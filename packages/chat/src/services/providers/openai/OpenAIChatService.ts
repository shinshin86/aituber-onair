import { ChatService } from '../../ChatService';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_4O_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../constants';
import type { OpenAIReasoningEffort } from '../../../constants';
import type { ChatResponseLength } from '../../../constants/chat';
import type {
  MCPServerConfig,
  Message,
  MessageWithVision,
  ToolChatCompletion,
  ToolDefinition,
} from '../../../types';
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';
import {
  parseOpenAICompatibleOneShot,
  parseOpenAICompatibleTextStream,
  parseOpenAICompatibleToolStream,
  processChatWithOptionalTools,
} from '../../../utils';
import {
  parseOpenAIResponsesOneShot,
  parseOpenAIResponsesStream,
} from './responsesParser';
import { buildOpenAIRequestBody } from './openaiRequestBuilder';

/**
 * OpenAI implementation of ChatService
 */
export class OpenAIChatService implements ChatService {
  /** Provider name */
  readonly provider: string;

  private apiKey: string;
  private model: string;
  private visionModel: string;
  private tools: ToolDefinition[];
  private endpoint: string;
  private mcpServers: MCPServerConfig[];
  private responseLength?: ChatResponseLength;
  private verbosity?: 'low' | 'medium' | 'high';
  private reasoning_effort?: OpenAIReasoningEffort;
  private enableReasoningSummary?: boolean;

  /**
   * Constructor
   * @param apiKey OpenAI API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GPT_4O_MINI,
    visionModel: string = MODEL_GPT_4O_MINI,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
    mcpServers: MCPServerConfig[] = [],
    responseLength?: ChatResponseLength,
    verbosity?: 'low' | 'medium' | 'high',
    reasoning_effort?: OpenAIReasoningEffort,
    enableReasoningSummary: boolean = false,
    provider: string = 'openai',
    validateVisionModel: boolean = true,
  ) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
    this.tools = tools || [];
    // Keep the endpoint as specified - no auto-switching
    this.endpoint = endpoint;
    this.mcpServers = mcpServers;
    this.responseLength = responseLength;
    this.verbosity = verbosity;
    this.reasoning_effort = reasoning_effort;
    this.enableReasoningSummary = enableReasoningSummary;

    // Official OpenAI validates vision model names strictly.
    // Compatible providers can skip this to support arbitrary local IDs.
    if (validateVisionModel && !VISION_SUPPORTED_MODELS.includes(visionModel)) {
      throw new Error(
        `Model ${visionModel} does not support vision capabilities.`,
      );
    }

    this.visionModel = visionModel;
  }

  /**
   * Get the current model name
   * @returns Model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the current vision model name
   * @returns Vision model name
   */
  getVisionModel(): string {
    return this.visionModel;
  }

  /**
   * Process chat messages
   * @param messages Array of messages to send
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   */
  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    await processChatWithOptionalTools({
      hasTools: this.tools.length > 0,
      runWithoutTools: async () => {
        const res = await this.callOpenAI(messages, this.model, true);
        const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

        try {
          if (isResponsesAPI) {
            const result = await parseOpenAIResponsesStream(
              res,
              onPartialResponse,
            );
            return StreamTextAccumulator.getFullText(result.blocks);
          }
          return this.handleStream(res, onPartialResponse);
        } catch (error) {
          console.error('[processChat] Error in streaming/completion:', error);
          throw error;
        }
      },
      runWithTools: () => this.chatOnce(messages, true, onPartialResponse),
      onCompleteResponse,
      toolErrorMessage:
        'processChat received tool_calls. ' +
        'ChatProcessor must use chatOnce() loop when tools are enabled.',
    });
  }

  /**
   * Process chat messages with images
   * @param messages Array of messages to send (including images)
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   * @throws Error if the selected model doesn't support vision
   */
  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    try {
      await processChatWithOptionalTools({
        hasTools: this.tools.length > 0,
        runWithoutTools: async () => {
          const res = await this.callOpenAI(messages, this.visionModel, true);
          const isResponsesAPI =
            this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

          try {
            if (isResponsesAPI) {
              const result = await parseOpenAIResponsesStream(
                res,
                onPartialResponse,
              );
              return StreamTextAccumulator.getFullText(result.blocks);
            }
            return this.handleStream(res, onPartialResponse);
          } catch (streamError) {
            console.error(
              '[processVisionChat] Error in streaming/completion:',
              streamError,
            );
            throw streamError;
          }
        },
        runWithTools: () =>
          this.visionChatOnce(messages, true, onPartialResponse),
        onCompleteResponse,
        toolErrorMessage:
          'processVisionChat received tool_calls. ' +
          'ChatProcessor must use visionChatOnce() loop when tools are enabled.',
      });
    } catch (error) {
      console.error('Error in processVisionChat:', error);
      throw error;
    }
  }

  /**
   * Process chat messages with tools (text only)
   * @param messages Array of messages to send
   * @param stream Whether to use streaming
   * @param onPartialResponse Callback for partial responses
   * @param maxTokens Maximum tokens for response (optional)
   * @returns Tool chat completion
   */
  async chatOnce(
    messages: Message[],
    stream = true,
    onPartialResponse: (text: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callOpenAI(messages, this.model, stream, maxTokens);
    return this.parseResponse(res, stream, onPartialResponse);
  }

  /**
   * Process vision chat messages with tools
   * @param messages Array of messages to send (including images)
   * @param stream Whether to use streaming
   * @param onPartialResponse Callback for partial responses
   * @param maxTokens Maximum tokens for response (optional)
   * @returns Tool chat completion
   */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean = false,
    onPartialResponse: (text: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callOpenAI(
      messages,
      this.visionModel,
      stream,
      maxTokens,
    );
    return this.parseResponse(res, stream, onPartialResponse);
  }

  /**
   * Parse response based on endpoint type
   */
  private async parseResponse(
    res: Response,
    stream: boolean,
    onPartialResponse: (text: string) => void,
  ): Promise<ToolChatCompletion> {
    const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

    if (isResponsesAPI) {
      return stream
        ? parseOpenAIResponsesStream(res, onPartialResponse)
        : parseOpenAIResponsesOneShot(await res.json());
    }

    return stream
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
  }

  private async callOpenAI(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean = false,
    maxTokens?: number,
  ): Promise<Response> {
    const body = buildOpenAIRequestBody({
      provider: this.provider,
      endpoint: this.endpoint,
      messages,
      model,
      stream,
      tools: this.tools,
      mcpServers: this.mcpServers,
      responseLength: this.responseLength,
      verbosity: this.verbosity,
      reasoning_effort: this.reasoning_effort,
      enableReasoningSummary: this.enableReasoningSummary,
      maxTokens,
    });
    const headers: Record<string, string> = {};

    const shouldSendAuthorization =
      this.provider !== 'openai-compatible' || this.apiKey.trim() !== '';
    if (shouldSendAuthorization) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const res = await ChatServiceHttpClient.post(this.endpoint, body, headers);

    return res;
  }
  private async handleStream(res: Response, onPartial: (t: string) => void) {
    return parseOpenAICompatibleTextStream(res, onPartial);
  }

  private async parseStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<ToolChatCompletion> {
    return parseOpenAICompatibleToolStream(res, onPartial, {
      appendTextBlock: StreamTextAccumulator.addTextBlock,
    });
  }

  private parseOneShot(data: any): ToolChatCompletion {
    return parseOpenAICompatibleOneShot(data);
  }
}

import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import { ToolDefinition, ToolChatCompletion } from '../../../types';
import {
  ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
  MODEL_GLM_4_7,
  MODEL_GLM_4_6V_FLASH,
  isZaiToolStreamModel,
  isZaiVisionModel,
} from '../../../constants/zai';
import {
  ChatResponseLength,
  getMaxTokensForResponseLength,
} from '../../../constants/chat';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';
import {
  buildOpenAICompatibleTools,
  parseOpenAICompatibleOneShot,
  parseOpenAICompatibleTextStream,
  parseOpenAICompatibleToolStream,
  processChatWithOptionalTools,
} from '../../../utils';

/**
 * Z.ai implementation of ChatService (OpenAI-compatible Chat Completions)
 */
export class ZAIChatService implements ChatService {
  /** Provider name */
  readonly provider: string = 'zai';

  private apiKey: string;
  private model: string;
  private visionModel: string;
  private tools: ToolDefinition[];
  private endpoint: string;
  private responseLength?: ChatResponseLength;
  private responseFormat?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: any;
  };
  private thinking?: {
    type: 'enabled' | 'disabled';
    clear_thinking?: boolean;
  };

  /**
   * Constructor
   * @param apiKey Z.ai API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GLM_4_7,
    visionModel: string = MODEL_GLM_4_6V_FLASH,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_ZAI_CHAT_COMPLETIONS_API,
    responseLength?: ChatResponseLength,
    responseFormat?: {
      type: 'text' | 'json_object' | 'json_schema';
      json_schema?: any;
    },
    thinking?: {
      type: 'enabled' | 'disabled';
      clear_thinking?: boolean;
    },
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.tools = tools || [];
    this.endpoint = endpoint;
    this.responseLength = responseLength;
    this.responseFormat = responseFormat;
    this.thinking = thinking ?? { type: 'disabled' };

    this.visionModel = visionModel;
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the current vision model name
   */
  getVisionModel(): string {
    return this.visionModel;
  }

  /**
   * Process chat messages
   */
  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    await processChatWithOptionalTools({
      hasTools: this.tools.length > 0,
      runWithoutTools: async () => {
        const res = await this.callZAI(messages, this.model, true);
        return this.handleStream(res, onPartialResponse);
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
   */
  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    if (!isZaiVisionModel(this.visionModel)) {
      throw new Error(
        `Model ${this.visionModel} does not support vision capabilities.`,
      );
    }

    await processChatWithOptionalTools({
      hasTools: this.tools.length > 0,
      runWithoutTools: async () => {
        const res = await this.callZAI(messages, this.visionModel, true);
        return this.handleStream(res, onPartialResponse);
      },
      runWithTools: () =>
        this.visionChatOnce(messages, true, onPartialResponse),
      onCompleteResponse,
      toolErrorMessage:
        'processVisionChat received tool_calls. ' +
        'ChatProcessor must use visionChatOnce() loop when tools are enabled.',
    });
  }

  /**
   * Process chat messages with tools (text only)
   */
  async chatOnce(
    messages: Message[],
    stream: boolean = true,
    onPartialResponse: (text: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callZAI(messages, this.model, stream, maxTokens);
    return this.parseResponse(res, stream, onPartialResponse);
  }

  /**
   * Process vision chat messages with tools
   */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean = false,
    onPartialResponse: (text: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    if (!isZaiVisionModel(this.visionModel)) {
      throw new Error(
        `Model ${this.visionModel} does not support vision capabilities.`,
      );
    }

    const res = await this.callZAI(
      messages,
      this.visionModel,
      stream,
      maxTokens,
    );
    return this.parseResponse(res, stream, onPartialResponse);
  }

  private async parseResponse(
    res: Response,
    stream: boolean,
    onPartialResponse: (text: string) => void,
  ): Promise<ToolChatCompletion> {
    return stream
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
  }

  private async callZAI(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean = false,
    maxTokens?: number,
  ): Promise<Response> {
    const body = this.buildRequestBody(messages, model, stream, maxTokens);

    const res = await ChatServiceHttpClient.post(this.endpoint, body, {
      Authorization: `Bearer ${this.apiKey}`,
    });

    return res;
  }

  /**
   * Build request body (OpenAI-compatible Chat Completions)
   */
  private buildRequestBody(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean,
    maxTokens?: number,
  ): any {
    const body: any = {
      model,
      stream,
      messages,
    };

    const tokenLimit =
      maxTokens !== undefined
        ? maxTokens
        : getMaxTokensForResponseLength(this.responseLength);
    if (tokenLimit !== undefined) {
      body.max_tokens = tokenLimit;
    }

    if (this.responseFormat) {
      body.response_format = this.responseFormat;
    }

    if (this.thinking) {
      body.thinking = this.thinking;
    }

    const tools = this.buildToolsDefinition();
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
      if (stream && isZaiToolStreamModel(model)) {
        body.tool_stream = true;
      }
    }

    return body;
  }

  private buildToolsDefinition(): any[] {
    return buildOpenAICompatibleTools(this.tools, 'chat-completions');
  }

  private async handleStream(res: Response, onPartial: (t: string) => void) {
    return parseOpenAICompatibleTextStream(res, onPartial, {
      onJsonError: (payload) =>
        console.debug('Failed to parse SSE data:', payload),
    });
  }

  /**
   * Parse streaming response with tool support
   */
  private async parseStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<ToolChatCompletion> {
    return parseOpenAICompatibleToolStream(res, onPartial, {
      onJsonError: (payload) =>
        console.debug('Failed to parse SSE data:', payload),
    });
  }

  /**
   * Parse non-streaming response
   */
  private parseOneShot(data: any): ToolChatCompletion {
    return parseOpenAICompatibleOneShot(data);
  }
}

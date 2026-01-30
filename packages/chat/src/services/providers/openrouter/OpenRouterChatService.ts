import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import {
  ToolDefinition,
  ToolChatCompletion,
} from '../../../types';
import {
  ENDPOINT_OPENROUTER_API,
  MODEL_GPT_OSS_20B_FREE,
  isOpenRouterVisionModel,
  isOpenRouterFreeModel,
  OPENROUTER_FREE_RATE_LIMIT_PER_MINUTE,
} from '../../../constants/openrouter';
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
 * OpenRouter implementation of ChatService
 * OpenRouter provides access to multiple AI models through a unified API
 */
export class OpenRouterChatService implements ChatService {
  /** Provider name */
  readonly provider: string = 'openrouter';

  private apiKey: string;
  private model: string;
  private visionModel: string;
  private tools: ToolDefinition[];
  private endpoint: string;
  private responseLength?: ChatResponseLength;
  private appName?: string;
  private appUrl?: string;
  private reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  private includeReasoning?: boolean;
  private reasoningMaxTokens?: number;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;

  /**
   * Constructor
   * @param apiKey OpenRouter API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   * @param tools Tool definitions (optional)
   * @param endpoint API endpoint (optional)
   * @param responseLength Response length configuration (optional)
   * @param appName Application name for OpenRouter analytics (optional)
   * @param appUrl Application URL for OpenRouter analytics (optional)
   * @param reasoning_effort Reasoning effort level (optional)
   * @param includeReasoning Whether to include reasoning in response (optional)
   * @param reasoningMaxTokens Maximum tokens for reasoning (optional)
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GPT_OSS_20B_FREE,
    visionModel: string = MODEL_GPT_OSS_20B_FREE,
    tools?: ToolDefinition[],
    endpoint: string = ENDPOINT_OPENROUTER_API,
    responseLength?: ChatResponseLength,
    appName?: string,
    appUrl?: string,
    reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high',
    includeReasoning?: boolean,
    reasoningMaxTokens?: number,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.tools = tools || [];
    this.endpoint = endpoint;
    this.responseLength = responseLength;
    this.appName = appName;
    this.appUrl = appUrl;
    this.reasoning_effort = reasoning_effort;
    this.includeReasoning = includeReasoning;
    this.reasoningMaxTokens = reasoningMaxTokens;

    // Store vision model without validation at construction time
    // Validation will be performed when vision methods are actually called
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
   * Apply rate limiting for free tier models
   */
  private async applyRateLimiting(): Promise<void> {
    if (!isOpenRouterFreeModel(this.model)) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter if more than a minute has passed
    if (timeSinceLastRequest > 60000) {
      this.requestCount = 0;
    }

    // If we've hit the rate limit, wait
    if (this.requestCount >= OPENROUTER_FREE_RATE_LIMIT_PER_MINUTE) {
      const waitTime = 60000 - timeSinceLastRequest;
      if (waitTime > 0) {
        console.log(
          `Rate limit reached for free tier. Waiting ${waitTime}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      }
    }

    this.lastRequestTime = now;
    this.requestCount++;
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
    // Apply rate limiting for free tier
    await this.applyRateLimiting();

    await processChatWithOptionalTools({
      hasTools: this.tools.length > 0,
      runWithoutTools: async () => {
        const res = await this.callOpenRouter(messages, this.model, true);
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
   * @param messages Array of messages to send (including images)
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   */
  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    // Always validate vision capabilities when vision methods are called
    if (!isOpenRouterVisionModel(this.visionModel)) {
      throw new Error(
        `Model ${this.visionModel} does not support vision capabilities.`,
      );
    }

    // Apply rate limiting for free tier
    await this.applyRateLimiting();

    try {
      await processChatWithOptionalTools({
        hasTools: this.tools.length > 0,
        runWithoutTools: async () => {
          const res = await this.callOpenRouter(
            messages,
            this.visionModel,
            true,
          );
          return this.handleStream(res, onPartialResponse);
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
    await this.applyRateLimiting();
    const res = await this.callOpenRouter(
      messages,
      this.model,
      stream,
      maxTokens,
    );
    return stream
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
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
    // Always validate vision capabilities when vision methods are called
    if (!isOpenRouterVisionModel(this.visionModel)) {
      throw new Error(
        `Model ${this.visionModel} does not support vision capabilities.`,
      );
    }

    await this.applyRateLimiting();
    const res = await this.callOpenRouter(
      messages,
      this.visionModel,
      stream,
      maxTokens,
    );
    return stream
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouter(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean = false,
    maxTokens?: number,
  ): Promise<Response> {
    const body = this.buildRequestBody(messages, model, stream, maxTokens);

    // Build headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    // Add optional analytics headers
    if (this.appUrl) {
      headers['HTTP-Referer'] = this.appUrl;
    }
    if (this.appName) {
      headers['X-Title'] = this.appName;
    }

    const res = await ChatServiceHttpClient.post(this.endpoint, body, headers);

    return res;
  }

  /**
   * Build request body for OpenRouter API (OpenAI-compatible format)
   */
  private buildRequestBody(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean,
    maxTokens?: number,
  ): any {
    const body: any = {
      model,
      messages,
      stream,
    };

    // Add max_tokens if specified
    const tokenLimit =
      maxTokens !== undefined
        ? maxTokens
        : getMaxTokensForResponseLength(this.responseLength);

    // OpenRouter gpt-oss-20b model has known issues with token limits causing empty responses
    // Remove all token limits to ensure proper functionality
    if (tokenLimit) {
      console.warn(
        `OpenRouter: Token limits are not supported for gpt-oss-20b model due to known issues. Using unlimited tokens instead.`,
      );
      // Do not set max_tokens - use unlimited tokens
    }

    // Add OpenRouter reasoning control
    if (
      this.reasoning_effort !== undefined ||
      this.includeReasoning !== undefined ||
      this.reasoningMaxTokens
    ) {
      body.reasoning = {};

      if (this.reasoning_effort && this.reasoning_effort !== 'none') {
        // OpenRouter uses 'low' as the minimum effort level, map 'minimal' to 'low'
        const effort =
          this.reasoning_effort === 'minimal' ? 'low' : this.reasoning_effort;
        body.reasoning.effort = effort;
      }

      // Default to exclude reasoning to avoid empty responses unless explicitly requested
      if (this.reasoning_effort === 'none' || this.includeReasoning !== true) {
        body.reasoning.exclude = true;
      }

      if (this.reasoningMaxTokens) {
        body.reasoning.max_tokens = this.reasoningMaxTokens;
      }
    } else {
      // Default behavior: exclude reasoning to avoid empty responses
      body.reasoning = { exclude: true };
    }

    // Add tools if available
    if (this.tools.length > 0) {
      body.tools = buildOpenAICompatibleTools(this.tools, 'chat-completions');
      body.tool_choice = 'auto';
    }

    return body;
  }

  /**
   * Handle streaming response from OpenRouter
   * OpenRouter uses SSE format with potential comment lines
   */
  private async handleStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<string> {
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

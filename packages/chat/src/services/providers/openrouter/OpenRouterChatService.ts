import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import {
  ToolDefinition,
  ToolChatBlock,
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
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';

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

    // Not using tools
    if (this.tools.length === 0) {
      const res = await this.callOpenRouter(messages, this.model, true);
      const full = await this.handleStream(res, onPartialResponse);
      await onCompleteResponse(full);
      return;
    }

    // Using tools
    const { blocks, stop_reason } = await this.chatOnce(messages);

    if (stop_reason === 'end') {
      const full = blocks
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      await onCompleteResponse(full);
      return;
    }

    throw new Error(
      'processChat received tool_calls. ' +
        'ChatProcessor must use chatOnce() loop when tools are enabled.',
    );
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
      // Not using tools
      if (this.tools.length === 0) {
        const res = await this.callOpenRouter(messages, this.visionModel, true);
        const full = await this.handleStream(res, onPartialResponse);
        await onCompleteResponse(full);
        return;
      }

      // Using tools
      const { blocks, stop_reason } = await this.visionChatOnce(
        messages,
        true,
        onPartialResponse,
      );

      if (stop_reason === 'end') {
        const full = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        await onCompleteResponse(full);
        return;
      }

      throw new Error(
        'processVisionChat received tool_calls. ' +
          'ChatProcessor must use visionChatOnce() loop when tools are enabled.',
      );
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
      body.tools = this.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
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
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });

      // Process line by line
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comment lines (OpenRouter specific)
        if (!trimmedLine || trimmedLine.startsWith(':')) continue;

        if (!trimmedLine.startsWith('data:')) continue;

        const jsonStr = trimmedLine.slice(5).trim();
        if (jsonStr === '[DONE]') {
          return full;
        }

        try {
          const json = JSON.parse(jsonStr);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            onPartial(content);
            full += content;
          }
        } catch (e) {
          // Skip invalid JSON (could be partial or malformed)
          console.debug('Failed to parse SSE data:', jsonStr);
        }
      }
    }

    return full;
  }

  /**
   * Parse streaming response with tool support
   */
  private async parseStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<ToolChatCompletion> {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();

    const textBlocks: ToolChatBlock[] = [];
    const toolCallsMap = new Map<number, any>();

    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      // Process line by line
      const lines = buf.split('\n');
      buf = lines.pop() || ''; // Keep incomplete line

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and OpenRouter comment lines
        if (!trimmedLine || trimmedLine.startsWith(':')) continue;

        if (!trimmedLine.startsWith('data:')) continue;

        const payload = trimmedLine.slice(5).trim();
        if (payload === '[DONE]') {
          break;
        }

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta;

          if (delta?.content) {
            onPartial(delta.content);
            StreamTextAccumulator.append(textBlocks, delta.content);
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            delta.tool_calls.forEach((c: any) => {
              const entry = toolCallsMap.get(c.index) ?? {
                id: c.id,
                name: c.function?.name,
                args: '',
              };
              entry.args += c.function?.arguments || '';
              toolCallsMap.set(c.index, entry);
            });
          }
        } catch (e) {
          console.debug('Failed to parse SSE data:', payload);
        }
      }
    }

    // Convert tool_calls to blocks
    const toolBlocks: ToolChatBlock[] = Array.from(toolCallsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, e]) => ({
        type: 'tool_use',
        id: e.id,
        name: e.name,
        input: JSON.parse(e.args || '{}'),
      }));

    const blocks = [...textBlocks, ...toolBlocks];

    return {
      blocks,
      stop_reason: toolBlocks.length ? 'tool_use' : 'end',
    };
  }

  /**
   * Parse non-streaming response
   */
  private parseOneShot(data: any): ToolChatCompletion {
    const choice = data.choices?.[0];
    const blocks: ToolChatBlock[] = [];

    if (choice?.finish_reason === 'tool_calls' && choice?.message?.tool_calls) {
      choice.message.tool_calls.forEach((c: any) =>
        blocks.push({
          type: 'tool_use',
          id: c.id,
          name: c.function?.name,
          input: JSON.parse(c.function?.arguments || '{}'),
        }),
      );
    } else if (choice?.message?.content) {
      blocks.push({ type: 'text', text: choice.message.content });
    }

    return {
      blocks,
      stop_reason: choice?.finish_reason === 'tool_calls' ? 'tool_use' : 'end',
    };
  }
}

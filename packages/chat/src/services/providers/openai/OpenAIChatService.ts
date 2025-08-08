import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_4O_MINI,
  VISION_SUPPORTED_MODELS,
  isGPT5Model,
} from '../../../constants';
import {
  ChatResponseLength,
  getMaxTokensForResponseLength,
} from '../../../constants/chat';
import {
  ToolDefinition,
  ToolChatBlock,
  ToolChatCompletion,
} from '../../../types';
import { MCPServerConfig } from '../../../types';
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';

/**
 * OpenAI implementation of ChatService
 */
export class OpenAIChatService implements ChatService {
  /** Provider name */
  readonly provider: string = 'openai';

  private apiKey: string;
  private model: string;
  private visionModel: string;
  private tools: ToolDefinition[];
  private endpoint: string;
  private mcpServers: MCPServerConfig[];
  private responseLength?: ChatResponseLength;
  private verbosity?: 'low' | 'medium' | 'high';
  private reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
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
    reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high',
    enableReasoningSummary: boolean = false,
  ) {
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

    // Log the selected endpoint for GPT-5 models
    if (isGPT5Model(model)) {
      const apiType =
        endpoint === ENDPOINT_OPENAI_RESPONSES_API
          ? 'Responses API'
          : 'Chat Completions API';
      console.log(
        `[OpenAIChatService] Using ${apiType} for GPT-5 model: ${model}`,
      );
    }

    // check if the vision model is supported
    if (!VISION_SUPPORTED_MODELS.includes(visionModel)) {
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
    // not use tools
    if (this.tools.length === 0) {
      const res = await this.callOpenAI(messages, this.model, true);
      const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

      try {
        if (isResponsesAPI) {
          // Use Responses API parser for GPT-5 and other models using Responses API
          console.debug('[Responses API] Starting parseResponsesStream');
          const result = await this.parseResponsesStream(
            res,
            onPartialResponse,
          );
          const full = result.blocks
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('');
          console.debug(
            '[Responses API] Calling onCompleteResponse with text length:',
            full.length,
          );
          await onCompleteResponse(full);
          console.debug(
            '[Responses API] onCompleteResponse completed successfully',
          );
        } else {
          // Use standard Chat Completions API parser
          const full = await this.handleStream(res, onPartialResponse);
          await onCompleteResponse(full);
        }
      } catch (error) {
        console.error('[processChat] Error in streaming/completion:', error);
        throw error;
      }
      return;
    }

    // use tools
    const { blocks, stop_reason } = await this.chatOnce(messages);

    if (stop_reason === 'end') {
      // no tool calls
      const full = blocks
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      await onCompleteResponse(full);
      return;
    }

    // case of stop_reason === 'tool_use', so error
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
   * @throws Error if the selected model doesn't support vision
   */
  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    try {
      // not use tools
      if (this.tools.length === 0) {
        const res = await this.callOpenAI(messages, this.visionModel, true);
        const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

        try {
          if (isResponsesAPI) {
            // Use Responses API parser for GPT-5 and other models using Responses API
            console.debug(
              '[Responses API] Starting parseResponsesStream (vision)',
            );
            const result = await this.parseResponsesStream(
              res,
              onPartialResponse,
            );
            const full = result.blocks
              .filter((b) => b.type === 'text')
              .map((b) => b.text)
              .join('');
            console.debug(
              '[Responses API] Calling onCompleteResponse with text length (vision):',
              full.length,
            );
            await onCompleteResponse(full);
            console.debug(
              '[Responses API] onCompleteResponse completed successfully (vision)',
            );
          } else {
            // Use standard Chat Completions API parser
            const full = await this.handleStream(res, onPartialResponse);
            await onCompleteResponse(full);
          }
        } catch (streamError) {
          console.error(
            '[processVisionChat] Error in streaming/completion:',
            streamError,
          );
          throw streamError;
        }
        return;
      }

      // use tools
      const { blocks, stop_reason } = await this.visionChatOnce(
        messages,
        true,
        onPartialResponse,
      );

      if (stop_reason === 'end') {
        // no tool calls
        const full = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        await onCompleteResponse(full);
        return;
      }

      // case of stop_reason === 'tool_use', so error
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
        ? this.parseResponsesStream(res, onPartialResponse)
        : this.parseResponsesOneShot(await res.json());
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
    const body = this.buildRequestBody(messages, model, stream, maxTokens);

    const res = await ChatServiceHttpClient.post(this.endpoint, body, {
      Authorization: `Bearer ${this.apiKey}`,
    });

    return res;
  }

  /**
   * Build request body based on the endpoint type
   */
  private buildRequestBody(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean,
    maxTokens?: number,
  ): any {
    const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

    // Validate MCP servers compatibility
    this.validateMCPCompatibility();

    const body: any = {
      model,
      stream,
    };

    // Add max_tokens/max_completion_tokens based on endpoint
    const tokenLimit =
      maxTokens !== undefined
        ? maxTokens
        : getMaxTokensForResponseLength(this.responseLength);

    if (isResponsesAPI) {
      body.max_output_tokens = tokenLimit;
    } else {
      body.max_completion_tokens = tokenLimit;
    }

    // Handle messages format based on endpoint
    if (isResponsesAPI) {
      body.input = this.cleanMessagesForResponsesAPI(messages);
    } else {
      body.messages = messages;
    }

    // Add GPT-5 specific parameters
    if (isGPT5Model(model)) {
      // For Responses API, use nested structure
      if (isResponsesAPI) {
        if (this.reasoning_effort) {
          body.reasoning = {
            ...body.reasoning,
            effort: this.reasoning_effort,
          };
          // Only add summary if explicitly enabled (requires org verification)
          if (this.enableReasoningSummary) {
            body.reasoning.summary = 'auto';
          }
        }
        if (this.verbosity) {
          body.text = {
            ...body.text,
            format: { type: 'text' },
            verbosity: this.verbosity,
          };
        }
      } else {
        // For Chat Completions API, add GPT-5 parameters directly (flat structure)
        // Example: { "reasoning_effort": "minimal", "verbosity": "low" }
        if (this.reasoning_effort) {
          body.reasoning_effort = this.reasoning_effort;
        }
        if (this.verbosity) {
          body.verbosity = this.verbosity;
        }
      }
    }

    // Add tools if available
    const tools = this.buildToolsDefinition();
    if (tools.length > 0) {
      body.tools = tools;

      // Only Chat Completions API requires tool_choice
      if (!isResponsesAPI) {
        body.tool_choice = 'auto';
      }
    }

    return body;
  }

  /**
   * Validate MCP servers compatibility with the current endpoint
   */
  private validateMCPCompatibility(): void {
    if (
      this.mcpServers.length > 0 &&
      this.endpoint === ENDPOINT_OPENAI_CHAT_COMPLETIONS_API
    ) {
      throw new Error(
        `MCP servers are not supported with Chat Completions API. ` +
          `Current endpoint: ${this.endpoint}. ` +
          `Please use OpenAI Responses API endpoint: ${ENDPOINT_OPENAI_RESPONSES_API}. ` +
          `MCP tools are only available in the Responses API endpoint.`,
      );
    }
  }

  /**
   * Clean messages for Responses API (remove timestamp and other extra properties)
   */
  private cleanMessagesForResponsesAPI(
    messages: (Message | MessageWithVision)[],
  ): any[] {
    return messages.map((msg) => {
      const cleanMsg: any = {
        role: msg.role,
      };

      // Handle content (text or vision)
      if (typeof msg.content === 'string') {
        cleanMsg.content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Vision message case
        cleanMsg.content = msg.content;
      } else {
        cleanMsg.content = msg.content;
      }

      return cleanMsg;
    });
  }

  /**
   * Build tools definition based on the endpoint type
   */
  private buildToolsDefinition(): any[] {
    const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;
    const toolDefs: any[] = [];

    // Add function tools
    if (this.tools.length > 0) {
      if (isResponsesAPI) {
        // Responses API format (flattened function properties)
        toolDefs.push(
          ...this.tools.map((t) => ({
            type: 'function',
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        );
      } else {
        // Chat Completions API format (nested function properties)
        toolDefs.push(
          ...this.tools.map((t) => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          })),
        );
      }
    }

    // Add MCP tools (only for Responses API)
    if (this.mcpServers.length > 0 && isResponsesAPI) {
      toolDefs.push(...this.buildMCPToolsDefinition());
    }

    return toolDefs;
  }

  /**
   * Build MCP tools definition for Responses API
   */
  private buildMCPToolsDefinition(): any[] {
    return this.mcpServers.map((server) => {
      const mcpDef: any = {
        type: 'mcp',
        server_label: server.name,
        server_url: server.url,
        require_approval: 'never',
      };

      if (server.tool_configuration?.allowed_tools) {
        mcpDef.allowed_tools = server.tool_configuration.allowed_tools;
      }

      if (server.authorization_token) {
        mcpDef.headers = {
          Authorization: `Bearer ${server.authorization_token}`,
        };
      }

      return mcpDef;
    });
  }

  private async handleStream(res: Response, onPartial: (t: string) => void) {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!raw.startsWith('data:')) continue;
        const jsonStr = raw.slice(5).trim();
        if (jsonStr === '[DONE]') {
          buffer = '';
          break;
        }

        const json = JSON.parse(jsonStr);
        const content = json.choices[0]?.delta?.content || '';
        if (content) {
          onPartial(content);
          full += content;
        }
      }
    }
    return full;
  }

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

      // wait for "\n\n"
      let sep;
      while ((sep = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, sep).trim(); // 1 line
        buf = buf.slice(sep + 2);

        if (!raw.startsWith('data:')) continue;
        const payload = raw.slice(5).trim(); // after "data:"
        if (payload === '[DONE]') {
          buf = '';
          break;
        }

        const json = JSON.parse(payload);
        const delta = json.choices[0].delta;

        if (delta.content) {
          onPartial(delta.content);
          textBlocks.push({ type: 'text', text: delta.content });
        }

        /* -------------- tool_calls -------------- */
        if (delta.tool_calls) {
          delta.tool_calls.forEach((c: any) => {
            // arguments are incremented for each chunk → concatenate
            const entry = toolCallsMap.get(c.index) ?? {
              id: c.id,
              name: c.function.name,
              args: '',
            };
            entry.args += c.function.arguments || '';
            toolCallsMap.set(c.index, entry);
          });
        }
      }
    }

    // convert tool_callsMap to ToolUseBlock[]
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

  private parseOneShot(data: any): ToolChatCompletion {
    const choice = data.choices[0];
    const blocks: ToolChatBlock[] = [];

    if (choice.finish_reason === 'tool_calls') {
      choice.message.tool_calls.forEach((c: any) =>
        blocks.push({
          type: 'tool_use',
          id: c.id,
          name: c.function.name,
          input: JSON.parse(c.function.arguments || '{}'),
        }),
      );
    } else {
      blocks.push({ type: 'text', text: choice.message.content });
    }

    return {
      blocks,
      stop_reason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end',
    };
  }

  /**
   * Parse streaming response from Responses API (SSE format)
   */
  private async parseResponsesStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<ToolChatCompletion> {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();

    const textBlocks: ToolChatBlock[] = [];
    const toolCallsMap = new Map<string, any>();

    let buf = '';
    let isCompleted = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      // Parse SSE format: process event: and data: combinations
      let eventType = '';
      let eventData = '';

      const lines = buf.split('\n');
      buf = lines.pop() || ''; // Keep the last incomplete line

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          eventData = line.slice(5).trim();
        } else if (line === '' && eventType && eventData) {
          // Process event separated by empty line
          try {
            const json = JSON.parse(eventData);
            const completionResult = this.handleResponsesSSEEvent(
              eventType,
              json,
              onPartial,
              textBlocks,
              toolCallsMap,
            );

            // Check if response is completed
            if (completionResult === 'completed') {
              isCompleted = true;
              console.debug(
                '[Responses API] Stream completed via response.completed event',
              );
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', eventData);
          }
          eventType = '';
          eventData = '';
        }
      }
    }

    console.debug('[Responses API] Stream ended, isCompleted:', isCompleted);

    // Convert tool calls to blocks
    const toolBlocks: ToolChatBlock[] = Array.from(toolCallsMap.values()).map(
      (tool) => ({
        type: 'tool_use',
        id: tool.id,
        name: tool.name,
        input: tool.input || {},
      }),
    );

    const blocks = [...textBlocks, ...toolBlocks];

    return {
      blocks,
      stop_reason: toolBlocks.length ? 'tool_use' : 'end',
    };
  }

  /**
   * Handle specific SSE events from Responses API
   * @returns 'completed' if the response is completed, undefined otherwise
   */
  private handleResponsesSSEEvent(
    eventType: string,
    data: any,
    onPartial: (t: string) => void,
    textBlocks: ToolChatBlock[],
    toolCallsMap: Map<string, any>,
  ): 'completed' | undefined {
    // Debug logging for GPT-5 responses
    if (isGPT5Model(this.model)) {
      console.debug(`[GPT-5 SSE Event] Type: ${eventType}`, data);
    }

    switch (eventType) {
      // Item addition events
      case 'response.output_item.added':
        if (data.item?.type === 'message' && Array.isArray(data.item.content)) {
          data.item.content.forEach((c: any) => {
            if (c.type === 'output_text' && c.text) {
              onPartial(c.text);
              StreamTextAccumulator.append(textBlocks, c.text);
            }
          });
        } else if (data.item?.type === 'function_call') {
          toolCallsMap.set(data.item.id, {
            id: data.item.id,
            name: data.item.name,
            input: data.item.arguments ? JSON.parse(data.item.arguments) : {},
          });
        }
        break;

      // Initial content part events
      case 'response.content_part.added':
        if (
          data.part?.type === 'output_text' &&
          typeof data.part.text === 'string'
        ) {
          onPartial(data.part.text);
          StreamTextAccumulator.append(textBlocks, data.part.text);
        }
        break;

      // Text delta events
      case 'response.output_text.delta':
      case 'response.content_part.delta': // Also handle this event type just in case
        {
          const deltaText =
            typeof data.delta === 'string'
              ? data.delta
              : (data.delta?.text ?? '');
          if (deltaText) {
            onPartial(deltaText);
            StreamTextAccumulator.append(textBlocks, deltaText);
          }
        }
        break;

      // Text completion events - do not add text here as it's already accumulated via delta events
      case 'response.output_text.done':
      case 'response.content_part.done':
        // These events contain the complete text but we've already accumulated it through deltas
        // Adding it here would cause duplicate display
        break;

      // Response completion events
      case 'response.completed':
        console.debug('[Responses API] Response completed event received');
        return 'completed';

      // GPT-5 reasoning token events (not visible but counted for billing)
      case 'response.reasoning.started':
      case 'response.reasoning.delta':
      case 'response.reasoning.done':
        if (isGPT5Model(this.model)) {
          console.debug(`[GPT-5] Reasoning event: ${eventType}`, data);
        }
        break;

      default:
        // Log unknown events for GPT-5 debugging
        if (isGPT5Model(this.model) && eventType.startsWith('response.')) {
          console.debug(`[GPT-5] Unknown event type: ${eventType}`, data);
        }
        break;
    }

    return undefined;
  }

  /**
   * Parse non-streaming response from Responses API
   */
  private parseResponsesOneShot(data: any): ToolChatCompletion {
    const blocks: ToolChatBlock[] = [];

    // Process Responses API format: data.output array
    if (data.output && Array.isArray(data.output)) {
      data.output.forEach((outputItem: any) => {
        if (outputItem.type === 'message' && outputItem.content) {
          outputItem.content.forEach((content: any) => {
            if (content.type === 'output_text' && content.text) {
              blocks.push({ type: 'text', text: content.text });
            }
          });
        }

        // Handle function call items
        if (outputItem.type === 'function_call') {
          blocks.push({
            type: 'tool_use',
            id: outputItem.id,
            name: outputItem.name,
            input: outputItem.arguments ? JSON.parse(outputItem.arguments) : {},
          });
        }
      });
    }

    return {
      blocks,
      stop_reason: blocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    };
  }
}

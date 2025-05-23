import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../../types';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_4O_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../../constants';
import {
  ToolDefinition,
  ToolChatBlock,
  ToolChatCompletion,
} from '../../../../types';
import { MCPServerConfig } from '../../../../types';

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
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.tools = tools || [];
    this.endpoint = endpoint;
    this.mcpServers = mcpServers;

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
      const full = await this.handleStream(res, onPartialResponse);
      await onCompleteResponse(full);
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
        const full = await this.handleStream(res, onPartialResponse);
        await onCompleteResponse(full);
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
   * @returns Tool chat completion
   */
  async chatOnce(
    messages: Message[],
    stream = true,
    onPartialResponse: (text: string) => void = () => {},
  ): Promise<ToolChatCompletion> {
    const res = await this.callOpenAI(messages, this.model, stream);
    return this.parseResponse(res, stream, onPartialResponse);
  }

  /**
   * Process vision chat messages with tools
   * @param messages Array of messages to send (including images)
   * @param stream Whether to use streaming
   * @param onPartialResponse Callback for partial responses
   * @returns Tool chat completion
   */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean = false,
    onPartialResponse: (text: string) => void = () => {},
  ): Promise<ToolChatCompletion> {
    const res = await this.callOpenAI(messages, this.visionModel, stream);
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
  ): Promise<Response> {
    const body = this.buildRequestBody(messages, model, stream);

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    return res;
  }

  /**
   * Build request body based on the endpoint type
   */
  private buildRequestBody(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean,
  ): any {
    const isResponsesAPI = this.endpoint === ENDPOINT_OPENAI_RESPONSES_API;

    // Validate MCP servers compatibility
    this.validateMCPCompatibility();

    const body: any = {
      model,
      stream,
    };

    // Handle messages format based on endpoint
    if (isResponsesAPI && this.mcpServers.length > 0) {
      body.input = this.cleanMessagesForResponsesAPI(messages);
    } else {
      body.messages = messages;
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
            this.handleResponsesSSEEvent(
              eventType,
              json,
              onPartial,
              textBlocks,
              toolCallsMap,
            );
          } catch (e) {
            console.warn('Failed to parse SSE data:', eventData);
          }
          eventType = '';
          eventData = '';
        }
      }
    }

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
   */
  private handleResponsesSSEEvent(
    eventType: string,
    data: any,
    onPartial: (t: string) => void,
    textBlocks: ToolChatBlock[],
    toolCallsMap: Map<string, any>,
  ): void {
    // Helper to append text to the last text block or create a new one
    const appendText = (txt: string) => {
      if (!txt) return;
      if (
        textBlocks.length &&
        textBlocks[textBlocks.length - 1].type === 'text'
      ) {
        (textBlocks[textBlocks.length - 1] as any).text += txt;
      } else {
        textBlocks.push({ type: 'text', text: txt });
      }
    };

    switch (eventType) {
      // Item addition events
      case 'response.output_item.added':
        if (data.item?.type === 'message' && Array.isArray(data.item.content)) {
          data.item.content.forEach((c: any) => {
            if (c.type === 'output_text' && c.text) {
              onPartial(c.text);
              appendText(c.text);
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
          appendText(data.part.text);
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
            appendText(deltaText);
          }
        }
        break;

      // Text completion events
      case 'response.output_text.done':
      case 'response.content_part.done':
        if (typeof data.text === 'string' && data.text) {
          appendText(data.text);
        }
        break;

      // Response completion events
      case 'response.completed':
        break;

      default:
        // Ignore other events
        break;
    }
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

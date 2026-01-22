import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import {
  ToolDefinition,
  ToolChatBlock,
  ToolChatCompletion,
} from '../../../types';
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
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';

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
    // Not using tools
    if (this.tools.length === 0) {
      const res = await this.callZAI(messages, this.model, true);
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

    // Not using tools
    if (this.tools.length === 0) {
      const res = await this.callZAI(messages, this.visionModel, true);
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
    if (this.tools.length === 0) return [];
    return this.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  private async handleStream(res: Response, onPartial: (t: string) => void) {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let full = '';
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith(':')) continue;
        if (!trimmedLine.startsWith('data:')) continue;

        const payload = trimmedLine.slice(5).trim();
        if (payload === '[DONE]') {
          break;
        }

        try {
          const json = JSON.parse(payload);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            onPartial(content);
            full += content;
          }
        } catch (e) {
          console.debug('Failed to parse SSE data:', payload);
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

      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
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

    if (choice?.message?.tool_calls?.length) {
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
      stop_reason: blocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    };
  }
}

import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../../types';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  MODEL_GPT_4O_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../../constants';
import {
  ToolDefinition,
  ToolChatBlock,
  ToolChatCompletion,
} from '../../../../types';

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
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.tools = tools || [];

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
      // Check if the vision model supports vision capabilities
      if (!VISION_SUPPORTED_MODELS.includes(this.visionModel)) {
        throw new Error(
          `Model ${this.visionModel} does not support vision capabilities.`,
        );
      }

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
   * Process chat messages with tools
   * @param messages Array of messages to send
   * @returns Tool chat completion
   */
  async chatOnce(
    messages: Message[],
    stream = true,
    onPartialResponse: (text: string) => void = () => {},
  ): Promise<ToolChatCompletion> {
    const res = await this.callOpenAI(messages, this.model, stream);

    if (stream) {
      return this.parseStream(res, onPartialResponse);
    }

    return this.parseOneShot(await res.json());
  }

  /**
   * Process vision chat messages with tools
   * @param messages Array of messages to send (including images)
   * @returns Tool chat completion
   */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean = false,
    onPartialResponse: (text: string) => void = () => {},
  ): Promise<ToolChatCompletion> {
    const res = await this.callOpenAI(messages, this.visionModel, stream);
    return stream
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
  }

  private async callOpenAI(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean = false,
  ): Promise<Response> {
    const body = {
      model,
      messages,
      stream,
      ...(this.tools.length
        ? {
            tools: this.tools.map((t) => ({
              type: 'function',
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })),
            tool_choice: 'auto',
          }
        : {}),
    };

    const res = await fetch(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API, {
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
}

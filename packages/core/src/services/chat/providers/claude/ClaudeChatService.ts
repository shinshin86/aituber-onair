import { ChatService } from '../../ChatService';
import {
  CoreToolChatBlock,
  Message,
  MessageWithVision,
  ToolChatBlock,
  ToolChatCompletion,
  ToolDefinition,
} from '../../../../types';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_3_HAIKU,
  CLAUDE_VISION_SUPPORTED_MODELS,
} from '../../../../constants';

export interface ClaudeToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

type ClaudeToolChatBlock = CoreToolChatBlock;
type ClaudeCompletion = ToolChatCompletion<ClaudeToolChatBlock>;

/**
 * Claude implementation of ChatService
 */
export class ClaudeChatService implements ChatService {
  /** Provider name */
  readonly provider: string = 'claude';

  private apiKey: string;
  private model: string;
  private visionModel: string;
  private tools: ToolDefinition[];

  /**
   * Constructor
   * @param apiKey Anthropic API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   * @param tools Array of tool definitions
   */
  constructor(
    apiKey: string,
    model: string = MODEL_CLAUDE_3_HAIKU,
    visionModel: string = MODEL_CLAUDE_3_HAIKU,
    tools: ToolDefinition[] = [],
  ) {
    this.apiKey = apiKey;
    this.model = model || MODEL_CLAUDE_3_HAIKU;
    this.visionModel = visionModel || MODEL_CLAUDE_3_HAIKU;
    this.tools = tools;
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
      const res = await this.callClaude(messages, this.model, true);
      const full = await this.parsePureStream(res, onPartialResponse);
      await onCompleteResponse(full);
      return;
    }

    // use tools
    const { blocks, stop_reason } = await this.chatOnce(
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

    /* if tool_use, throw error */
    throw new Error(
      'processChat received tool_calls. ChatProcessor must use chatOnce() loop when tools are enabled.',
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
    if (!CLAUDE_VISION_SUPPORTED_MODELS.includes(this.visionModel)) {
      throw new Error(
        `Model ${this.visionModel} does not support vision capabilities.`,
      );
    }

    /* same branch logic for vision */
    if (this.tools.length === 0) {
      const res = await this.callClaude(messages, this.visionModel, true);
      const full = await this.parsePureStream(res, onPartialResponse);
      await onCompleteResponse(full);
      return;
    }

    const { blocks, stop_reason } = await this.visionChatOnce(messages); // non-stream (tools only)

    if (stop_reason === 'end') {
      const full = blocks
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      await onCompleteResponse(full);
      return;
    }

    throw new Error(
      'processVisionChat received tool_calls. ChatProcessor must use chatOnce() loop when tools are enabled.',
    );
  }

  /**
   * Convert AITuber OnAir messages to Claude format
   * @param messages Array of messages
   * @returns Claude formatted messages
   */
  private convertMessagesToClaudeFormat(messages: Message[]): any[] {
    return messages.map((msg) => {
      return {
        role: this.mapRoleToClaude(msg.role),
        content: msg.content,
      };
    });
  }

  /**
   * Convert AITuber OnAir vision messages to Claude format
   * @param messages Array of vision messages
   * @returns Claude formatted vision messages
   */
  private convertVisionMessagesToClaudeFormat(
    messages: MessageWithVision[],
  ): any[] {
    return messages.map((msg) => {
      // If message content is a string, create a text-only message
      if (typeof msg.content === 'string') {
        return {
          role: this.mapRoleToClaude(msg.role),
          content: [
            {
              type: 'text',
              text: msg.content,
            },
          ],
        };
      }

      // If message content is an array of blocks, convert each block
      if (Array.isArray(msg.content)) {
        const content = msg.content
          .map((block) => {
            if (block.type === 'image_url') {
              // check if the image url is a data url
              if (block.image_url.url.startsWith('data:')) {
                const m = block.image_url.url.match(
                  /^data:([^;]+);base64,(.+)$/,
                );
                if (m) {
                  return {
                    type: 'image',
                    source: { type: 'base64', media_type: m[1], data: m[2] },
                  };
                }
                return null;
              }

              // if the image url is a normal url
              return {
                type: 'image',
                source: {
                  type: 'url',
                  url: block.image_url.url,
                  media_type: this.getMimeTypeFromUrl(block.image_url.url),
                },
              };
            }
            return block;
          })
          .filter((b) => b);

        return {
          role: this.mapRoleToClaude(msg.role),
          content,
        };
      }

      return {
        role: this.mapRoleToClaude(msg.role),
        content: [],
      };
    });
  }

  /**
   * Map AITuber OnAir roles to Claude roles
   * @param role AITuber OnAir role
   * @returns Claude role
   */
  private mapRoleToClaude(role: string): string {
    switch (role) {
      case 'system':
        // Claude handles system messages separately, but we'll map it anyway
        return 'system';
      case 'user':
        return 'user';
      case 'assistant':
        return 'assistant';
      default:
        return 'user';
    }
  }

  /**
   * Get MIME type from URL
   * @param url Image URL
   * @returns MIME type
   */
  private getMimeTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Call Claude API
   * @param messages Array of messages to send
   * @param model Model name
   * @param stream Whether to stream the response
   * @returns Response
   */
  private async callClaude(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean,
  ): Promise<Response> {
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const content = messages.filter((m) => m.role !== 'system');

    const hasVision = content.some(
      (m) =>
        Array.isArray((m as any).content) &&
        (m as any).content.some(
          (b: any) => b.type === 'image_url' || b.type === 'image',
        ),
    );

    const body: any = {
      model,
      system,
      messages: hasVision
        ? this.convertVisionMessagesToClaudeFormat(
            content as MessageWithVision[],
          )
        : this.convertMessagesToClaudeFormat(content as Message[]),
      stream,
      max_tokens: 1000,
    };

    if (this.tools.length) {
      body.tools = this.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));

      body.tool_choice = { type: 'auto' };
    }

    const res = await fetch(ENDPOINT_CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(await res.text());
    return res;
  }

  /**
   * Parse stream response
   * @param res Response
   * @param onPartial Callback to receive each part of streaming response
   * @returns ToolChatCompletion
   */
  private async parseStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<ClaudeCompletion> {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();

    const textBlocks: ToolChatBlock[] = [];
    const toolCalls = new Map<
      number,
      { id: string; name: string; args: string }
    >();

    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (payload === '[DONE]') break;

        const ev = JSON.parse(payload);

        /* content delta */
        if (ev.type === 'content_block_delta' && ev.delta?.text) {
          onPartial(ev.delta.text);
          textBlocks.push({ type: 'text', text: ev.delta.text });
        }
        /* tool_call delta */
        if (
          ev.type === 'content_block_start' &&
          ev.content_block?.type === 'tool_use'
        ) {
          toolCalls.set(ev.index, {
            id: ev.content_block.id,
            name: ev.content_block.name,
            args: '',
          });
        } else if (
          ev.type === 'content_block_start' && // case of non-stream
          ev.content_block?.type === 'tool_result'
        ) {
          textBlocks.push({
            type: 'tool_result',
            tool_use_id: ev.content_block.tool_use_id,
            content: ev.content_block.content ?? '',
          });
        }

        /* case of input_json_delta */
        if (
          ev.type === 'content_block_delta' &&
          ev.delta?.type === 'input_json_delta'
        ) {
          const entry = toolCalls.get(ev.index);
          if (entry) entry.args += ev.delta.partial_json || '';
        }

        /* case of content_block_stop */
        if (ev.type === 'content_block_stop' && toolCalls.has(ev.index)) {
          const { id, name, args } = toolCalls.get(ev.index)!;
          textBlocks.push({
            type: 'tool_use',
            id,
            name,
            input: JSON.parse(args || '{}'),
          });
          toolCalls.delete(ev.index);
        }
      }
    }

    return {
      blocks: textBlocks,
      stop_reason: textBlocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    };
  }

  private async parsePureStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<string> {
    const { blocks } = await this.parseStream(res, onPartial);
    return blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }

  private parseOneShot(data: any): ClaudeCompletion {
    const blocks: ClaudeToolChatBlock[] = [];

    (data.content ?? []).forEach((c: any) => {
      if (c.type === 'text') {
        blocks.push({ type: 'text', text: c.text });
      } else if (c.type === 'tool_use') {
        blocks.push({
          type: 'tool_use',
          id: c.id,
          name: c.name,
          input: c.input ?? {},
        });
      } else if (c.type === 'tool_result') {
        blocks.push({
          type: 'tool_result',
          tool_use_id: c.tool_use_id,
          content: c.content ?? '',
        });
      }
    });

    return {
      blocks,
      stop_reason: blocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    };
  }

  /**
   * Process chat messages
   * @param messages Array of messages to send
   * @param stream Whether to stream the response
   * @param onPartial Callback to receive each part of streaming response
   * @returns ToolChatCompletion
   */
  async chatOnce(
    messages: Message[],
    stream = true,
    onPartial: (t: string) => void = () => {},
  ): Promise<ClaudeCompletion> {
    const res = await this.callClaude(messages, this.model, stream);

    if (stream) {
      return this.parseStream(res, onPartial);
    }
    return this.parseOneShot(await res.json());
  }

  /**
   * Process vision chat messages
   * @param messages Array of messages to send
   * @returns ToolChatCompletion
   */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream = false,
    onPartial: (t: string) => void = () => {},
  ): Promise<ClaudeCompletion> {
    const res = await this.callClaude(messages, this.visionModel, stream);

    if (stream) {
      return this.parseStream(res, onPartial);
    }

    return this.parseOneShot(await res.json());
  }
}

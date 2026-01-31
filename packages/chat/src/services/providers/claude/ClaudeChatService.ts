import { ChatService } from '../../ChatService';
import {
  CoreToolChatBlock,
  Message,
  MessageWithVision,
  ToolChatCompletion,
  ToolDefinition,
  MCPServerConfig,
  ClaudeMCPToolUseBlock,
  ClaudeMCPToolResultBlock,
} from '../../../types';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_3_HAIKU,
  CLAUDE_VISION_SUPPORTED_MODELS,
} from '../../../constants';
import {
  ChatResponseLength,
  getMaxTokensForResponseLength,
} from '../../../constants/chat';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';
import { processChatWithOptionalTools } from '../../../utils';

export interface ClaudeToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

type ClaudeToolChatBlock =
  | CoreToolChatBlock
  | ClaudeMCPToolUseBlock
  | ClaudeMCPToolResultBlock;
// type ClaudeCompletion = ToolChatCompletion<ClaudeToolChatBlock>;

// Internal extended completion type for MCP support
type ClaudeInternalCompletion = {
  blocks: ClaudeToolChatBlock[];
  stop_reason: 'tool_use' | 'end';
};

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
  private mcpServers: MCPServerConfig[];
  private responseLength?: ChatResponseLength;

  /**
   * Constructor
   * @param apiKey Anthropic API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   * @param tools Array of tool definitions
   * @param mcpServers Array of MCP server configurations (optional)
   * @throws Error if the vision model doesn't support vision capabilities
   */
  constructor(
    apiKey: string,
    model: string = MODEL_CLAUDE_3_HAIKU,
    visionModel: string = MODEL_CLAUDE_3_HAIKU,
    tools: ToolDefinition[] = [],
    mcpServers: MCPServerConfig[] = [],
    responseLength?: ChatResponseLength,
  ) {
    this.apiKey = apiKey;
    this.model = model || MODEL_CLAUDE_3_HAIKU;
    this.visionModel = visionModel || MODEL_CLAUDE_3_HAIKU;
    this.tools = tools;
    this.mcpServers = mcpServers;
    this.responseLength = responseLength;

    // Validate vision model supports vision capabilities
    if (!CLAUDE_VISION_SUPPORTED_MODELS.includes(this.visionModel)) {
      throw new Error(
        `Model ${this.visionModel} does not support vision capabilities.`,
      );
    }
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
   * Get configured MCP servers
   * @returns Array of MCP server configurations
   */
  getMCPServers(): MCPServerConfig[] {
    return this.mcpServers;
  }

  /**
   * Add MCP server configuration
   * @param serverConfig MCP server configuration
   */
  addMCPServer(serverConfig: MCPServerConfig): void {
    this.mcpServers.push(serverConfig);
  }

  /**
   * Remove MCP server by name
   * @param serverName Name of the server to remove
   */
  removeMCPServer(serverName: string): void {
    this.mcpServers = this.mcpServers.filter(
      (server) => server.name !== serverName,
    );
  }

  /**
   * Check if MCP servers are configured
   * @returns True if MCP servers are configured
   */
  hasMCPServers(): boolean {
    return this.mcpServers.length > 0;
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
      hasTools: this.tools.length > 0 || this.mcpServers.length > 0,
      runWithoutTools: async () => {
        const res = await this.callClaude(messages, this.model, true);
        return this.parsePureStream(res, onPartialResponse);
      },
      runWithTools: () => this.chatOnce(messages, true, onPartialResponse),
      onCompleteResponse,
      toolErrorMessage:
        'processChat received tool_calls. ChatProcessor must use chatOnce() loop when tools are enabled.',
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
    await processChatWithOptionalTools({
      hasTools: this.tools.length > 0 || this.mcpServers.length > 0,
      runWithoutTools: async () => {
        const res = await this.callClaude(messages, this.visionModel, true);
        return this.parsePureStream(res, onPartialResponse);
      },
      runWithTools: () => this.visionChatOnce(messages),
      onCompleteResponse,
      toolErrorMessage:
        'processVisionChat received tool_calls. ChatProcessor must use chatOnce() loop when tools are enabled.',
    });
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
   * @param maxTokens Maximum tokens for response (optional)
   * @returns Response
   */
  private async callClaude(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream: boolean,
    maxTokens?: number,
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
      max_tokens:
        maxTokens !== undefined
          ? maxTokens
          : getMaxTokensForResponseLength(this.responseLength),
    };

    if (this.tools.length) {
      body.tools = this.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));

      body.tool_choice = { type: 'auto' };
    }

    // Add MCP servers if configured
    if (this.mcpServers.length > 0) {
      body.mcp_servers = this.mcpServers;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };

    // Add beta header if MCP servers are configured
    if (this.mcpServers.length > 0) {
      headers['anthropic-beta'] = 'mcp-client-2025-04-04';
    }

    const res = await ChatServiceHttpClient.post(
      ENDPOINT_CLAUDE_API,
      body,
      headers,
    );
    return res;
  }

  /**
   * Parse stream response
   * @param res Response
   * @param onPartial Callback to receive each part of streaming response
   * @returns ClaudeInternalCompletion
   */
  private async parseStream(
    res: Response,
    onPartial: (t: string) => void,
  ): Promise<ClaudeInternalCompletion> {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();

    const textBlocks: ClaudeToolChatBlock[] = [];
    const toolCalls = new Map<
      number,
      { id: string; name: string; args: string; server_name?: string }
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
          ev.type === 'content_block_start' &&
          ev.content_block?.type === 'mcp_tool_use'
        ) {
          // Handle MCP tool use
          toolCalls.set(ev.index, {
            id: ev.content_block.id,
            name: ev.content_block.name,
            args: '',
            server_name: ev.content_block.server_name,
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
        } else if (
          ev.type === 'content_block_start' &&
          ev.content_block?.type === 'mcp_tool_result'
        ) {
          // Handle MCP tool result
          textBlocks.push({
            type: 'mcp_tool_result',
            tool_use_id: ev.content_block.tool_use_id,
            is_error: ev.content_block.is_error ?? false,
            content: ev.content_block.content ?? [],
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
          const { id, name, args, server_name } = toolCalls.get(ev.index)!;
          if (server_name) {
            // MCP tool use
            textBlocks.push({
              type: 'mcp_tool_use',
              id,
              name,
              server_name,
              input: JSON.parse(args || '{}'),
            });
          } else {
            // Standard tool use
            textBlocks.push({
              type: 'tool_use',
              id,
              name,
              input: JSON.parse(args || '{}'),
            });
          }
          toolCalls.delete(ev.index);
        }
      }
    }

    return {
      blocks: textBlocks,
      stop_reason: textBlocks.some(
        (b) => b.type === 'tool_use' || b.type === 'mcp_tool_use',
      )
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

  private parseOneShot(data: any): ClaudeInternalCompletion {
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
      } else if (c.type === 'mcp_tool_use') {
        blocks.push({
          type: 'mcp_tool_use',
          id: c.id,
          name: c.name,
          server_name: c.server_name,
          input: c.input ?? {},
        });
      } else if (c.type === 'tool_result') {
        blocks.push({
          type: 'tool_result',
          tool_use_id: c.tool_use_id,
          content: c.content ?? '',
        });
      } else if (c.type === 'mcp_tool_result') {
        blocks.push({
          type: 'mcp_tool_result',
          tool_use_id: c.tool_use_id,
          is_error: c.is_error ?? false,
          content: c.content ?? [],
        });
      }
    });

    return {
      blocks,
      stop_reason: blocks.some(
        (b) => b.type === 'tool_use' || b.type === 'mcp_tool_use',
      )
        ? 'tool_use'
        : 'end',
    };
  }

  /**
   * Process chat messages
   * @param messages Array of messages to send
   * @param stream Whether to stream the response
   * @param onPartial Callback to receive each part of streaming response
   * @param maxTokens Maximum tokens for response (optional)
   * @returns ToolChatCompletion
   */
  async chatOnce(
    messages: Message[],
    stream: boolean = true,
    onPartial: (t: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callClaude(messages, this.model, stream, maxTokens);
    const internalResult = stream
      ? await this.parseStream(res, onPartial)
      : this.parseOneShot(await res.json());

    // Convert ClaudeInternalCompletion to ToolChatCompletion for compatibility
    return this.convertToStandardCompletion(internalResult);
  }

  /**
   * Process vision chat messages
   * @param messages Array of messages to send
   * @param stream Whether to stream the response
   * @param onPartial Callback to receive each part of streaming response
   * @param maxTokens Maximum tokens for response (optional)
   * @returns ToolChatCompletion
   */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean = false,
    onPartial: (t: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callClaude(
      messages,
      this.visionModel,
      stream,
      maxTokens,
    );
    const internalResult = stream
      ? await this.parseStream(res, onPartial)
      : this.parseOneShot(await res.json());

    // Convert ClaudeInternalCompletion to ToolChatCompletion for compatibility
    return this.convertToStandardCompletion(internalResult);
  }

  /**
   * Convert internal completion to standard ToolChatCompletion
   * @param completion Internal completion result
   * @returns Standard ToolChatCompletion
   */
  private convertToStandardCompletion(
    completion: ClaudeInternalCompletion,
  ): ToolChatCompletion {
    // Filter out MCP-specific blocks and convert to standard format
    const standardBlocks = completion.blocks.filter(
      (block): block is CoreToolChatBlock => {
        return (
          block.type === 'text' ||
          block.type === 'tool_use' ||
          block.type === 'tool_result'
        );
      },
    );

    return {
      blocks: standardBlocks,
      stop_reason: completion.stop_reason,
    };
  }
}

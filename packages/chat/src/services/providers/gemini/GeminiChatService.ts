import { ChatService } from '../../ChatService';
import {
  Message,
  MessageWithVision,
  ToolChatBlock,
  ToolChatCompletion,
  ToolDefinition,
  MCPServerConfig,
} from '../../../types';
import {
  ENDPOINT_GEMINI_API,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_1_FLASH_LITE,
  GEMINI_VISION_SUPPORTED_MODELS,
} from '../../../constants';
import {
  ChatResponseLength,
  getMaxTokensForResponseLength,
} from '../../../constants/chat';
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';
import { MCPSchemaFetcher } from '../../../utils/mcpSchemaFetcher';
import { processChatWithOptionalTools } from '../../../utils';
import {
  convertMessagesToGeminiFormat,
  convertVisionMessagesToGeminiFormat,
} from './geminiMessageConverter';
import {
  buildGeminiToolConfig,
  createFallbackMCPToolSchemas,
} from './geminiToolAdapter';

/**
 * Gemini implementation of ChatService
 */
export class GeminiChatService implements ChatService {
  /** Provider name */
  readonly provider: string = 'gemini';

  private apiKey: string;
  private model: string;
  private visionModel: string;
  private tools: ToolDefinition[];
  private mcpServers: MCPServerConfig[];
  private mcpToolSchemas: ToolDefinition[] = [];
  private mcpSchemasInitialized: boolean = false;
  private responseLength?: ChatResponseLength;

  /** id(OpenAI) → name(Gemini) mapping */
  private callIdMap = new Map<string, string>();

  private isGemma4Model(model: string): boolean {
    return /^gemma-4-/.test(model);
  }

  private shouldMinimizeThinking(model: string): boolean {
    return model === MODEL_GEMINI_3_5_FLASH || this.isGemma4Model(model);
  }

  private shouldExposeTextPart(part: any, model: string): boolean {
    if (!part.text) return false;

    // Gemma 4 can emit thought parts as regular text blocks.
    // Hide those blocks from user-visible output while leaving other Gemini
    // model families unchanged for now.
    if (this.isGemma4Model(model) && part.thought === true) {
      return false;
    }

    return true;
  }

  /**
   * camelCase → snake_case conversion (v1beta)
   */
  private adaptKeysForApi(obj: any): any {
    const map: Record<string, string> = {
      toolConfig: 'tool_config',
      functionCallingConfig: 'function_calling_config',
      functionDeclarations: 'function_declarations',
      functionCall: 'function_call',
      functionResponse: 'function_response',
    };
    if (Array.isArray(obj)) return obj.map((v) => this.adaptKeysForApi(v));
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          map[k] ?? k,
          this.adaptKeysForApi(v),
        ]),
      );
    }
    return obj;
  }

  /**
   * Constructor
   * @param apiKey Google API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   * @param tools Array of tool definitions
   * @param mcpServers Array of MCP server configurations
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GEMINI_3_1_FLASH_LITE,
    visionModel: string = MODEL_GEMINI_3_1_FLASH_LITE,
    tools: ToolDefinition[] = [],
    mcpServers: MCPServerConfig[] = [],
    responseLength?: ChatResponseLength,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.responseLength = responseLength;

    // check if the vision model is supported
    if (!GEMINI_VISION_SUPPORTED_MODELS.includes(visionModel)) {
      throw new Error(
        `Model ${visionModel} does not support vision capabilities.`,
      );
    }
    this.visionModel = visionModel;
    this.tools = tools;
    this.mcpServers = mcpServers;
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
    // Reset initialization flag to re-fetch schemas
    this.mcpSchemasInitialized = false;
  }

  /**
   * Remove MCP server by name
   * @param serverName Name of the server to remove
   */
  removeMCPServer(serverName: string): void {
    this.mcpServers = this.mcpServers.filter(
      (server) => server.name !== serverName,
    );
    // Reset initialization flag to re-fetch schemas
    this.mcpSchemasInitialized = false;
  }

  /**
   * Check if MCP servers are configured
   * @returns True if MCP servers are configured
   */
  hasMCPServers(): boolean {
    return this.mcpServers.length > 0;
  }

  /**
   * Initialize MCP tool schemas by fetching from servers
   * @private
   */
  private async initializeMCPSchemas(): Promise<void> {
    if (this.mcpSchemasInitialized || this.mcpServers.length === 0) {
      return;
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MCP schema fetch timeout')), 5000),
      );

      const schemasPromise = MCPSchemaFetcher.fetchAllToolSchemas(
        this.mcpServers,
      );
      this.mcpToolSchemas = await Promise.race([
        schemasPromise,
        timeoutPromise,
      ]);
      this.mcpSchemasInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize MCP schemas, using fallback:', error);
      this.mcpToolSchemas = createFallbackMCPToolSchemas(this.mcpServers);
      this.mcpSchemasInitialized = true;
    }
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
    try {
      await processChatWithOptionalTools({
        hasTools: this.tools.length > 0 || this.mcpServers.length > 0,
        runWithoutTools: async () => {
          const res = await this.callGemini(messages, this.model, true);
          const { blocks } = await this.parseStream(
            res,
            onPartialResponse,
            this.model,
          );
          return StreamTextAccumulator.getFullText(blocks);
        },
        runWithTools: () => this.chatOnce(messages, true, onPartialResponse),
        onCompleteResponse,
        toolErrorMessage:
          'Received functionCall. Use chatOnce() loop when tools are enabled.',
      });
    } catch (err) {
      console.error('Error in processChat:', err);
      throw err;
    }
  }

  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    try {
      await processChatWithOptionalTools({
        hasTools: this.tools.length > 0 || this.mcpServers.length > 0,
        runWithoutTools: async () => {
          const res = await this.callGemini(messages, this.visionModel, true);
          const { blocks } = await this.parseStream(
            res,
            onPartialResponse,
            this.visionModel,
          );
          return StreamTextAccumulator.getFullText(blocks);
        },
        runWithTools: () => this.visionChatOnce(messages),
        onToolBlocks: (blocks) => {
          blocks
            .filter(
              (b): b is { type: 'text'; text: string } => b.type === 'text',
            )
            .forEach((b) => onPartialResponse(b.text));
        },
        onCompleteResponse,
        toolErrorMessage:
          'Received functionCall. Use visionChatOnce() loop when tools are enabled.',
      });
    } catch (err) {
      console.error('Error in processVisionChat:', err);
      throw err;
    }
  }

  /* ────────────────────────────────── */
  /*  HTTP call                           */
  /* ────────────────────────────────── */
  private async callGemini(
    messages: (Message | MessageWithVision)[],
    model: string,
    stream = false,
    maxTokens?: number,
  ): Promise<Response> {
    const hasVision = messages.some(
      (m) =>
        Array.isArray((m as any).content) &&
        (m as any).content.some(
          (b: any) => b?.type === 'image_url' || b?.inlineData,
        ),
    );
    const contents = hasVision
      ? await convertVisionMessagesToGeminiFormat(
          messages as MessageWithVision[],
          {
            callIdMap: this.callIdMap,
          },
        )
      : convertMessagesToGeminiFormat(messages as Message[], {
          callIdMap: this.callIdMap,
        });

    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens:
          maxTokens !== undefined
            ? maxTokens
            : getMaxTokensForResponseLength(this.responseLength),
      },
    };

    if (this.shouldMinimizeThinking(model)) {
      body.generationConfig.thinkingConfig = {
        includeThoughts: false,
        thinkingLevel: 'MINIMAL',
      };
    }
    let activeMCPToolSchemas: ToolDefinition[] = [];
    if (this.mcpServers.length > 0) {
      try {
        await this.initializeMCPSchemas();
        activeMCPToolSchemas = this.mcpToolSchemas;
      } catch (error) {
        console.warn('MCP initialization failed, skipping MCP tools:', error);
      }
    }

    const toolConfig = buildGeminiToolConfig(this.tools, activeMCPToolSchemas);
    if (toolConfig) {
      Object.assign(body, toolConfig);
    }

    const fetchOnce = async (
      ver: 'v1' | 'v1beta',
      payload: any,
    ): Promise<Response> => {
      const fn = stream ? 'streamGenerateContent' : 'generateContent';
      const alt = stream ? '?alt=sse' : '';
      const url = `${ENDPOINT_GEMINI_API}/${ver}/models/${model}:${fn}${alt}${alt ? '&' : '?'}key=${this.apiKey}`;
      return ChatServiceHttpClient.post(url, payload);
    };

    const isLite = /flash[-_]lite/.test(model);
    const isGemma4 = this.isGemma4Model(model);
    const isGemini25 = /gemini-2\.5/.test(model);
    const isGemini3 = /^gemini-3(?:\.[0-9]+)?-/.test(model);
    const requiresV1beta = isLite || isGemma4 || isGemini25 || isGemini3;
    const firstVer: 'v1' | 'v1beta' = requiresV1beta ? 'v1beta' : 'v1';

    const tryApi = async (): Promise<Response> => {
      try {
        const payload = firstVer === 'v1' ? body : this.adaptKeysForApi(body); // snake_case conversion
        return await fetchOnce(firstVer, payload);
      } catch (e: any) {
        // Retry with v1beta when a v1 request looks unsupported for this model.
        const looksLikeVersionMismatch =
          /Unknown name|Cannot find field|404/.test(e?.message || '') ||
          e?.status === 404;
        if (!requiresV1beta && looksLikeVersionMismatch) {
          try {
            return await fetchOnce('v1beta', this.adaptKeysForApi(body));
          } catch (fallbackError) {
            if (fallbackError instanceof Error) {
              (fallbackError as Error & { cause?: unknown }).cause = e;
            }
            throw fallbackError;
          }
        }
        throw e; // otherwise, throw to upper layer
      }
    };

    try {
      const res = await tryApi();
      return res;
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (error.body) {
        console.error('Gemini API Error Details:', error.body);
        console.error('Request Body:', JSON.stringify(body, null, 2));
      }
      throw error;
    }
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Convert NDJSON stream to common format             */
  /* ────────────────────────────────────────────────────────── */
  private async parseStream(
    res: Response,
    onPartial: (chunk: string) => void,
    model: string,
  ): Promise<ToolChatCompletion> {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();

    const textBlocks: ToolChatBlock[] = [];
    const toolBlocks: ToolChatBlock[] = [];
    let buf = '';

    const flush = (payload: string) => {
      if (!payload || payload === '[DONE]') return;
      let obj: any;
      try {
        obj = JSON.parse(payload);
      } catch {
        return;
      }

      for (const cand of obj.candidates ?? []) {
        for (const part of cand.content?.parts ?? []) {
          if (this.shouldExposeTextPart(part, model)) {
            onPartial(part.text);
            StreamTextAccumulator.addTextBlock(textBlocks, part.text);
          }
          if (part.functionCall) {
            toolBlocks.push({
              type: 'tool_use',
              id: this.genUUID(),
              name: part.functionCall.name,
              input: part.functionCall.args ?? {},
            });
          }
          if (part.functionResponse) {
            toolBlocks.push({
              type: 'tool_result',
              tool_use_id: part.functionResponse.name,
              content: JSON.stringify(part.functionResponse.response),
            });
          }
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1); // CRLF support
        if (!line.trim()) {
          flush('');
          continue;
        } // keep-alive empty line

        if (line.startsWith('data:')) line = line.slice(5).trim();
        if (!line) continue;

        flush(line);
      }
    }
    if (buf) flush(buf);

    const blocks = [...textBlocks, ...toolBlocks];
    return {
      blocks,
      stop_reason: toolBlocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    };
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Convert JSON of non-stream (= generateContent)        */
  /* ────────────────────────────────────────────────────────── */
  private parseOneShot(data: any, model: string): ToolChatCompletion {
    const textBlocks: ToolChatBlock[] = [];
    const toolBlocks: ToolChatBlock[] = [];

    for (const cand of data.candidates ?? []) {
      for (const part of cand.content?.parts ?? []) {
        if (this.shouldExposeTextPart(part, model)) {
          textBlocks.push({ type: 'text', text: part.text });
        }
        if (part.functionCall) {
          toolBlocks.push({
            type: 'tool_use',
            id: this.genUUID(),
            name: part.functionCall.name,
            input: part.functionCall.args ?? {},
          });
        }
        if (part.functionResponse) {
          toolBlocks.push({
            type: 'tool_result',
            tool_use_id: part.functionResponse.name,
            content: JSON.stringify(part.functionResponse.response),
          });
        }
      }
    }

    const blocks = [...textBlocks, ...toolBlocks];
    return {
      blocks,
      stop_reason: toolBlocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    };
  }

  /* ────────────────────────────────────────────────────────── */
  /*  chatOnce (text)                                       */
  /* ────────────────────────────────────────────────────────── */

  async chatOnce(
    messages: Message[],
    stream: boolean = true,
    onPartialResponse: (t: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callGemini(messages, this.model, stream, maxTokens);
    return stream
      ? this.parseStream(res, onPartialResponse, this.model)
      : this.parseOneShot(await res.json(), this.model);
  }

  /* ────────────────────────────────────────────────────────── */
  /*  visionChatOnce (images)                               */
  /* ────────────────────────────────────────────────────────── */
  async visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean = false,
    onPartialResponse: (t: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const res = await this.callGemini(
      messages,
      this.visionModel,
      stream,
      maxTokens,
    );
    return stream
      ? this.parseStream(res, onPartialResponse, this.visionModel)
      : this.parseOneShot(await res.json(), this.visionModel);
  }

  /* ────────────────────────────────────────────────────────── */
  /*  UUID helper                                           */
  /* ────────────────────────────────────────────────────────── */
  private genUUID(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  }
}

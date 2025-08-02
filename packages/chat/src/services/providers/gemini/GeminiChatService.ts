import { ChatService } from '../../ChatService';
import {
  Message,
  MessageWithVision,
  ToolChatBlock,
  ToolChatCompletion,
  ToolDefinition,
} from '../../../types';
import {
  ENDPOINT_GEMINI_API,
  MODEL_GEMINI_2_0_FLASH_LITE,
  GEMINI_VISION_SUPPORTED_MODELS,
  DEFAULT_MAX_TOKENS,
} from '../../../constants';
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';

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

  /** id(OpenAI) → name(Gemini) mapping */
  private callIdMap = new Map<string, string>();

  /* ────────────────────────────────── */
  /*  Utilities                           */
  /* ────────────────────────────────── */
  private safeJsonParse(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return str; // keep as string
    }
  }

  private normalizeToolResult(val: any) {
    if (val === null) return { content: null };
    if (typeof val === 'object') return val;
    return { content: val }; // wrap primitive
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
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GEMINI_2_0_FLASH_LITE,
    visionModel: string = MODEL_GEMINI_2_0_FLASH_LITE,
    tools: ToolDefinition[] = [],
  ) {
    this.apiKey = apiKey;
    this.model = model;

    // check if the vision model is supported
    if (!GEMINI_VISION_SUPPORTED_MODELS.includes(visionModel)) {
      throw new Error(
        `Model ${visionModel} does not support vision capabilities.`,
      );
    }
    this.visionModel = visionModel;
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
    try {
      // not use tools
      if (this.tools.length === 0) {
        const res = await this.callGemini(messages, this.model, true);
        const { blocks } = await this.parseStream(res, onPartialResponse);
        const full = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        await onCompleteResponse(full);
        return;
      }

      /* with tools (1 turn) */
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
      throw new Error(
        'Received functionCall. Use chatOnce() loop when tools are enabled.',
      );
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
      if (this.tools.length === 0) {
        const res = await this.callGemini(messages, this.visionModel, true);
        const { blocks } = await this.parseStream(res, onPartialResponse);
        const full = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        await onCompleteResponse(full);
        return;
      }

      const { blocks, stop_reason } = await this.visionChatOnce(messages);
      blocks
        .filter((b) => b.type === 'text')
        .forEach((b) => onPartialResponse(b.text!));
      if (stop_reason === 'end') {
        const full = blocks
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        await onCompleteResponse(full);
        return;
      }
      throw new Error(
        'Received functionCall. Use visionChatOnce() loop when tools are enabled.',
      );
    } catch (err) {
      console.error('Error in processVisionChat:', err);
      throw err;
    }
  }

  /* ────────────────────────────────── */
  /*  OpenAI → Gemini conversion         */
  /* ────────────────────────────────── */
  private convertMessagesToGeminiFormat(messages: Message[]): any[] {
    const gemini: any[] = [];
    let currentRole: string | null = null;
    let currentParts: any[] = [];

    const pushCurrent = () => {
      if (currentRole && currentParts.length) {
        gemini.push({ role: currentRole, parts: [...currentParts] });
        currentParts = [];
      }
    };

    for (const msg of messages) {
      const role = this.mapRoleToGemini(msg.role);

      /* assistant: tool_calls -> functionCall */
      if ((msg as any).tool_calls) {
        pushCurrent();
        for (const call of (msg as any).tool_calls) {
          this.callIdMap.set(call.id, call.function.name);
          gemini.push({
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: call.function.name,
                  args: JSON.parse(call.function.arguments || '{}'),
                },
              },
            ],
          });
        }
        continue;
      }

      /* tool → functionResponse */
      if (msg.role === 'tool') {
        pushCurrent();
        const funcName =
          (msg as any).name ??
          this.callIdMap.get((msg as any).tool_call_id) ??
          'result';
        gemini.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: funcName,
                response: this.normalizeToolResult(
                  this.safeJsonParse(msg.content),
                ),
              },
            },
          ],
        });
        continue;
      }

      /* normal text */
      if (role !== currentRole) pushCurrent();
      currentRole = role;
      currentParts.push({ text: msg.content });
    }
    pushCurrent();
    return gemini;
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
      ? await this.convertVisionMessagesToGeminiFormat(
          messages as MessageWithVision[],
        )
      : this.convertMessagesToGeminiFormat(messages as Message[]);

    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens:
          maxTokens !== undefined ? maxTokens : DEFAULT_MAX_TOKENS,
      },
    };
    if (this.tools.length) {
      body.tools = [
        {
          functionDeclarations: this.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
      body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
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
    const isGemini25 = /gemini-2\.5/.test(model);
    const firstVer: 'v1' | 'v1beta' = isLite || isGemini25 ? 'v1beta' : 'v1';

    const tryApi = async (): Promise<Response> => {
      try {
        const payload = firstVer === 'v1' ? body : this.adaptKeysForApi(body); // snake_case conversion
        return await fetchOnce(firstVer, payload);
      } catch (e: any) {
        // Only retry v1beta if camel/snake case mismatch error occurs in models that don't require v1beta
        if (
          !(isLite || isGemini25) &&
          /Unknown name|Cannot find field|404/.test(e.message)
        ) {
          return await fetchOnce('v1beta', this.adaptKeysForApi(body));
        }
        throw e; // otherwise, throw to upper layer
      }
    };

    const res = await tryApi();
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    return res;
  }

  /**
   * Convert AITuber OnAir vision messages to Gemini format
   * @param messages Array of vision messages
   * @returns Gemini formatted vision messages
   */
  private async convertVisionMessagesToGeminiFormat(
    messages: MessageWithVision[],
  ): Promise<any[]> {
    const geminiMessages = [];
    let currentRole = null;
    let currentParts = [];

    for (const msg of messages) {
      // Map AITuber OnAir roles to Gemini roles
      const role = this.mapRoleToGemini(msg.role);

      /* ----------- OpenAI compatible tool metadata ----------- */
      // assistant: { tool_calls:[{id,name,function:{arguments}}] }
      if ((msg as any).tool_calls) {
        for (const call of (msg as any).tool_calls) {
          // Gemini does not need id. Insert functionCall into parts
          geminiMessages.push({
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: call.function.name,
                  args: JSON.parse(call.function.arguments || '{}'),
                },
              },
            ],
          });
        }
        continue;
      }

      // tool role → user role + functionResponse
      if (msg.role === 'tool') {
        const funcName =
          (msg as any).name ??
          this.callIdMap.get((msg as any).tool_call_id) ??
          'result';
        geminiMessages.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: funcName,
                response: this.normalizeToolResult(
                  this.safeJsonParse(msg.content as string),
                ),
              },
            },
          ],
        });
        continue;
      }

      // If role changes, start a new message
      if (role !== currentRole && currentParts.length > 0) {
        geminiMessages.push({
          role: currentRole,
          parts: [...currentParts],
        });
        currentParts = [];
      }

      currentRole = role;

      // If the message has content blocks, process them
      if (typeof msg.content === 'string') {
        currentParts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Process each content block (text or image)
        for (const block of msg.content) {
          if (block.type === 'text') {
            currentParts.push({ text: block.text });
          } else if (block.type === 'image_url') {
            try {
              // Fetch the image data from URL
              const imageResponse = await ChatServiceHttpClient.get(
                block.image_url.url,
              );

              // Convert image to blob and then to base64
              const imageBlob = await imageResponse.blob();
              const base64Data = await this.blobToBase64(imageBlob);

              // Add image data in Gemini format
              currentParts.push({
                inlineData: {
                  mimeType: imageBlob.type || 'image/jpeg',
                  data: base64Data.split(',')[1], // Remove the "data:image/jpeg;base64," prefix
                },
              });
            } catch (error: any) {
              console.error('Error processing image:', error);
              throw new Error(`Failed to process image: ${error.message}`);
            }
          }
        }
      }
    }

    // Add the last message
    if (currentRole && currentParts.length > 0) {
      geminiMessages.push({
        role: currentRole,
        parts: [...currentParts],
      });
    }

    return geminiMessages;
  }

  /**
   * Convert Blob to Base64 string
   * @param blob Image blob
   * @returns Promise with base64 encoded string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Map AITuber OnAir roles to Gemini roles
   * @param role AITuber OnAir role
   * @returns Gemini role
   */
  private mapRoleToGemini(role: string): string {
    switch (role) {
      case 'system':
        return 'model'; // Gemini uses 'model' for system messages
      case 'user':
        return 'user';
      case 'assistant':
        return 'model';
      default:
        return 'user';
    }
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Convert NDJSON stream to common format             */
  /* ────────────────────────────────────────────────────────── */
  private async parseStream(
    res: Response,
    onPartial: (chunk: string) => void,
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
          if (part.text) {
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
  private parseOneShot(data: any): ToolChatCompletion {
    const textBlocks: ToolChatBlock[] = [];
    const toolBlocks: ToolChatBlock[] = [];

    for (const cand of data.candidates ?? []) {
      for (const part of cand.content?.parts ?? []) {
        if (part.text) {
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
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
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
      ? this.parseStream(res, onPartialResponse)
      : this.parseOneShot(await res.json());
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

import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import { ToolChatCompletion } from '../../../types/toolChat';
import {
  MODEL_GEMINI_NANO,
  GEMINI_NANO_MAX_CONTEXT_MESSAGES,
} from '../../../constants/geminiNano';
import { ChatResponseLength } from '../../../constants/chat';
import type { GeminiNanoChatServiceOptions } from '../ChatServiceProvider';

/**
 * LanguageModel API types (Chrome 138+ Prompt API).
 * Local type definitions — not global declarations.
 */
interface LanguageModelAPI {
  availability(options?: Record<string, unknown>): Promise<string>;
  create(options?: Record<string, unknown>): Promise<LanguageModelSession>;
}

interface LanguageModelSession {
  prompt(text: string): Promise<string>;
  destroy(): void;
}

/**
 * Get the LanguageModel API from the global scope.
 * Returns undefined in non-browser environments or unsupported browsers.
 */
function getLanguageModelAPI(): LanguageModelAPI | undefined {
  if (typeof globalThis !== 'undefined' && 'LanguageModel' in globalThis) {
    return (globalThis as any).LanguageModel as LanguageModelAPI;
  }
  return undefined;
}

/**
 * Gemini Nano implementation of ChatService.
 * Uses Chrome's built-in LanguageModel API (Prompt API, Chrome 138+).
 * Runs entirely in the browser — no API key or network required.
 */
export class GeminiNanoChatService implements ChatService {
  readonly provider: string = 'gemini-nano';

  private expectedInputLanguages: string[];
  private expectedOutputLanguages: string[];
  private _responseLength?: ChatResponseLength;

  constructor(options: GeminiNanoChatServiceOptions = {}) {
    this.expectedInputLanguages = options.expectedInputLanguages ?? ['ja'];
    this.expectedOutputLanguages = options.expectedOutputLanguages ?? ['ja'];
    this._responseLength = options.responseLength;
    void this._responseLength;
  }

  getModel(): string {
    return MODEL_GEMINI_NANO;
  }

  getVisionModel(): string {
    return MODEL_GEMINI_NANO;
  }

  /**
   * Process chat messages using Gemini Nano.
   * Non-streaming: calls onPartialResponse once with the full response,
   * then calls onCompleteResponse.
   */
  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    const response = await this.generateResponse(messages);
    onPartialResponse(response);
    await onCompleteResponse(response);
  }

  async processVisionChat(
    _messages: MessageWithVision[],
    _onPartialResponse: (text: string) => void,
    _onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    throw new Error('Gemini Nano does not support vision capabilities.');
  }

  async chatOnce(
    messages: Message[],
    _stream: boolean = false,
    onPartialResponse: (text: string) => void = () => {},
    _maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const response = await this.generateResponse(messages);
    onPartialResponse(response);

    return {
      blocks: [{ type: 'text', text: response }],
      stop_reason: 'end',
    };
  }

  async visionChatOnce(
    _messages: MessageWithVision[],
    _stream: boolean = false,
    _onPartialResponse: (text: string) => void = () => {},
    _maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    throw new Error('Gemini Nano does not support vision capabilities.');
  }

  /**
   * Core logic: extract system prompt, manage session, call prompt().
   */
  private async generateResponse(messages: Message[]): Promise<string> {
    const api = getLanguageModelAPI();
    if (!api) {
      throw new Error(
        'Gemini Nano is not available in this environment. ' +
          'Chrome 138+ with Prompt API enabled is required.',
      );
    }

    const availability = await api.availability();
    if (availability !== 'available' && availability !== 'downloadable') {
      throw new Error(
        'Gemini Nano Prompt API is not ready in this environment. ' +
          `LanguageModel.availability() returned "${availability}". ` +
          'Expected "available" or "downloadable".',
      );
    }

    // Extract system prompt
    const systemMessages = messages.filter((m) => m.role === 'system');
    const systemPrompt = systemMessages.map((m) => m.content).join('\n');

    // Get conversation messages (exclude system)
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .slice(-GEMINI_NANO_MAX_CONTEXT_MESSAGES);

    // Get the last user message to send via prompt()
    const lastUserMessage = [...conversationMessages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message found in the provided messages.');
    }

    const session = await this.createSession(
      api,
      systemPrompt,
      conversationMessages,
    );

    try {
      return await session.prompt(lastUserMessage.content);
    } finally {
      try {
        session.destroy();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Create a new LanguageModel session with system prompt and context history.
   * Context history (excluding the last user message) is embedded in the system prompt.
   */
  private async createSession(
    api: LanguageModelAPI,
    systemPrompt: string,
    contextHistory: Message[],
  ): Promise<LanguageModelSession> {
    let prompt = systemPrompt;

    // Embed conversation history into system prompt (exclude last user msg)
    const historyMessages = contextHistory.slice(0, -1);
    if (historyMessages.length > 0) {
      const history = historyMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      prompt +=
        '\n\n以下はこれまでの会話履歴です。この文脈を踏まえて回答してください:\n' +
        history;
    }

    return api.create({
      systemPrompt: prompt,
      expectedInputs: [
        { type: 'text', languages: this.expectedInputLanguages },
      ],
      expectedOutputs: [
        { type: 'text', languages: this.expectedOutputLanguages },
      ],
    });
  }
}

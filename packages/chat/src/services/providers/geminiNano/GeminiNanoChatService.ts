import { ChatService } from '../../ChatService';
import { Message, MessageWithVision } from '../../../types';
import { ToolChatCompletion } from '../../../types/toolChat';
import {
  MODEL_GEMINI_NANO,
  GEMINI_NANO_MAX_CONTEXT_MESSAGES,
} from '../../../constants/geminiNano';
import {
  CHAT_RESPONSE_LENGTH,
  type ChatResponseLength,
  MAX_TOKENS_BY_LENGTH,
} from '../../../constants/chat';
import type {
  GeminiNanoChatServiceOptions,
  GeminiNanoInitialPrompt,
} from '../ChatServiceProvider';

interface LanguageModelTextExpectation {
  type: 'text';
  languages: string[];
}

interface LanguageModelOptions {
  expectedInputs: LanguageModelTextExpectation[];
  expectedOutputs: LanguageModelTextExpectation[];
}

interface LanguageModelCreateOptions extends LanguageModelOptions {
  initialPrompts?: GeminiNanoInitialPrompt[];
}

/**
 * LanguageModel API types (Prompt API for web pages in Chrome 148+).
 * Local type definitions — not global declarations.
 */
interface LanguageModelAPI {
  availability(options?: LanguageModelOptions): Promise<string>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
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
 * Uses Chrome's built-in LanguageModel API (Prompt API, Chrome 148+ on web).
 * Runs entirely in the browser — no API key or network required.
 */
export class GeminiNanoChatService implements ChatService {
  readonly provider: string = 'gemini-nano';

  private expectedInputLanguages: string[];
  private expectedOutputLanguages: string[];
  private initialPrompts: GeminiNanoInitialPrompt[];
  private _responseLength?: ChatResponseLength;

  constructor(options: GeminiNanoChatServiceOptions = {}) {
    this.expectedInputLanguages = options.expectedInputLanguages ?? [
      'ja',
      'en',
    ];
    this.expectedOutputLanguages = options.expectedOutputLanguages ?? ['ja'];
    this.initialPrompts = (options.initialPrompts ?? []).map((prompt) => ({
      ...prompt,
    }));
    this._responseLength = options.responseLength;
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
          'Chrome 148+ on a supported desktop device is required for web pages.',
      );
    }

    const modelOptions = this.getModelOptions();
    const availability = await api.availability(modelOptions);
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
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-GEMINI_NANO_MAX_CONTEXT_MESSAGES);

    // Get the last user message to send via prompt()
    const lastUserMessageIndex =
      this.findLastUserMessageIndex(conversationMessages);

    if (lastUserMessageIndex === -1) {
      throw new Error('No user message found in the provided messages.');
    }

    const lastUserMessage = conversationMessages[lastUserMessageIndex];
    const session = await this.createSession(
      api,
      systemPrompt,
      conversationMessages.slice(0, lastUserMessageIndex),
      modelOptions,
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
   * Create a new LanguageModel session with structured initial prompts.
   * System instructions, few-shot examples, and conversation history retain
   * their roles instead of being flattened into a single string.
   */
  private async createSession(
    api: LanguageModelAPI,
    systemPrompt: string,
    contextHistory: Message[],
    modelOptions: LanguageModelOptions,
  ): Promise<LanguageModelSession> {
    const initialPrompts = this.buildInitialPrompts(
      systemPrompt,
      contextHistory,
    );
    const createOptions: LanguageModelCreateOptions = {
      ...modelOptions,
      ...(initialPrompts.length > 0 ? { initialPrompts } : {}),
    };

    return api.create(createOptions);
  }

  private getModelOptions(): LanguageModelOptions {
    return {
      expectedInputs: [
        { type: 'text', languages: this.expectedInputLanguages },
      ],
      expectedOutputs: [
        { type: 'text', languages: this.expectedOutputLanguages },
      ],
    };
  }

  private buildInitialPrompts(
    systemPrompt: string,
    contextHistory: Message[],
  ): GeminiNanoInitialPrompt[] {
    const configuredSystemPrompts = this.initialPrompts
      .filter((prompt) => prompt.role === 'system')
      .map((prompt) => prompt.content);
    const combinedSystemPrompt = this.buildSystemPrompt(
      [systemPrompt, ...configuredSystemPrompts].filter(Boolean).join('\n\n'),
    );
    const prompts: GeminiNanoInitialPrompt[] = [];

    if (combinedSystemPrompt) {
      prompts.push({ role: 'system', content: combinedSystemPrompt });
    }

    prompts.push(
      ...this.initialPrompts
        .filter((prompt) => prompt.role !== 'system')
        .map((prompt) => ({ ...prompt })),
      ...contextHistory
        .filter(
          (message): message is Message & { role: 'user' | 'assistant' } =>
            message.role === 'user' || message.role === 'assistant',
        )
        .map(({ role, content }) => ({ role, content })),
    );

    return prompts;
  }

  private findLastUserMessageIndex(messages: Message[]): number {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'user') {
        return index;
      }
    }

    return -1;
  }

  private buildSystemPrompt(systemPrompt?: string): string {
    const promptParts: string[] = [];

    if (systemPrompt) {
      promptParts.push(systemPrompt);
    }

    const lengthInstruction = this.getResponseLengthInstruction();
    if (lengthInstruction) {
      promptParts.push(lengthInstruction);
    }

    return promptParts.join('\n\n');
  }

  private getResponseLengthInstruction(): string | undefined {
    if (!this._responseLength) {
      return undefined;
    }

    const maxTokens = MAX_TOKENS_BY_LENGTH[this._responseLength];
    if (!maxTokens) {
      return undefined;
    }

    switch (this._responseLength) {
      case CHAT_RESPONSE_LENGTH.VERY_SHORT:
        return (
          'Reply in no more than one concise sentence. Do not use a ' +
          'preamble, summary, bullet points, or Markdown. Keep the reaction ' +
          'and answer short enough to read in one breath. Stay within ' +
          `approximately ${maxTokens} tokens.`
        );
      case CHAT_RESPONSE_LENGTH.SHORT:
        return (
          'Reply in no more than two concise sentences. Do not use a ' +
          'preamble, summary, bullet points, or Markdown. Keep the reaction ' +
          'and answer short enough to read in one breath. Use natural ' +
          `conversational language. Stay within approximately ${maxTokens} tokens.`
        );
      case CHAT_RESPONSE_LENGTH.MEDIUM:
        return (
          'Reply in no more than three concise sentences. Answer directly ' +
          'and include only the context needed to understand the answer. Do ' +
          'not use a preamble, summary, bullet points, or Markdown. Use ' +
          `natural conversational language. Stay within approximately ${maxTokens} tokens.`
        );
      case CHAT_RESPONSE_LENGTH.LONG:
        return (
          'Reply in no more than five sentences. Explain the important ' +
          'details clearly, but avoid unnecessary preambles, repetition, ' +
          'bullet points, or Markdown. Use natural conversational language. ' +
          `Stay within approximately ${maxTokens} tokens.`
        );
      case CHAT_RESPONSE_LENGTH.VERY_LONG:
        return (
          'Reply in no more than ten sentences. Give a thorough but focused ' +
          'answer. Use short plain-text paragraphs when helpful, and avoid ' +
          'unnecessary repetition, bullet points, or Markdown. Stay within ' +
          `approximately ${maxTokens} tokens.`
        );
      case CHAT_RESPONSE_LENGTH.DEEP:
        return (
          'Give a detailed response and organize it in the way that best ' +
          'fits the request. No sentence-count limit applies at this level. ' +
          `Stay within approximately ${maxTokens} tokens.`
        );
    }
  }
}

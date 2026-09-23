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
  promptStreaming?(text: string): ReadableStream<string>;
  clone?(): Promise<LanguageModelSession>;
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
  private sessionMode: 'stateless' | 'persistent';
  private baseSession?: LanguageModelSession;
  private liveSession?: LanguageModelSession;
  private persistentSessionKey?: string;
  private consumedTranscript: Message[] = [];

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
    this.sessionMode = options.sessionMode ?? 'stateless';
  }

  getModel(): string {
    return MODEL_GEMINI_NANO;
  }

  getVisionModel(): string {
    return MODEL_GEMINI_NANO;
  }

  /** Destroy any persistent Prompt API sessions held by this service. */
  dispose(): void {
    this.destroyPersistentSessions();
  }

  /**
   * Process chat messages using Gemini Nano.
   * Streams response deltas when Chrome exposes promptStreaming(), then calls
   * onCompleteResponse with the complete response.
   */
  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    const response = await this.generateResponse(
      messages,
      true,
      onPartialResponse,
    );
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
    stream: boolean = false,
    onPartialResponse: (text: string) => void = () => {},
    _maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const response = await this.generateResponse(
      messages,
      stream,
      onPartialResponse,
    );

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
  private async generateResponse(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
  ): Promise<string> {
    const api = getLanguageModelAPI();
    if (!api) {
      throw new Error(
        'Gemini Nano is not available in this environment. ' +
          'Chrome 148+ on a supported desktop device is required for web pages.',
      );
    }

    const modelOptions = this.getModelOptions();
    if (this.sessionMode === 'stateless') {
      await this.ensureAvailability(api, modelOptions);
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
    const contextHistory = conversationMessages.slice(0, lastUserMessageIndex);

    if (this.sessionMode === 'persistent') {
      return this.generatePersistentResponse(
        api,
        systemPrompt,
        contextHistory,
        lastUserMessage.content,
        modelOptions,
        stream,
        onPartialResponse,
      );
    }

    const session = await this.createSession(
      api,
      systemPrompt,
      contextHistory,
      modelOptions,
    );

    try {
      return await this.promptSession(
        session,
        lastUserMessage.content,
        stream,
        onPartialResponse,
      );
    } finally {
      try {
        session.destroy();
      } catch {
        // ignore
      }
    }
  }

  private async generatePersistentResponse(
    api: LanguageModelAPI,
    systemPrompt: string,
    contextHistory: Message[],
    userPrompt: string,
    modelOptions: LanguageModelOptions,
    stream: boolean,
    onPartialResponse: (text: string) => void,
  ): Promise<string> {
    const sessionKey = this.getPersistentSessionKey(systemPrompt, modelOptions);

    if (this.persistentSessionKey !== sessionKey) {
      this.destroyPersistentSessions();
    }

    if (!this.baseSession && !this.liveSession) {
      await this.ensureAvailability(api, modelOptions);
      await this.createPersistentBaseSession(
        api,
        systemPrompt,
        contextHistory,
        modelOptions,
      );
      this.persistentSessionKey = sessionKey;
    }

    let session = await this.getPersistentLiveSession(
      api,
      systemPrompt,
      contextHistory,
      modelOptions,
    );
    const reusedLiveSession =
      session === this.liveSession &&
      this.isHistoryCompatible(contextHistory, this.consumedTranscript);
    this.persistentSessionKey = sessionKey;

    try {
      const response = await this.promptSession(
        session,
        userPrompt,
        stream,
        onPartialResponse,
      );
      this.recordConsumedTranscript(
        contextHistory,
        userPrompt,
        response,
        reusedLiveSession,
      );
      return response;
    } catch (error) {
      if (!this.isQuotaExceededError(error)) {
        this.destroyPersistentLiveSession();
        throw error;
      }

      this.destroyPersistentLiveSession();
      session = await this.getPersistentLiveSession(
        api,
        systemPrompt,
        [],
        modelOptions,
      );
      this.persistentSessionKey = sessionKey;

      try {
        const response = await this.promptSession(
          session,
          userPrompt,
          stream,
          onPartialResponse,
        );
        this.recordConsumedTranscript([], userPrompt, response, false);
        return response;
      } catch (retryError) {
        this.destroyPersistentLiveSession();
        throw retryError;
      }
    }
  }

  private async ensureAvailability(
    api: LanguageModelAPI,
    modelOptions: LanguageModelOptions,
  ): Promise<void> {
    const availability = await api.availability(modelOptions);
    if (availability !== 'available' && availability !== 'downloadable') {
      throw new Error(
        'Gemini Nano Prompt API is not ready in this environment. ' +
          `LanguageModel.availability() returned "${availability}". ` +
          'Expected "available" or "downloadable".',
      );
    }
  }

  private async createPersistentBaseSession(
    api: LanguageModelAPI,
    systemPrompt: string,
    contextHistory: Message[],
    modelOptions: LanguageModelOptions,
  ): Promise<void> {
    this.baseSession = await this.createSession(
      api,
      systemPrompt,
      [],
      modelOptions,
    );
    if (contextHistory.length > 0) {
      this.liveSession = await this.createSession(
        api,
        systemPrompt,
        contextHistory,
        modelOptions,
      );
      this.consumedTranscript = contextHistory.map((message) => ({
        ...message,
      }));
    } else if (typeof this.baseSession.clone === 'function') {
      this.liveSession = await this.baseSession.clone();
    } else {
      this.liveSession = this.baseSession;
    }
  }

  private async getPersistentLiveSession(
    api: LanguageModelAPI,
    systemPrompt: string,
    contextHistory: Message[],
    modelOptions: LanguageModelOptions,
  ): Promise<LanguageModelSession> {
    if (
      this.liveSession &&
      this.isHistoryCompatible(contextHistory, this.consumedTranscript)
    ) {
      return this.liveSession;
    }

    if (this.liveSession && this.liveSession !== this.baseSession) {
      this.destroyPersistentLiveSession();
    }

    if (contextHistory.length === 0 && this.baseSession) {
      if (typeof this.baseSession.clone === 'function') {
        this.liveSession = await this.baseSession.clone();
      } else {
        if (this.consumedTranscript.length > 0) {
          this.destroyPersistentSessions();
          await this.createPersistentBaseSession(
            api,
            systemPrompt,
            [],
            modelOptions,
          );
          return this.liveSession as LanguageModelSession;
        }
        this.liveSession = this.baseSession;
      }
      return this.liveSession;
    }

    if (this.baseSession && typeof this.baseSession.clone === 'function') {
      this.liveSession = await this.createSession(
        api,
        systemPrompt,
        contextHistory,
        modelOptions,
      );
      return this.liveSession;
    }

    this.destroyPersistentSessions();
    await this.ensureAvailability(api, modelOptions);
    await this.createPersistentBaseSessionWithHistory(
      api,
      systemPrompt,
      contextHistory,
      modelOptions,
    );
    return this.liveSession as LanguageModelSession;
  }

  private async createPersistentBaseSessionWithHistory(
    api: LanguageModelAPI,
    systemPrompt: string,
    contextHistory: Message[],
    modelOptions: LanguageModelOptions,
  ): Promise<void> {
    this.baseSession = await this.createSession(
      api,
      systemPrompt,
      contextHistory,
      modelOptions,
    );
    this.liveSession = this.baseSession;
    this.consumedTranscript = contextHistory.map((message) => ({
      ...message,
    }));
  }

  private recordConsumedTranscript(
    contextHistory: Message[],
    userPrompt: string,
    response: string,
    reusedLiveSession: boolean,
  ): void {
    const priorTranscript = reusedLiveSession
      ? this.consumedTranscript
      : contextHistory;
    this.consumedTranscript = [
      ...priorTranscript,
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: response },
    ];
  }

  private getPersistentSessionKey(
    systemPrompt: string,
    modelOptions: LanguageModelOptions,
  ): string {
    return JSON.stringify({
      systemPrompt,
      modelOptions,
      initialPrompts: this.initialPrompts,
      responseLength: this._responseLength,
    });
  }

  private isHistoryCompatible(left: Message[], right: Message[]): boolean {
    if (left.length === 0 || right.length === 0) {
      return left.length === 0 && right.length === 0;
    }

    return this.isSuffix(left, right) || this.isSuffix(right, left);
  }

  private isSuffix(candidate: Message[], full: Message[]): boolean {
    if (candidate.length > full.length) return false;
    const offset = full.length - candidate.length;
    return candidate.every(
      (message, index) =>
        message.role === full[offset + index].role &&
        message.content === full[offset + index].content,
    );
  }

  private isQuotaExceededError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'QuotaExceededError'
    );
  }

  private destroyPersistentLiveSession(): void {
    if (this.liveSession) {
      this.destroySession(this.liveSession);
      if (this.liveSession === this.baseSession) {
        this.baseSession = undefined;
      }
    }
    this.liveSession = undefined;
    this.consumedTranscript = [];
  }

  private destroyPersistentSessions(): void {
    if (this.liveSession && this.liveSession !== this.baseSession) {
      this.destroySession(this.liveSession);
    }
    if (this.baseSession) {
      this.destroySession(this.baseSession);
    }
    this.baseSession = undefined;
    this.liveSession = undefined;
    this.persistentSessionKey = undefined;
    this.consumedTranscript = [];
  }

  private destroySession(session: LanguageModelSession): void {
    try {
      session.destroy();
    } catch {
      // ignore
    }
  }

  private async promptSession(
    session: LanguageModelSession,
    prompt: string,
    stream: boolean,
    onPartialResponse: (text: string) => void,
  ): Promise<string> {
    if (stream && typeof session.promptStreaming === 'function') {
      const reader = session.promptStreaming(prompt).getReader();
      let response = '';
      let streamMode: 'unknown' | 'cumulative' | 'delta' = 'unknown';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = String(value ?? '');
        if (streamMode === 'unknown' && response !== '') {
          streamMode = chunk.startsWith(response) ? 'cumulative' : 'delta';
        }

        const isCumulative = streamMode === 'cumulative';
        const delta = isCumulative ? chunk.slice(response.length) : chunk;
        response = isCumulative ? chunk : response + chunk;
        if (delta) onPartialResponse(delta);
      }

      return response;
    }

    const response = await session.prompt(prompt);
    onPartialResponse(response);
    return response;
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

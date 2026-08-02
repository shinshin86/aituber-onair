import {
  ChatService,
  Message,
  MessageWithVision,
  ChatType,
  ChatResponseLength,
  MAX_TOKENS_BY_LENGTH,
  ToolUseBlock,
  ToolResultBlock,
  ToolChatCompletion,
  ToolChatBlock,
  DEFAULT_VISION_PROMPT,
  textsToScreenplay,
  buildToolContinuationMessages,
} from '@aituber-onair/chat';
import { MemoryManager } from './MemoryManager';
import { EventEmitter } from './EventEmitter';

type ToolCallback = (blocks: ToolUseBlock[]) => Promise<ToolResultBlock[]>;
/**
 * ChatProcessor options
 */
export interface ChatProcessorOptions {
  /** System prompt */
  systemPrompt: string;
  /** System prompt for vision mode */
  visionSystemPrompt?: string;
  /** Vision prompt for describing the image */
  visionPrompt?: string;
  /** Whether to summarize memory during processing */
  useMemory: boolean;
  /** Memory note (instructions for AI) */
  memoryNote?: string;
  /** Maximum number of tool call iterations allowed (default: 6) */
  maxHops?: number;
  /** Maximum tokens for chat responses (takes precedence over responseLength) */
  maxTokens?: number;
  /** Response length preset for chat (used if maxTokens is not specified) */
  responseLength?: ChatResponseLength;
  /** Maximum tokens for vision responses (takes precedence over visionResponseLength) */
  visionMaxTokens?: number;
  /** Response length preset for vision (used if visionMaxTokens is not specified) */
  visionResponseLength?: ChatResponseLength;
}

/**
 * Core logic for chat processing
 * Combines ChatService and MemoryManager to execute
 * AITuber's main processing (text chat, vision chat)
 */
export class ChatProcessor extends EventEmitter {
  private chatService: ChatService;
  private memoryManager?: MemoryManager;
  private options: ChatProcessorOptions;
  private chatLog: Message[] = [];
  private chatStartTime: number = 0;
  private processingChat: boolean = false;
  private toolCallback?: ToolCallback;
  private maxHops: number;

  /**
   * Constructor
   * @param chatService Chat service
   * @param options Configuration options
   * @param memoryManager Memory manager (optional)
   */
  constructor(
    chatService: ChatService,
    options: ChatProcessorOptions,
    memoryManager?: MemoryManager,
    toolCallback?: ToolCallback,
  ) {
    super();
    this.chatService = chatService;
    this.options = options;
    this.memoryManager = memoryManager;
    this.toolCallback = toolCallback;

    // Initialize maxHops from options with default value of 6
    this.maxHops = options.maxHops ?? 6;
  }

  /**
   * Add message to chat log
   * @param message Message to add
   */
  addToChatLog(message: Message): void {
    this.chatLog.push(message);
    this.emit('chatLogUpdated', this.chatLog);
  }

  /**
   * Get chat log
   */
  getChatLog(): Message[] {
    return [...this.chatLog];
  }

  /**
   * Clear chat log
   */
  clearChatLog(): void {
    this.chatLog = [];
    this.emit('chatLogUpdated', this.chatLog);
  }

  /**
   * Set chat start time
   * @param time Timestamp
   */
  setChatStartTime(time: number): void {
    this.chatStartTime = time;
  }

  /**
   * Get chat start time
   */
  getChatStartTime(): number {
    return this.chatStartTime;
  }

  /**
   * Get processing status
   */
  isProcessing(): boolean {
    return this.processingChat;
  }

  /**
   * Update options
   * @param newOptions New options to merge with existing ones
   */
  updateOptions(newOptions: Partial<ChatProcessorOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Update maxHops if maxHops is included in the new options
    if (newOptions.maxHops !== undefined) {
      this.maxHops = newOptions.maxHops;
    }
  }

  /**
   * Process text chat
   * @param text User input text
   * @param chatType Chat type
   */
  async processTextChat(
    text: string,
    chatType: ChatType = 'chatForm',
  ): Promise<void> {
    if (this.processingChat) {
      console.warn('Another chat processing is in progress');
      return;
    }

    try {
      this.processingChat = true;
      this.emit('processingStart', { type: chatType, text });

      // Set chat start time (if first message)
      if (this.chatStartTime === 0) {
        this.chatStartTime = Date.now();
      }

      // Create user message
      const userMessage: Message = {
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      // Add to chat log
      this.addToChatLog(userMessage);

      // Create memory (if needed)
      if (this.options.useMemory && this.memoryManager) {
        await this.memoryManager.createMemoryIfNeeded(
          this.chatLog,
          this.chatStartTime,
        );
      }

      const initialMsgs = await this.prepareMessagesForAI();

      // Only pass explicit maxTokens.
      // Provider-specific responseLength handling should stay in the provider.
      const maxTokens = this.getExplicitMaxTokensForChat();
      await this.runToolLoop<Message>(initialMsgs, (msgs, stream, cb) =>
        this.chatService.chatOnce(msgs as Message[], stream, cb, maxTokens),
      );
    } catch (error) {
      console.error('Error in text chat processing:', error);
      this.emit('error', error);
    } finally {
      this.processingChat = false;
      this.emit('processingEnd');
    }
  }

  /**
   * Process vision chat
   * @param imageDataUrl Image data URL
   */
  async processVisionChat(imageDataUrl: string): Promise<void> {
    if (this.processingChat) {
      console.warn('Another chat processing is in progress');
      return;
    }

    try {
      this.processingChat = true;
      this.emit('processingStart', { type: 'vision', imageUrl: imageDataUrl });

      // Set chat start time (if first message)
      if (this.chatStartTime === 0) {
        this.chatStartTime = Date.now();
      }

      // Create memory (if needed)
      if (this.options.useMemory && this.memoryManager) {
        await this.memoryManager.createMemoryIfNeeded(
          this.chatLog,
          this.chatStartTime,
        );
      }

      // Prepare messages to send to AI
      const baseMessages = await this.prepareMessagesForAI();

      // Add vision system prompt
      if (this.options.visionSystemPrompt) {
        baseMessages.push({
          role: 'system',
          content: this.options.visionSystemPrompt,
        });
      }

      // Create vision message
      const visionMessage: MessageWithVision = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: this.options.visionPrompt || DEFAULT_VISION_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
              detail: 'low', // For token saving
            },
          },
        ],
      };

      // Only pass explicit maxTokens.
      // Provider-specific responseLength handling should stay in the provider.
      const maxTokens = this.getExplicitMaxTokensForVision();
      await this.runToolLoop<Message | MessageWithVision>(
        [...baseMessages, visionMessage],
        (msgs, stream, cb) =>
          this.chatService.visionChatOnce(
            msgs as MessageWithVision[],
            stream,
            cb,
            maxTokens,
          ),
        imageDataUrl, // visionSource
      );
    } catch (error) {
      console.error('Error in vision chat processing:', error);
      this.emit('error', error);
    } finally {
      this.processingChat = false;
      this.emit('processingEnd');
    }
  }

  /**
   * Prepare messages to send to AI
   * Create an array of messages with system prompt and memory
   */
  private async prepareMessagesForAI(): Promise<Message[]> {
    const messages: Message[] = [];

    // Add system prompt
    if (this.options.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.options.systemPrompt,
      });
    }

    // Add memory
    if (this.options.useMemory && this.memoryManager) {
      const memoryText = this.memoryManager.getMemoryForPrompt();
      if (memoryText) {
        const memoryContent =
          memoryText +
          (this.options.memoryNote ? `\n\n${this.options.memoryNote}` : '');

        messages.push({
          role: 'system',
          content: memoryContent,
        });
      }
    }

    // Add chat log
    messages.push(
      ...this.chatLog.filter(
        (m) =>
          !(typeof m.content === 'string' && m.content.trim() === '') &&
          !(Array.isArray(m.content) && m.content.length === 0),
      ),
    );

    return messages;
  }

  /**
   * Set chat log from external source
   * @param messages Message array to set as chat log
   */
  setChatLog(messages: Message[]): void {
    this.chatLog = Array.isArray(messages) ? [...messages] : [];
    this.emit('chatLogUpdated', this.chatLog);
  }

  /**
   * Get max tokens for chat responses
   * @returns Maximum tokens for chat
   */
  private getExplicitMaxTokensForChat(): number | undefined {
    return this.options.maxTokens;
  }

  /**
   * Get max tokens for vision responses
   * @returns Maximum tokens for vision
   */
  private getExplicitMaxTokensForVision(): number | undefined {
    if (this.options.visionMaxTokens !== undefined) {
      return this.options.visionMaxTokens;
    }

    if (this.options.visionResponseLength !== undefined) {
      return MAX_TOKENS_BY_LENGTH[this.options.visionResponseLength];
    }

    return this.getExplicitMaxTokensForChat();
  }

  private getToolUseBlocks(blocks: ToolChatBlock[]): ToolUseBlock[] {
    return blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');
  }

  private getToolResultBlocks(blocks: ToolChatBlock[]): ToolResultBlock[] {
    return blocks.filter((b): b is ToolResultBlock => b.type === 'tool_result');
  }

  private async runToolLoop<T extends Message | MessageWithVision>(
    send: T[],
    once: (
      msgs: T[],
      stream: boolean,
      onPartial: (t: string) => void,
    ) => Promise<ToolChatCompletion>,
    visionSource?: string,
  ): Promise<void> {
    let toSend = send;
    let hops = 0;
    let first = true;

    while (hops++ < this.maxHops) {
      const completion = await once(toSend, first, (t) =>
        this.emit('assistantPartialResponse', t),
      );
      const {
        blocks,
        stop_reason,
        truncated,
        finish_reason,
        response_status,
        incomplete_details,
        usage,
      } = completion;
      first = false;

      this.getToolResultBlocks(blocks).forEach((b) =>
        this.emit('assistantPartialResponse', b.content),
      );

      if (stop_reason === 'end') {
        const full = blocks
          .map((b) =>
            b.type === 'text'
              ? b.text
              : b.type === 'tool_result'
                ? b.content
                : '',
          )
          .join('');

        const assistantMessage: Message = {
          role: 'assistant',
          content: full,
          timestamp: Date.now(),
        };
        this.addToChatLog(assistantMessage);

        const screenplay = textsToScreenplay([full])[0];
        const responsePayload = {
          message: assistantMessage,
          screenplay,
          visionSource,
          truncated: Boolean(truncated),
          finishReason: finish_reason,
          responseStatus: response_status,
          incompleteDetails: incomplete_details ?? null,
          usage,
        };

        if (responsePayload.truncated) {
          this.emit('assistantResponseTruncated', responsePayload);
        }

        this.emit('assistantResponse', responsePayload);

        if (this.memoryManager) this.memoryManager.cleanupOldMemories();
        return;
      }

      /* ---------- tool_use ---------- */
      if (!this.toolCallback) throw new Error('Tool callback missing');

      const toolUses = this.getToolUseBlocks(blocks);
      const toolResults = await this.toolCallback(toolUses);

      /* build messages for the next turn */
      const cleaned = buildToolContinuationMessages({
        provider: this.chatService.provider,
        messages: toSend as Message[],
        completion,
        toolResults,
      });

      toSend = cleaned as T[];
    }

    // It is rare to reach this point. Just log it.
    console.warn('Tool loop exceeded MAX_HOPS');
  }
}

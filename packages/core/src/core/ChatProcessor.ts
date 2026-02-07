import {
  ChatService,
  Message,
  MessageWithVision,
  ChatType,
  ChatResponseLength,
  MAX_TOKENS_BY_LENGTH,
  DEFAULT_MAX_TOKENS,
  ToolUseBlock,
  ToolResultBlock,
  ToolChatCompletion,
  ToolChatBlock,
  DEFAULT_VISION_PROMPT,
  textsToScreenplay,
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

      // Set max tokens for text chat
      const maxTokens = this.getMaxTokensForChat();
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

      // Set max tokens for vision chat
      const maxTokens = this.getMaxTokensForVision();
      await this.runToolLoop<Message | MessageWithVision>(
        [...baseMessages, visionMessage],
        (msgs, stream, cb) =>
          (this.chatService as any).visionChatOnce(
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
  private getMaxTokensForChat(): number | undefined {
    // Prioritize direct maxTokens setting
    if (this.options.maxTokens !== undefined) {
      return this.options.maxTokens;
    }

    // Use responseLength preset if specified
    if (this.options.responseLength) {
      return MAX_TOKENS_BY_LENGTH[this.options.responseLength];
    }

    // Return undefined for provider default
    return undefined;
  }

  /**
   * Get max tokens for vision responses
   * @returns Maximum tokens for vision
   */
  private getMaxTokensForVision(): number | undefined {
    // Prioritize direct visionMaxTokens setting
    if (this.options.visionMaxTokens !== undefined) {
      return this.options.visionMaxTokens;
    }

    // Use visionResponseLength preset if specified
    if (this.options.visionResponseLength) {
      return MAX_TOKENS_BY_LENGTH[this.options.visionResponseLength];
    }

    // Fallback to regular chat settings
    return this.getMaxTokensForChat();
  }

  private isClaudeProvider(): boolean {
    return (this.chatService as any).provider === 'claude';
  }

  private getToolUseBlocks(blocks: ToolChatBlock[]): ToolUseBlock[] {
    return blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');
  }

  private getToolResultBlocks(blocks: ToolChatBlock[]): ToolResultBlock[] {
    return blocks.filter((b): b is ToolResultBlock => b.type === 'tool_result');
  }

  private isEmptyClaudeAssistantMessage(
    isClaude: boolean,
    message: Message,
  ): boolean {
    if (!isClaude || message.role !== 'assistant') {
      return false;
    }
    const content = (message as { content?: unknown }).content;
    return Array.isArray(content) && content.length === 0;
  }

  private buildAssistantToolCall(
    isClaude: boolean,
    toolUses: ToolUseBlock[],
  ): Message {
    if (isClaude) {
      return {
        role: 'assistant',
        content: toolUses.map((u) => ({
          type: 'tool_use',
          id: u.id,
          name: u.name,
          input: u.input ?? {},
        })),
      } as unknown as Message;
    }

    return {
      role: 'assistant',
      content: [],
      tool_calls: toolUses.map((u) => ({
        id: u.id,
        type: 'function',
        function: {
          name: u.name,
          arguments: JSON.stringify(u.input || {}),
        },
      })),
    } as unknown as Message;
  }

  private buildToolMessages(
    isClaude: boolean,
    toolResults: ToolResultBlock[],
  ): Message[] {
    if (isClaude) {
      return toolResults.map(
        (r) =>
          ({
            role: 'user',
            content: [
              {
                type: r.type,
                tool_use_id: r.tool_use_id,
                content: r.content,
              },
            ],
          }) as unknown as Message,
      );
    }

    return toolResults.map(
      (r) =>
        ({
          role: 'tool',
          tool_call_id: r.tool_use_id,
          content: r.content,
        }) as unknown as Message,
    );
  }

  private buildNextMessages(
    isClaude: boolean,
    currentMessages: Message[],
    assistantToolCall: Message,
    toolMessages: Message[],
  ): Message[] {
    const cleaned = currentMessages.filter(
      (m) => !this.isEmptyClaudeAssistantMessage(isClaude, m),
    );

    if (!this.isEmptyClaudeAssistantMessage(isClaude, assistantToolCall)) {
      cleaned.push(assistantToolCall);
    }
    toolMessages.forEach((m) => cleaned.push(m));
    return cleaned;
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

    // check if the chat service is claude
    const isClaude = this.isClaudeProvider();

    while (hops++ < this.maxHops) {
      const { blocks, stop_reason } = await once(toSend, first, (t) =>
        this.emit('assistantPartialResponse', t),
      );
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
        this.emit('assistantResponse', {
          message: assistantMessage,
          screenplay,
          visionSource,
        });

        if (this.memoryManager) this.memoryManager.cleanupOldMemories();
        return;
      }

      /* ---------- tool_use ---------- */
      if (!this.toolCallback) throw new Error('Tool callback missing');

      const toolUses = this.getToolUseBlocks(blocks);
      const toolResults = await this.toolCallback(toolUses);

      const assistantToolCall = this.buildAssistantToolCall(isClaude, toolUses);
      const toolMsgs = this.buildToolMessages(isClaude, toolResults);

      /* build messages for the next turn */
      const cleaned = this.buildNextMessages(
        isClaude,
        toSend as Message[],
        assistantToolCall,
        toolMsgs,
      );

      toSend = cleaned as T[];
    }

    // It is rare to reach this point. Just log it.
    console.warn('Tool loop exceeded MAX_HOPS');
  }
}

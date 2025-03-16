import { ChatService } from '../services/chat/ChatService';
import { MemoryManager } from './MemoryManager';
import { Message, MessageWithVision, ChatType, Screenplay } from '../types';
import { EventEmitter } from './EventEmitter';
import { textsToScreenplay } from '../utils/screenplay';
import { DEFAULT_VISION_PROMPT } from '../constants/prompts';

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
  ) {
    super();
    this.chatService = chatService;
    this.options = options;
    this.memoryManager = memoryManager;
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

      // Prepare messages to send to AI
      const messages: Message[] = await this.prepareMessagesForAI();

      // Process with ChatService
      await this.chatService.processChat(
        messages,
        (sentence) => {
          // Process streaming response
          this.emit('assistantPartialResponse', sentence);
        },
        async (fullText) => {
          // Process after response
          const assistantMessage: Message = {
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
          };

          this.addToChatLog(assistantMessage);

          // Convert to screenplay
          const screenplay = textsToScreenplay([fullText])[0];
          this.emit('assistantResponse', {
            message: assistantMessage,
            screenplay: screenplay,
          });

          // Clean up memory
          if (this.memoryManager) {
            this.memoryManager.cleanupOldMemories();
          }
        },
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

      // Process with ChatService
      await this.chatService.processVisionChat(
        [...baseMessages, visionMessage],
        (sentence) => {
          // Process streaming response
          this.emit('assistantPartialResponse', sentence);
        },
        async (fullText) => {
          // Process after response
          const assistantMessage: Message = {
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
          };

          this.addToChatLog(assistantMessage);

          // Convert to screenplay
          const screenplay = textsToScreenplay([fullText])[0];
          this.emit('assistantResponse', {
            message: assistantMessage,
            screenplay: screenplay,
            visionSource: imageDataUrl,
          });

          // Clean up memory
          if (this.memoryManager) {
            this.memoryManager.cleanupOldMemories();
          }
        },
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
    messages.push(...this.chatLog);

    return messages;
  }
}

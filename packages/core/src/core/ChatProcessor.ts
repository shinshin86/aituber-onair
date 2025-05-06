import { ChatService } from '../services/chat/ChatService';
import { MemoryManager } from './MemoryManager';
import { Message, MessageWithVision, ChatType } from '../types';
import { EventEmitter } from './EventEmitter';
import { textsToScreenplay } from '../utils/screenplay';
import { DEFAULT_VISION_PROMPT } from '../constants';
import {
  ToolUseBlock,
  ToolResultBlock,
  ToolChatCompletion,
} from '../types/toolChat';

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
  private readonly MAX_HOPS = 6;

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

      const initialMsgs = await this.prepareMessagesForAI();
      await this.runToolLoop<Message>(initialMsgs, (msgs, stream, cb) =>
        this.chatService.chatOnce(msgs as Message[], stream, cb),
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

      await this.runToolLoop<Message | MessageWithVision>(
        [...baseMessages, visionMessage],
        (msgs, stream, cb) =>
          (this.chatService as any).visionChatOnce(
            msgs as MessageWithVision[],
            stream,
            cb,
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
    const isClaude = (this.chatService as any).provider === 'claude';

    while (hops++ < this.MAX_HOPS) {
      const { blocks, stop_reason } = await once(toSend, first, (t) =>
        this.emit('assistantPartialResponse', t),
      );
      first = false;

      blocks
        .filter((b: any) => b.type === 'tool_result')
        .forEach((b: any) => this.emit('assistantPartialResponse', b.content));

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

      const toolUses = blocks.filter((b: any) => b.type === 'tool_use');
      const toolResults = await this.toolCallback(toolUses as any);

      const assistantToolCall = isClaude
        ? {
            role: 'assistant',
            content: toolUses.map((u: any) => ({
              type: 'tool_use',
              id: u.id,
              name: u.name,
              input: u.input ?? {},
            })),
          }
        : {
            role: 'assistant',
            content: [],
            tool_calls: toolUses.map((u: any) => ({
              id: u.id,
              type: 'function',
              function: {
                name: u.name,
                arguments: JSON.stringify(u.input || {}),
              },
            })),
          };

      const toolMsgs = toolResults.map((r) => {
        if (isClaude) {
          return {
            role: 'user',
            content: [
              {
                type: r.type,
                tool_use_id: r.tool_use_id,
                content: r.content,
              },
            ],
          };
        }

        return {
          role: 'tool',
          tool_call_id: r.tool_use_id,
          content: r.content,
        };
      });

      /* build messages for the next turn */
      const cleaned: Message[] = (toSend as Message[]).filter((m) => {
        if (
          isClaude &&
          m.role === 'assistant' &&
          Array.isArray((m as any).content) &&
          (m as any).content.length === 0
        ) {
          return false;
        }
        return true;
      });

      if (
        !(
          isClaude &&
          Array.isArray((assistantToolCall as any).content) &&
          (assistantToolCall as any).content.length === 0
        )
      ) {
        cleaned.push(assistantToolCall as unknown as Message);
      }
      toolMsgs.forEach((m) => cleaned.push(m as unknown as Message));

      toSend = cleaned as T[];
    }

    // It is rare to reach this point. Just log it.
    console.warn('Tool loop exceeded MAX_HOPS');
  }
}

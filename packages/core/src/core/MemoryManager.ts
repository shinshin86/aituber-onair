import { Message, MemoryRecord, MemoryType, MemoryStorage } from '../types';
import { AITuberOnAirCoreEvent } from './AITuberOnAirCore';
import { EventEmitter } from './EventEmitter';

/**
 * Memory manager settings
 */
export interface MemoryOptions {
  /** Enable summarization */
  enableSummarization: boolean;
  /** Short-term memory duration (milliseconds) */
  shortTermDuration: number;
  /** Mid-term memory duration (milliseconds) */
  midTermDuration: number;
  /** Long-term memory duration (milliseconds) */
  longTermDuration: number;
  /** Threshold for the number of messages before summarization */
  maxMessagesBeforeSummarization: number;
  /** Maximum number of characters in summary */
  maxSummaryLength?: number;
  /** Memory retention period (milliseconds) */
  memoryRetentionPeriod?: number;
  /** Custom summary prompt template */
  summaryPromptTemplate?: string;
}

/**
 * Summarizer interface
 */
export interface Summarizer {
  /**
   * Summarize message array
   * @param messages Array of messages to summarize
   * @param maxLength Maximum number of characters
   * @param customPrompt Custom prompt template for summarization (optional)
   */
  summarize(
    messages: Message[],
    maxLength?: number,
    customPrompt?: string,
  ): Promise<string>;
}

/**
 * Manager for managing chat history and summarization
 */
export class MemoryManager extends EventEmitter {
  private options: MemoryOptions;
  private summarizer?: Summarizer;
  private memories: MemoryRecord[] = [];
  private storage?: MemoryStorage;

  /**
   * Constructor
   * @param options Settings options
   * @param summarizer Summarizer implementation (if omitted, summarization is disabled)
   * @param storage Storage implementation for persistence (optional)
   */
  constructor(
    options: MemoryOptions,
    summarizer?: Summarizer,
    storage?: MemoryStorage,
  ) {
    super();
    this.options = {
      enableSummarization: options.enableSummarization,
      shortTermDuration: options.shortTermDuration || 60 * 1000, // Default 1 minute
      midTermDuration: options.midTermDuration || 4 * 60 * 1000, // Default 4 minutes
      longTermDuration: options.longTermDuration || 9 * 60 * 1000, // Default 9 minutes
      maxMessagesBeforeSummarization:
        options.maxMessagesBeforeSummarization || 20,
      maxSummaryLength: options.maxSummaryLength || 256,
      memoryRetentionPeriod: options.memoryRetentionPeriod || 60 * 60 * 1000, // Default 1 hour
      summaryPromptTemplate: options.summaryPromptTemplate,
    };
    this.summarizer = summarizer;
    this.storage = storage;

    // Load memories from storage if available
    this.loadFromStorage();
  }

  /**
   * Load memories from storage
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      const loadedMemories = await this.storage.load();
      if (loadedMemories && loadedMemories.length > 0) {
        this.memories = loadedMemories;
        this.emit(AITuberOnAirCoreEvent.MEMORY_LOADED, loadedMemories);
      }
    } catch (error) {
      console.error('Error loading memories from storage:', error);
      this.emit(AITuberOnAirCoreEvent.ERROR, error);
    }
  }

  /**
   * Save memories to storage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      await this.storage.save(this.memories);
      this.emit(AITuberOnAirCoreEvent.MEMORY_SAVED, this.memories);
    } catch (error) {
      console.error('Error saving memories to storage:', error);
      this.emit(AITuberOnAirCoreEvent.ERROR, error);
    }
  }

  /**
   * Import memory records (used for restoring from external storage)
   * @param records Memory records to import
   */
  public importMemoryRecords(records: MemoryRecord[]): void {
    if (!records || records.length === 0) return;

    // Filter out any records with invalid types
    const validRecords = records.filter((record) =>
      ['short', 'mid', 'long'].includes(record.type),
    );

    // Replace existing memories of same types
    const existingTypes = new Set(validRecords.map((r) => r.type));
    this.memories = [
      ...this.memories.filter((m) => !existingTypes.has(m.type)),
      ...validRecords,
    ];

    this.emit('memoriesImported', validRecords);

    // Save to storage if available
    this.saveToStorage();
  }

  /**
   * Summarize chat log and save as memory
   * @param chatLog Chat log
   * @param chatStartTime Chat start time
   */
  async createMemoryIfNeeded(
    chatLog: Message[],
    chatStartTime: number,
  ): Promise<void> {
    if (!this.options.enableSummarization || !this.summarizer) {
      return;
    }

    const now = Date.now();
    const elapsedTime = now - chatStartTime;

    try {
      // Create short-term memory (1 minute passed)
      if (elapsedTime >= this.options.shortTermDuration) {
        await this.createMemory('short', chatLog, now);
      }

      // Create mid-term memory (4 minutes passed)
      if (elapsedTime >= this.options.midTermDuration) {
        await this.createMemory('mid', chatLog, now);
      }

      // Create long-term memory (9 minutes passed)
      if (elapsedTime >= this.options.longTermDuration) {
        await this.createMemory('long', chatLog, now);
      }
    } catch (error) {
      console.error('Error creating memory:', error);
      this.emit('error', error);
    }
  }

  /**
   * Create memory of specified type
   * @param type Memory type
   * @param chatLog Chat log
   * @param timestamp Timestamp
   */
  private async createMemory(
    type: MemoryType,
    chatLog: Message[],
    timestamp: number,
  ): Promise<void> {
    if (!this.summarizer) return;

    try {
      // Delete old memories of the same type
      this.memories = this.memories.filter((mem) => mem.type !== type);

      // Summarize chat log
      const summary = await this.summarizer.summarize(
        chatLog,
        this.options.maxSummaryLength,
      );

      // Add new memory
      const memoryRecord: MemoryRecord = {
        type,
        summary,
        timestamp,
      };

      this.memories.push(memoryRecord);
      this.emit(AITuberOnAirCoreEvent.MEMORY_CREATED, memoryRecord);

      // Save to storage if available
      await this.saveToStorage();
    } catch (error) {
      console.error(`Error creating ${type} memory:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Get all memories
   */
  getAllMemories(): MemoryRecord[] {
    return [...this.memories];
  }

  /**
   * Get memory of specified type
   * @param type Memory type
   */
  getMemoryByType(type: MemoryType): MemoryRecord | undefined {
    return this.memories.find((mem) => mem.type === type);
  }

  /**
   * Generate memory text for AI prompt
   */
  getMemoryForPrompt(): string {
    const memoryParts: string[] = [];

    const shortMemory = this.getMemoryByType('short');
    if (shortMemory) {
      memoryParts.push(`[Short-term memory: 1min]\n${shortMemory.summary}`);
    }

    const midMemory = this.getMemoryByType('mid');
    if (midMemory) {
      memoryParts.push(`[Mid-term memory: 4min]\n${midMemory.summary}`);
    }

    const longMemory = this.getMemoryByType('long');
    if (longMemory) {
      memoryParts.push(`[Long-term memory: 9min]\n${longMemory.summary}`);
    }

    return memoryParts.join('\n\n');
  }

  /**
   * Clean up old memories
   */
  async cleanupOldMemories(): Promise<void> {
    const now = Date.now();
    const retentionPeriod =
      this.options.memoryRetentionPeriod || 60 * 60 * 1000; // Default 1 hour

    const oldMemories = this.memories.filter(
      (mem) => now - mem.timestamp > retentionPeriod,
    );

    if (oldMemories.length > 0) {
      this.memories = this.memories.filter(
        (mem) => now - mem.timestamp <= retentionPeriod,
      );

      this.emit(AITuberOnAirCoreEvent.MEMORY_REMOVED, oldMemories);

      // Save to storage if available
      await this.saveToStorage();
    }
  }

  /**
   * Clear all memories
   */
  async clearAllMemories(): Promise<void> {
    const oldMemories = [...this.memories];
    this.memories = [];
    this.emit(AITuberOnAirCoreEvent.MEMORY_REMOVED, oldMemories);

    // Clear storage if available
    if (this.storage) {
      try {
        await this.storage.clear();
        this.emit(AITuberOnAirCoreEvent.STORAGE_CLEARED);
      } catch (error) {
        console.error('Error clearing storage:', error);
        this.emit(AITuberOnAirCoreEvent.ERROR, error);
      }
    }
  }
}

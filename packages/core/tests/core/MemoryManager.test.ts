import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryManager, MemoryOptions } from '../../src/core/MemoryManager';
import { Message, MemoryRecord, MemoryStorage } from '../../src/types';

/**
 * Mock implementation of MemoryStorage
 */
class MockMemoryStorage implements MemoryStorage {
  private records: MemoryRecord[] = [];
  load = vi.fn().mockImplementation(async () => this.records);
  save = vi.fn().mockImplementation(async (records: MemoryRecord[]) => {
    this.records = records;
  });
  clear = vi.fn().mockImplementation(async () => {
    this.records = [];
  });
}

/**
 * Mock implementation of Summarizer
 */
const createMockSummarizer = () => ({
  summarize: vi.fn().mockImplementation(async (messages: Message[]) => {
    return `${messages.length}メッセージの要約`;
  }),
});

describe('MemoryManager', () => {
  // test settings
  const defaultOptions: MemoryOptions = {
    enableSummarization: true,
    shortTermDuration: 60 * 1000, // 1 minute
    midTermDuration: 4 * 60 * 1000, // 4 minutes
    longTermDuration: 9 * 60 * 1000, // 9 minutes
    maxMessagesBeforeSummarization: 20,
    maxSummaryLength: 256,
  };

  // test chat log
  const chatLog: Message[] = [
    { role: 'user', content: 'こんにちは', timestamp: Date.now() - 5000 },
    {
      role: 'assistant',
      content: 'こんにちは！',
      timestamp: Date.now() - 3000,
    },
  ];

  // mock setup
  let mockSummarizer: ReturnType<typeof createMockSummarizer>;
  let mockStorage: MockMemoryStorage;
  let memoryManager: MemoryManager;

  beforeEach(() => {
    mockSummarizer = createMockSummarizer();
    mockStorage = new MockMemoryStorage();
    memoryManager = new MemoryManager(
      defaultOptions,
      mockSummarizer,
      mockStorage,
    );

    // mock Date
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('can be instantiated', () => {
    expect(memoryManager).toBeDefined();
  });

  it('can create short memory', async () => {
    const chatStartTime = Date.now() - 2 * 60 * 1000; // 2 minutes ago
    await memoryManager.createMemoryIfNeeded(chatLog, chatStartTime);

    // verify - summarize is called
    expect(mockSummarizer.summarize).toHaveBeenCalledWith(
      chatLog,
      defaultOptions.maxSummaryLength,
    );

    // verify - save is called
    expect(mockStorage.save).toHaveBeenCalled();

    // verify - short memory is created
    const memories = memoryManager.getAllMemories();
    expect(memories.length).toBe(1);
    expect(memories[0].type).toBe('short');
  });

  it('can create mid memory', async () => {
    const chatStartTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    await memoryManager.createMemoryIfNeeded(chatLog, chatStartTime);

    // verify - short and mid memories are created
    const memories = memoryManager.getAllMemories();
    expect(memories.length).toBe(2);

    const types = memories.map((m) => m.type);
    expect(types).toContain('short');
    expect(types).toContain('mid');
  });

  it('can create long memory', async () => {
    const chatStartTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    await memoryManager.createMemoryIfNeeded(chatLog, chatStartTime);

    // verify - all memories are created
    const memories = memoryManager.getAllMemories();
    expect(memories.length).toBe(3);

    const types = memories.map((m) => m.type);
    expect(types).toContain('short');
    expect(types).toContain('mid');
    expect(types).toContain('long');
  });

  it('can convert memory to prompt text', async () => {
    // create memory
    const shortMemory: MemoryRecord = {
      type: 'short',
      summary: '短期メモリの内容',
      timestamp: Date.now(),
    };
    const midMemory: MemoryRecord = {
      type: 'mid',
      summary: '中期メモリの内容',
      timestamp: Date.now(),
    };

    // import memory manually
    memoryManager.importMemoryRecords([shortMemory, midMemory]);

    // get prompt text
    const promptText = memoryManager.getMemoryForPrompt();

    // verify - expected string is included
    expect(promptText).toContain('[Short-term memory: 1min]');
    expect(promptText).toContain('短期メモリの内容');
    expect(promptText).toContain('[Mid-term memory: 4min]');
    expect(promptText).toContain('中期メモリの内容');
  });

  it('can clean up old memory', async () => {
    // create memory 2 hours ago
    const oldMemory: MemoryRecord = {
      type: 'short',
      summary: '古いメモリ',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
    };

    // create memory 30 minutes ago
    const newMemory: MemoryRecord = {
      type: 'mid',
      summary: '新しいメモリ',
      timestamp: Date.now() - 30 * 60 * 1000,
    };

    // import memory
    memoryManager.importMemoryRecords([oldMemory, newMemory]);

    // execute cleanup
    await memoryManager.cleanupOldMemories();

    // verify - only old memory is deleted
    const memories = memoryManager.getAllMemories();
    expect(memories.length).toBe(1);
    expect(memories[0].type).toBe('mid');
    expect(memories[0].summary).toBe('新しいメモリ');
  });

  it('can clear all memories', async () => {
    // create memory
    const memory: MemoryRecord = {
      type: 'short',
      summary: 'テストメモリ',
      timestamp: Date.now(),
    };

    // import memory
    memoryManager.importMemoryRecords([memory]);

    // clear memory
    await memoryManager.clearAllMemories();

    // verify - memory is empty
    const memories = memoryManager.getAllMemories();
    expect(memories.length).toBe(0);

    // verify - clear is called
    expect(mockStorage.clear).toHaveBeenCalled();
  });

  it('can load memory from storage', async () => {
    // save memory to storage
    const memory: MemoryRecord = {
      type: 'short',
      summary: 'ストレージからのメモリ',
      timestamp: Date.now(),
    };

    // prepare mock storage
    mockStorage.load = vi.fn().mockResolvedValue([memory]);

    // create new instance
    // (loadFromStorage is called when initializing)
    const newMemoryManager = new MemoryManager(
      defaultOptions,
      mockSummarizer,
      mockStorage,
    );

    // verify - memory is loaded
    const memories = await new Promise<MemoryRecord[]>((resolve) => {
      newMemoryManager.on('memoriesLoaded', resolve);
    });

    expect(memories.length).toBe(1);
    expect(memories[0].summary).toBe('ストレージからのメモリ');
  });
});

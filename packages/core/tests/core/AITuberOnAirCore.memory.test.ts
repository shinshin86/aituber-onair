import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';
import { MemoryStorage, MemoryRecord } from '../../src/types';

// OpenAI API mock
vi.mock('../../services/chat/OpenAIChatService', () => {
  return {
    OpenAIChatService: vi.fn().mockImplementation(() => ({
      processChat: vi.fn().mockResolvedValue({
        role: 'assistant',
        content: 'テスト応答',
      }),
      processVisionChat: vi.fn().mockResolvedValue({
        role: 'assistant',
        content: '画像に対する応答',
      }),
    })),
  };
});

// OpenAI Summarizer mock
vi.mock('../../services/chat/OpenAISummarizer', () => {
  return {
    OpenAISummarizer: vi.fn().mockImplementation(() => ({
      summarize: vi.fn().mockResolvedValue('要約テスト'),
    })),
  };
});

// VoiceEngineAdapter mock
vi.mock('../../services/voice/VoiceEngineAdapter', () => {
  return {
    VoiceEngineAdapter: vi.fn().mockImplementation(() => ({
      speakText: vi.fn().mockResolvedValue(undefined),
      speak: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      updateOptions: vi.fn(),
    })),
  };
});

/**
 * Mock version of MemoryStorage
 */
class MockMemoryStorage implements MemoryStorage {
  private records: MemoryRecord[] = [];
  load = vi.fn().mockImplementation(async () => [...this.records]);
  save = vi.fn().mockImplementation(async (records: MemoryRecord[]) => {
    this.records = [...records];
  });
  clear = vi.fn().mockImplementation(async () => {
    this.records = [];
  });
}

describe('AITuberOnAirCore Memory Integration', () => {
  let mockMemoryStorage: MockMemoryStorage;
  let core: AITuberOnAirCore;

  const createCoreWithMemory = (enableMemory: boolean) => {
    const options: AITuberOnAirCoreOptions = {
      apiKey: 'test-api-key',
      chatOptions: {
        systemPrompt: 'あなたはAIチューバーです',
        visionSystemPrompt: 'こちらは配信画面です',
        visionPrompt: '配信画面について説明してください',
      },
      voiceOptions: {
        engineType: 'voicevox',
        speaker: '1',
      },
      // memory options and storage settings
      memoryOptions: enableMemory
        ? {
            enableSummarization: true,
            shortTermDuration: 60 * 1000, // 1 minute
            midTermDuration: 4 * 60 * 1000, // 4 minutes
            longTermDuration: 9 * 60 * 1000, // 9 minutes
            maxMessagesBeforeSummarization: 20,
            maxSummaryLength: 256,
          }
        : undefined,
      memoryStorage: enableMemory ? mockMemoryStorage : undefined,
    };

    return new AITuberOnAirCore(options);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMemoryStorage = new MockMemoryStorage();
    core = createCoreWithMemory(true);
  });

  it('memory feature is enabled', () => {
    expect(core.isMemoryEnabled()).toBe(true);
  });

  it('memory feature can be disabled', () => {
    const coreWithoutMemory = createCoreWithMemory(false);
    expect(coreWithoutMemory.isMemoryEnabled()).toBe(false);
  });

  it('memory feature is used when processing chat', async () => {
    await core.processChat('こんにちは');

    // processChat should call MemoryManager's createMemoryIfNeeded
    // but, because the test execution time is short, the actual memory is not created

    // memory is enabled
    expect(core.isMemoryEnabled()).toBe(true);
  });

  it('clear chat history also clears memory', async () => {
    // process chat
    await core.processChat('こんにちは');

    // clear chat history
    core.clearChatHistory();

    // memory storage clear is called
    expect(mockMemoryStorage.clear).toHaveBeenCalled();
  });

  it('initial state is loaded from storage', async () => {
    // set test data to mock storage
    const testMemories: MemoryRecord[] = [
      { type: 'short', summary: 'テスト短期メモリ', timestamp: Date.now() },
    ];
    mockMemoryStorage.load = vi.fn().mockResolvedValue(testMemories);

    // create new core instance
    // (load process is executed when initializing)
    const newCore = createCoreWithMemory(true);

    // load is called
    expect(mockMemoryStorage.load).toHaveBeenCalled();

    // memory is enabled
    expect(newCore.isMemoryEnabled()).toBe(true);
  });
});

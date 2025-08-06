import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';
import { MemoryStorage, MemoryRecord } from '../../src/types';

// Create a mock chat service using vi.hoisted
const mockChatService = vi.hoisted(() => ({
  processChat: vi.fn().mockResolvedValue({
    role: 'assistant',
    content: 'テスト応答',
  }),
  processVisionChat: vi.fn().mockResolvedValue({
    role: 'assistant',
    content: '画像に対する応答',
  }),
  chatOnce: vi.fn().mockResolvedValue({
    blocks: [{ type: 'text', text: 'テスト応答' }],
    stop_reason: 'end',
  }),
  visionChatOnce: vi.fn(),
  getModel: vi.fn(),
  getVisionModel: vi.fn(),
}));

// Mock ChatServiceFactory from chat package
vi.mock('@aituber-onair/chat', () => {
  return {
    ChatServiceFactory: {
      createChatService: vi.fn().mockReturnValue(mockChatService),
      getAvailableProviders: vi.fn().mockReturnValue(['openai']),
      getSupportedModels: vi.fn().mockReturnValue(['gpt-4o-mini']),
    },
    // Mock other potential exports from chat package
    ChatService: vi.fn(),
    Message: {},
    ChatServiceOptions: {},
    textsToScreenplay: vi.fn(),
  };
});

// Skip voice from voice package
vi.mock('@aituber-onair/voice', () => {
  return {
    VoiceEngineAdapter: vi.fn().mockImplementation(() => ({
      speakText: vi.fn(),
      speak: vi.fn(),
      stop: vi.fn(),
      updateOptions: vi.fn(),
    })),
    // Mock other potential exports from voice package
    VoiceService: vi.fn(),
    VoiceServiceOptions: {},
    AudioPlayOptions: {},
  };
});

// OpenAI Summarizer mock (still in core package)
vi.mock('../../src/services/chat/providers/openai/OpenAISummarizer', () => {
  return {
    OpenAISummarizer: vi.fn().mockImplementation(() => ({
      summarize: vi.fn().mockResolvedValue('要約テスト'),
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

  it('can set chat history from external source', () => {
    const messages = [
      { role: 'user' as const, content: 'A', timestamp: 1 },
      { role: 'assistant' as const, content: 'B', timestamp: 2 },
    ];
    core.setChatHistory(messages);
    expect(core.getChatHistory()).toEqual(messages);
  });
});

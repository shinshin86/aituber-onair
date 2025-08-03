import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';
import { Message } from '../../src/types';

// Create a mock chat service using vi.hoisted
const mockChatService = vi.hoisted(() => ({
  chatOnce: vi.fn().mockResolvedValue({
    blocks: [{ type: 'text', text: 'generated' }],
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

describe('AITuberOnAirCore generateOneShotContentFromHistory', () => {
  let core: AITuberOnAirCore;

  beforeEach(() => {
    vi.clearAllMocks();
    const options: AITuberOnAirCoreOptions = {
      apiKey: 'test',
      chatOptions: { systemPrompt: 'system' },
    };
    core = new AITuberOnAirCore(options);
  });

  it('should send system prompt and provided message history to chatOnce', async () => {
    const history: Message[] = [
      { role: 'user', content: 'A', timestamp: 1 },
      { role: 'assistant', content: 'B', timestamp: 2 },
    ];

    await core.generateOneShotContentFromHistory('Write a blog post', history);

    expect(mockChatService.chatOnce).toHaveBeenCalledTimes(1);
    const args = mockChatService.chatOnce.mock.calls[0];
    const messages = args[0] as Message[];
    const stream = args[1];

    expect(stream).toBe(false);
    expect(messages[0]).toEqual({
      role: 'system',
      content: 'Write a blog post',
    });
    expect(messages.slice(1)).toEqual(history);
  });

  it('should work with empty message history', async () => {
    const emptyHistory: Message[] = [];

    await core.generateOneShotContentFromHistory(
      'Create a summary',
      emptyHistory,
    );

    const messages = mockChatService.chatOnce.mock.calls[0][0] as Message[];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      role: 'system',
      content: 'Create a summary',
    });
  });

  it('should return generated text from chatOnce response', async () => {
    const history: Message[] = [
      { role: 'user', content: 'test message', timestamp: 1 },
    ];

    mockChatService.chatOnce.mockResolvedValue({
      blocks: [
        { type: 'text', text: 'generated' },
        { type: 'text', text: 'content' },
        { type: 'other', content: 'ignored' },
      ],
      stop_reason: 'end',
    });

    const result = await core.generateOneShotContentFromHistory(
      'Write something',
      history,
    );

    expect(result).toBe('generatedcontent');
  });
});

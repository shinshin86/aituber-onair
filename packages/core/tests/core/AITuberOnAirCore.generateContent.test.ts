import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';
import { Message } from '../../src/types';

// Mock OpenAIChatService
vi.mock('../../services/chat/OpenAIChatService', () => {
  return {
    OpenAIChatService: vi.fn().mockImplementation(() => ({
      chatOnce: vi.fn().mockResolvedValue({
        blocks: [{ type: 'text', text: 'generated' }],
        stop_reason: 'end',
      }),
      visionChatOnce: vi.fn(),
      getModel: vi.fn(),
      getVisionModel: vi.fn(),
    })),
  };
});

// Skip voice
vi.mock('../../services/voice/VoiceEngineAdapter', () => {
  return {
    VoiceEngineAdapter: vi.fn().mockImplementation(() => ({
      speakText: vi.fn(),
      speak: vi.fn(),
      stop: vi.fn(),
      updateOptions: vi.fn(),
    })),
  };
});

describe('AITuberOnAirCore generateContentFromHistory', () => {
  let core: AITuberOnAirCore;
  let chatServiceMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const options: AITuberOnAirCoreOptions = {
      apiKey: 'test',
      chatOptions: { systemPrompt: 'system' },
    };
    core = new AITuberOnAirCore(options);
    chatServiceMock = (core as any).chatService;
  });

  it('should send system prompt and chat log to chatOnce', async () => {
    const history: Message[] = [
      { role: 'user', content: 'A', timestamp: 1 },
      { role: 'assistant', content: 'B', timestamp: 2 },
    ];
    core.setChatHistory(history);

    await core.generateContentFromHistory('ブログを書いて');

    expect(chatServiceMock.chatOnce).toHaveBeenCalledTimes(1);
    const args = chatServiceMock.chatOnce.mock.calls[0];
    const messages = args[0] as Message[];
    const stream = args[1];

    expect(stream).toBe(false);
    expect(messages[0]).toEqual({ role: 'system', content: 'ブログを書いて' });
    expect(messages.slice(1)).toEqual(history);
  });

  it('should include memory when available', async () => {
    (core as any).memoryManager = {
      getMemoryForPrompt: vi.fn().mockReturnValue('MEMORY'),
    };
    core.setChatHistory([{ role: 'user', content: 'C', timestamp: 3 }]);

    await core.generateContentFromHistory('指示');

    const messages = chatServiceMock.chatOnce.mock.calls[0][0] as Message[];
    expect(messages[1]).toEqual({ role: 'system', content: 'MEMORY' });
  });
});

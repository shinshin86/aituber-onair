import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';
import { ChatServiceFactory } from '@aituber-onair/chat';
import { VoiceEngineAdapter } from '@aituber-onair/voice';

const createChatService = vi.hoisted(() => vi.fn().mockReturnValue({}));

vi.mock('@aituber-onair/chat', () => {
  return {
    ChatServiceFactory: {
      createChatService,
    },
    ChatService: vi.fn(),
    Message: {},
    ChatServiceOptions: {},
    textsToScreenplay: vi.fn(),
    textToScreenplay: vi.fn(),
    screenplayToText: vi.fn(),
  };
});

vi.mock('@aituber-onair/voice', () => {
  return {
    VoiceEngineAdapter: vi.fn().mockImplementation(() => ({
      speakText: vi.fn(),
      speak: vi.fn(),
      stop: vi.fn(),
      updateOptions: vi.fn(),
      switchEngine: vi.fn(),
    })),
    VoiceService: vi.fn(),
    VoiceServiceOptions: {},
    AudioPlayOptions: {},
  };
});

const createOptions = (
  overrides: Partial<AITuberOnAirCoreOptions> = {},
): AITuberOnAirCoreOptions => ({
  apiKey: 'test-api-key',
  chatOptions: {
    systemPrompt: 'system',
  },
  ...overrides,
});

describe('AITuberOnAirCore buildChatServiceOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes base options and provider options to ChatServiceFactory', () => {
    const options = createOptions({
      chatProvider: 'openai',
      model: 'base-model',
      providerOptions: {
        responseLength: 'short',
      },
    });

    new AITuberOnAirCore(options);

    const mockCreate = vi.mocked(ChatServiceFactory.createChatService);
    expect(mockCreate).toHaveBeenCalledWith(
      'openai',
      expect.objectContaining({
        apiKey: 'test-api-key',
        model: 'base-model',
        responseLength: 'short',
        tools: [],
      }),
    );
  });

  it('selects provider-specific options for gemini', () => {
    const options = createOptions({
      chatProvider: 'gemini',
      model: 'gemini-model',
      providerOptions: {
        responseLength: 'long',
      },
    });

    new AITuberOnAirCore(options);

    const mockCreate = vi.mocked(ChatServiceFactory.createChatService);
    expect(mockCreate).toHaveBeenCalledWith(
      'gemini',
      expect.objectContaining({
        apiKey: 'test-api-key',
        model: 'gemini-model',
        responseLength: 'long',
        tools: [],
      }),
    );
  });

  it('passes endpoint options for openai-compatible provider', () => {
    const options = createOptions({
      chatProvider: 'openai-compatible',
      apiKey: '',
      model: 'local-model',
      providerOptions: {
        endpoint: 'http://localhost:11434/v1/chat/completions',
      },
    });

    new AITuberOnAirCore(options);

    const mockCreate = vi.mocked(ChatServiceFactory.createChatService);
    expect(mockCreate).toHaveBeenCalledWith(
      'openai-compatible',
      expect.objectContaining({
        apiKey: '',
        model: 'local-model',
        endpoint: 'http://localhost:11434/v1/chat/completions',
        tools: [],
      }),
    );
  });

  it('switches voice engine via switchEngine when voice service exists', () => {
    const core = new AITuberOnAirCore(
      createOptions({
        voiceOptions: {
          engineType: 'voicevox',
          speaker: '1',
        },
      }),
    );

    const nextOptions = {
      engineType: 'openai' as const,
      speaker: 'alloy',
      apiKey: 'test-openai-key',
    };

    core.updateVoiceService(nextOptions);

    const voiceAdapterMock = vi.mocked(VoiceEngineAdapter);
    expect(voiceAdapterMock).toHaveBeenCalledTimes(1);

    const instance = voiceAdapterMock.mock.results[0]?.value as {
      switchEngine: ReturnType<typeof vi.fn>;
      updateOptions: ReturnType<typeof vi.fn>;
    };

    expect(instance.switchEngine).toHaveBeenCalledWith(nextOptions);
    expect(instance.updateOptions).not.toHaveBeenCalled();
  });
});

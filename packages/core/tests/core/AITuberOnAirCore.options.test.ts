import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../src/core/AITuberOnAirCore';
import { ChatServiceFactory } from '@aituber-onair/chat';

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
});

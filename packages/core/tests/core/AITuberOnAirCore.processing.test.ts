import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
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
    textToScreenplay: vi.fn().mockReturnValue({ text: '' }),
    screenplayToText: vi.fn().mockReturnValue(''),
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

describe('AITuberOnAirCore processing flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits processing start/end in order for processChat', async () => {
    const core = new AITuberOnAirCore(createOptions());
    const chatProcessor = (core as any).chatProcessor;

    vi.spyOn(chatProcessor, 'processTextChat').mockResolvedValue(undefined);

    const events: string[] = [];
    const payloads: Array<Record<string, unknown>> = [];

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, (payload) => {
      events.push('start');
      payloads.push(payload as Record<string, unknown>);
    });
    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => events.push('end'));

    const result = await core.processChat('hello');

    expect(result).toBe(true);
    expect(events).toEqual(['start', 'end']);
    expect(payloads[0]).toEqual({ text: 'hello' });
  });

  it('emits error before processing end on failure', async () => {
    const core = new AITuberOnAirCore(createOptions());
    const chatProcessor = (core as any).chatProcessor;

    vi
      .spyOn(chatProcessor, 'processTextChat')
      .mockRejectedValue(new Error('boom'));

    const events: string[] = [];

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, () => events.push('start'));
    core.on(AITuberOnAirCoreEvent.ERROR, () => events.push('error'));
    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => events.push('end'));

    const result = await core.processChat('hello');

    expect(result).toBe(false);
    expect(events).toEqual(['start', 'error', 'end']);
  });

  it('emits vision start/end and updates prompt when provided', async () => {
    const core = new AITuberOnAirCore(createOptions());
    const chatProcessor = (core as any).chatProcessor;

    const updateSpy = vi.spyOn(chatProcessor, 'updateOptions');
    const processSpy = vi
      .spyOn(chatProcessor, 'processVisionChat')
      .mockResolvedValue(undefined);

    const events: Array<Record<string, unknown> | string> = [];

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, (payload) => {
      events.push(payload as Record<string, unknown>);
    });
    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => events.push('end'));

    const result = await core.processVisionChat(
      'data:image/png;base64,xxx',
      'prompt',
    );

    expect(result).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ visionPrompt: 'prompt' });
    expect(processSpy).toHaveBeenCalledWith('data:image/png;base64,xxx');
    expect(events).toEqual([{ type: 'vision' }, 'end']);
  });
});

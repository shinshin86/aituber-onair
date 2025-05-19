import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { VoiceServiceOptions } from '../../src/services/voice/VoiceService';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
  AITuberOnAirCoreEvent,
} from '../../src/core/AITuberOnAirCore';

// biome-ignore lint/style/noVar: To avoid TDZ, var is required
var lastVoiceInstance: any;
// biome-ignore lint/style/noVar: To keep the mock function outside
var VoiceEngineAdapter: Mock;

vi.mock('../../src/services/voice/VoiceEngineAdapter', () => {
  const createVoiceInstance = (opts: VoiceServiceOptions) => ({
    options: { ...opts },
    speakText: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    updateOptions: vi
      .fn()
      .mockImplementation((u: Partial<VoiceServiceOptions>) => {
        lastVoiceInstance.options = { ...lastVoiceInstance.options, ...u };
      }),
  });

  VoiceEngineAdapter = vi.fn((opts: VoiceServiceOptions) => {
    lastVoiceInstance = createVoiceInstance(opts);
    return lastVoiceInstance;
  });

  return { VoiceEngineAdapter };
});

vi.mock('@/services/chat/ChatServiceFactory', () => ({
  ChatServiceFactory: {
    createChatService: vi.fn(() => ({})),
    getAvailableProviders: vi.fn(() => []),
    getSupportedModels: vi.fn(() => []),
  },
}));

// Utility to create core instance
const createCore = (withVoice = true) => {
  const options: AITuberOnAirCoreOptions = {
    apiKey: 'test-api-key',
    chatOptions: {
      systemPrompt: 'sys',
      visionSystemPrompt: 'vision',
      visionPrompt: 'prompt',
    },
  };
  if (withVoice) {
    options.voiceOptions = { engineType: 'voicevox', speaker: '1' };
  }
  return new AITuberOnAirCore(options);
};

beforeEach(() => {
  vi.clearAllMocks();
  lastVoiceInstance = undefined;
});

describe('AITuberOnAirCore Voice features', () => {
  it('updateVoiceService updates existing service', () => {
    const core = createCore(true);
    const instance = lastVoiceInstance;

    const newOpts: VoiceServiceOptions = {
      engineType: 'voicevox',
      speaker: '2',
    };
    core.updateVoiceService(newOpts);

    expect(instance.updateOptions).toHaveBeenCalledWith(newOpts);
    expect(VoiceEngineAdapter).toHaveBeenCalledTimes(1);
  });

  it('updateVoiceService creates service when none', () => {
    const core = createCore(false);

    const opts: VoiceServiceOptions = { engineType: 'voicevox', speaker: '3' };
    core.updateVoiceService(opts);

    expect(VoiceEngineAdapter).toHaveBeenCalledTimes(1);
    expect(lastVoiceInstance.options).toEqual(opts);
  });

  it('stopSpeech stops playback and emits event', () => {
    const core = createCore(true);
    const instance = lastVoiceInstance;
    const endHandler = vi.fn();
    core.on(AITuberOnAirCoreEvent.SPEECH_END, endHandler);

    core.stopSpeech();

    expect(instance.stop).toHaveBeenCalled();
    expect(endHandler).toHaveBeenCalled();
  });

  it('speakTextWithOptions applies options and emits events', async () => {
    const core = createCore(true);
    const instance = lastVoiceInstance;
    const start = vi.fn();
    const end = vi.fn();
    const error = vi.fn();

    core.on(AITuberOnAirCoreEvent.SPEECH_START, start);
    core.on(AITuberOnAirCoreEvent.SPEECH_END, end);
    core.on(AITuberOnAirCoreEvent.ERROR, error);

    await core.speakTextWithOptions('[happy] Hello', {
      enableAnimation: true,
      temporaryVoiceOptions: { speaker: '2' },
      audioElementId: 'el',
    });

    expect(instance.updateOptions.mock.calls[0][0]).toEqual({ speaker: '2' });
    expect(instance.updateOptions.mock.calls[1][0]).toEqual({
      speaker: '1',
      engineType: 'voicevox',
      apiKey: undefined,
    });
    expect(instance.speakText).toHaveBeenCalledWith('[happy] Hello', {
      enableAnimation: true,
      audioElementId: 'el',
    });
    expect(start).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('speakTextWithOptions handles errors and restores options', async () => {
    const core = createCore(true);
    const instance = lastVoiceInstance;
    const err = new Error('fail');
    instance.speakText.mockRejectedValueOnce(err);
    const error = vi.fn();
    const end = vi.fn();
    core.on(AITuberOnAirCoreEvent.ERROR, error);
    core.on(AITuberOnAirCoreEvent.SPEECH_END, end);

    await core.speakTextWithOptions('hello', {
      temporaryVoiceOptions: { speaker: '2' },
    });

    expect(error).toHaveBeenCalledWith(err);
    expect(end).not.toHaveBeenCalled();
    expect(instance.updateOptions.mock.calls[0][0]).toEqual({ speaker: '2' });
    expect(instance.updateOptions.mock.calls[1][0]).toEqual({
      speaker: '1',
      engineType: 'voicevox',
      apiKey: undefined,
    });
  });
});

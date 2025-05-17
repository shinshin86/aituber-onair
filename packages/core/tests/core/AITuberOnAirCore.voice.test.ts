import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
  AITuberOnAirCoreEvent,
} from '../../src/core/AITuberOnAirCore';
import { VoiceServiceOptions } from '../../src/services/voice/VoiceService';

// Mock OpenAIChatService to avoid real API calls
vi.mock('../../services/chat/OpenAIChatService', () => {
  return {
    OpenAIChatService: vi.fn().mockImplementation(() => ({
      processChat: vi.fn().mockResolvedValue(undefined),
      processVisionChat: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

let lastVoiceInstance: any;

// Helper to create a mock VoiceEngineAdapter instance
function createVoiceInstance(opts: VoiceServiceOptions) {
  const instance: any = {
    options: { ...opts },
    speakText: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    updateOptions: vi.fn().mockImplementation((u: Partial<VoiceServiceOptions>) => {
      instance.options = { ...instance.options, ...u };
    }),
  };
  return instance;
}

// Mock VoiceEngineAdapter
const VoiceEngineAdapter = vi
  .fn()
  .mockImplementation((opts: VoiceServiceOptions) => {
    lastVoiceInstance = createVoiceInstance(opts);
    return lastVoiceInstance;
  });
vi.mock('../../services/voice/VoiceEngineAdapter', () => {
  return { VoiceEngineAdapter };
});

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

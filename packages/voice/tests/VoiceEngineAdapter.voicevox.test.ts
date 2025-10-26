import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceEngineAdapter } from '../src/services/VoiceEngineAdapter';
import type { VoiceServiceOptions } from '../src/services/VoiceService';

vi.mock('../src/services/audio/AudioPlayerFactory', () => ({
  AudioPlayerFactory: {
    createAudioPlayer: () => ({
      play: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      setOnComplete: vi.fn(),
    }),
  },
}));

describe('VoiceEngineAdapter VOICEVOX integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('applies VOICEVOX overrides to synthesis request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speedScale: 1.0,
          pitchScale: 0,
          intonationScale: 1.0,
          volumeScale: 1.0,
          prePhonemeLength: 0,
          postPhonemeLength: 0,
          pauseLength: null,
          pauseLengthScale: 1,
          outputSamplingRate: 24000,
          outputStereo: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => ({
          arrayBuffer: async () => new ArrayBuffer(8),
        }),
      });

    global.fetch = fetchMock as any;

    const adapter = new VoiceEngineAdapter({
      engineType: 'voicevox',
      speaker: '1',
      voicevoxSpeedScale: 1.25,
      voicevoxVolumeScale: 0.9,
    } as VoiceServiceOptions);

    await adapter.speak({ text: 'テストです' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, synthesisConfig] = fetchMock.mock.calls[1];
    const body = JSON.parse(synthesisConfig.body);
    expect(body.speedScale).toBe(1.25);
    expect(body.volumeScale).toBe(0.9);
  });
});

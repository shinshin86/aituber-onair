import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceEngineAdapter } from '../src/services/VoiceEngineAdapter';

const player = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  setOnComplete: vi.fn(),
}));
vi.mock('../src/services/audio/AudioPlayerFactory', () => ({
  AudioPlayerFactory: { createAudioPlayer: () => player },
}));

describe('Gradium adapter transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('propagates model updates to real engine requests and preserves audio', async () => {
    const audio = new Uint8Array([82, 73, 70, 70]).buffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({ arrayBuffer: async () => audio }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new VoiceEngineAdapter({
      engineType: 'gradium',
      speaker: 'YTpq7expH9539ERJ',
      apiKey: 'test-api-key',
      gradiumApiUrl: 'https://example.com/api/post/speech/tts',
    });

    await adapter.speak({ text: 'Production' });
    adapter.updateOptions({ gradiumModel: 'gradium-tts-beta' });
    await adapter.speak({ text: 'Beta' });
    adapter.updateOptions({ gradiumModel: 'default' });
    await adapter.speak({ text: 'Production again' });
    adapter.updateOptions({ gradiumModel: undefined });
    await adapter.speak({ text: 'Production without selection' });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).model_name),
    ).toEqual([undefined, 'gradium-tts-beta', 'default', undefined]);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toBe('https://example.com/api/post/speech/tts');
      expect(init.headers['x-api-key']).toBe('test-api-key');
      expect(JSON.parse(init.body)).toMatchObject({
        voice_id: 'YTpq7expH9539ERJ',
        output_format: 'wav',
        only_audio: true,
      });
    }
    expect(player.play).toHaveBeenCalledTimes(4);
    expect(player.play.mock.calls.every(([buffer]) => buffer === audio)).toBe(
      true,
    );
  });
});

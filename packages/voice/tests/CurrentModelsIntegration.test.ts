import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceEngineAdapter } from '../src/services/VoiceEngineAdapter';

vi.mock('../src/services/audio/AudioPlayerFactory', () => ({
  AudioPlayerFactory: {
    createAudioPlayer: () => ({ setOnComplete: vi.fn(), dispose: vi.fn() }),
  },
}));

afterEach(() => vi.restoreAllMocks());

describe('current model runtime updates', () => {
  it('routes released and preview Fish Audio selections through the existing HTTP engine', async () => {
    const audio = new Uint8Array([73, 68, 51, 0, 127, 128, 254, 255]).buffer;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => audio,
    } as Response);
    const onPlay = vi.fn();
    const adapter = new VoiceEngineAdapter({
      engineType: 'fishAudio',
      speaker: 'fixture-reference-id',
      apiKey: '<YOUR_API_KEY>',
      fishAudioFormat: 'mp3',
      fishAudioSpeed: 1.1,
      onPlay,
    });
    const text = '[laugh] こんにちは。<whisper>またね。</whisper>';
    await adapter.speak({ text });

    for (const model of ['drama-3', 'drama-3-preview', 's2-pro'] as const) {
      adapter.updateOptions({ fishAudioModel: model });
      await adapter.speak({ text });
    }

    expect(
      fetchMock.mock.calls.map(([url, request]) => ({
        url,
        headers: request?.headers,
        body: JSON.parse(request?.body as string),
      })),
    ).toEqual(
      ['s2-pro', 'drama-3', 'drama-3-preview', 's2-pro'].map((model) => ({
        url: 'https://api.fish.audio/v1/tts',
        headers: {
          Authorization: 'Bearer <YOUR_API_KEY>',
          'Content-Type': 'application/json',
          model,
        },
        body: {
          text,
          reference_id: 'fixture-reference-id',
          format: 'mp3',
          latency: 'normal',
          prosody: { speed: 1.1 },
        },
      })),
    );
    expect(onPlay).toHaveBeenCalledTimes(4);
    expect(onPlay).toHaveBeenCalledWith(audio, undefined);
  });

  it('filters Eleven v4 settings after updateOptions and restores them when switching back', async () => {
    const audio = new Uint8Array([73, 68, 51]).buffer;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => ({ arrayBuffer: async () => audio }),
    } as Response);
    const onPlay = vi.fn();
    const adapter = new VoiceEngineAdapter({
      engineType: 'elevenLabs',
      speaker: 'voice-id',
      apiKey: 'test-key',
      elevenLabsModel: 'eleven_flash_v2_5',
      elevenLabsVoiceSettings: {
        style: 0.4,
        speed: 1.1,
        useSpeakerBoost: true,
      },
      elevenLabsStability: 0.5,
      elevenLabsSimilarityBoost: 0.8,
      onPlay,
    });

    adapter.updateOptions({ elevenLabsModel: 'eleven_v4' });
    await adapter.speak({ text: 'Hello' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.elevenlabs.io/v1/text-to-speech/voice-id?output_format=mp3_44100_128',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      text: 'Hello',
      model_id: 'eleven_v4',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    });
    expect(onPlay).toHaveBeenCalledWith(audio, undefined);

    adapter.updateOptions({ elevenLabsModel: 'eleven_flash_v2_5' });
    await adapter.speak({ text: 'Hello again' });
    expect(
      JSON.parse(fetchMock.mock.calls[1][1]?.body as string).voice_settings,
    ).toEqual({
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.4,
      speed: 1.1,
      use_speaker_boost: true,
    });
  });

  it('routes Cartesia runtime model updates through the existing pinned transport', async () => {
    const audio = new Uint8Array([82, 73, 70, 70]).buffer;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => audio,
    } as Response);
    const onPlay = vi.fn();
    const adapter = new VoiceEngineAdapter({
      engineType: 'cartesia',
      speaker: 'voice-id',
      apiKey: 'test-key',
      onPlay,
    });

    for (const model of ['sonic-3.6', 'sonic-3.6-2026-08-27']) {
      adapter.updateOptions({ cartesiaModel: model });
      await adapter.speak({ text: 'こんにちは' });
      const [url, request] = fetchMock.mock.calls.at(-1)!;
      expect(url).toBe('https://api.cartesia.ai/tts/bytes');
      expect(request?.headers).toMatchObject({
        'Cartesia-Version': '2026-03-01',
      });
      expect(JSON.parse(request?.body as string)).toMatchObject({
        model_id: model,
        voice: { id: 'voice-id' },
        language: 'ja',
        output_format: { container: 'wav' },
      });
    }
    expect(onPlay).toHaveBeenCalledTimes(2);
    expect(onPlay).toHaveBeenCalledWith(audio, undefined);
  });
});

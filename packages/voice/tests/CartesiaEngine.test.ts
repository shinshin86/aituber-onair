import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartesiaEngine } from '../src/engines/CartesiaEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CartesiaEngine', () => {
  it('sends a Sonic 3.5 WAV request and returns audio bytes', async () => {
    const audio = new Uint8Array([4, 5, 6]).buffer;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => audio,
    } as Response);
    const engine = new CartesiaEngine();

    const result = await engine.fetchAudio(
      { message: ' こんにちは ', style: 'neutral' },
      'cartesia-voice-id',
      'sk_car_test',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cartesia.ai/tts/bytes',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk_car_test',
          'Cartesia-Version': '2026-03-01',
          'Content-Type': 'application/json',
        },
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      model_id: 'sonic-3.5',
      transcript: 'こんにちは',
      voice: { id: 'cartesia-voice-id' },
      output_format: {
        container: 'wav',
        encoding: 'pcm_s16le',
        sample_rate: 44100,
      },
      language: 'ja',
    });
    expect(result).toBe(audio);
  });

  it('supports MP3 output and custom synthesis options', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    const engine = new CartesiaEngine();
    engine.setApiEndpoint('https://example.com/tts/bytes');
    engine.setModel('sonic-3');
    engine.setLanguage('en');
    engine.setOutputContainer('mp3');
    engine.setSampleRate(24000);
    engine.setMp3Bitrate(96000);

    await engine.fetchAudio(
      { message: 'hello', style: 'neutral' },
      'voice-id',
      'cartesia-key',
    );

    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/tts/bytes');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      model_id: 'sonic-3',
      transcript: 'hello',
      voice: { id: 'voice-id' },
      output_format: {
        container: 'mp3',
        sample_rate: 24000,
        bit_rate: 96000,
      },
      language: 'en',
    });
  });

  it.each([
    ['', 'voice-id', 'Cartesia API key is required'],
    ['cartesia-key', '', 'Cartesia voice ID is required'],
  ])('validates required configuration', async (apiKey, voice, message) => {
    const engine = new CartesiaEngine();
    await expect(
      engine.fetchAudio({ message: 'hello', style: 'neutral' }, voice, apiKey),
    ).rejects.toThrow(message);
  });

  it('reports API response details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'invalid voice',
    } as Response);
    const engine = new CartesiaEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' },
        'voice-id',
        'cartesia-key',
      ),
    ).rejects.toThrow('Failed to fetch TTS from Cartesia: 400 - invalid voice');
  });
});

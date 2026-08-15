import { afterEach, describe, expect, it, vi } from 'vitest';
import { FishAudioEngine } from '../src/engines/FishAudioEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FishAudioEngine', () => {
  it('sends the documented JSON request and returns audio bytes', async () => {
    const audio = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => audio,
    } as Response);
    const engine = new FishAudioEngine();
    engine.setApiEndpoint('https://example.com/v1/tts');
    engine.setModel('s2.1-pro-free');
    engine.setFormat('mp3');
    engine.setSampleRate(44100);
    engine.setMp3Bitrate(192);
    engine.setLatency('low');
    engine.setSpeed(1.25);

    const result = await engine.fetchAudio(
      { message: ' こんにちは ', style: 'happy' },
      'voice-model-id',
      'fish-key',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/v1/tts',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer fish-key',
          'Content-Type': 'application/json',
          model: 's2.1-pro-free',
        },
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      text: 'こんにちは',
      reference_id: 'voice-model-id',
      format: 'mp3',
      latency: 'low',
      sample_rate: 44100,
      mp3_bitrate: 192,
      prosody: { speed: 1.25 },
    });
    expect(result).toBe(audio);
  });

  it('omits MP3 bitrate for non-MP3 output and clamps speed', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response);
    const engine = new FishAudioEngine();
    engine.setFormat('wav');
    engine.setMp3Bitrate(192);
    engine.setSpeed(10);

    await engine.fetchAudio(
      { message: 'hello', style: 'neutral' },
      'voice-id',
      'fish-key',
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      text: 'hello',
      reference_id: 'voice-id',
      format: 'wav',
      latency: 'normal',
      prosody: { speed: 2 },
    });
  });

  it.each([
    ['', 'voice-id', 'Fish Audio API key is required'],
    ['fish-key', '', 'Fish Audio reference ID is required'],
  ])('validates required configuration', async (apiKey, voice, message) => {
    const engine = new FishAudioEngine();
    await expect(
      engine.fetchAudio({ message: 'hello', style: 'neutral' }, voice, apiKey),
    ).rejects.toThrow(message);
  });

  it('reports API response details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => 'insufficient balance',
    } as Response);
    const engine = new FishAudioEngine();

    await expect(
      engine.fetchAudio(
        { message: 'hello', style: 'neutral' },
        'voice-id',
        'fish-key',
      ),
    ).rejects.toThrow(
      'Failed to fetch TTS from Fish Audio: 402 - insufficient balance',
    );
  });
});

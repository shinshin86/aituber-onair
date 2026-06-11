import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPENAI_TTS_API_URL } from '../src/constants/voiceEngine';
import { OpenAiEngine } from '../src/engines/OpenAiEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenAiEngine', () => {
  it('should send a speech request with clamped speed and default model', async () => {
    const engine = new OpenAiEngine();
    engine.setSpeed(10);
    engine.setModel('   ');
    const audio = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(audio, {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await engine.fetchAudio(
      {
        style: 'talk',
        message: '  Hello  ',
      },
      'alloy',
      'api-key',
    );

    expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledWith(
      OPENAI_TTS_API_URL,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer api-key',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'alloy',
          input: 'Hello',
          speed: 4,
        }),
      }),
    );
  });

  it('should use configured model and lower speed clamp', async () => {
    const engine = new OpenAiEngine();
    engine.setSpeed(0);
    engine.setModel('gpt-4o-mini-tts');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new ArrayBuffer(0)));
    vi.stubGlobal('fetch', fetchMock);

    await engine.fetchAudio(
      {
        style: 'talk',
        message: 'Hello',
      },
      'nova',
      'api-key',
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'gpt-4o-mini-tts',
      speed: 0.25,
    });
  });

  it('should validate required inputs before fetch', async () => {
    const engine = new OpenAiEngine();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      engine.fetchAudio({ style: 'talk', message: 'Hello' }, 'alloy'),
    ).rejects.toThrow('OpenAI API key is required');
    await expect(
      engine.fetchAudio({ style: 'talk', message: 'Hello' }, '', 'api-key'),
    ).rejects.toThrow('OpenAI TTS voice name is required');
    await expect(
      engine.fetchAudio({ style: 'talk', message: '   ' }, 'alloy', 'api-key'),
    ).rejects.toThrow('Input text is empty');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should throw when the OpenAI API returns a non-ok response', async () => {
    const engine = new OpenAiEngine();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('server error', {
          status: 500,
        }),
      ),
    );

    await expect(
      engine.fetchAudio(
        { style: 'talk', message: 'Hello' },
        'alloy',
        'api-key',
      ),
    ).rejects.toThrow('Failed to fetch TTS from OpenAI TTS.');
  });

  it('should return the default or custom test message', () => {
    const engine = new OpenAiEngine();

    expect(engine.getTestMessage()).toBe('OpenAI TTSを使用します');
    expect(engine.getTestMessage('custom')).toBe('custom');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPENROUTER_TTS_API_URL, VoiceEngineAdapter } from '../src';
import { parseWavHeader, getWavDataOffset } from '../src/utils/wavHeader';

const player = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  setOnComplete: vi.fn(),
}));
vi.mock('../src/services/audio/AudioPlayerFactory', () => ({
  AudioPlayerFactory: { createAudioPlayer: () => player },
}));

const model = 'microsoft/mai-voice-2.1';
const flash = 'microsoft/mai-voice-2.1-flash';
const voice = 'en-US-Harper:MAI-Voice-2.1';
const flashVoice = 'en-US-Harper:MAI-Voice-2.1-Flash';

function mockAudio() {
  const audio = new Uint8Array([0, 0, 0xff, 0x7f, 0, 0x80]).buffer;
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'audio/pcm' }),
    arrayBuffer: async () => audio,
  });
  vi.stubGlobal('fetch', fetchMock);
  return { audio, fetchMock };
}

function expectWavPayload(wav: ArrayBuffer, pcm: ArrayBuffer) {
  // These are the same header readers used by the unchanged Node player.
  expect(parseWavHeader(wav)).toEqual({
    audioFormat: 1,
    channels: 1,
    sampleRate: 24000,
    bitsPerSample: 16,
  });
  expect(getWavDataOffset(wav)).toBe(44);
  expect(new Uint8Array(wav, 44)).toEqual(new Uint8Array(pcm));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('OpenRouter adapter transport', () => {
  it('propagates key, model, voice and endpoint updates through the real engine to WAV playback', async () => {
    const { audio, fetchMock } = mockAudio();
    const adapter = new VoiceEngineAdapter({
      engineType: 'openRouter',
      speaker: voice,
      openRouterModel: model,
      apiKey: 'first-key',
    });
    await adapter.speak({ text: 'Full model', emotion: 'happy' });
    adapter.updateOptions({
      openRouterModel: flash,
      speaker: flashVoice,
      apiKey: 'second-key',
      openRouterApiUrl: 'https://proxy.example.test/speech',
    });
    await adapter.speak({ text: 'Flash model' });
    adapter.updateOptions({ openRouterApiUrl: undefined });
    await adapter.speak({ text: 'Default endpoint again' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      OPENROUTER_TTS_API_URL,
      'https://proxy.example.test/speech',
      OPENROUTER_TTS_API_URL,
    ]);
    expect(
      fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body)),
    ).toEqual([
      { model, voice, input: 'Full model', response_format: 'pcm' },
      {
        model: flash,
        voice: flashVoice,
        input: 'Flash model',
        response_format: 'pcm',
      },
      {
        model: flash,
        voice: flashVoice,
        input: 'Default endpoint again',
        response_format: 'pcm',
      },
    ]);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer second-key',
    );
    expect(player.play).toHaveBeenCalledTimes(3);
    for (const [buffer] of player.play.mock.calls) {
      expectWavPayload(buffer, audio);
    }
  });

  it('clears stale voices on model-only updates and requires reselection', async () => {
    const { fetchMock } = mockAudio();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const adapter = new VoiceEngineAdapter({
      engineType: 'openRouter',
      speaker: voice,
      openRouterModel: model,
      apiKey: 'key',
    });
    adapter.updateOptions({ openRouterModel: flash });
    expect(adapter.getOptions().speaker).toBe('');
    await expect(
      adapter.speakText('Do not send stale voice'),
    ).rejects.toMatchObject({ kind: 'configuration' });
    expect(fetchMock).not.toHaveBeenCalled();
    adapter.updateOptions({ speaker: flashVoice });
    await adapter.speakText('Selected new voice');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    adapter.updateOptions({ openRouterModel: flash });
    expect(adapter.getOptions().speaker).toBe(flashVoice);
  });

  it('rejects mismatched explicit voice updates and reset models before transport', async () => {
    const { fetchMock } = mockAudio();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const adapter = new VoiceEngineAdapter({
      engineType: 'openRouter',
      speaker: voice,
      openRouterModel: model,
      apiKey: 'key',
    });
    adapter.updateOptions({ openRouterModel: flash, speaker: voice });
    await expect(adapter.speakText('Wrong suffix')).rejects.toMatchObject({
      kind: 'configuration',
    });
    adapter.updateOptions({ openRouterModel: undefined });
    await expect(adapter.speakText('No model fallback')).rejects.toThrow(
      'explicitly',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  it('supports runtime engine switching without altering existing engine defaults', async () => {
    const { audio, fetchMock } = mockAudio();
    const onPlay = vi.fn().mockResolvedValue(undefined);
    const adapter = new VoiceEngineAdapter({
      engineType: 'none',
      speaker: '',
      onPlay,
    });
    adapter.switchEngine({
      engineType: 'openRouter',
      openRouterModel: model,
      speaker: voice,
      apiKey: 'key',
      onPlay,
    });
    await adapter.speakText('Switched');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expectWavPayload(onPlay.mock.calls[0][0], audio);
    expect(onPlay.mock.calls[0][1]).toBeUndefined();
    adapter.switchEngine({ engineType: 'none', speaker: '' });
    expect(adapter.getOptions().engineType).toBe('none');
  });
});

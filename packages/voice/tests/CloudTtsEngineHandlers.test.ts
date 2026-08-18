import { describe, expect, it, vi } from 'vitest';
import {
  applyOptionsToEngine,
  getAllowedUpdateKeys,
  mergeOptionsForEngine,
} from '../src/services/internal/engineHandlers';

describe('cloud TTS engine handlers', () => {
  it('applies and merges Fish Audio options', () => {
    const engine = {
      setApiEndpoint: vi.fn(),
      setModel: vi.fn(),
      setFormat: vi.fn(),
      setSampleRate: vi.fn(),
      setMp3Bitrate: vi.fn(),
      setLatency: vi.fn(),
      setSpeed: vi.fn(),
    } as any;
    const options = {
      engineType: 'fishAudio' as const,
      speaker: 'voice-id',
      fishAudioApiUrl: 'https://example.com/v1/tts',
      fishAudioModel: 's2.1-pro' as const,
      fishAudioFormat: 'mp3' as const,
      fishAudioSampleRate: 44100,
      fishAudioMp3Bitrate: 128 as const,
      fishAudioLatency: 'balanced' as const,
      fishAudioSpeed: 1.1,
    };

    applyOptionsToEngine(engine, options);

    expect(engine.setApiEndpoint).toHaveBeenCalledWith(options.fishAudioApiUrl);
    expect(engine.setModel).toHaveBeenCalledWith('s2.1-pro');
    expect(engine.setFormat).toHaveBeenCalledWith('mp3');
    expect(engine.setSampleRate).toHaveBeenCalledWith(44100);
    expect(engine.setMp3Bitrate).toHaveBeenCalledWith(128);
    expect(engine.setLatency).toHaveBeenCalledWith('balanced');
    expect(engine.setSpeed).toHaveBeenCalledWith(1.1);
    expect(getAllowedUpdateKeys('fishAudio')).toContain('fishAudioLatency');
    expect(
      mergeOptionsForEngine(options, { fishAudioLatency: 'low' }),
    ).toMatchObject({ fishAudioLatency: 'low' });
  });

  it('applies and merges Cartesia options', () => {
    const engine = {
      setApiEndpoint: vi.fn(),
      setModel: vi.fn(),
      setLanguage: vi.fn(),
      setOutputContainer: vi.fn(),
      setSampleRate: vi.fn(),
      setMp3Bitrate: vi.fn(),
    } as any;
    const options = {
      engineType: 'cartesia' as const,
      speaker: 'voice-id',
      cartesiaApiUrl: 'https://example.com/tts/bytes',
      cartesiaModel: 'sonic-3.5',
      cartesiaLanguage: 'ja' as const,
      cartesiaOutputContainer: 'wav' as const,
      cartesiaSampleRate: 44100,
      cartesiaMp3Bitrate: 128000,
    };

    applyOptionsToEngine(engine, options);

    expect(engine.setApiEndpoint).toHaveBeenCalledWith(options.cartesiaApiUrl);
    expect(engine.setModel).toHaveBeenCalledWith('sonic-3.5');
    expect(engine.setLanguage).toHaveBeenCalledWith('ja');
    expect(engine.setOutputContainer).toHaveBeenCalledWith('wav');
    expect(engine.setSampleRate).toHaveBeenCalledWith(44100);
    expect(engine.setMp3Bitrate).toHaveBeenCalledWith(128000);
    expect(getAllowedUpdateKeys('cartesia')).toContain('cartesiaLanguage');
    expect(
      mergeOptionsForEngine(options, { cartesiaOutputContainer: 'mp3' }),
    ).toMatchObject({ cartesiaOutputContainer: 'mp3' });
  });
});

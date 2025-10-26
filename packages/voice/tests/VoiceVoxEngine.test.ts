import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceVoxEngine } from '../src/engines/VoiceVoxEngine';

describe('VoiceVoxEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply query overrides and synthesis flags', async () => {
    const engine = new VoiceVoxEngine();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speedScale: 1,
          pitchScale: 0,
          intonationScale: 1,
          volumeScale: 1,
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

    globalThis.fetch = fetchMock as any;

    try {
      engine.setApiEndpoint('http://localhost:50021');
      engine.setQueryParameters({
        speedScale: 1.05,
        volumeScale: 0.95,
      });
      engine.setPitchScale(-0.1);
      engine.setIntonationScale(1.3);
      engine.setPrePhonemeLength(0.2);
      engine.setPostPhonemeLength(0.15);
      engine.setPauseLength(null);
      engine.setPauseLengthScale(1.1);
      engine.setOutputSamplingRate(48000);
      engine.setOutputStereo(true);
      engine.setEnableKatakanaEnglish(false);
      engine.setEnableInterrogativeUpspeak(false);
      engine.setCoreVersion('0.15.0');

      await engine.fetchAudio(
        { message: 'テストです', style: 'happy' } as any,
        '1',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);

      const [queryUrl, queryConfig] = fetchMock.mock.calls[0];
      expect(queryUrl).toContain('audio_query');
      expect(queryUrl).toContain('speaker=1');
      expect(queryUrl).toContain('enable_katakana_english=false');
      expect(queryUrl).toContain('core_version=0.15.0');
      expect(queryConfig.method).toBe('POST');

      const [synthesisUrl, synthesisConfig] = fetchMock.mock.calls[1];
      expect(synthesisUrl).toContain('synthesis');
      expect(synthesisUrl).toContain('enable_interrogative_upspeak=false');
      expect(synthesisUrl).toContain('core_version=0.15.0');
      expect(synthesisConfig.method).toBe('POST');

      const body = JSON.parse(synthesisConfig.body);
      expect(body.speedScale).toBe(1.05);
      expect(body.pitchScale).toBe(-0.1);
      expect(body.intonationScale).toBe(1.3);
      expect(body.volumeScale).toBe(0.95);
      expect(body.prePhonemeLength).toBe(0.2);
      expect(body.postPhonemeLength).toBe(0.15);
      expect(body.pauseLength).toBeNull();
      expect(body.pauseLengthScale).toBe(1.1);
      expect(body.outputSamplingRate).toBe(48000);
      expect(body.outputStereo).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should revert overrides when undefined is provided', async () => {
    const engine = new VoiceVoxEngine();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speedScale: 1,
          pitchScale: 0,
          intonationScale: 1,
          volumeScale: 1,
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

    globalThis.fetch = fetchMock as any;

    try {
      engine.setSpeedScale(1.4);
      engine.setSpeedScale(undefined);
      engine.setOutputStereo(true);
      engine.setOutputStereo(undefined);

      await engine.fetchAudio(
        { message: 'テスト', style: 'neutral' } as any,
        '1',
      );

      const [, synthesisConfig] = fetchMock.mock.calls[1];
      const body = JSON.parse(synthesisConfig.body);
      expect(body.speedScale).toBe(1.16);
      expect(body.outputStereo).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

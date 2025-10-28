import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AivisSpeechEngine } from '../src/engines/AivisSpeechEngine';

describe('AivisSpeechEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply query overrides and flags', async () => {
    const engine = new AivisSpeechEngine();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speedScale: 1.0,
          pitchScale: 0.0,
          intonationScale: 1.0,
          tempoDynamicsScale: 1.0,
          volumeScale: 1.0,
          prePhonemeLength: 0.0,
          postPhonemeLength: 0.0,
          pauseLength: null,
          pauseLengthScale: 1.0,
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
      engine.setApiEndpoint('http://localhost:10101');
      engine.setQueryParameters({
        speedScale: 1.2,
        tempoDynamicsScale: 1.1,
      });
      engine.setPitchScale(-0.05);
      engine.setIntonationScale(1.3);
      engine.setVolumeScale(0.9);
      engine.setPrePhonemeLength(0.2);
      engine.setPostPhonemeLength(0.15);
      engine.setPauseLength(null);
      engine.setPauseLengthScale(1.2);
      engine.setOutputSamplingRate(44100);
      engine.setOutputStereo(true);

      await engine.fetchAudio(
        { message: 'テストです', style: 'happy' } as any,
        '100',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);

      const [queryUrl] = fetchMock.mock.calls[0];
      expect(queryUrl).not.toContain('enable_katakana_english');
      expect(queryUrl).not.toContain('core_version');

      const [synthesisUrl, synthesisConfig] = fetchMock.mock.calls[1];
      expect(synthesisUrl).not.toContain('enable_interrogative_upspeak');
      expect(synthesisUrl).not.toContain('core_version');

      const body = JSON.parse(synthesisConfig.body);
      expect(body.speedScale).toBe(1.2);
      expect(body.pitchScale).toBe(-0.05);
      expect(body.intonationScale).toBe(1.3);
      expect(body.tempoDynamicsScale).toBe(1.1);
      expect(body.volumeScale).toBe(0.9);
      expect(body.prePhonemeLength).toBe(0.2);
      expect(body.postPhonemeLength).toBe(0.15);
      expect(body.pauseLength).toBeNull();
      expect(body.pauseLengthScale).toBe(1.2);
      expect(body.outputSamplingRate).toBe(44100);
      expect(body.outputStereo).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should reset overrides when undefined is provided', async () => {
    const engine = new AivisSpeechEngine();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speedScale: 1.0,
          pitchScale: 0.0,
          intonationScale: 1.0,
          tempoDynamicsScale: 1.0,
          volumeScale: 1.0,
          prePhonemeLength: 0.0,
          postPhonemeLength: 0.0,
          pauseLength: null,
          pauseLengthScale: 1.0,
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
      engine.setSpeedScale(1.3);
      engine.setSpeedScale(undefined);
      engine.setTempoDynamicsScale(1.4);
      engine.setTempoDynamicsScale(undefined);
      engine.setOutputStereo(true);
      engine.setOutputStereo(undefined);

      await engine.fetchAudio(
        { message: 'テスト', style: 'neutral' } as any,
        '100',
      );

      const [, synthesisConfig] = fetchMock.mock.calls[1];
      const body = JSON.parse(synthesisConfig.body);
      expect(body.speedScale).toBe(1.0);
      expect(body.tempoDynamicsScale).toBe(1.0);
      expect(body.outputStereo).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

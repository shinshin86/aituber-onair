import { describe, expect, it, vi } from 'vitest';
import { MinimaxEngine, type MinimaxModel } from '../src/engines/MinimaxEngine';

// No API mocking needed - we only test configuration methods

describe('MinimaxEngine', () => {
  describe('Configuration Methods', () => {
    it('should set and use different models', () => {
      const engine = new MinimaxEngine();
      const models: MinimaxModel[] = [
        'speech-2.6-hd',
        'speech-2.6-turbo',
        'speech-2.5-hd-preview',
        'speech-2.5-turbo-preview',
        'speech-02-hd',
        'speech-02-turbo',
        'speech-01-hd',
        'speech-01-turbo',
      ];

      models.forEach((model) => {
        engine.setModel(model);
        // Since getModel is private, we'll test this through fetchAudio
        expect(() => engine.setModel(model)).not.toThrow();
      });
    });

    it('should set GroupId', () => {
      const engine = new MinimaxEngine();
      const groupId = 'test-group-id-123';

      expect(() => engine.setGroupId(groupId)).not.toThrow();
    });

    it('should set endpoint to global', () => {
      const engine = new MinimaxEngine();

      expect(() => engine.setEndpoint('global')).not.toThrow();
    });

    it('should set endpoint to china', () => {
      const engine = new MinimaxEngine();

      expect(() => engine.setEndpoint('china')).not.toThrow();
    });

    it('should set language', () => {
      const engine = new MinimaxEngine();

      expect(() => engine.setLanguage('English')).not.toThrow();
      expect(() => engine.setLanguage('Japanese')).not.toThrow();
    });
  });

  describe('Override Handling', () => {
    it('should apply voice and audio overrides in requests', async () => {
      const engine = new MinimaxEngine();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0 },
          data: { audio: '00' },
        }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as any;

      try {
        engine.setVoiceSettings({ speed: 1.4, vol: 0.85, pitch: 2 });
        engine.setSpeed(1.5);
        engine.setVolume(0.9);
        engine.setAudioSettings({
          sampleRate: 44100,
          bitrate: 96000,
          format: 'wav',
          channel: 2,
        });
        engine.setAudioFormat('mp3');
        engine.setSampleRate(32000);
        engine.setBitrate(128000);
        engine.setAudioChannel(1);

        await engine.testVoice('hello world', 'test-speaker', 'api-key');

        expect(fetchMock).toHaveBeenCalled();
        const call = fetchMock.mock.calls[0];
        expect(call[0]).toContain('GroupId=');
        const body = JSON.parse(call[1].body);
        expect(body.voice_setting.speed).toBe(1.5);
        expect(body.voice_setting.vol).toBe(0.9);
        expect(body.voice_setting.pitch).toBe(2);
        expect(body.audio_setting.sample_rate).toBe(32000);
        expect(body.audio_setting.bitrate).toBe(128000);
        expect(body.audio_setting.format).toBe('mp3');
        expect(body.audio_setting.channel).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should fall back to defaults after clearing overrides', async () => {
      const engine = new MinimaxEngine();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          base_resp: { status_code: 0 },
          data: { audio: '00' },
        }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as any;

      try {
        engine.setSpeed(1.6);
        engine.setSpeed(undefined);
        engine.setSampleRate(44100);
        engine.setSampleRate(undefined);

        await engine.testVoice('hello world', 'test-speaker', 'api-key');

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.voice_setting.speed).toBe(1.0);
        expect(body.audio_setting.sample_rate).toBe(32000);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // Note: getVoiceList() API tests removed to avoid requiring API keys in CI/CD

  // Note: testVoice() API tests removed to avoid requiring API keys in CI/CD

  // Note: fetchAudio() API tests removed to avoid requiring API keys in CI/CD

  describe('getTestMessage', () => {
    it('should return default test message', () => {
      const engine = new MinimaxEngine();
      expect(engine.getTestMessage()).toBe('MiniMax Audioを使用します');
    });

    it('should return custom test message', () => {
      const engine = new MinimaxEngine();
      const customMessage = 'Custom test message';
      expect(engine.getTestMessage(customMessage)).toBe(customMessage);
    });
  });

  // Note: MinimaxEngine doesn't implement isAvailable() and getEngineInfo() methods
  // These are optional methods in the VoiceEngine interface
});

import { describe, expect, it } from 'vitest';
import { MinimaxEngine, type MinimaxModel } from '../src/engines/MinimaxEngine';

// No API mocking needed - we only test configuration methods

describe('MinimaxEngine', () => {

  describe('Configuration Methods', () => {
    it('should set and use different models', () => {
      const engine = new MinimaxEngine();
      const models: MinimaxModel[] = [
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
import { describe, it, expect, beforeEach } from 'vitest';
import { ManneriDetector } from '../core/ManneriDetector.js';
import type { Message } from '../types/index.js';

describe('ManneriDetector', () => {
  let detector: ManneriDetector;

  beforeEach(() => {
    detector = new ManneriDetector({
      similarityThreshold: 0.7, // Lower threshold to make detection easier
      repetitionLimit: 2,
      interventionCooldown: 1000,
      debugMode: true, // Enable debug mode to see what's happening
    });
  });

  describe('detectManneri', () => {
    it('should return false for empty messages', () => {
      const result = detector.detectManneri([]);
      expect(result).toBe(false);
    });

    it('should return false for single message', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you?' },
      ];
      const result = detector.detectManneri(messages);
      expect(result).toBe(false);
    });

    it('should detect similarity in repeated messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' }, // Add third repetition
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
      ];

      const result = detector.detectManneri(messages);
      expect(result).toBe(true);
    });

    it('should not detect similarity in different messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I am fine.' },
        { role: 'user', content: 'What is the weather like?' },
        { role: 'assistant', content: 'It is sunny today.' },
      ];

      const result = detector.detectManneri(messages);
      expect(result).toBe(false);
    });
  });

  describe('shouldIntervene', () => {
    it('should respect intervention cooldown', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
      ];

      // 最初の介入チェック
      const firstCheck = detector.shouldIntervene(messages);
      expect(firstCheck).toBe(true);

      // 実際に介入を実行して記録
      detector.generateDiversificationPrompt(messages);

      // すぐに再度チェック（クールダウン中）
      const secondIntervention = detector.shouldIntervene(messages);
      expect(secondIntervention).toBe(false);
    });
  });

  describe('generateDiversificationPrompt', () => {
    it('should generate a diversification prompt', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello there' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello there' },
      ];

      const prompt = detector.generateDiversificationPrompt(messages);

      expect(prompt).toBeDefined();
      expect(prompt.content).toBeDefined();
      expect(prompt.type).toBeDefined();
      expect(prompt.priority).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should allow config updates', () => {
      const newConfig = { similarityThreshold: 0.9 };
      detector.updateConfig(newConfig);

      const config = detector.getConfig();
      expect(config.similarityThreshold).toBe(0.9);
    });

    it('should return current config', () => {
      const config = detector.getConfig();
      expect(config).toBeDefined();
      expect(config.similarityThreshold).toBeDefined();
      expect(config.repetitionLimit).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should provide statistics', () => {
      const stats = detector.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalInterventions).toBeDefined();
      expect(stats.configuredThresholds).toBeDefined();
      expect(stats.analysisStats).toBeDefined();
    });
  });

  describe('event handling', () => {
    it('should handle event listeners', () => {
      let eventReceived = false;

      detector.on('similarity_calculated', () => {
        eventReceived = true;
      });

      const messages: Message[] = [
        { role: 'user', content: 'Test message' },
        { role: 'user', content: 'Test message' },
      ];

      detector.detectManneri(messages);
      expect(eventReceived).toBe(true);
    });
  });

  describe('data management', () => {
    it('should export and import data', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
      ];

      // 実際に介入を実行して記録
      detector.generateDiversificationPrompt(messages);

      const exportedData = detector.exportData();
      expect(exportedData).toBeDefined();
      expect(exportedData.interventions).toBeDefined();
      expect(exportedData.settings).toBeDefined();

      const newDetector = new ManneriDetector();
      newDetector.importData(exportedData);

      const stats = newDetector.getStatistics();
      expect(stats.totalInterventions).toBeGreaterThan(0);
    });

    it('should clear history', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
      ];

      // 実際に介入を実行して記録
      detector.generateDiversificationPrompt(messages);

      const statsBefore = detector.getStatistics();
      expect(statsBefore.totalInterventions).toBeGreaterThan(0);

      detector.clearHistory();

      const statsAfter = detector.getStatistics();
      expect(statsAfter.totalInterventions).toBe(0);
    });
  });
});

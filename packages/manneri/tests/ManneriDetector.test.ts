import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ManneriDetector } from '../src/core/ManneriDetector.js';
import type {
  Message,
  PersistenceProvider,
  StorageData,
} from '../src/types/index.js';

describe('ManneriDetector', () => {
  let detector: ManneriDetector;

  const createStorageData = (
    overrides: Partial<StorageData> = {}
  ): StorageData => ({
    patterns: [],
    interventions: [],
    settings: {},
    lastCleanup: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    detector = new ManneriDetector({
      similarityThreshold: 0.7, // Lower threshold to make detection easier
      repetitionLimit: 2,
      interventionCooldown: 1000,
      debugMode: true, // Enable debug mode to see what's happening
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

    it('should pass language and custom prompts to analyzer', () => {
      const englishDetector = new ManneriDetector({
        language: 'en',
        similarityThreshold: 0.5,
        customPrompts: {
          en: {
            interventionReasons: {
              similarityHigh: 'High similarity override ({score}%)',
              patternRepetition: 'Pattern override ({count})',
              topicBias: 'Topic override ({count})',
              thresholdExceeded: 'Threshold override',
            },
          },
        },
      });
      const similarMessages: Message[] = [
        { role: 'user', content: 'Tell me about cats', timestamp: 1000 },
        {
          role: 'assistant',
          content: 'Cats are wonderful pets',
          timestamp: 2000,
        },
        { role: 'user', content: 'Tell me about cats', timestamp: 3000 },
        {
          role: 'assistant',
          content: 'Cats are wonderful pets',
          timestamp: 4000,
        },
      ];

      const result = englishDetector.analyzeConversation(similarMessages);

      expect(result.shouldIntervene).toBe(true);
      expect(result.similarity.score).toBeGreaterThanOrEqual(0.5);
      expect(result.interventionReason).toContain('High similarity override');
      expect(result.interventionReason).not.toContain('類似度が高い');
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

  describe('persistence provider', () => {
    it('should report when no persistence provider is configured', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(detector.hasPersistenceProvider()).toBe(false);
      expect(detector.getPersistenceInfo()).toBeNull();
      await expect(detector.save()).resolves.toBe(false);
      await expect(detector.load()).resolves.toBe(false);

      expect(consoleSpy).toHaveBeenCalledWith(
        'ManneriDetector: No persistence provider configured'
      );
    });

    it('should save exported data and emit save_success', async () => {
      const provider: PersistenceProvider = {
        save: vi.fn(() => true),
        load: vi.fn(() => null),
        clear: vi.fn(() => true),
      };
      const detectorWithProvider = new ManneriDetector(
        { similarityThreshold: 0.7 },
        { persistenceProvider: provider }
      );
      const saveListener = vi.fn();

      detectorWithProvider.on('save_success', saveListener);

      await expect(detectorWithProvider.save()).resolves.toBe(true);

      expect(provider.save).toHaveBeenCalledWith(
        expect.objectContaining({
          patterns: [],
          interventions: [],
          settings: expect.objectContaining({ similarityThreshold: 0.7 }),
        })
      );
      expect(saveListener).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
      });
    });

    it('should emit save_error when provider save throws', async () => {
      const provider: PersistenceProvider = {
        save: vi.fn(() => {
          throw new Error('save failed');
        }),
        load: vi.fn(() => null),
        clear: vi.fn(() => true),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );
      const errorListener = vi.fn();

      detectorWithProvider.on('save_error', errorListener);

      await expect(detectorWithProvider.save()).resolves.toBe(false);

      expect(errorListener).toHaveBeenCalledWith({
        error: expect.any(Error),
      });
    });

    it('should load data, import settings, and emit load_success', async () => {
      const storedData = createStorageData({
        interventions: [1000, 2000],
        settings: {
          similarityThreshold: 0.9,
          interventionCooldown: 1234,
        },
      });
      const provider: PersistenceProvider = {
        save: vi.fn(() => true),
        load: vi.fn(() => storedData),
        clear: vi.fn(() => true),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );
      const loadListener = vi.fn();

      detectorWithProvider.on('load_success', loadListener);

      await expect(detectorWithProvider.load()).resolves.toBe(true);

      expect(detectorWithProvider.getConfig().similarityThreshold).toBe(0.9);
      expect(detectorWithProvider.getConfig().interventionCooldown).toBe(1234);
      expect(detectorWithProvider.getStatistics().totalInterventions).toBe(2);
      expect(loadListener).toHaveBeenCalledWith({
        data: storedData,
        timestamp: expect.any(Number),
      });
    });

    it('should emit load_error when provider load throws', async () => {
      const provider: PersistenceProvider = {
        save: vi.fn(() => true),
        load: vi.fn(() => {
          throw new Error('load failed');
        }),
        clear: vi.fn(() => true),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );
      const errorListener = vi.fn();

      detectorWithProvider.on('load_error', errorListener);

      await expect(detectorWithProvider.load()).resolves.toBe(false);

      expect(errorListener).toHaveBeenCalledWith({
        error: expect.any(Error),
      });
    });

    it('should cleanup memory and provider data', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const now = Date.now();
      const provider: PersistenceProvider = {
        save: vi.fn(() => true),
        load: vi.fn(() => null),
        clear: vi.fn(() => true),
        cleanup: vi.fn(() => 2),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );
      const cleanupListener = vi.fn();

      detectorWithProvider.importData(
        createStorageData({
          interventions: [now - 1000, now - 10 * 24 * 60 * 60 * 1000],
        })
      );
      detectorWithProvider.on('cleanup_completed', cleanupListener);

      await expect(
        detectorWithProvider.cleanup(7 * 24 * 60 * 60 * 1000)
      ).resolves.toBe(3);

      expect(provider.cleanup).toHaveBeenCalledWith(7 * 24 * 60 * 60 * 1000);
      expect(detectorWithProvider.getStatistics().totalInterventions).toBe(1);
      expect(cleanupListener).toHaveBeenCalledWith({
        removedItems: 3,
        timestamp: now,
      });
    });

    it('should return memory cleanup count when provider cleanup throws', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const now = Date.now();
      const provider: PersistenceProvider = {
        save: vi.fn(() => true),
        load: vi.fn(() => null),
        clear: vi.fn(() => true),
        cleanup: vi.fn(() => {
          throw new Error('cleanup failed');
        }),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );
      const errorListener = vi.fn();

      detectorWithProvider.importData(
        createStorageData({
          interventions: [now - 1000, now - 10 * 24 * 60 * 60 * 1000],
        })
      );
      detectorWithProvider.on('cleanup_error', errorListener);

      await expect(
        detectorWithProvider.cleanup(7 * 24 * 60 * 60 * 1000)
      ).resolves.toBe(1);

      expect(errorListener).toHaveBeenCalledWith({
        error: expect.any(Error),
      });
    });

    it('should return custom persistence info when available', () => {
      const provider = {
        save: vi.fn(() => true),
        load: vi.fn(() => null),
        clear: vi.fn(() => true),
        getStorageInfo: vi.fn(() => ({
          provider: 'memory',
          available: true,
        })),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );

      expect(detectorWithProvider.hasPersistenceProvider()).toBe(true);
      expect(detectorWithProvider.getPersistenceInfo()).toEqual({
        provider: 'memory',
        available: true,
      });
    });

    it('should return default persistence info for custom providers', () => {
      const provider: PersistenceProvider = {
        save: vi.fn(() => true),
        load: vi.fn(() => null),
        clear: vi.fn(() => true),
      };
      const detectorWithProvider = new ManneriDetector(
        {},
        { persistenceProvider: provider }
      );

      expect(detectorWithProvider.getPersistenceInfo()).toEqual({
        provider: 'custom',
        available: true,
      });
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

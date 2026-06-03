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

    it('should not detect manneri for a normal alternating conversation with varied content', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What should I cook tonight?',
          timestamp: 1000,
        },
        {
          role: 'assistant',
          content: 'A quick pasta with vegetables would work well.',
          timestamp: 2000,
        },
        {
          role: 'user',
          content: 'I also need to plan groceries for tomorrow.',
          timestamp: 3000,
        },
        {
          role: 'assistant',
          content: 'Start with staples like rice, eggs, and leafy greens.',
          timestamp: 4000,
        },
        {
          role: 'user',
          content: 'Can you suggest a short workout after dinner?',
          timestamp: 5000,
        },
        {
          role: 'assistant',
          content: 'Try ten minutes of stretching and light squats.',
          timestamp: 6000,
        },
      ];

      const result = detector.detectManneri(messages);

      expect(result).toBe(false);
    });

    it('should detect short repeated Japanese stream chat content', () => {
      const shortMessageDetector = new ManneriDetector({
        minMessageLength: 0,
      });
      const messages: Message[] = [
        { role: 'user', content: '[happy] 次の企画は何にする？' },
        {
          role: 'assistant',
          content: '[neutral] まだ迷っているけど、コメントを見ながら決めるね。',
        },
        { role: 'user', content: '[happy] コメント読むのいいね！' },
        {
          role: 'assistant',
          content: '[happy] みんなの反応を見ながら進めるの楽しそうだね！',
        },
        { role: 'user', content: '[happy] じゃあ次のコーナーに行こう！' },
        {
          role: 'assistant',
          content: '[happy] いいね、次の流れを作っていこう！',
        },
        { role: 'user', content: '[happy] うん、次のコーナーに進もうね！' },
        {
          role: 'assistant',
          content: '[relaxed] そうだね、少しずつ次へ進めよう。',
        },
        { role: 'user', content: '[happy] うん、次のコーナーに進もうね' },
        {
          role: 'assistant',
          content: '[happy] 次の話題に切り替えてみようか。',
        },
        { role: 'user', content: '[happy] うん、次のコーナーに進もうね！' },
        {
          role: 'assistant',
          content: '[surprised] いいタイミングだね、流れを変えてみよう！',
        },
        { role: 'user', content: '[happy] うん、次のコーナーに進もうね' },
        {
          role: 'assistant',
          content: '[happy] それじゃあ新しいテーマに移ろう！',
        },
        { role: 'user', content: '[happy] そろそろ新しい話題も見たい！' },
        {
          role: 'assistant',
          content: '[happy] 了解、新しいコメントを拾ってみるね！',
        },
      ];

      const result = shortMessageDetector.analyzeConversation(messages);

      expect(result.shouldIntervene).toBe(true);
      expect(
        result.patterns.some(
          (pattern) =>
            pattern.pattern.includes('Repeated user message') &&
            pattern.frequency >= 3
        )
      ).toBe(true);
    });

    it('should detect Japanese stream chat stuck on similar short phrases', () => {
      const shortMessageDetector = new ManneriDetector({
        minMessageLength: 0,
        lookbackWindow: 15,
      });
      const messages: Message[] = [
        { role: 'user', content: '今日の配信は何から始める？' },
        {
          role: 'assistant',
          content: '[neutral] まずは近況を少し話してから決めようかな。',
        },
        { role: 'user', content: '近況のあとで次の話題も聞きたい！' },
        {
          role: 'assistant',
          content: '[happy] いいね、あとで新しいテーマに移ろう。',
        },
        { role: 'user', content: 'うん、次の話題へ進もう！' },
        {
          role: 'assistant',
          content: '[relaxed] そうだね、次の流れを考えてみるね。',
        },
        { role: 'user', content: '次の話題に進もう' },
        {
          role: 'assistant',
          content: '[happy] もう少しだけ今の話をまとめてから進めよう。',
        },
        { role: 'user', content: 'うん、次の話題に進もう' },
        {
          role: 'assistant',
          content: '[relaxed] そうしよう、切り替える準備をするね。',
        },
        { role: 'user', content: 'そろそろ次の話題だね' },
        {
          role: 'assistant',
          content: '[happy] うん、新しいテーマも見てみよう。',
        },
        { role: 'user', content: 'うん、次の話題へ進もう' },
        {
          role: 'assistant',
          content: '[relaxed] それじゃあ次の流れに移ろう。',
        },
        { role: 'user', content: '次へ進もう' },
      ];

      const result = shortMessageDetector.analyzeConversation(messages);

      expect(result.shouldIntervene).toBe(true);
      expect(
        result.patterns.some(
          (pattern) =>
            pattern.pattern.includes('Repeated user message') &&
            pattern.frequency >= 3
        )
      ).toBe(true);
    });

    it('should not detect varied short Japanese stream chat as manneri', () => {
      const shortMessageDetector = new ManneriDetector({
        minMessageLength: 0,
        lookbackWindow: 15,
      });
      const messages: Message[] = [
        { role: 'user', content: '今日は何から始める？' },
        {
          role: 'assistant',
          content: '[neutral] まずは最近のニュースを少し話そうかな。',
        },
        { role: 'user', content: '次はゲームの話も聞きたい' },
        {
          role: 'assistant',
          content: '[happy] いいね、遊んだタイトルの話をしよう。',
        },
        { role: 'user', content: '好きな食べ物も教えて' },
        {
          role: 'assistant',
          content: '[happy] 最近は辛いカレーが気になってるよ。',
        },
        { role: 'user', content: '週末の予定はある？' },
        {
          role: 'assistant',
          content: '[relaxed] 散歩しながら配信の準備をする予定だよ。',
        },
        { role: 'user', content: 'おすすめの曲ある？' },
        {
          role: 'assistant',
          content: '[happy] 明るいテンポの曲をあとで紹介するね。',
        },
      ];

      const result = shortMessageDetector.analyzeConversation(messages);

      expect(result.shouldIntervene).toBe(false);
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

    it('should use fallback prompt metadata when no analysis result exists', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello there' },
      ];

      const prompt = detector.generateDiversificationPrompt(messages);

      expect(prompt.type).toBe('topic_change');
      expect(prompt.priority).toBe('medium');
      expect(prompt.context).toBe('Conversation length: 2 messages');
    });

    it('should generate a high-priority pattern break prompt for high similarity', () => {
      const similarityDetector = new ManneriDetector({
        similarityThreshold: 0.5,
      });
      const messages: Message[] = [
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

      similarityDetector.analyzeConversation(messages);
      const prompt = similarityDetector.generateDiversificationPrompt(messages);

      expect(prompt.type).toBe('pattern_break');
      expect(prompt.priority).toBe('high');
      expect(prompt.context).toContain('Reason: similarity');
    });

    it('should generate a keyword shift prompt for topic concentration', () => {
      const topicDetector = new ManneriDetector({
        similarityThreshold: 0.95,
      });
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Programming architecture needs careful planning alpha',
          timestamp: 1000,
        },
        {
          role: 'assistant',
          content:
            'Programming projects benefit from clear module boundaries beta',
          timestamp: 2000,
        },
        {
          role: 'user',
          content: 'Programming teams often discuss testing strategy gamma',
          timestamp: 3000,
        },
        {
          role: 'assistant',
          content: 'Programming workflows improve with useful automation delta',
          timestamp: 4000,
        },
        {
          role: 'user',
          content:
            'Programming documentation supports future maintenance epsilon',
          timestamp: 5000,
        },
        {
          role: 'assistant',
          content: 'Programming reviews catch design problems early zeta',
          timestamp: 6000,
        },
        {
          role: 'user',
          content: 'Programming estimates should include integration work eta',
          timestamp: 7000,
        },
        {
          role: 'assistant',
          content: 'Programming releases need stable verification steps theta',
          timestamp: 8000,
        },
        {
          role: 'user',
          content:
            'Programming discussions can still explore product tradeoffs iota',
          timestamp: 9000,
        },
        {
          role: 'assistant',
          content: 'Programming choices should match user constraints kappa',
          timestamp: 10000,
        },
      ];

      const analysis = topicDetector.analyzeConversation(messages);
      expect(analysis.shouldIntervene).toBe(true);
      expect(analysis.similarity.isRepeated).toBe(false);

      const prompt = topicDetector.generateDiversificationPrompt(messages);

      expect(prompt.type).toBe('keyword_shift');
      expect(prompt.priority).toBe('medium');
      expect(prompt.context).toContain('Reason: topic');
    });

    it('should generate a pattern break prompt for repeated conversation patterns', () => {
      const patternDetector = new ManneriDetector({
        similarityThreshold: 0.99,
      });
      const messages: Message[] = [
        { role: 'user', content: 'Question alpha', timestamp: 1000 },
        { role: 'assistant', content: 'Answer alpha', timestamp: 2000 },
        { role: 'user', content: 'Question beta', timestamp: 3000 },
        { role: 'assistant', content: 'Answer beta', timestamp: 4000 },
        { role: 'user', content: 'Question alpha', timestamp: 5000 },
        { role: 'assistant', content: 'Answer alpha', timestamp: 6000 },
        { role: 'user', content: 'Question beta', timestamp: 7000 },
        { role: 'assistant', content: 'Answer beta', timestamp: 8000 },
        { role: 'user', content: 'Question alpha', timestamp: 9000 },
        { role: 'assistant', content: 'Answer alpha', timestamp: 10000 },
        { role: 'user', content: 'Question beta', timestamp: 11000 },
        { role: 'assistant', content: 'Answer beta', timestamp: 12000 },
      ];

      const analysis = patternDetector.analyzeConversation(messages);
      expect(analysis.shouldIntervene).toBe(true);
      expect(analysis.patterns.some((pattern) => pattern.frequency >= 3)).toBe(
        true
      );

      const prompt = patternDetector.generateDiversificationPrompt(messages);

      expect(prompt.type).toBe('pattern_break');
      expect(prompt.priority).toBe('high');
      expect(prompt.context).toContain('Reason: pattern');
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

    it('should ignore repeated messages shorter than minMessageLength', () => {
      const detectorWithMinLength = new ManneriDetector({
        similarityThreshold: 0.5,
        minMessageLength: 10,
      });
      const shortMessages: Message[] = [
        { role: 'user', content: 'Hi', timestamp: 1000 },
        { role: 'assistant', content: 'OK', timestamp: 2000 },
        { role: 'user', content: 'Hi', timestamp: 3000 },
        { role: 'assistant', content: 'OK', timestamp: 4000 },
        { role: 'user', content: 'Hi', timestamp: 5000 },
        { role: 'assistant', content: 'OK', timestamp: 6000 },
      ];

      const result = detectorWithMinLength.analyzeConversation(shortMessages);

      expect(result.shouldIntervene).toBe(false);
      expect(result.similarity.isRepeated).toBe(false);
      expect(result.patterns).toEqual([]);
    });

    it('should ignore messages that exactly match excludeKeywords', () => {
      const detectorWithExcludedKeywords = new ManneriDetector({
        similarityThreshold: 0.5,
        minMessageLength: 1,
        excludeKeywords: ['ok', 'yes'],
      });
      const excludedMessages: Message[] = [
        { role: 'user', content: 'OK', timestamp: 1000 },
        { role: 'assistant', content: 'Yes', timestamp: 2000 },
        { role: 'user', content: 'ok', timestamp: 3000 },
        { role: 'assistant', content: 'yes', timestamp: 4000 },
        { role: 'user', content: 'OK', timestamp: 5000 },
        { role: 'assistant', content: 'Yes', timestamp: 6000 },
      ];

      const result =
        detectorWithExcludedKeywords.analyzeConversation(excludedMessages);

      expect(result.shouldIntervene).toBe(false);
      expect(result.similarity.isRepeated).toBe(false);
      expect(result.patterns).toEqual([]);
    });

    it('should apply updated minMessageLength and excludeKeywords to later analyses', () => {
      const configurableDetector = new ManneriDetector({
        similarityThreshold: 0.5,
        minMessageLength: 1,
        excludeKeywords: [],
      });
      const repeatedMessages: Message[] = [
        { role: 'user', content: 'OK', timestamp: 1000 },
        { role: 'assistant', content: 'Sure', timestamp: 2000 },
        { role: 'user', content: 'OK', timestamp: 3000 },
        { role: 'assistant', content: 'Sure', timestamp: 4000 },
        { role: 'user', content: 'OK', timestamp: 5000 },
        { role: 'assistant', content: 'Sure', timestamp: 6000 },
      ];

      expect(configurableDetector.detectManneri(repeatedMessages)).toBe(true);

      configurableDetector.updateConfig({
        minMessageLength: 5,
        excludeKeywords: ['ok'],
      });

      expect(configurableDetector.detectManneri(repeatedMessages)).toBe(false);
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

    it('should expose analyzer statistics', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you today?' },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking.',
        },
        { role: 'user', content: 'Hello, how are you today?' },
      ];

      detector.analyzeConversation(messages);
      detector.detectManneri(messages);

      const stats = detector.getStatistics();
      expect(stats.analysisStats.totalAnalyses).toBe(2);
      expect(stats.analysisStats.averageAnalysisTime).toBeGreaterThanOrEqual(0);
    });
  });
});

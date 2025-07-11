import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeywordExtractor } from '../src/analyzers/KeywordExtractor.js';
import type { Message } from '../src/types/index.js';

describe('KeywordExtractor', () => {
  let extractor: KeywordExtractor;
  const mockMessages: Message[] = [
    {
      role: 'user',
      content: 'Let me talk about programming and coding today',
      timestamp: 1000,
    },
    {
      role: 'assistant',
      content: 'Programming is a great skill to learn',
      timestamp: 2000,
    },
    {
      role: 'user',
      content: 'I love coding and building software applications',
      timestamp: 3000,
    },
    {
      role: 'assistant',
      content: 'Software development requires good programming practices',
      timestamp: 4000,
    },
  ];

  beforeEach(() => {
    extractor = new KeywordExtractor();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(extractor).toBeDefined();
    });

    it('should accept custom options', () => {
      const customExtractor = new KeywordExtractor({
        minWordLength: 3,
        maxNgrams: 4,
        caseSensitive: true,
        language: 'ja',
      });
      expect(customExtractor).toBeDefined();
    });
  });

  describe('extractKeywordsFromMessage', () => {
    it('should extract keywords from a single message', () => {
      const message: Message = {
        role: 'user',
        content: 'Programming languages are interesting',
      };
      const keywords = extractor.extractKeywordsFromMessage(message);

      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('programming');
    });

    it('should handle empty content', () => {
      const message: Message = { role: 'user', content: '' };
      const keywords = extractor.extractKeywordsFromMessage(message);

      expect(keywords).toEqual([]);
    });

    it('should handle short content', () => {
      const message: Message = { role: 'user', content: 'Hi' };
      const keywords = extractor.extractKeywordsFromMessage(message);

      expect(keywords).toBeInstanceOf(Array);
    });
  });

  describe('extractKeywordsFromMessages', () => {
    it('should extract and rank keywords from multiple messages', () => {
      const keywords = extractor.extractKeywordsFromMessages(mockMessages);

      expect(keywords).toBeInstanceOf(Array);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(20);

      // Should contain programming-related keywords
      const programmingKeywords = keywords.filter(
        (k) =>
          k.includes('programming') ||
          k.includes('coding') ||
          k.includes('software')
      );
      expect(programmingKeywords.length).toBeGreaterThan(0);
    });

    it('should handle empty messages array', () => {
      const keywords = extractor.extractKeywordsFromMessages([]);

      expect(keywords).toEqual([]);
    });

    it('should rank keywords by frequency', () => {
      const messages: Message[] = [
        { role: 'user', content: 'apple apple apple' },
        { role: 'user', content: 'apple banana' },
        { role: 'user', content: 'banana cherry' },
      ];

      const keywords = extractor.extractKeywordsFromMessages(messages);

      expect(keywords[0]).toBe('apple'); // Most frequent should be first
    });
  });

  describe('analyzeKeywordFrequencies', () => {
    it('should analyze keyword frequencies with scores', () => {
      const frequencies = extractor.analyzeKeywordFrequencies(mockMessages);

      expect(frequencies).toBeInstanceOf(Array);
      expect(frequencies.length).toBeGreaterThan(0);
      expect(frequencies.length).toBeLessThanOrEqual(50);

      for (const freq of frequencies) {
        expect(freq).toHaveProperty('keyword');
        expect(freq).toHaveProperty('frequency');
        expect(freq).toHaveProperty('score');
        expect(freq).toHaveProperty('firstSeen');
        expect(freq).toHaveProperty('lastSeen');
        expect(freq).toHaveProperty('contexts');

        expect(freq.frequency).toBeGreaterThan(0);
        expect(freq.score).toBeGreaterThan(0);
        expect(freq.contexts).toBeInstanceOf(Array);
      }
    });

    it('should handle messages without timestamps', () => {
      const messagesNoTimestamp: Message[] = [
        { role: 'user', content: 'test keyword analysis' },
        { role: 'assistant', content: 'keyword frequency test' },
      ];

      const frequencies =
        extractor.analyzeKeywordFrequencies(messagesNoTimestamp);

      expect(frequencies.length).toBeGreaterThan(0);
      expect(frequencies[0].firstSeen).toBeDefined();
      expect(frequencies[0].lastSeen).toBeDefined();
    });

    it('should limit context length', () => {
      const longMessage: Message = {
        role: 'user',
        content:
          'This is a very long message that should be truncated when stored as context. '.repeat(
            10
          ),
      };

      const frequencies = extractor.analyzeKeywordFrequencies([longMessage]);

      for (const freq of frequencies) {
        for (const context of freq.contexts) {
          expect(context.length).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('detectTopicShift', () => {
    it('should detect topic shift between recent and historical messages', () => {
      const historicalMessages: Message[] = [
        { role: 'user', content: 'I love cooking and recipes' },
        { role: 'assistant', content: 'Cooking is a wonderful hobby' },
      ];

      const recentMessages: Message[] = [
        { role: 'user', content: 'Programming languages are fascinating' },
        { role: 'assistant', content: 'Software development is challenging' },
      ];

      const result = extractor.detectTopicShift(
        recentMessages,
        historicalMessages,
        0.5
      );

      expect(result).toHaveProperty('hasShift');
      expect(result).toHaveProperty('newTopics');
      expect(result).toHaveProperty('oldTopics');
      expect(result.hasShift).toBe(true);
      expect(result.newTopics.length).toBeGreaterThan(0);
      expect(result.oldTopics.length).toBeGreaterThan(0);
    });

    it('should not detect shift when topics are similar', () => {
      const historicalMessages: Message[] = [
        { role: 'user', content: 'Programming is fun' },
        { role: 'assistant', content: 'Coding requires practice' },
      ];

      const recentMessages: Message[] = [
        { role: 'user', content: 'Software programming is challenging' },
        {
          role: 'assistant',
          content: 'Development and coding go hand in hand',
        },
      ];

      const result = extractor.detectTopicShift(
        recentMessages,
        historicalMessages,
        0.1
      );

      // With very low threshold, should detect as similar topic
      expect(result.hasShift).toBe(false);
    });

    it('should handle empty message arrays', () => {
      const result = extractor.detectTopicShift([], [], 0.5);

      expect(result.hasShift).toBe(false);
      expect(result.newTopics).toEqual([]);
      expect(result.oldTopics).toEqual([]);
    });
  });

  describe('analyzeTopicClusters', () => {
    it('should analyze and create topic clusters', () => {
      const clusters = extractor.analyzeTopicClusters(mockMessages);

      expect(clusters).toBeInstanceOf(Array);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(10);

      for (const cluster of clusters) {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('keywords');
        expect(cluster).toHaveProperty('score');
        expect(cluster).toHaveProperty('messageCount');
        expect(cluster).toHaveProperty('firstMessage');
        expect(cluster).toHaveProperty('lastMessage');

        expect(cluster.keywords).toBeInstanceOf(Array);
        expect(cluster.keywords.length).toBeGreaterThan(0);
        expect(cluster.messageCount).toBeGreaterThan(0);
        expect(cluster.score).toBeGreaterThan(0);
      }
    });

    it('should sort clusters by score', () => {
      const clusters = extractor.analyzeTopicClusters(mockMessages);

      if (clusters.length > 1) {
        for (let i = 1; i < clusters.length; i++) {
          expect(clusters[i - 1].score).toBeGreaterThanOrEqual(
            clusters[i].score
          );
        }
      }
    });
  });

  describe('getTopicInfo', () => {
    it('should get topic information with categories', () => {
      const topicInfo = extractor.getTopicInfo(mockMessages);

      expect(topicInfo).toBeInstanceOf(Array);
      expect(topicInfo.length).toBeGreaterThan(0);

      for (const topic of topicInfo) {
        expect(topic).toHaveProperty('keywords');
        expect(topic).toHaveProperty('score');
        expect(topic).toHaveProperty('category');
        expect(topic).toHaveProperty('confidence');

        expect(topic.keywords).toBeInstanceOf(Array);
        expect(topic.score).toBeGreaterThan(0);
        expect(topic.confidence).toBeGreaterThanOrEqual(0);
        expect(topic.confidence).toBeLessThanOrEqual(1);
        expect(['技術', 'エンターテイメント', '日常', 'その他']).toContain(
          topic.category
        );
      }
    });

    it('should categorize programming topics correctly', () => {
      const programmingMessages: Message[] = [
        { role: 'user', content: 'プログラミング技術について話しましょう' },
        { role: 'assistant', content: 'コードの最適化が重要です' },
      ];

      const topicInfo = extractor.getTopicInfo(programmingMessages);

      expect(topicInfo.length).toBeGreaterThan(0);
      // Should categorize as technical topic
      const technicalTopics = topicInfo.filter((t) => t.category === '技術');
      expect(technicalTopics.length).toBeGreaterThan(0);
    });
  });

  describe('findRepeatedKeywords', () => {
    it('should find keywords that repeat frequently', () => {
      const repetitiveMessages: Message[] = [
        { role: 'user', content: 'programming is fun' },
        { role: 'assistant', content: 'yes programming requires practice' },
        { role: 'user', content: 'programming languages vary' },
        { role: 'assistant', content: 'learning programming takes time' },
        { role: 'user', content: 'programming skills improve' },
      ];

      const repeated = extractor.findRepeatedKeywords(repetitiveMessages, 3, 5);

      expect(repeated).toBeInstanceOf(Array);

      if (repeated.length > 0) {
        for (const item of repeated) {
          expect(item).toHaveProperty('keyword');
          expect(item).toHaveProperty('positions');
          expect(item).toHaveProperty('density');

          expect(item.positions.length).toBeGreaterThanOrEqual(3);
          expect(item.density).toBeGreaterThan(0.5);
          expect(item.density).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should return empty array when no keywords repeat enough', () => {
      const diverseMessages: Message[] = [
        { role: 'user', content: 'apple banana cherry' },
        { role: 'assistant', content: 'dog cat bird' },
        { role: 'user', content: 'car bike train' },
      ];

      const repeated = extractor.findRepeatedKeywords(diverseMessages, 3, 5);

      expect(repeated).toEqual([]);
    });

    it('should sort by density', () => {
      const messages: Message[] = [];
      for (let i = 0; i < 10; i++) {
        messages.push({
          role: 'user',
          content: 'frequent word and less frequent word',
        });
        if (i % 2 === 0) {
          messages.push({
            role: 'assistant',
            content: 'frequent word appears more',
          });
        }
      }

      const repeated = extractor.findRepeatedKeywords(messages, 3, 5);

      if (repeated.length > 1) {
        for (let i = 1; i < repeated.length; i++) {
          expect(repeated[i - 1].density).toBeGreaterThanOrEqual(
            repeated[i].density
          );
        }
      }
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // Perform some analysis to populate cache
      extractor.analyzeKeywordFrequencies(mockMessages);
      extractor.analyzeTopicClusters(mockMessages);

      // Clear cache
      extractor.clearCache();

      // Should not throw any errors
      expect(() => extractor.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle messages with special characters', () => {
      const specialMessages: Message[] = [
        { role: 'user', content: 'Hello! @#$%^&*()' },
        { role: 'assistant', content: 'Testing... 123 [brackets]' },
      ];

      const keywords = extractor.extractKeywordsFromMessages(specialMessages);

      expect(keywords).toBeInstanceOf(Array);
    });

    it('should handle very short keywords', () => {
      const shortMessages: Message[] = [
        { role: 'user', content: 'a b c d e f' },
        { role: 'assistant', content: 'x y z' },
      ];

      const keywords = extractor.extractKeywordsFromMessages(shortMessages);

      expect(keywords).toBeInstanceOf(Array);
    });

    it('should handle duplicate messages', () => {
      const duplicateMessages: Message[] = [
        { role: 'user', content: 'duplicate content' },
        { role: 'user', content: 'duplicate content' },
        { role: 'user', content: 'duplicate content' },
      ];

      const frequencies =
        extractor.analyzeKeywordFrequencies(duplicateMessages);

      expect(frequencies.length).toBeGreaterThan(0);
      expect(frequencies[0].frequency).toBeGreaterThan(1);
    });
  });
});

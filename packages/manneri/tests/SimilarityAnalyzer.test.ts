import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SimilarityAnalyzer } from '../src/analyzers/SimilarityAnalyzer.js';
import type { Message } from '../src/types/index.js';

describe('SimilarityAnalyzer', () => {
  let analyzer: SimilarityAnalyzer;

  beforeEach(() => {
    analyzer = new SimilarityAnalyzer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(analyzer).toBeDefined();
    });

    it('should accept custom options', () => {
      const customAnalyzer = new SimilarityAnalyzer({
        minWordLength: 3,
        maxNgrams: 4,
        caseSensitive: true,
        language: 'ja',
      });
      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between identical texts', () => {
      const similarity = analyzer.calculateSimilarity(
        'Hello world',
        'Hello world'
      );
      expect(similarity).toBe(1);
    });

    it('should calculate similarity between different texts', () => {
      const similarity = analyzer.calculateSimilarity(
        'Hello world',
        'Goodbye world'
      );
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty strings', () => {
      const similarity1 = analyzer.calculateSimilarity('', '');
      expect(similarity1).toBe(1);

      const similarity2 = analyzer.calculateSimilarity('Hello', '');
      expect(similarity2).toBe(0);

      const similarity3 = analyzer.calculateSimilarity('', 'Hello');
      expect(similarity3).toBe(0);
    });

    it('should be case-insensitive by default', () => {
      const similarity = analyzer.calculateSimilarity(
        'HELLO WORLD',
        'hello world'
      );
      expect(similarity).toBe(1);
    });

    it('should respect case sensitivity when configured', () => {
      const caseSensitiveAnalyzer = new SimilarityAnalyzer({
        caseSensitive: true,
      });
      const similarity = caseSensitiveAnalyzer.calculateSimilarity(
        'HELLO WORLD',
        'hello world'
      );
      expect(similarity).toBeLessThan(1);
    });

    it('should use cache for repeated calculations', () => {
      const text1 = 'Hello world';
      const text2 = 'Hello universe';

      // First calculation
      const similarity1 = analyzer.calculateSimilarity(text1, text2);

      // Second calculation should use cache
      const similarity2 = analyzer.calculateSimilarity(text1, text2);

      expect(similarity1).toBe(similarity2);
    });
  });

  describe('analyzeSimilarity', () => {
    const mockMessages: Message[] = [
      { role: 'user', content: 'Hello, how are you?' },
      { role: 'assistant', content: 'I am doing well!' },
      { role: 'user', content: 'What can you help with?' },
      { role: 'assistant', content: 'I can help with many things.' },
    ];

    it('should return empty result for no previous messages', () => {
      const currentMessage: Message = { role: 'user', content: 'Hello' };
      const result = analyzer.analyzeSimilarity(currentMessage, []);

      expect(result.score).toBe(0);
      expect(result.isRepeated).toBe(false);
      expect(result.matchedMessages).toEqual([]);
    });

    it('should return empty result for empty current message', () => {
      const currentMessage: Message = { role: 'user', content: '' };
      const result = analyzer.analyzeSimilarity(currentMessage, mockMessages);

      expect(result.score).toBe(0);
      expect(result.isRepeated).toBe(false);
      expect(result.matchedMessages).toEqual([]);
    });

    it('should detect similar messages with same role', () => {
      const currentMessage: Message = {
        role: 'user',
        content: 'Hello, how are you?',
      };
      const result = analyzer.analyzeSimilarity(
        currentMessage,
        mockMessages,
        0.8
      );

      expect(result.score).toBe(1);
      expect(result.isRepeated).toBe(true);
      expect(result.matchedMessages).toHaveLength(1);
      expect(result.matchedMessages[0].content).toBe('Hello, how are you?');
    });

    it('should not match messages with different roles', () => {
      const currentMessage: Message = {
        role: 'assistant',
        content: 'Hello, how are you?',
      };
      const result = analyzer.analyzeSimilarity(currentMessage, mockMessages);

      expect(result.score).toBe(0);
      expect(result.isRepeated).toBe(false);
      expect(result.matchedMessages).toEqual([]);
    });

    it('should respect threshold parameter', () => {
      const currentMessage: Message = {
        role: 'user',
        content: 'Hello, how are you doing?',
      };

      // With low threshold
      const result1 = analyzer.analyzeSimilarity(
        currentMessage,
        mockMessages,
        0.5
      );
      expect(result1.isRepeated).toBe(true);

      // With high threshold
      const result2 = analyzer.analyzeSimilarity(
        currentMessage,
        mockMessages,
        0.95
      );
      expect(result2.isRepeated).toBe(false);
    });
  });

  describe('findSimilarMessages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello world' },
      { role: 'assistant', content: 'Hello world' },
      { role: 'user', content: 'Hello universe' },
      { role: 'assistant', content: 'Goodbye world' },
    ];

    it('should find similar messages with same role', () => {
      const targetMessage: Message = { role: 'user', content: 'Hello world' };
      const similar = analyzer.findSimilarMessages(
        targetMessage,
        messages,
        0.5,
        true
      );

      expect(similar).toHaveLength(1);
      // The actual content found should be checked (could be either similar message)
      expect(similar[0].role).toBe('user');
      expect(['Hello universe', 'Hello world']).toContain(similar[0].content);
    });

    it('should find similar messages across roles when configured', () => {
      const targetMessage: Message = { role: 'user', content: 'Hello world' };
      const similar = analyzer.findSimilarMessages(
        targetMessage,
        messages,
        0.9,
        false
      );

      expect(similar.length).toBeGreaterThan(0);
      const exactMatch = similar.find(
        (m) => m.content === 'Hello world' && m.role === 'assistant'
      );
      expect(exactMatch).toBeDefined();
    });

    it('should exclude the target message itself', () => {
      const targetMessage = messages[0];
      const similar = analyzer.findSimilarMessages(
        targetMessage,
        messages,
        0.5
      );

      expect(similar).not.toContain(targetMessage);
    });

    it('should return empty array when no similar messages found', () => {
      const targetMessage: Message = {
        role: 'user',
        content: 'Completely different text',
      };
      const similar = analyzer.findSimilarMessages(
        targetMessage,
        messages,
        0.9
      );

      expect(similar).toEqual([]);
    });
  });

  describe('analyzeSequenceSimilarity', () => {
    const messages: Message[] = [
      { role: 'user', content: 'What is the weather?' },
      { role: 'assistant', content: 'It is sunny.' },
      { role: 'user', content: 'Thank you.' },
      { role: 'user', content: 'What is the weather?' },
      { role: 'assistant', content: 'It is sunny.' },
      { role: 'user', content: 'Thank you.' },
    ];

    it('should detect similar sequences', () => {
      const sequences = analyzer.analyzeSequenceSimilarity(messages, 3, 0.8);

      expect(sequences).toHaveLength(1);
      expect(sequences[0].similarity).toBeGreaterThan(0.8);
      expect(sequences[0].sequence).toHaveLength(3);
    });

    it('should return empty array for short message lists', () => {
      const shortMessages = messages.slice(0, 3);
      const sequences = analyzer.analyzeSequenceSimilarity(
        shortMessages,
        3,
        0.8
      );

      expect(sequences).toEqual([]);
    });

    it('should sort sequences by similarity', () => {
      const sequences = analyzer.analyzeSequenceSimilarity(messages, 2, 0.5);

      if (sequences.length > 1) {
        for (let i = 1; i < sequences.length; i++) {
          expect(sequences[i - 1].similarity).toBeGreaterThanOrEqual(
            sequences[i].similarity
          );
        }
      }
    });
  });

  describe('analyzeNgramSimilarity', () => {
    it('should calculate ngram similarity', () => {
      const similarity = analyzer.analyzeNgramSimilarity(
        'hello world test',
        'hello world example',
        2
      );

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should return 1 for identical texts', () => {
      const similarity = analyzer.analyzeNgramSimilarity(
        'hello world',
        'hello world',
        2
      );

      expect(similarity).toBe(1);
    });

    it('should handle empty strings', () => {
      const similarity1 = analyzer.analyzeNgramSimilarity('', '', 2);
      expect(similarity1).toBe(1);

      const similarity2 = analyzer.analyzeNgramSimilarity('hello', '', 2);
      expect(similarity2).toBe(0);
    });

    it('should handle short texts', () => {
      const similarity = analyzer.analyzeNgramSimilarity('hi', 'hi', 3);
      expect(similarity).toBe(1);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // Add some entries to cache
      analyzer.calculateSimilarity('text1', 'text2');
      analyzer.calculateSimilarity('text3', 'text4');

      // Clear cache
      analyzer.clearCache();

      // Cache should be empty
      const stats = analyzer.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = analyzer.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    });

    it('should auto-expire cache entries after timeout', () => {
      analyzer.calculateSimilarity('text1', 'text2');

      expect(analyzer.getCacheStats().size).toBe(1);

      // Fast-forward time past cache timeout (5 minutes)
      vi.advanceTimersByTime(300001);

      expect(analyzer.getCacheStats().size).toBe(0);
    });

    it('should limit cache size', () => {
      // Add many entries to cache
      for (let i = 0; i < 1100; i++) {
        analyzer.calculateSimilarity(`text${i}`, `other${i}`);
      }

      // Cache size should be limited
      const stats = analyzer.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });
  });
});

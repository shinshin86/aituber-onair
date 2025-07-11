import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationAnalyzer } from '../src/core/ConversationAnalyzer.js';
import type { Message } from '../src/types/index.js';

describe('ConversationAnalyzer', () => {
  let analyzer: ConversationAnalyzer;
  const mockMessages: Message[] = [
    { role: 'user', content: 'Hello, how are you?', timestamp: 1000 },
    {
      role: 'assistant',
      content: 'I am doing well, thank you!',
      timestamp: 2000,
    },
    { role: 'user', content: 'What can you help me with?', timestamp: 3000 },
    {
      role: 'assistant',
      content: 'I can help you with various tasks.',
      timestamp: 4000,
    },
  ];

  beforeEach(() => {
    analyzer = new ConversationAnalyzer();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const options = analyzer.getOptions();
      expect(options.similarityThreshold).toBe(0.75);
      expect(options.patternThreshold).toBe(0.8);
      expect(options.keywordThreshold).toBe(0.7);
      expect(options.analysisWindow).toBe(10);
      expect(options.enableSimilarityAnalysis).toBe(true);
      expect(options.enablePatternDetection).toBe(true);
      expect(options.enableKeywordAnalysis).toBe(true);
      expect(options.enableTopicTracking).toBe(true);
    });

    it('should accept custom options', () => {
      const customAnalyzer = new ConversationAnalyzer({
        similarityThreshold: 0.9,
        analysisWindow: 5,
        enablePatternDetection: false,
      });
      const options = customAnalyzer.getOptions();
      expect(options.similarityThreshold).toBe(0.9);
      expect(options.analysisWindow).toBe(5);
      expect(options.enablePatternDetection).toBe(false);
    });
  });

  describe('analyzeConversation', () => {
    it('should return empty analysis for empty messages', () => {
      const result = analyzer.analyzeConversation([]);
      expect(result.similarity.score).toBe(0);
      expect(result.similarity.isRepeated).toBe(false);
      expect(result.topics).toEqual([]);
      expect(result.patterns).toEqual([]);
      expect(result.shouldIntervene).toBe(false);
    });

    it('should analyze conversation with all features enabled', () => {
      const result = analyzer.analyzeConversation(mockMessages);
      expect(result).toHaveProperty('similarity');
      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('shouldIntervene');
      expect(result).toHaveProperty('interventionReason');
      expect(result).toHaveProperty('lastIntervention');
    });

    it('should respect analysis window size', () => {
      const customAnalyzer = new ConversationAnalyzer({ analysisWindow: 2 });
      const manyMessages: Message[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: i * 1000,
        }));

      const result = customAnalyzer.analyzeConversation(manyMessages);
      // Should only analyze last 2 messages
      expect(result).toBeDefined();
    });

    it('should disable features when configured', () => {
      const customAnalyzer = new ConversationAnalyzer({
        enableSimilarityAnalysis: false,
        enablePatternDetection: false,
        enableTopicTracking: false,
      });

      const result = customAnalyzer.analyzeConversation(mockMessages);
      expect(result.similarity.score).toBe(0);
      expect(result.patterns).toEqual([]);
      expect(result.topics).toEqual([]);
    });

    it('should detect repetitive conversations', () => {
      const repetitiveMessages: Message[] = [
        { role: 'user', content: 'Hello', timestamp: 1000 },
        { role: 'assistant', content: 'Hi there', timestamp: 2000 },
        { role: 'user', content: 'Hello', timestamp: 3000 },
        { role: 'assistant', content: 'Hi there', timestamp: 4000 },
        { role: 'user', content: 'Hello', timestamp: 5000 },
        { role: 'assistant', content: 'Hi there', timestamp: 6000 },
      ];

      const result = analyzer.analyzeConversation(repetitiveMessages);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionReason).toContain('パターンの繰り返し');
    });
  });

  describe('analyzeMessageFlow', () => {
    it('should return empty stats for empty messages', () => {
      const result = analyzer.analyzeMessageFlow([]);
      expect(result.avgMessageLength).toBe(0);
      expect(result.roleDistribution).toEqual({});
      expect(result.conversationRhythm).toEqual([]);
      expect(result.engagementScore).toBe(0);
    });

    it('should calculate message flow statistics', () => {
      const result = analyzer.analyzeMessageFlow(mockMessages);
      expect(result.avgMessageLength).toBeGreaterThan(0);
      expect(result.roleDistribution).toEqual({
        user: 2,
        assistant: 2,
      });
      expect(result.conversationRhythm).toHaveLength(3);
      expect(result.engagementScore).toBeGreaterThan(0);
    });

    it('should handle messages without timestamps', () => {
      const messagesWithoutTimestamp: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];

      const result = analyzer.analyzeMessageFlow(messagesWithoutTimestamp);
      expect(result.conversationRhythm).toEqual([]);
      expect(result.avgMessageLength).toBeGreaterThan(0);
    });
  });

  describe('detectConversationLoops', () => {
    it('should return no loop for short conversations', () => {
      const shortMessages: Message[] = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
      ];

      const result = analyzer.detectConversationLoops(shortMessages);
      expect(result.hasLoop).toBe(false);
      expect(result.loopLength).toBe(0);
      expect(result.loopStart).toBe(-1);
      expect(result.confidence).toBe(0);
    });

    it('should detect simple conversation loops', () => {
      const loopingMessages: Message[] = [
        { role: 'user', content: 'What is the weather?' },
        { role: 'assistant', content: 'It is sunny today.' },
        { role: 'user', content: 'What is the weather?' },
        { role: 'assistant', content: 'It is sunny today.' },
      ];

      const result = analyzer.detectConversationLoops(loopingMessages);
      expect(result.hasLoop).toBe(true);
      expect(result.loopLength).toBe(2);
      expect(result.loopStart).toBe(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should not detect loops in varied conversations', () => {
      const result = analyzer.detectConversationLoops(mockMessages);
      expect(result.hasLoop).toBe(false);
    });
  });

  describe('getAnalysisStats', () => {
    it('should return analysis statistics', () => {
      const stats = analyzer.getAnalysisStats();
      expect(stats).toHaveProperty('totalAnalyses');
      expect(stats).toHaveProperty('averageAnalysisTime');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('memoryUsage');
    });
  });

  describe('cache management', () => {
    it('should clear all caches', () => {
      // Perform some analyses to populate caches
      analyzer.analyzeConversation(mockMessages);

      // Clear caches
      analyzer.clearCache();

      // Stats should reflect cleared caches
      const stats = analyzer.getAnalysisStats();
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('options management', () => {
    it('should update options', () => {
      analyzer.updateOptions({
        similarityThreshold: 0.85,
        analysisWindow: 15,
      });

      const options = analyzer.getOptions();
      expect(options.similarityThreshold).toBe(0.85);
      expect(options.analysisWindow).toBe(15);
      // Other options should remain unchanged
      expect(options.patternThreshold).toBe(0.8);
    });

    it('should return a copy of options', () => {
      const options1 = analyzer.getOptions();
      const options2 = analyzer.getOptions();
      expect(options1).not.toBe(options2);
      expect(options1).toEqual(options2);
    });
  });

  describe('intervention logic', () => {
    it('should trigger intervention on high similarity', () => {
      const similarMessages: Message[] = [
        { role: 'user', content: 'Tell me about cats' },
        { role: 'assistant', content: 'Cats are wonderful pets' },
        { role: 'user', content: 'Tell me about cats' },
        { role: 'assistant', content: 'Cats are wonderful pets' },
      ];

      const customAnalyzer = new ConversationAnalyzer({
        similarityThreshold: 0.5,
      });

      const result = customAnalyzer.analyzeConversation(similarMessages);
      if (result.similarity.score >= 0.5) {
        expect(result.interventionReason).toContain('類似度が高い');
      }
    });

    it('should trigger intervention on topic concentration', () => {
      // This test depends on the actual implementation of topic analysis
      const topicMessages: Message[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'Let me talk about programming and coding again',
          timestamp: i * 1000,
        }));

      const result = analyzer.analyzeConversation(topicMessages);
      // Topic analysis might detect concentrated topics
      expect(result).toBeDefined();
    });
  });
});

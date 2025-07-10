import type {
  Message,
  AnalysisResult,
  SimilarityResult,
  TopicInfo,
  ConversationPattern,
  TextAnalysisOptions,
} from '../types/index.js';
import { SimilarityAnalyzer } from '../analyzers/SimilarityAnalyzer.js';
import { KeywordExtractor } from '../analyzers/KeywordExtractor.js';
import { PatternDetector } from '../analyzers/PatternDetector.js';
import { measurePerformance } from '../utils/browserUtils.js';

export interface ConversationAnalyzerOptions {
  similarityThreshold: number;
  patternThreshold: number;
  keywordThreshold: number;
  analysisWindow: number;
  enableSimilarityAnalysis: boolean;
  enablePatternDetection: boolean;
  enableKeywordAnalysis: boolean;
  enableTopicTracking: boolean;
  textAnalysisOptions: Partial<TextAnalysisOptions>;
}

export class ConversationAnalyzer {
  private readonly similarityAnalyzer: SimilarityAnalyzer;
  private readonly keywordExtractor: KeywordExtractor;
  private readonly patternDetector: PatternDetector;
  private readonly options: ConversationAnalyzerOptions;

  constructor(options: Partial<ConversationAnalyzerOptions> = {}) {
    this.options = {
      similarityThreshold: 0.75,
      patternThreshold: 0.8,
      keywordThreshold: 0.7,
      analysisWindow: 10,
      enableSimilarityAnalysis: true,
      enablePatternDetection: true,
      enableKeywordAnalysis: true,
      enableTopicTracking: true,
      textAnalysisOptions: {},
      ...options,
    };

    this.similarityAnalyzer = new SimilarityAnalyzer(
      this.options.textAnalysisOptions
    );
    this.keywordExtractor = new KeywordExtractor(
      this.options.textAnalysisOptions
    );
    this.patternDetector = new PatternDetector();
  }

  analyzeConversation(messages: Message[]): AnalysisResult {
    return measurePerformance('analyzeConversation', () => {
      const analysisWindow = this.getAnalysisWindow(messages);

      const similarity = this.options.enableSimilarityAnalysis
        ? this.analyzeSimilarity(analysisWindow)
        : this.createEmptySimilarityResult();

      const topics = this.options.enableTopicTracking
        ? this.analyzeTopics(analysisWindow)
        : [];

      const patterns = this.options.enablePatternDetection
        ? this.analyzePatterns(analysisWindow)
        : [];

      const shouldIntervene = this.shouldIntervene(
        similarity,
        topics,
        patterns
      );
      const interventionReason = this.getInterventionReason(
        similarity,
        topics,
        patterns
      );

      return {
        similarity,
        topics,
        patterns,
        shouldIntervene,
        interventionReason,
        lastIntervention: 0,
      };
    });
  }

  private getAnalysisWindow(messages: Message[]): Message[] {
    const windowSize = Math.min(this.options.analysisWindow, messages.length);
    return messages.slice(-windowSize);
  }

  private analyzeSimilarity(messages: Message[]): SimilarityResult {
    if (messages.length < 2) {
      return this.createEmptySimilarityResult();
    }

    const latestMessage = messages[messages.length - 1];
    const previousMessages = messages.slice(0, -1);

    return this.similarityAnalyzer.analyzeSimilarity(
      latestMessage,
      previousMessages,
      this.options.similarityThreshold
    );
  }

  private analyzeTopics(messages: Message[]): TopicInfo[] {
    if (!this.options.enableTopicTracking || messages.length === 0) {
      return [];
    }

    return this.keywordExtractor.getTopicInfo(messages);
  }

  private analyzePatterns(messages: Message[]): ConversationPattern[] {
    if (!this.options.enablePatternDetection || messages.length < 3) {
      return [];
    }

    const result = this.patternDetector.detectPatterns(messages);
    return result.patterns;
  }

  private shouldIntervene(
    similarity: SimilarityResult,
    topics: TopicInfo[],
    patterns: ConversationPattern[]
  ): boolean {
    const similarityTrigger =
      similarity.isRepeated &&
      similarity.score >= this.options.similarityThreshold;

    const patternTrigger = patterns.some((p) => p.frequency >= 3);

    const topicTrigger =
      topics.length > 0 && topics.some((t) => t.confidence > 0.8);

    return similarityTrigger || patternTrigger || topicTrigger;
  }

  private getInterventionReason(
    similarity: SimilarityResult,
    topics: TopicInfo[],
    patterns: ConversationPattern[]
  ): string {
    const reasons: string[] = [];

    if (similarity.isRepeated) {
      reasons.push(`類似度が高い (${Math.round(similarity.score * 100)}%)`);
    }

    if (patterns.length > 0) {
      const maxFrequency = Math.max(...patterns.map((p) => p.frequency));
      reasons.push(`パターンの繰り返し (最大${maxFrequency}回)`);
    }

    if (topics.length > 0) {
      const highConfidenceTopics = topics.filter((t) => t.confidence > 0.8);
      if (highConfidenceTopics.length > 0) {
        reasons.push(`話題の偏り (${highConfidenceTopics.length}件)`);
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : '閾値を超過';
  }

  private createEmptySimilarityResult(): SimilarityResult {
    return {
      score: 0,
      isRepeated: false,
      matchedMessages: [],
    };
  }

  analyzeMessageFlow(messages: Message[]): {
    avgMessageLength: number;
    roleDistribution: Record<string, number>;
    conversationRhythm: number[];
    engagementScore: number;
  } {
    if (messages.length === 0) {
      return {
        avgMessageLength: 0,
        roleDistribution: {},
        conversationRhythm: [],
        engagementScore: 0,
      };
    }

    const avgMessageLength =
      messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;

    const roleDistribution: Record<string, number> = {};
    messages.forEach((m) => {
      roleDistribution[m.role] = (roleDistribution[m.role] || 0) + 1;
    });

    const conversationRhythm = this.calculateConversationRhythm(messages);
    const engagementScore = this.calculateEngagementScore(messages);

    return {
      avgMessageLength: Math.round(avgMessageLength),
      roleDistribution,
      conversationRhythm,
      engagementScore,
    };
  }

  private calculateConversationRhythm(messages: Message[]): number[] {
    const rhythm: number[] = [];

    for (let i = 1; i < messages.length; i++) {
      const prevTime = messages[i - 1].timestamp || 0;
      const currTime = messages[i].timestamp || 0;

      if (prevTime > 0 && currTime > 0) {
        const interval = currTime - prevTime;
        rhythm.push(interval);
      }
    }

    return rhythm;
  }

  private calculateEngagementScore(messages: Message[]): number {
    if (messages.length === 0) return 0;

    const avgLength =
      messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const uniqueWords = new Set();

    messages.forEach((m) => {
      const words = m.content.split(/\s+/);
      words.forEach((word) => uniqueWords.add(word.toLowerCase()));
    });

    const vocabularyDiversity = uniqueWords.size / messages.length;
    const lengthScore = Math.min(avgLength / 100, 1.0);

    return Math.round((vocabularyDiversity + lengthScore) * 50);
  }

  detectConversationLoops(messages: Message[]): {
    hasLoop: boolean;
    loopLength: number;
    loopStart: number;
    confidence: number;
  } {
    const result = {
      hasLoop: false,
      loopLength: 0,
      loopStart: -1,
      confidence: 0,
    };

    if (messages.length < 4) return result;

    for (
      let loopLength = 2;
      loopLength <= Math.floor(messages.length / 2);
      loopLength++
    ) {
      for (let start = 0; start <= messages.length - loopLength * 2; start++) {
        const sequence1 = messages.slice(start, start + loopLength);
        const sequence2 = messages.slice(
          start + loopLength,
          start + loopLength * 2
        );

        const similarity = this.calculateSequenceSimilarity(
          sequence1,
          sequence2
        );

        if (similarity > 0.8) {
          result.hasLoop = true;
          result.loopLength = loopLength;
          result.loopStart = start;
          result.confidence = similarity;
          return result;
        }
      }
    }

    return result;
  }

  private calculateSequenceSimilarity(
    seq1: Message[],
    seq2: Message[]
  ): number {
    if (seq1.length !== seq2.length) return 0;

    let totalSimilarity = 0;
    let validComparisons = 0;

    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i].role === seq2[i].role) {
        const similarity = this.similarityAnalyzer.calculateSimilarity(
          seq1[i].content,
          seq2[i].content
        );
        totalSimilarity += similarity;
        validComparisons++;
      }
    }

    return validComparisons > 0 ? totalSimilarity / validComparisons : 0;
  }

  getAnalysisStats(): {
    totalAnalyses: number;
    averageAnalysisTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  } {
    const similarityStats = this.similarityAnalyzer.getCacheStats();

    return {
      totalAnalyses: 0,
      averageAnalysisTime: 0,
      cacheHitRate: similarityStats.hitRate,
      memoryUsage: similarityStats.size,
    };
  }

  clearCache(): void {
    this.similarityAnalyzer.clearCache();
    this.keywordExtractor.clearCache();
    this.patternDetector.clearPatterns();
  }

  updateOptions(options: Partial<ConversationAnalyzerOptions>): void {
    Object.assign(this.options, options);
  }

  getOptions(): ConversationAnalyzerOptions {
    return { ...this.options };
  }
}

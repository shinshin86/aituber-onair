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
import {
  DEFAULT_ANALYSIS_WINDOW,
  DEFAULT_ANALYZER_SIMILARITY_THRESHOLD,
  DEFAULT_KEYWORD_THRESHOLD,
  DEFAULT_PATTERN_THRESHOLD,
  LOOP_DETECTION_THRESHOLD,
  PATTERN_FREQUENCY_TRIGGER,
  TOPIC_CONFIDENCE_TRIGGER,
} from '../config/constants.js';
import { DEFAULT_PROMPTS } from '../config/defaultPrompts.js';
import {
  overridePrompts,
  type LocalizedPrompts,
  type LocalizedPromptOverrides,
  type PromptTemplates,
} from '../types/prompts.js';
import { measurePerformance } from '../utils/browserUtils.js';

const DEFAULT_INTERVENTION_REASONS: NonNullable<
  PromptTemplates['interventionReasons']
> = {
  similarityHigh: 'High similarity ({score}%)',
  patternRepetition: 'Pattern repetition (max {count} times)',
  topicBias: 'Narrow topic focus ({count} topics)',
  thresholdExceeded: 'Threshold exceeded',
};

type InterventionReasonKey = keyof NonNullable<
  PromptTemplates['interventionReasons']
>;

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
  language?: string;
  customPrompts?: LocalizedPromptOverrides;
}

export class ConversationAnalyzer {
  private readonly similarityAnalyzer: SimilarityAnalyzer;
  private readonly keywordExtractor: KeywordExtractor;
  private readonly patternDetector: PatternDetector;
  private readonly options: ConversationAnalyzerOptions;
  private prompts: LocalizedPrompts;

  constructor(options: Partial<ConversationAnalyzerOptions> = {}) {
    this.options = {
      similarityThreshold: DEFAULT_ANALYZER_SIMILARITY_THRESHOLD,
      patternThreshold: DEFAULT_PATTERN_THRESHOLD,
      keywordThreshold: DEFAULT_KEYWORD_THRESHOLD,
      analysisWindow: DEFAULT_ANALYSIS_WINDOW,
      enableSimilarityAnalysis: true,
      enablePatternDetection: true,
      enableKeywordAnalysis: true,
      enableTopicTracking: true,
      textAnalysisOptions: {},
      language: 'ja',
      customPrompts: undefined,
      ...options,
    };
    this.prompts = overridePrompts(DEFAULT_PROMPTS, this.options.customPrompts);

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

    const patternTrigger = patterns.some(
      (p) => p.frequency >= PATTERN_FREQUENCY_TRIGGER
    );

    const topicTrigger =
      topics.length > 0 &&
      topics.some((t) => t.confidence > TOPIC_CONFIDENCE_TRIGGER);

    return similarityTrigger || patternTrigger || topicTrigger;
  }

  private getInterventionReason(
    similarity: SimilarityResult,
    topics: TopicInfo[],
    patterns: ConversationPattern[]
  ): string {
    const templates = this.getInterventionReasonTemplates();
    const reasons: string[] = [];

    if (similarity.isRepeated) {
      reasons.push(
        templates.similarityHigh.replace(
          '{score}',
          String(Math.round(similarity.score * 100))
        )
      );
    }

    if (patterns.length > 0) {
      const maxFrequency = Math.max(...patterns.map((p) => p.frequency));
      reasons.push(
        templates.patternRepetition.replace('{count}', String(maxFrequency))
      );
    }

    if (topics.length > 0) {
      const highConfidenceTopics = topics.filter(
        (t) => t.confidence > TOPIC_CONFIDENCE_TRIGGER
      );
      if (highConfidenceTopics.length > 0) {
        reasons.push(
          templates.topicBias.replace(
            '{count}',
            String(highConfidenceTopics.length)
          )
        );
      }
    }

    return reasons.length > 0
      ? reasons.join(', ')
      : templates.thresholdExceeded;
  }

  private getInterventionReasonTemplates(): NonNullable<
    PromptTemplates['interventionReasons']
  > {
    return {
      similarityHigh: this.resolveInterventionReasonTemplate('similarityHigh'),
      patternRepetition:
        this.resolveInterventionReasonTemplate('patternRepetition'),
      topicBias: this.resolveInterventionReasonTemplate('topicBias'),
      thresholdExceeded:
        this.resolveInterventionReasonTemplate('thresholdExceeded'),
    } satisfies NonNullable<PromptTemplates['interventionReasons']>;
  }

  private resolveInterventionReasonTemplate(
    key: InterventionReasonKey
  ): string {
    const language = this.options.language || 'ja';
    const languageReasons = this.prompts[language]?.interventionReasons;
    const englishDefaults = DEFAULT_PROMPTS.en.interventionReasons;

    return (
      languageReasons?.[key] ||
      englishDefaults?.[key] ||
      DEFAULT_INTERVENTION_REASONS[key]
    );
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
    for (const m of messages) {
      roleDistribution[m.role] = (roleDistribution[m.role] || 0) + 1;
    }

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

    for (const m of messages) {
      const words = m.content.split(/\s+/);
      for (const word of words) {
        uniqueWords.add(word.toLowerCase());
      }
    }

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

        if (similarity > LOOP_DETECTION_THRESHOLD) {
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
    this.prompts = overridePrompts(DEFAULT_PROMPTS, this.options.customPrompts);
  }

  getOptions(): ConversationAnalyzerOptions {
    return { ...this.options };
  }
}

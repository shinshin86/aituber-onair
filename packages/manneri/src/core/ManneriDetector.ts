import type {
  Message,
  ManneriConfig,
  AnalysisResult,
  DiversificationPrompt,
  ManneriEvent,
  ManneriEventHandler,
  StorageData,
  AiProviderConfig,
  PersistenceProvider,
} from '../types/index.js';
import { DEFAULT_MANNERI_CONFIG } from '../types/index.js';
import {
  ConversationAnalyzer,
  type ConversationAnalyzerOptions,
} from './ConversationAnalyzer.js';
import {
  PromptGenerator,
  type PromptGenerationOptions,
} from '../generators/PromptGenerator.js';
import { PatternDetector } from '../analyzers/PatternDetector.js';
import { createEventEmitter, generateId } from '../utils/browserUtils.js';

export class ManneriDetector {
  private readonly config: ManneriConfig;
  private readonly analyzer: ConversationAnalyzer;
  private readonly promptGenerator: PromptGenerator;
  private readonly patternDetector: PatternDetector;
  private readonly persistenceProvider?: PersistenceProvider;
  private readonly eventEmitter = createEventEmitter<{
    pattern_detected: AnalysisResult;
    intervention_triggered: DiversificationPrompt;
    topic_changed: { oldTopics: string[]; newTopics: string[] };
    similarity_calculated: { score: number; threshold: number };
    config_updated: Partial<ManneriConfig>;
    storage_cleaned: { removedItems: number };
    save_success: { timestamp: number };
    save_error: { error: Error };
    load_success: { data: StorageData; timestamp: number };
    load_error: { error: Error };
    cleanup_completed: { removedItems: number; timestamp: number };
    cleanup_error: { error: Error };
  }>();

  private interventionHistory: number[] = [];
  private lastAnalysisResult: AnalysisResult | null = null;

  constructor(
    config: Partial<ManneriConfig> = {},
    options: {
      persistenceProvider?: PersistenceProvider;
    } = {}
  ) {
    this.config = { ...DEFAULT_MANNERI_CONFIG, ...config };
    this.persistenceProvider = options.persistenceProvider;

    const language = this.config.language || 'ja';
    const customPrompts = this.config.customPrompts;

    this.analyzer = new ConversationAnalyzer(this.createAnalyzerOptions());
    this.promptGenerator = new PromptGenerator(language, customPrompts);
    this.patternDetector = new PatternDetector();
  }

  detectManneri(messages: Message[]): boolean {
    if (messages.length < 2) return false;

    const result = this.analyzer.analyzeConversation(messages);
    this.lastAnalysisResult = result;

    this.emit('similarity_calculated', {
      score: result.similarity.score,
      threshold: this.config.similarityThreshold,
    });

    if (result.shouldIntervene) {
      this.emit('pattern_detected', result);
    }

    return result.shouldIntervene;
  }

  shouldIntervene(messages: Message[]): boolean {
    if (!this.detectManneri(messages)) return false;

    const now = Date.now();
    const lastIntervention =
      this.interventionHistory[this.interventionHistory.length - 1] || 0;
    const timeSinceLastIntervention = now - lastIntervention;

    const shouldInterveneByTime =
      timeSinceLastIntervention >= this.config.interventionCooldown;

    if (!shouldInterveneByTime && this.config.debugMode) {
      console.log(
        `[Manneri] Intervention skipped due to cooldown. Time remaining: ${this.config.interventionCooldown - timeSinceLastIntervention}ms`
      );
    }

    return shouldInterveneByTime;
  }

  generateDiversificationPrompt(messages: Message[]): DiversificationPrompt {
    const options: PromptGenerationOptions = {
      language: this.config.language,
    };

    const prompt = this.promptGenerator.generateDiversificationPrompt(
      messages,
      options
    );

    this.recordIntervention();
    this.emit('intervention_triggered', prompt);

    return prompt;
  }

  async generateAiDiversificationPrompt(
    messages: Message[]
  ): Promise<DiversificationPrompt> {
    return this.generateDiversificationPrompt(messages);
  }

  analyzeConversation(messages: Message[]): AnalysisResult {
    const result = this.analyzer.analyzeConversation(messages);
    this.lastAnalysisResult = result;
    return result;
  }

  updateConfig(newConfig: Partial<ManneriConfig>): void {
    Object.assign(this.config, newConfig);

    // Update language and prompts if changed
    if (newConfig.language || newConfig.customPrompts) {
      const language = this.config.language || 'ja';
      const customPrompts = this.config.customPrompts;
      (this as any).promptGenerator = new PromptGenerator(
        language,
        customPrompts
      );
      (this as any).patternDetector = new PatternDetector();
    }

    this.analyzer.updateOptions(this.createAnalyzerOptions());

    this.emit('config_updated', newConfig);
  }

  getConfig(): ManneriConfig {
    return { ...this.config };
  }

  on<K extends keyof ManneriEvent>(
    event: K,
    handler: ManneriEventHandler<ManneriEvent[K]>
  ): void {
    this.eventEmitter.on(event, handler);
  }

  off<K extends keyof ManneriEvent>(
    event: K,
    handler: ManneriEventHandler<ManneriEvent[K]>
  ): void {
    this.eventEmitter.off(event, handler);
  }

  getStatistics(): {
    totalInterventions: number;
    averageInterventionInterval: number;
    lastIntervention: number | null;
    configuredThresholds: {
      similarity: number;
      repetition: number;
      cooldown: number;
    };
    analysisStats: ReturnType<ConversationAnalyzer['getAnalysisStats']>;
  } {
    const totalInterventions = this.interventionHistory.length;

    let averageInterval = 0;
    if (totalInterventions > 1) {
      const intervals = [];
      for (let i = 1; i < this.interventionHistory.length; i++) {
        intervals.push(
          this.interventionHistory[i] - this.interventionHistory[i - 1]
        );
      }
      averageInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) /
        intervals.length;
    }

    return {
      totalInterventions,
      averageInterventionInterval: Math.round(averageInterval),
      lastIntervention:
        this.interventionHistory[this.interventionHistory.length - 1] || null,
      configuredThresholds: {
        similarity: this.config.similarityThreshold,
        repetition: this.config.repetitionLimit,
        cooldown: this.config.interventionCooldown,
      },
      analysisStats: this.analyzer.getAnalysisStats(),
    };
  }

  clearHistory(): void {
    this.interventionHistory = [];
    this.lastAnalysisResult = null;
    this.analyzer.clearCache();
    this.promptGenerator.clearHistory();
  }

  exportData(): StorageData {
    return {
      patterns: this.lastAnalysisResult?.patterns || [],
      interventions: this.interventionHistory,
      settings: this.config,
      lastCleanup: Date.now(),
    };
  }

  importData(data: StorageData): void {
    if (data.interventions) {
      this.interventionHistory = data.interventions;
    }

    if (data.settings) {
      this.updateConfig(data.settings);
    }
  }

  private createAnalyzerOptions(): ConversationAnalyzerOptions {
    return {
      similarityThreshold: this.config.similarityThreshold,
      patternThreshold: 0.8,
      keywordThreshold: 0.7,
      analysisWindow: this.config.lookbackWindow,
      enableSimilarityAnalysis: true,
      enablePatternDetection: true,
      enableKeywordAnalysis: this.config.enableKeywordAnalysis,
      enableTopicTracking: this.config.enableTopicTracking,
      textAnalysisOptions: {
        minWordLength: 2,
        includeStopWords: false,
        language: 'auto',
      },
    };
  }

  private recordIntervention(): void {
    const now = Date.now();
    this.interventionHistory.push(now);

    const maxHistory = 100;
    if (this.interventionHistory.length > maxHistory) {
      this.interventionHistory = this.interventionHistory.slice(-maxHistory);
    }
  }

  private emit<K extends keyof ManneriEvent>(event: K, data: any): void {
    if (this.config.debugMode) {
      console.log(`[Manneri] Event: ${event}`, data);
    }

    this.eventEmitter.emit(event, data);
  }

  /**
   * Manually save data using the persistence provider
   */
  async save(): Promise<boolean> {
    if (!this.persistenceProvider) {
      console.warn('ManneriDetector: No persistence provider configured');
      return false;
    }

    try {
      const data: StorageData = this.exportData();
      const result = await this.persistenceProvider.save(data);

      if (result) {
        this.emit('save_success', { timestamp: Date.now() });
      }

      return result;
    } catch (error) {
      this.emit('save_error', { error: error as Error });
      return false;
    }
  }

  /**
   * Manually load data using the persistence provider
   */
  async load(): Promise<boolean> {
    if (!this.persistenceProvider) {
      console.warn('ManneriDetector: No persistence provider configured');
      return false;
    }

    try {
      const data = await this.persistenceProvider.load();

      if (data) {
        this.importData(data);
        this.emit('load_success', { data, timestamp: Date.now() });
        return true;
      }

      return false;
    } catch (error) {
      this.emit('load_error', { error: error as Error });
      return false;
    }
  }

  /**
   * Manually cleanup old data
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAge;

    const originalLength = this.interventionHistory.length;
    this.interventionHistory = this.interventionHistory.filter(
      (timestamp) => timestamp > cutoff
    );

    const removed = originalLength - this.interventionHistory.length;

    try {
      let providerRemoved = 0;
      if (this.persistenceProvider?.cleanup) {
        providerRemoved = await this.persistenceProvider.cleanup(maxAge);
      }

      const totalRemoved = removed + providerRemoved;

      if (totalRemoved > 0) {
        this.emit('cleanup_completed', {
          removedItems: totalRemoved,
          timestamp: Date.now(),
        });
      }

      return totalRemoved;
    } catch (error) {
      this.emit('cleanup_error', { error: error as Error });
      return removed; // Return at least the memory cleanup count
    }
  }

  /**
   * Check if persistence provider is configured
   */
  hasPersistenceProvider(): boolean {
    return this.persistenceProvider !== undefined;
  }

  /**
   * Get persistence provider info (if available)
   */
  getPersistenceInfo(): any {
    if (!this.persistenceProvider) {
      return null;
    }

    // Try to get info from LocalStoragePersistenceProvider
    if ('getStorageInfo' in this.persistenceProvider) {
      return (this.persistenceProvider as any).getStorageInfo();
    }

    return { provider: 'custom', available: true };
  }
}

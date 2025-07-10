export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
}

import type { LocalizedPrompts } from './prompts.js';

export interface ManneriConfig {
  similarityThreshold: number;
  repetitionLimit: number;
  lookbackWindow: number;
  interventionCooldown: number;
  minMessageLength: number;
  excludeKeywords: string[];
  enableTopicTracking: boolean;
  enableKeywordAnalysis: boolean;
  debugMode: boolean;
  // AI generation settings
  enableAiPromptGeneration: boolean;
  aiPromptGenerationProvider: 'openai' | 'gemini' | 'default';
  aiPromptGenerationModel?: string;
  // Language and prompt settings
  language?: string;
  customPrompts?: Partial<LocalizedPrompts>;
}

export interface SimilarityResult {
  score: number;
  isRepeated: boolean;
  matchedMessages: Message[];
}

export interface ConversationPattern {
  id: string;
  pattern: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  messages: Message[];
}

export interface TopicInfo {
  keywords: string[];
  score: number;
  category: string;
  confidence: number;
}

export interface AnalysisResult {
  similarity: SimilarityResult;
  topics: TopicInfo[];
  patterns: ConversationPattern[];
  shouldIntervene: boolean;
  interventionReason: string;
  lastIntervention: number;
}

export interface DiversificationPrompt {
  content: string;
  type: 'topic_change' | 'pattern_break' | 'keyword_shift';
  priority: 'low' | 'medium' | 'high';
  context: string;
}

export interface AiProviderConfig {
  provider: 'openai' | 'gemini';
  model: string;
  apiKey: string;
}

export interface TextAnalysisOptions {
  minWordLength: number;
  maxNgrams: number;
  includeStopWords: boolean;
  caseSensitive: boolean;
  language: 'ja' | 'en' | 'auto';
}

export interface StorageData {
  patterns: ConversationPattern[];
  interventions: number[];
  settings: Partial<ManneriConfig>;
  lastCleanup: number;
}

export interface ManneriEvent {
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
}

export interface ManneriEventHandler<T = any> {
  (data: T): void;
}

export const DEFAULT_MANNERI_CONFIG: ManneriConfig = {
  similarityThreshold: 0.75,
  repetitionLimit: 3,
  lookbackWindow: 10,
  interventionCooldown: 300000,
  minMessageLength: 10,
  excludeKeywords: [
    'はい',
    'そうですね',
    'そうです',
    'いいえ',
    'yes',
    'no',
    'ok',
    'okay',
  ],
  enableTopicTracking: true,
  enableKeywordAnalysis: true,
  debugMode: false,
  enableAiPromptGeneration: false,
  aiPromptGenerationProvider: 'default',
  aiPromptGenerationModel: undefined,
  language: 'ja',
  customPrompts: undefined,
};

// Export prompt types
export type {
  PromptTemplates,
  LocalizedPrompts,
} from './prompts.js';

// Export persistence types
export type {
  PersistenceProvider,
  PersistenceConfig,
  PersistenceEvents,
} from './persistence.js';

// Re-export utility functions
export { getPromptTemplate, overridePrompts } from './prompts.js';

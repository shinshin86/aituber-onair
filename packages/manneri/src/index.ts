export { ManneriDetector } from './core/ManneriDetector.js';
export { ConversationAnalyzer } from './core/ConversationAnalyzer.js';
export { SimilarityAnalyzer } from './analyzers/SimilarityAnalyzer.js';
export { KeywordExtractor } from './analyzers/KeywordExtractor.js';
export { PatternDetector } from './analyzers/PatternDetector.js';
export { PromptGenerator } from './generators/PromptGenerator.js';

export type {
  Message,
  ManneriConfig,
  SimilarityResult,
  ConversationPattern,
  TopicInfo,
  AnalysisResult,
  DiversificationPrompt,
  TextAnalysisOptions,
  StorageData,
  ManneriEvent,
  ManneriEventHandler,
} from './types/index.js';

export {
  DEFAULT_MANNERI_CONFIG,
  getPromptTemplate,
  overridePrompts,
} from './types/index.js';

export { DEFAULT_PROMPTS } from './config/defaultPrompts.js';
export {
  CACHE_TTL_MS,
  MAX_CACHE_SIZE,
  CACHE_EVICTION_BATCH,
  DEFAULT_SIMILARITY_THRESHOLD,
  MAX_KEYWORDS,
  MAX_CONTEXT_LENGTH,
  MAX_CONTEXTS_PER_KEYWORD,
  TOP_KEYWORDS_LIMIT,
  MAX_TOPIC_CLUSTERS,
  MAX_RELATED_KEYWORDS,
  SEMANTIC_SIMILARITY_THRESHOLD,
  KEYWORD_DENSITY_THRESHOLD,
  RECENCY_WINDOW_MS,
  PERSISTENCE_WINDOW_MS,
  MAX_PATTERNS,
  MIN_PATTERN_LENGTH,
  MAX_PATTERN_LENGTH,
  REPEATED_SIMILARITY_THRESHOLD,
  MIN_SEQUENCE_FREQUENCY,
  MIN_REPEATED_ROLE_FREQUENCY,
  MAX_PATTERN_AGE_MS,
  SEVERITY_HIGH_FREQUENCY,
  SEVERITY_HIGH_PATTERN_COUNT,
  SEVERITY_MEDIUM_FREQUENCY,
  SEVERITY_MEDIUM_PATTERN_COUNT,
  SIGNATURE_WORD_COUNT,
  DEFAULT_ANALYZER_SIMILARITY_THRESHOLD,
  DEFAULT_PATTERN_THRESHOLD,
  DEFAULT_KEYWORD_THRESHOLD,
  DEFAULT_ANALYSIS_WINDOW,
  LOOP_DETECTION_THRESHOLD,
  PATTERN_FREQUENCY_TRIGGER,
  TOPIC_CONFIDENCE_TRIGGER,
  MAX_INTERVENTION_HISTORY,
  DEFAULT_CLEANUP_MAX_AGE_MS,
  DEFAULT_STORAGE_KEY,
  STORAGE_VERSION,
  DEFAULT_TOP_KEYWORDS,
  SHORT_TEXT_TOKEN_LIMIT,
  HIGH_JACCARD_THRESHOLD,
  MAX_PROMPT_HISTORY,
} from './config/constants.js';

// Export persistence providers
export { LocalStoragePersistenceProvider } from './persistence/LocalStoragePersistenceProvider.js';
export type {
  PersistenceProvider,
  PersistenceConfig,
  PersistenceEvents,
} from './types/persistence.js';

export {
  calculateTextSimilarity,
  extractKeywords,
  normalizeText,
  tokenize,
  generateNgrams,
  calculateJaccardSimilarity,
  calculateCosineSimilarity,
} from './utils/textUtils.js';

export {
  isBrowserEnvironment,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  cleanupOldData,
  debounce,
  throttle,
  measurePerformance,
  asyncMeasurePerformance,
  createEventEmitter,
  generateId,
  isValidConfig,
} from './utils/browserUtils.js';

export const VERSION = '0.1.0';

export function createManneriDetector(
  config?: Partial<import('./types/index.js').ManneriConfig>
) {
  return new ManneriDetector(config);
}

import { ConversationAnalyzer } from './core/ConversationAnalyzer.js';

export function createConversationAnalyzer(
  options?: Partial<
    import('./core/ConversationAnalyzer.js').ConversationAnalyzerOptions
  >
) {
  return new ConversationAnalyzer(options);
}

import { PromptGenerator } from './generators/PromptGenerator.js';

export function createPromptGenerator(
  language?: string,
  customPrompts?: import('./types/prompts.js').LocalizedPromptOverrides
) {
  return new PromptGenerator(language, customPrompts);
}

import { ManneriDetector } from './core/ManneriDetector.js';
export default ManneriDetector;

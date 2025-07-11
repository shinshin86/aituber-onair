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
  customPrompts?: Partial<import('./types/prompts.js').LocalizedPrompts>
) {
  return new PromptGenerator(language, customPrompts);
}

import { ManneriDetector } from './core/ManneriDetector.js';
export default ManneriDetector;

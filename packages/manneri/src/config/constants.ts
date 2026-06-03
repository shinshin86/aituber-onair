// SimilarityAnalyzer
export const CACHE_TTL_MS = 300000 as const;
export const MAX_CACHE_SIZE = 1000 as const;
export const CACHE_EVICTION_BATCH = 100 as const;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.7 as const;

// KeywordExtractor
export const MAX_KEYWORDS = 50 as const;
export const MAX_CONTEXT_LENGTH = 100 as const;
export const MAX_CONTEXTS_PER_KEYWORD = 5 as const;
export const TOP_KEYWORDS_LIMIT = 20 as const;
export const MAX_TOPIC_CLUSTERS = 10 as const;
export const MAX_RELATED_KEYWORDS = 5 as const;
export const SEMANTIC_SIMILARITY_THRESHOLD = 0.3 as const;
export const KEYWORD_DENSITY_THRESHOLD = 0.5 as const;
export const RECENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PERSISTENCE_WINDOW_MS = 60 * 60 * 1000;

// PatternDetector
export const MAX_PATTERNS = 100 as const;
export const MIN_PATTERN_LENGTH = 2 as const;
export const MAX_PATTERN_LENGTH = 5 as const;
export const REPEATED_SIMILARITY_THRESHOLD = 0.8 as const;
export const JAPANESE_SHORT_REPEATED_SIMILARITY_THRESHOLD = 0.4 as const;
export const JAPANESE_SHORT_REPEATED_MAX_LENGTH = 24 as const;
export const MIN_SEQUENCE_FREQUENCY = 2 as const;
export const MIN_REPEATED_ROLE_FREQUENCY = 3 as const;
export const MAX_PATTERN_AGE_MS = 24 * 60 * 60 * 1000;
export const SEVERITY_HIGH_FREQUENCY = 5 as const;
export const SEVERITY_HIGH_PATTERN_COUNT = 10 as const;
export const SEVERITY_MEDIUM_FREQUENCY = 3 as const;
export const SEVERITY_MEDIUM_PATTERN_COUNT = 5 as const;
export const SIGNATURE_WORD_COUNT = 3 as const;

// ConversationAnalyzer
export const DEFAULT_ANALYZER_SIMILARITY_THRESHOLD = 0.75 as const;
export const DEFAULT_PATTERN_THRESHOLD = 0.8 as const;
export const DEFAULT_KEYWORD_THRESHOLD = 0.7 as const;
export const DEFAULT_ANALYSIS_WINDOW = 10 as const;
export const LOOP_DETECTION_THRESHOLD = 0.8 as const;
export const PATTERN_FREQUENCY_TRIGGER = 3 as const;
export const TOPIC_CONFIDENCE_TRIGGER = 0.8 as const;

// ManneriDetector
export const MAX_INTERVENTION_HISTORY = 100 as const;
export const DEFAULT_CLEANUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// browserUtils
export const DEFAULT_STORAGE_KEY = 'manneri_data' as const;
export const STORAGE_VERSION = '1.0.0' as const;

// textUtils
export const DEFAULT_TOP_KEYWORDS = 10 as const;
export const SHORT_TEXT_TOKEN_LIMIT = 5 as const;
export const HIGH_JACCARD_THRESHOLD = 0.9 as const;

// PromptGenerator
export const MAX_PROMPT_HISTORY = 50 as const;

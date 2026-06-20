import type { CommentAnalysisLLMProvider } from './llm.js';
import type { RankingStrategy, RankingWeights } from './ranking.js';

export type CommentAnalysisMode = 'rules' | 'hybrid' | 'llm-assisted';

export type CommentIntelligenceConfig = {
  analysis?: {
    mode?: CommentAnalysisMode;
    llmProvider?: CommentAnalysisLLMProvider;
    llmPolicy?: {
      minComments?: number;
      maxComments?: number;
      timeoutMs?: number;
      fallbackToRules?: boolean;
    };
  };
  safety?: {
    enabled?: boolean;
    ignoreHighRisk?: boolean;
    ignoreMediumRisk?: boolean;
    blockPromptInjection?: boolean;
    blockUrls?: boolean;
  };
  ranking?: {
    strategy?: RankingStrategy;
    topicFilter?: 'off' | 'prefer' | 'require';
    maxSelectedComments?: number;
    minScore?: number;
    weights?: Partial<RankingWeights>;
  };
  summary?: {
    enabled?: boolean;
    includeIgnoredSummary?: boolean;
    maxExamplesPerCluster?: number;
  };
  context?: {
    language?: 'ja' | 'en' | 'auto';
    style?: 'compact' | 'aituber-live';
  };
  viewerSafety?: {
    enabled?: boolean;
    blockOnHighRisk?: boolean;
    blockDurationMs?: number;
    violationThreshold?: number;
  };
};

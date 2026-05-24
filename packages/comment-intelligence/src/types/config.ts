import type { CommentAnalysisLLMProvider } from './llm';
import type { RankingStrategy, RankingWeights } from './ranking';

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
    blockPromptInjection?: boolean;
    blockUrls?: boolean;
  };
  ranking?: {
    strategy?: RankingStrategy;
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

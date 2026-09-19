import type { LiveComment } from './comment.js';
import type { RecentAiMessage, StreamState } from './context.js';

/** Optional semantic signals. Omitted fields leave the rule score unchanged. */
export type CommentSemanticAssessment = {
  commentId: string;
  topicRelated?: boolean;
  question?: boolean;
  alreadyAnswered?: boolean;
};

export type LLMCommentAnalysisResult = {
  /** Uses deterministic re-ranking instead of provider-selected IDs/text. */
  semanticAssessments?: CommentSemanticAssessment[];
  selectedCommentIds?: string[];
  topicRelatedCommentIds?: string[];
  ignoredSummary?: string;
  audienceMood?: 'calm' | 'excited' | 'confused' | 'negative';
  safetyFlags?: Array<{
    commentId: string;
    category: string;
    reason: string;
  }>;
  instructionForLLM?: string;
  contextForLLM?: string[];
};

export type CommentAnalysisLLMProvider = {
  /** Only send comments that existing safety/answered exclusion rules allow. */
  inputScope?: 'eligible-comments';
  analyze(input: {
    comments: LiveComment[];
    streamState?: StreamState;
    recentMessages?: RecentAiMessage[];
    recentAiMessages?: RecentAiMessage[];
    signal?: AbortSignal;
  }): Promise<LLMCommentAnalysisResult>;
};

import type { LiveComment } from './comment.js';
import type { RecentAiMessage, StreamState } from './context.js';

/** Optional semantic signals. Omitted fields leave the rule score unchanged. */
export type CommentSemanticAssessment = {
  commentId: string;
  topicRelated?: boolean;
  question?: boolean;
  alreadyAnswered?: boolean;
};

/** How much thought a reply to the comment deserves. */
export type CommentResponseDepth = 'one_liner' | 'quick' | 'thoughtful';

export type CommentReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Suggested handling for one comment. The package never generates replies or
 * sends notifications; the host decides how to act on the plan.
 */
export type CommentResponsePlan = {
  commentId: string;
  /** Omitted when the provider was not confident enough. */
  depth?: CommentResponseDepth;
  /** Suggested reasoning effort for the host's reply model. */
  reasoningEffort?: CommentReasoningEffort;
  /** Rude or hostile. Handle with care; no escalation is needed. */
  needsAttention: boolean;
  /**
   * Says the streamer or the AI stated something wrong. Count these across
   * viewers to detect a flare-up that needs a correction.
   */
  pointsOutError: boolean;
  /** Real-world harm or a safety risk; a moderator should act right away. */
  notifyModerator: boolean;
};

export type LLMCommentAnalysisResult = {
  /** Uses deterministic re-ranking instead of provider-selected IDs/text. */
  semanticAssessments?: CommentSemanticAssessment[];
  /** Optional per-comment handling suggestions; they never change ranking. */
  responsePlans?: CommentResponsePlan[];
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

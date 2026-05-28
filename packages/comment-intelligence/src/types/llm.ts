import type { LiveComment } from './comment';
import type { RecentAiMessage, StreamState } from './context';

export type LLMCommentAnalysisResult = {
  selectedCommentIds?: string[];
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
  analyze(input: {
    comments: LiveComment[];
    streamState?: StreamState;
    recentMessages?: RecentAiMessage[];
    recentAiMessages?: RecentAiMessage[];
  }): Promise<LLMCommentAnalysisResult>;
};

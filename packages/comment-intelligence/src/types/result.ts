import type { LiveComment } from './comment.js';
import type { CommentAnalysisMode } from './config.js';
import type { RecentAiMessage, StreamState } from './context.js';
import type { RankedComment } from './ranking.js';
import type { SafetyReport } from './safety.js';
import type { IgnoredCommentsSummary } from './summary.js';
import type { ViewerProfile } from './viewer.js';

export type CommentIntelligenceDebugInfo = {
  mode: CommentAnalysisMode;
  usedLLM: boolean;
  analyzedCommentCount: number;
  selectedCommentIds: string[];
  blockedViewerIds?: string[];
  llmUnmatchedIds: string[];
};

export type CommentIntelligenceResult = {
  selectedComments: RankedComment[];
  rankedComments: RankedComment[];
  ignoredComments: LiveComment[];
  ignoredSummary: IgnoredCommentsSummary;
  safetyReports: SafetyReport[];
  contextForLLM: string[];
  instructionForLLM: string;
  debug?: CommentIntelligenceDebugInfo;
};

export type AnalyzeCommentsInput = {
  comments: LiveComment[];
  recentMessages?: RecentAiMessage[];
  recentAiMessages?: RecentAiMessage[];
  viewerProfiles?: ViewerProfile[];
  streamState?: StreamState;
  options?: Partial<import('./config.js').CommentIntelligenceConfig>;
};

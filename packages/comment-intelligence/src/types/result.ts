import type { LiveComment } from './comment';
import type { CommentAnalysisMode } from './config';
import type { RecentAiMessage, StreamState } from './context';
import type { RankedComment } from './ranking';
import type { SafetyReport } from './safety';
import type { IgnoredCommentsSummary } from './summary';
import type { ViewerProfile } from './viewer';

export type CommentIntelligenceDebugInfo = {
  mode: CommentAnalysisMode;
  usedLLM: boolean;
  analyzedCommentCount: number;
  selectedCommentIds: string[];
  blockedViewerIds?: string[];
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
  options?: Partial<import('./config').CommentIntelligenceConfig>;
};

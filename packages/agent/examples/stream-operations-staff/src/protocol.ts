import type {
  AgentApprovalDecision,
  AgentApprovalRequest,
  AgentArtifact,
  AgentEvent,
  AgentRunResult,
} from '@aituber-onair/agent';
import type { SafetyReport } from '@aituber-onair/comment-intelligence';
import type { FixtureReport } from './types.js';

export type StreamAlertData = {
  readonly kind: 'live-alert';
  readonly reportId: string;
  readonly atCount: number;
  readonly time: string;
  readonly category: FixtureReport['kind'];
  readonly severity: FixtureReport['severity'];
  readonly observation: string;
  readonly suggestion: string;
  readonly evidenceCommentIds: readonly string[];
};

export type StreamReportData = {
  readonly kind: 'post-stream-report';
  readonly delivery: 'local-draft';
  readonly streamId: string;
  readonly summary: string;
  readonly viewerSentiment: string;
  readonly notableTopics: readonly string[];
  readonly safetyConcerns: readonly string[];
  readonly frequentQuestions: readonly string[];
  readonly unansweredQuestions: readonly string[];
  readonly constructiveFeedback: readonly string[];
  readonly nextStreamSuggestions: readonly string[];
  readonly evidence: readonly {
    readonly commentId: string;
    readonly observation: string;
  }[];
};

export type StreamStaffArtifact = AgentArtifact<
  StreamAlertData | StreamReportData
>;

export interface CommentAnalysisSnapshot {
  readonly analyzedCommentCount: number;
  readonly selectedCommentIds: readonly string[];
  readonly safetyReports: readonly SafetyReport[];
}

export interface StreamStaffTurn {
  readonly events: readonly AgentEvent[];
  readonly result?: AgentRunResult;
  readonly analysis?: CommentAnalysisSnapshot;
}

export interface StreamServerState {
  readonly backendSessionId: string | null;
  readonly pendingApprovals: readonly AgentApprovalRequest[];
  readonly resumed: boolean;
  readonly turnActive: boolean;
}

export interface StreamStaffInitialization {
  readonly backendSessionId: string | null;
  readonly resumed: boolean;
}

export type StreamSseEnvelope =
  | {
      readonly kind: 'agent-event';
      readonly operationId: string;
      readonly event: AgentEvent;
    }
  | { readonly kind: 'state'; readonly state: StreamServerState }
  | {
      readonly kind: 'operation-completed';
      readonly operationId: string;
      readonly result?: AgentRunResult;
      readonly analysis?: CommentAnalysisSnapshot;
    }
  | {
      readonly kind: 'turn-error';
      readonly operationId: string;
      readonly message: string;
    };

export interface StreamOperationsStaffRuntime {
  initialize(): Promise<StreamStaffInitialization>;
  analyzeComments(
    comments: readonly { readonly id: string }[]
  ): Promise<StreamStaffTurn>;
  createPostStreamReport(): Promise<StreamStaffTurn>;
  subscribeState(listener: (state: StreamServerState) => void): () => void;
  resolveApproval(
    requestId: string,
    decision: AgentApprovalDecision
  ): Promise<void>;
  interrupt(): Promise<void>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

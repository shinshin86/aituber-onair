import type {
  AgentArtifact,
  AgentBackendEvent,
  CharacterProfile,
} from '@aituber-onair/agent';
import type {
  CommentIntelligenceResult,
  LiveComment,
} from '@aituber-onair/comment-intelligence';

export type CommentLabel =
  | '質問'
  | '注目'
  | '建設的なフィードバック'
  | '重複'
  | '要注意'
  | '返信候補'
  | '対応不要';

export type AttentionLevel = '通常' | '確認推奨' | '優先' | '安全性注意';

export interface FixtureComment extends LiveComment {
  readonly atSeconds: number;
  readonly displayBody?: string;
  readonly labels: readonly CommentLabel[];
  readonly attention: AttentionLevel;
  readonly repeatCount?: number;
  readonly simulateAnalysisError?: boolean;
}

export type ReportKind =
  | '情報'
  | '注目'
  | '質問増加'
  | '建設的フィードバック'
  | '安全性注意'
  | '話題変化';

export type ReportSeverity = '低' | '中' | '高';

export interface FixtureReport {
  readonly id: string;
  readonly atCount: number;
  readonly time: string;
  readonly kind: ReportKind;
  readonly severity: ReportSeverity;
  readonly observation: string;
  readonly suggestion: string;
  readonly evidenceIds: readonly string[];
}

export type StaffPhase =
  | '配信開始前'
  | 'コメント監視中'
  | 'コメント分析中'
  | '安全性注意発生'
  | '一時停止中'
  | '配信終了処理中'
  | '配信後レポート完成'
  | '分析エラー';

export type DemoPhase =
  | 'pre'
  | 'monitoring'
  | 'paused'
  | 'ending'
  | 'complete'
  | 'error';

export type BottomTab = 'events' | 'tools' | 'report';

export type FixtureAgentEventType =
  | AgentBackendEvent['type']
  | 'tool.completed'
  | 'artifact.created'
  | 'turn.completed';

export interface FixtureAgentEvent {
  readonly id: string;
  readonly atCount: number;
  readonly time: string;
  readonly type: FixtureAgentEventType;
  readonly summary: string;
}

export type ReportArtifact = AgentArtifact<{
  readonly status: 'fixture';
  readonly evidenceCommentIds: readonly string[];
}>;

export interface ToolRun {
  readonly id: string;
  readonly atCount: number;
  readonly name: 'comments.analyze' | 'report.submit';
  readonly time: string;
  readonly state: '完了' | '実行中' | 'エラー';
  readonly result: string;
}

export interface RulesSnapshot {
  readonly result: CommentIntelligenceResult | null;
  readonly pending: boolean;
  readonly error: string | null;
}

export const MIKO_PROFILE = {
  id: 'stream-ops-miko',
  name: 'Miko',
  role: 'ライブ配信運営スタッフ',
  persona: {
    traits: ['calm', 'observant', 'concise'],
    values: ['viewer safety', 'evidence-first reporting'],
    priorities: ['surface urgent questions', 'separate facts from suggestions'],
    speakingStyle: 'brief and calm Japanese operations notes',
  },
  boundaries: [
    'Never perform moderation actions.',
    'Never present suggestions as observed facts.',
  ],
} satisfies CharacterProfile;

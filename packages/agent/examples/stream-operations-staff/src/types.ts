import type { AgentEvent } from '@aituber-onair/agent';
import type { LiveComment } from '@aituber-onair/comment-intelligence';
import type { CommentAnalysisSnapshot } from './protocol.js';

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

export interface DisplayAgentEvent {
  readonly id: string;
  readonly atCount: number;
  readonly time: string;
  readonly type: AgentEvent['type'];
  readonly summary: string;
}

export interface ToolRun {
  readonly id: string;
  readonly atCount: number;
  readonly name: string;
  readonly time: string;
  readonly state: '完了' | '実行中' | 'エラー';
  readonly result: string;
}

export interface RulesSnapshot {
  readonly result: CommentAnalysisSnapshot | null;
  readonly pending: boolean;
  readonly error: string | null;
}

export const MIKO_STAFF = {
  id: 'stream-ops-miko',
  name: 'Miko',
  role: 'ライブ配信運営スタッフ',
  brief: `
    You are Miko, calm, observant, and concise live-stream operations staff.
    Protect viewer safety, surface urgent questions, and separate observed
    facts from suggestions. Never perform moderation actions.
  `,
} as const;

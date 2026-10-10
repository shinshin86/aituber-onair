export type BackendKind = 'mock' | 'cursor-acp';
export interface MailEvent {
  schemaVersion: 1;
  eventId: string;
  source: string;
  receivedAt: string;
  aliasTag: string;
  subject: string;
  bodyText: string;
}
export interface Draft {
  publicSubject: string;
  publicExcerpt: string;
  speechText: string;
}
export interface Reaction extends Draft {
  eventId: string;
  backend: BackendKind;
  approvedAt: string;
}
export type MailStatus =
  | 'received'
  | 'generating'
  | 'ready_for_review'
  | 'approved'
  | 'rejected'
  | 'invalid'
  | 'quarantined'
  | 'generation_failed';
export interface MailRecord {
  id: string;
  sequence: number;
  revision: number;
  backend?: BackendKind;
  status: MailStatus;
  mail?: MailEvent;
  draft?: Draft;
  reaction?: Reaction;
  notice?: string;
  agentEvents: string[];
}
export interface OperatorState {
  backend: BackendKind;
  records: MailRecord[];
}
export interface StageState {
  backend: BackendKind;
  reactions: Reaction[];
}

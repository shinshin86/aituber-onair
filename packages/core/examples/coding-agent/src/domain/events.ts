export type AuditEventType =
  | "turn.start"
  | "tool.use"
  | "tool.result"
  | "loop.retry"
  | "loop.halt"
  | "assistant.response"
  | "turn.end";

export interface AuditEvent {
  type: AuditEventType;
  ts: string;
  data: Record<string, unknown>;
}

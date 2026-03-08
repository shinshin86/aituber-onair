import type { AuditEvent } from "../../domain/events.js";

function nowIso(): string {
  return new Date().toISOString();
}

function estimateBytes(value: unknown): number {
  if (value == null) {
    return 0;
  }
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Buffer.byteLength(String(value), "utf8");
  }
}

function estimateFieldCount(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }
  return Object.keys(value).length;
}

export class AuditLogger {
  emit(type: AuditEvent["type"], data: Record<string, unknown>): void {
    const event: AuditEvent = {
      type,
      ts: nowIso(),
      data,
    };

    if (type === "tool.use") {
      console.log(
        `[TOOL_USE] ${String(data.name || "unknown")} input_bytes=${estimateBytes(data.input)}`,
      );
      return;
    }

    if (type === "tool.result") {
      console.log(
        `[TOOL_RESULT] ${String(data.toolUseId || "unknown")} output_bytes=${estimateBytes(data.output)}`,
      );
      return;
    }

    if (type === "loop.retry") {
      console.warn(`[RECOVERY] retry=${String(data.retryCount)}`);
      return;
    }

    console.log(
      `[AUDIT] type=${event.type} ts=${event.ts} fields=${estimateFieldCount(event.data)} data_bytes=${estimateBytes(event.data)}`,
    );
  }
}

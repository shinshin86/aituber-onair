export type AgentErrorCode =
  | "E_CONFIG"
  | "E_VALIDATION"
  | "E_POLICY_VIOLATION"
  | "E_TIMEOUT"
  | "E_IO"
  | "E_PROVIDER"
  | "E_LOOP_GUARD"
  | "E_INTERNAL";

export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: AgentErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.details = details;
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

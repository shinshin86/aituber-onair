import type {
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendSession,
  AgentBackendSessionInput,
} from '../../types.js';

/** Cursor modes exposed by the verified ACP session protocol. */
export type CursorAcpMode = 'ask' | 'plan' | 'agent';

/** Fixed feature flags implemented by the Cursor ACP backend. */
export interface CursorAcpBackendCapabilities extends AgentBackendCapabilities {
  readonly text: true;
  readonly streaming: true;
  readonly tools: false;
  readonly interruption: true;
  readonly sessionResume: true;
  readonly approvals: true;
  readonly detailedEvents: false;
}

/** Working directory, Cursor session selection, timeouts, and diagnostics. */
export interface CursorAcpCommonOptions {
  readonly workingDirectory: string;
  /** Defaults to `ask`. `agent` may edit workspace files without approval. */
  readonly mode?: CursorAcpMode;
  /** ACP model ID reported by Cursor, such as `default[]`. */
  readonly model?: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly onDiagnostic?: (message: string) => void;
}

/** Requires either an explicit executable path or deliberate PATH lookup opt-in. */
export type CursorAcpExecutableOptions =
  | {
      readonly agentPath: string;
      readonly allowPathLookup?: false;
    }
  | {
      readonly agentPath?: never;
      readonly allowPathLookup: true;
    };

/** Complete configuration accepted by `createCursorAcpBackend`. */
export type CursorAcpBackendOptions = CursorAcpCommonOptions &
  CursorAcpExecutableOptions;

/** Resumable Cursor ACP Session. */
export interface CursorAcpBackendSession extends AgentBackendSession {
  readonly id: string;
}

/** Node.js backend that manages one Cursor ACP child process per Session. */
export interface CursorAcpBackend extends AgentBackend {
  readonly kind: 'cursor-acp';
  readonly backendCapabilities: Readonly<CursorAcpBackendCapabilities>;
  startSession(
    input: AgentBackendSessionInput
  ): Promise<CursorAcpBackendSession>;
}

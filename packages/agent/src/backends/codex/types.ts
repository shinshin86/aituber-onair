import type {
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendSession,
  AgentBackendSessionInput,
  AgentRunInput,
} from '../../types.js';
import type {
  CodexAppServerAccountReadResult,
  CodexAppServerModelListResult,
} from './protocol.js';
import type {
  CodexAppServerApprovalPolicy,
  CodexAppServerSandboxMode,
} from './client.js';

/** Fixed feature flags implemented by the Codex app-server backend. */
export interface CodexAppServerBackendCapabilities
  extends AgentBackendCapabilities {
  readonly text: true;
  readonly streaming: true;
  readonly tools: false;
  readonly interruption: true;
  readonly sessionResume: true;
  readonly approvals: true;
  readonly detailedEvents: true;
}

/** Minimum-version policy and optional custom acceptance rule for the Codex CLI. */
export interface CodexAppServerCompatibility {
  /** Defaults to CODEX_APP_SERVER_MINIMUM_VERSION. */
  readonly minimumVersion?: string;
  /** Defaults to warning when the CLI differs from the verified version. */
  readonly onMismatch?: 'reject' | 'warn' | 'allow';
  /** Overrides minimumVersion and onMismatch when provided. */
  readonly accept?: (actual: string, verified: string) => boolean;
}

/** Working directory, protocol timeouts, Thread policy, model, and diagnostics. */
export interface CodexAppServerCommonOptions {
  readonly workingDirectory: string;
  readonly compatibility?: CodexAppServerCompatibility;
  readonly environment?: Readonly<Record<string, string>>;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly sandbox?: CodexAppServerSandboxMode;
  readonly approvalPolicy?: CodexAppServerApprovalPolicy;
  readonly model?: string;
  readonly ephemeral?: boolean;
  readonly onDiagnostic?: (message: string) => void;
}

/** Requires either an explicit executable path or deliberate PATH lookup opt-in. */
export type CodexAppServerExecutableOptions =
  | {
      readonly codexPath: string;
      readonly allowPathLookup?: false;
    }
  | {
      readonly codexPath?: never;
      readonly allowPathLookup: true;
    };

/** Complete configuration accepted by `createCodexAppServerBackend`. */
export type CodexAppServerBackendOptions = CodexAppServerCommonOptions &
  CodexAppServerExecutableOptions;

/** Pagination and visibility filters for Codex model discovery. */
export interface CodexAppServerModelListOptions {
  readonly cursor?: string | null;
  readonly limit?: number | null;
  readonly includeHidden?: boolean | null;
}

/** Resumable Codex Thread Session with backend-specific Turn steering. */
export interface CodexAppServerBackendSession extends AgentBackendSession {
  readonly id: string;
  steer(input: AgentRunInput): Promise<void>;
}

/** Node.js backend that manages Codex Threads, account reads, and model discovery. */
export interface CodexAppServerBackend extends AgentBackend {
  readonly kind: 'codex-app-server';
  readonly backendCapabilities: Readonly<CodexAppServerBackendCapabilities>;
  startSession(
    input: AgentBackendSessionInput
  ): Promise<CodexAppServerBackendSession>;
  readAccount(refreshToken?: boolean): Promise<CodexAppServerAccountReadResult>;
  listModels(
    options?: CodexAppServerModelListOptions
  ): Promise<CodexAppServerModelListResult>;
}

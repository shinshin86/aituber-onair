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

export interface CodexAppServerCompatibility {
  /** Defaults to CODEX_APP_SERVER_MINIMUM_VERSION. */
  readonly minimumVersion?: string;
  /** Defaults to warning when the CLI differs from the verified version. */
  readonly onMismatch?: 'reject' | 'warn' | 'allow';
  /** Overrides minimumVersion and onMismatch when provided. */
  readonly accept?: (actual: string, verified: string) => boolean;
}

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

export type CodexAppServerExecutableOptions =
  | {
      readonly codexPath: string;
      readonly allowPathLookup?: false;
    }
  | {
      readonly codexPath?: never;
      readonly allowPathLookup: true;
    };

export type CodexAppServerBackendOptions = CodexAppServerCommonOptions &
  CodexAppServerExecutableOptions;

export interface CodexAppServerModelListOptions {
  readonly cursor?: string | null;
  readonly limit?: number | null;
  readonly includeHidden?: boolean | null;
}

export interface CodexAppServerBackendSession extends AgentBackendSession {
  readonly id: string;
  steer(input: AgentRunInput): Promise<void>;
}

export interface CodexAppServerBackend extends AgentBackend {
  readonly kind: 'codex-app-server';
  readonly capabilities: Readonly<CodexAppServerBackendCapabilities>;
  startSession(
    input: AgentBackendSessionInput
  ): Promise<CodexAppServerBackendSession>;
  readAccount(refreshToken?: boolean): Promise<CodexAppServerAccountReadResult>;
  listModels(
    options?: CodexAppServerModelListOptions
  ): Promise<CodexAppServerModelListResult>;
}

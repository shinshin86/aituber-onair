/**
 * Stable protocol subset generated and reconciled against codex-cli 0.145.0.
 * The complete generated schema is intentionally not exposed by this package.
 */
export const CODEX_APP_SERVER_SUPPORTED_VERSION = '0.145.0';
export const CODEX_APP_SERVER_SCHEMA_VERSION = 'v2@0.145.0';

export type CodexAppServerRequestId = string | number;

export interface CodexAppServerRequest {
  readonly method: string;
  readonly id: CodexAppServerRequestId;
  readonly params?: unknown;
}

export interface CodexAppServerNotification {
  readonly method: string;
  readonly params?: unknown;
}

export interface CodexAppServerErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface CodexAppServerSuccessResponse {
  readonly id: CodexAppServerRequestId;
  readonly result: unknown;
}

export interface CodexAppServerErrorResponse {
  readonly id: CodexAppServerRequestId;
  readonly error: CodexAppServerErrorObject;
}

export type CodexAppServerResponse =
  | CodexAppServerSuccessResponse
  | CodexAppServerErrorResponse;

export type CodexAppServerIncomingMessage =
  | CodexAppServerNotification
  | CodexAppServerRequest
  | CodexAppServerResponse;

export interface CodexAppServerInitializeResponse {
  readonly userAgent: string;
  readonly codexHome: string;
  readonly platformFamily: string;
  readonly platformOs: string;
}

export type CodexAppServerAccount =
  | { readonly type: 'apiKey' }
  | {
      readonly type: 'chatgpt';
      readonly email: string | null;
      readonly planType: string;
    }
  | {
      readonly type: 'amazonBedrock';
      readonly usesCodexManagedCredentials: boolean;
    };

export interface CodexAppServerAccountReadResult {
  readonly account: CodexAppServerAccount | null;
  readonly requiresOpenaiAuth: boolean;
}

export interface CodexAppServerModel {
  readonly id: string;
  readonly model: string;
  readonly displayName: string;
  readonly description: string;
  readonly hidden: boolean;
  readonly defaultReasoningEffort: string;
  readonly inputModalities: readonly string[];
  readonly supportsPersonality: boolean;
  readonly isDefault: boolean;
  readonly [key: string]: unknown;
}

export interface CodexAppServerModelListResult {
  readonly data: readonly CodexAppServerModel[];
  readonly nextCursor: string | null;
}

export interface CodexAppServerThread {
  readonly id: string;
  readonly sessionId?: string;
  readonly cwd?: string;
  readonly cliVersion?: string;
  readonly [key: string]: unknown;
}

export interface CodexAppServerThreadResult {
  readonly thread: CodexAppServerThread;
  readonly [key: string]: unknown;
}

export type CodexAppServerTurnStatus =
  | 'completed'
  | 'interrupted'
  | 'failed'
  | 'inProgress';

export interface CodexAppServerTurn {
  readonly id: string;
  readonly status: CodexAppServerTurnStatus;
  readonly items?: readonly unknown[];
  readonly error?: {
    readonly message: string;
    readonly additionalDetails?: string | null;
  } | null;
}

export interface CodexAppServerTurnStartResult {
  readonly turn: CodexAppServerTurn;
}

export interface CodexAppServerTurnSteerResult {
  readonly turnId: string;
}

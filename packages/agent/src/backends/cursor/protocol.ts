/** ACP protocol version verified with Cursor CLI. */
export const CURSOR_ACP_PROTOCOL_VERSION = 1;

export type CursorAcpRequestId = string | number;

export interface CursorAcpRequest {
  readonly jsonrpc: '2.0';
  readonly id: CursorAcpRequestId;
  readonly method: string;
  readonly params?: unknown;
}

export interface CursorAcpNotification {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: unknown;
}

export interface CursorAcpErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface CursorAcpSuccessResponse {
  readonly jsonrpc: '2.0';
  readonly id: CursorAcpRequestId;
  readonly result: unknown;
}

export interface CursorAcpErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: CursorAcpRequestId;
  readonly error: CursorAcpErrorObject;
}

export type CursorAcpResponse =
  | CursorAcpSuccessResponse
  | CursorAcpErrorResponse;

export interface CursorAcpAgentCapabilities {
  readonly loadSession?: boolean;
  readonly [key: string]: unknown;
}

export interface CursorAcpInitializeResult {
  readonly protocolVersion: number;
  readonly agentCapabilities: CursorAcpAgentCapabilities;
  readonly authMethods: readonly {
    readonly id: string;
    readonly name?: string;
    readonly description?: string;
  }[];
}

export interface CursorAcpMode {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface CursorAcpModel {
  readonly modelId: string;
  readonly name: string;
}

export interface CursorAcpSessionConfiguration {
  readonly modes: {
    readonly currentModeId: string;
    readonly availableModes: readonly CursorAcpMode[];
  };
  readonly models: {
    readonly currentModelId: string;
    readonly availableModels: readonly CursorAcpModel[];
  };
}

export interface CursorAcpNewSessionResult
  extends CursorAcpSessionConfiguration {
  readonly sessionId: string;
}

export type CursorAcpLoadSessionResult = CursorAcpSessionConfiguration;

export type CursorAcpStopReason =
  | 'end_turn'
  | 'cancelled'
  | 'max_tokens'
  | 'max_turn_requests'
  | 'refusal';

export interface CursorAcpPromptResult {
  readonly stopReason: CursorAcpStopReason | string;
}

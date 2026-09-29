import {
  BARE_JSON_LINE_RPC_ENVELOPE,
  JsonLineRpcServerRequestError,
  JsonLineRpcTransport,
} from '../shared/JsonLineRpcTransport.js';
import type { CodexAppServerProcess } from './process.js';
import type {
  CodexAppServerNotification,
  CodexAppServerRequest,
} from './protocol.js';

export interface CodexAppServerTransportOptions {
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly onNotification?: (notification: CodexAppServerNotification) => void;
  readonly onServerRequest?: (
    request: CodexAppServerRequest
  ) => Promise<unknown> | unknown;
  readonly onDiagnostic?: (message: string) => void;
  readonly onError?: (error: Error) => void;
}

export class CodexAppServerServerRequestError extends JsonLineRpcServerRequestError {
  constructor(code: number, message: string, data?: unknown) {
    super(code, message, data);
    this.name = 'CodexAppServerServerRequestError';
  }
}

export class CodexAppServerTransport extends JsonLineRpcTransport<
  CodexAppServerNotification,
  CodexAppServerRequest
> {
  constructor(
    process: CodexAppServerProcess,
    options: CodexAppServerTransportOptions = {}
  ) {
    super(process, {
      label: 'Codex app-server',
      peerRequestLabel: 'server',
      envelope: BARE_JSON_LINE_RPC_ENVELOPE,
      ...options,
    });
  }
}

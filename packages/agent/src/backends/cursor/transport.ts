import {
  JSON_RPC_2_LINE_ENVELOPE,
  JsonLineRpcServerRequestError,
  JsonLineRpcTransport,
} from '../shared/JsonLineRpcTransport.js';
import type { CursorAcpProcess } from './process.js';
import type { CursorAcpNotification, CursorAcpRequest } from './protocol.js';

export interface CursorAcpTransportOptions {
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly onNotification?: (notification: CursorAcpNotification) => void;
  readonly onServerRequest?: (
    request: CursorAcpRequest
  ) => Promise<unknown> | unknown;
  readonly onDiagnostic?: (message: string) => void;
  readonly onError?: (error: Error) => void;
}

export class CursorAcpServerRequestError extends JsonLineRpcServerRequestError {
  constructor(code: number, message: string, data?: unknown) {
    super(code, message, data);
    this.name = 'CursorAcpServerRequestError';
  }
}

export class CursorAcpTransport extends JsonLineRpcTransport<
  CursorAcpNotification,
  CursorAcpRequest
> {
  constructor(
    process: CursorAcpProcess,
    options: CursorAcpTransportOptions = {}
  ) {
    super(process, {
      label: 'Cursor ACP',
      peerRequestLabel: 'agent',
      envelope: JSON_RPC_2_LINE_ENVELOPE,
      diagnoseProtocolErrors: true,
      includeServerErrorDetails: true,
      ...options,
    });
  }
}

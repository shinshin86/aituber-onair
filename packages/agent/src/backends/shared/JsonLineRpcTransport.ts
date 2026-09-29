import { Buffer } from 'node:buffer';
import {
  AgentBackendProcessError,
  AgentBackendProtocolError,
  AgentConfigurationError,
  AgentTimeoutError,
} from '../../errors.js';
import type { JsonLineRpcProcess } from './process.js';

const DEFAULT_MAX_LINE_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 2_000;
const MAX_DIAGNOSTIC_LENGTH = 8_192;
const MAX_SERVER_ERROR_FIELD_LENGTH = 512;
const MAX_TIMED_OUT_REQUEST_IDS = 256;

export type JsonLineRpcRequestId = string | number;

export interface JsonLineRpcRequest {
  readonly method: string;
  readonly id: JsonLineRpcRequestId;
  readonly params?: unknown;
}

export interface JsonLineRpcNotification {
  readonly method: string;
  readonly params?: unknown;
}

export interface JsonLineRpcErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

interface PendingRequest {
  readonly method: string;
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: unknown) => void;
  readonly timeoutId: ReturnType<typeof setTimeout>;
}

/** Adds and validates the protocol-specific JSON-RPC envelope. */
export interface JsonLineRpcEnvelope {
  encode(message: Readonly<Record<string, unknown>>): Record<string, unknown>;
  decode(message: unknown, label: string): Record<string, unknown>;
}

/** Bare JSON messages used by Codex app-server. */
export const BARE_JSON_LINE_RPC_ENVELOPE: JsonLineRpcEnvelope = Object.freeze({
  encode(message: Readonly<Record<string, unknown>>) {
    return { ...message };
  },
  decode(message: unknown, label: string) {
    if (!isRecord(message)) {
      throw new AgentBackendProtocolError(
        `${label} emitted a non-object message.`
      );
    }
    return message;
  },
});

/** JSON-RPC 2.0 messages used by Cursor ACP. */
export const JSON_RPC_2_LINE_ENVELOPE: JsonLineRpcEnvelope = Object.freeze({
  encode(message: Readonly<Record<string, unknown>>) {
    return { jsonrpc: '2.0', ...message };
  },
  decode(message: unknown, label: string) {
    if (!isRecord(message) || message.jsonrpc !== '2.0') {
      throw new AgentBackendProtocolError(
        `${label} emitted a malformed JSON-RPC message.`
      );
    }
    return message;
  },
});

export interface JsonLineRpcTransportOptions<
  TNotification extends JsonLineRpcNotification,
  TRequest extends JsonLineRpcRequest,
> {
  readonly label: string;
  readonly peerRequestLabel: string;
  readonly envelope: JsonLineRpcEnvelope;
  readonly diagnoseProtocolErrors?: boolean;
  readonly includeServerErrorDetails?: boolean;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly onNotification?: (notification: TNotification) => void;
  readonly onServerRequest?: (request: TRequest) => Promise<unknown> | unknown;
  readonly onDiagnostic?: (message: string) => void;
  readonly onError?: (error: Error) => void;
}

export class JsonLineRpcServerRequestError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'JsonLineRpcServerRequestError';
    this.code = code;
    this.data = data;
  }
}

/** Protocol-neutral request correlation and JSONL child-process lifecycle. */
export class JsonLineRpcTransport<
  TNotification extends JsonLineRpcNotification,
  TRequest extends JsonLineRpcRequest,
> {
  private readonly process: JsonLineRpcProcess;
  private readonly label: string;
  private readonly peerRequestLabel: string;
  private readonly envelope: JsonLineRpcEnvelope;
  private readonly diagnoseProtocolErrors: boolean;
  private readonly includeServerErrorDetails: boolean;
  private readonly requestTimeoutMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly maxLineBytes: number;
  private readonly onNotification?: (notification: TNotification) => void;
  private readonly onServerRequest?: (
    request: TRequest
  ) => Promise<unknown> | unknown;
  private readonly onDiagnostic?: (message: string) => void;
  private readonly onError?: (error: Error) => void;
  private readonly pendingRequests = new Map<number, PendingRequest>();
  private readonly timedOutRequestIds = new Set<number>();
  private stdoutParts: Buffer[] = [];
  private stdoutBytes = 0;
  private stderrBuffer = '';
  private nextRequestId = 1;
  private terminalError?: Error;
  private closing = false;
  private exited = false;
  private exitCode: number | null = null;
  private exitSignal: NodeJS.Signals | null = null;
  private readonly exitPromise: Promise<void>;
  private resolveExit!: () => void;

  constructor(
    process: JsonLineRpcProcess,
    options: JsonLineRpcTransportOptions<TNotification, TRequest>
  ) {
    const issues = validateOptions(options);
    if (issues.length > 0) {
      throw new AgentConfigurationError(
        `${options.label} transport options are invalid.`,
        issues
      );
    }
    this.process = process;
    this.label = options.label;
    this.peerRequestLabel = options.peerRequestLabel;
    this.envelope = options.envelope;
    this.diagnoseProtocolErrors = options.diagnoseProtocolErrors ?? false;
    this.includeServerErrorDetails = options.includeServerErrorDetails ?? false;
    this.requestTimeoutMs =
      options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.shutdownTimeoutMs =
      options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    this.maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES;
    this.onNotification = options.onNotification;
    this.onServerRequest = options.onServerRequest;
    this.onDiagnostic = options.onDiagnostic;
    this.onError = options.onError;
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });
    this.attachProcessListeners();
  }

  request<TResult>(
    method: string,
    params: unknown,
    timeoutMs = this.requestTimeoutMs
  ): Promise<TResult> {
    this.assertWritable();
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return Promise.reject(
        new AgentConfigurationError(
          `${this.label} request timeout is invalid.`,
          ['timeoutMs must be a positive finite number']
        )
      );
    }
    if (this.nextRequestId > Number.MAX_SAFE_INTEGER) {
      return Promise.reject(
        new AgentBackendProtocolError(
          `${this.label} request ID space was exhausted.`
        )
      );
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return new Promise<TResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (!pending) return;
        this.pendingRequests.delete(id);
        this.recordTimedOutRequestId(id);
        pending.reject(
          new AgentTimeoutError(`${this.label} request "${method}" timed out.`)
        );
      }, timeoutMs);
      this.pendingRequests.set(id, {
        method,
        resolve: resolve as (result: unknown) => void,
        reject,
        timeoutId,
      });

      try {
        this.writeMessage({ id, method, params });
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  notify(method: string, params?: unknown): void {
    this.assertWritable();
    this.writeMessage(params === undefined ? { method } : { method, params });
  }

  async close(): Promise<void> {
    if (this.exited) return;
    if (!this.closing) {
      this.closing = true;
      this.rejectPending(
        new AgentBackendProcessError(
          `${this.label} transport closed before requests completed.`
        )
      );
      this.process.stdin.end();
    }

    if (await waitFor(this.exitPromise, this.shutdownTimeoutMs)) return;
    this.process.kill('SIGTERM');
    if (await waitFor(this.exitPromise, this.shutdownTimeoutMs)) return;
    this.process.kill('SIGKILL');
    await waitFor(this.exitPromise, this.shutdownTimeoutMs);
  }

  private attachProcessListeners(): void {
    this.process.once('error', (cause) => {
      this.fail(
        new AgentBackendProcessError(`Failed to start or run ${this.label}.`, {
          cause,
        })
      );
    });
    this.process.stdout.on('data', (chunk: Buffer | string) => {
      this.consumeStdoutChunk(toBuffer(chunk));
    });
    this.process.stdin.once('error', (cause) => {
      this.fail(
        new AgentBackendProcessError(`${this.label} stdin failed.`, { cause })
      );
    });
    this.process.stdout.once('end', () => {
      if (this.stdoutBytes > 0) {
        this.handleStdoutLine(this.joinStdoutParts());
      }
      if (!this.closing && !this.exited) {
        this.fail(
          new AgentBackendProcessError(
            `${this.label} stdout closed unexpectedly.`
          )
        );
      }
    });
    this.process.stdout.once('error', (cause) => {
      this.fail(
        new AgentBackendProcessError(`${this.label} stdout failed.`, { cause })
      );
    });
    this.process.stderr.on('data', (chunk: Buffer | string) => {
      this.consumeStderr(String(chunk));
    });
    this.process.stderr.once('end', () => this.flushDiagnostic());
    this.process.stderr.once('error', (cause) => {
      this.emitDiagnostic(`${this.label} stderr failed: ${String(cause)}`);
    });
    this.process.once('exit', (code, signal) => {
      this.exited = true;
      this.exitCode = code;
      this.exitSignal = signal;
      this.resolveExit();
      if (!this.closing && !this.terminalError) {
        this.fail(this.createExitError());
      } else {
        this.rejectPending(this.terminalError ?? this.createExitError());
      }
    });
  }

  private consumeStdoutChunk(chunk: Buffer): void {
    let start = 0;
    for (let index = 0; index < chunk.length; index += 1) {
      if (chunk[index] !== 0x0a) continue;
      this.appendStdoutPart(chunk.subarray(start, index));
      if (this.terminalError) return;
      this.handleStdoutLine(this.joinStdoutParts());
      if (this.terminalError) return;
      start = index + 1;
    }
    if (start < chunk.length) this.appendStdoutPart(chunk.subarray(start));
  }

  private appendStdoutPart(part: Buffer): void {
    this.stdoutBytes += part.length;
    if (this.stdoutBytes > this.maxLineBytes) {
      this.emitProtocolDiagnostic(
        `${this.label} stdout line exceeded ${this.maxLineBytes} bytes.`
      );
      this.fail(
        new AgentBackendProtocolError(
          `${this.label} stdout line exceeded ${this.maxLineBytes} bytes.`
        )
      );
      return;
    }
    if (part.length > 0) this.stdoutParts.push(part);
  }

  private joinStdoutParts(): Buffer {
    const line = Buffer.concat(this.stdoutParts, this.stdoutBytes);
    this.stdoutParts = [];
    this.stdoutBytes = 0;
    return line;
  }

  private handleStdoutLine(lineBuffer: Buffer): void {
    const normalized =
      lineBuffer.at(-1) === 0x0d ? lineBuffer.subarray(0, -1) : lineBuffer;
    const line = normalized.toString('utf8');
    if (!line.trim()) {
      this.emitProtocolDiagnostic(
        `${this.label} emitted an empty stdout line.`
      );
      this.fail(
        new AgentBackendProtocolError(
          `${this.label} emitted an empty stdout line.`
        )
      );
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (cause) {
      this.emitProtocolDiagnostic(`${this.label} emitted malformed JSON.`);
      this.fail(
        new AgentBackendProtocolError(`${this.label} emitted malformed JSON.`, {
          cause,
        })
      );
      return;
    }
    let message: Record<string, unknown>;
    try {
      message = this.envelope.decode(parsed, this.label);
    } catch (error) {
      this.fail(
        error instanceof Error
          ? error
          : new AgentBackendProtocolError(
              `${this.label} envelope validation failed.`,
              { cause: error }
            )
      );
      return;
    }
    this.dispatchMessage(message);
  }

  private dispatchMessage(message: Record<string, unknown>): void {
    const hasId =
      typeof message.id === 'string' || typeof message.id === 'number';
    if (typeof message.method === 'string') {
      if (hasId) {
        void this.handleServerRequest(message as unknown as TRequest).catch(
          (cause) => {
            this.fail(
              cause instanceof Error
                ? cause
                : new AgentBackendProtocolError(
                    `${this.label} ${this.peerRequestLabel} request handling failed.`,
                    { cause }
                  )
            );
          }
        );
      } else {
        try {
          this.onNotification?.(message as unknown as TNotification);
        } catch (cause) {
          this.fail(
            new AgentBackendProtocolError(
              `${this.label} notification handling failed.`,
              { cause }
            )
          );
        }
      }
      return;
    }
    if (hasId) {
      this.handleResponse(message);
      return;
    }
    this.fail(
      new AgentBackendProtocolError(
        `${this.label} emitted an unrecognized message.`
      )
    );
  }

  private handleResponse(message: Record<string, unknown>): void {
    if (typeof message.id !== 'number') {
      this.fail(
        new AgentBackendProtocolError(
          `${this.label} returned unexpected response ID "${String(
            message.id
          )}".`
        )
      );
      return;
    }
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      if (this.timedOutRequestIds.delete(message.id)) return;
      this.fail(
        new AgentBackendProtocolError(
          `${this.label} returned unknown or duplicate response ID ${message.id}.`
        )
      );
      return;
    }
    const hasResult = hasOwn(message, 'result');
    const hasError = hasOwn(message, 'error');
    if (hasResult === hasError) {
      this.fail(
        new AgentBackendProtocolError(
          `${this.label} response ${message.id} must contain exactly one of result or error.`
        )
      );
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(message.id);
    if (hasError) {
      const rpcError = parseErrorObject(message.error);
      pending.reject(
        new AgentBackendProtocolError(
          `${this.label} request "${pending.method}" failed: ${rpcError.message}`,
          {
            details: createServerErrorDetails(
              rpcError,
              this.includeServerErrorDetails
            ),
          }
        )
      );
    } else {
      pending.resolve(message.result);
    }
  }

  private async handleServerRequest(request: TRequest): Promise<void> {
    if (!this.onServerRequest) {
      this.writeServerError(
        request.id,
        new JsonLineRpcServerRequestError(
          -32601,
          `Unsupported ${this.peerRequestLabel} request method "${request.method}".`
        )
      );
      return;
    }
    try {
      const result = await this.onServerRequest(request);
      if (!this.terminalError && !this.exited) {
        this.writeMessage({ id: request.id, result });
      }
    } catch (error) {
      if (!this.terminalError && !this.exited) {
        this.writeServerError(request.id, error);
      }
    }
  }

  private writeServerError(id: JsonLineRpcRequestId, error: unknown): void {
    const rpcError: JsonLineRpcErrorObject =
      error instanceof JsonLineRpcServerRequestError
        ? { code: error.code, message: error.message, data: error.data }
        : { code: -32603, message: 'Client failed to handle server request.' };
    this.writeMessage({ id, error: rpcError });
  }

  private writeMessage(message: Readonly<Record<string, unknown>>): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(this.envelope.encode(message));
    } catch (cause) {
      throw new AgentBackendProtocolError(
        `${this.label} message was not JSON serializable.`,
        { cause }
      );
    }
    if (serialized === undefined) {
      throw new AgentBackendProtocolError(
        `${this.label} message was not JSON serializable.`
      );
    }
    try {
      this.process.stdin.write(`${serialized}\n`);
    } catch (cause) {
      throw new AgentBackendProcessError(
        `Failed to write to ${this.label} stdin.`,
        { cause }
      );
    }
  }

  private consumeStderr(chunk: string): void {
    this.stderrBuffer += chunk;
    let newlineIndex = this.stderrBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.stderrBuffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.stderrBuffer = this.stderrBuffer.slice(newlineIndex + 1);
      this.emitDiagnostic(line);
      newlineIndex = this.stderrBuffer.indexOf('\n');
    }
    if (this.stderrBuffer.length > MAX_DIAGNOSTIC_LENGTH) {
      this.emitDiagnostic(this.stderrBuffer.slice(0, MAX_DIAGNOSTIC_LENGTH));
      this.stderrBuffer = '';
    }
  }

  private flushDiagnostic(): void {
    if (!this.stderrBuffer) return;
    this.emitDiagnostic(this.stderrBuffer.replace(/\r$/, ''));
    this.stderrBuffer = '';
  }

  private emitDiagnostic(message: string): void {
    if (!message) return;
    try {
      this.onDiagnostic?.(message.slice(0, MAX_DIAGNOSTIC_LENGTH));
    } catch {
      // Diagnostics are observational and must not affect protocol handling.
    }
  }

  private emitProtocolDiagnostic(message: string): void {
    if (this.diagnoseProtocolErrors) this.emitDiagnostic(message);
  }

  private assertWritable(): void {
    if (this.terminalError) throw this.terminalError;
    if (this.closing || this.exited) {
      throw new AgentBackendProcessError(`${this.label} transport is closed.`);
    }
  }

  private fail(error: Error): void {
    if (this.terminalError) return;
    this.terminalError = error;
    this.rejectPending(error);
    try {
      this.onError?.(error);
    } catch {
      // A terminal transport failure must not be masked by an observer.
    }
    if (!this.exited) this.process.kill('SIGTERM');
  }

  private rejectPending(error: unknown): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private recordTimedOutRequestId(id: number): void {
    this.timedOutRequestIds.add(id);
    if (this.timedOutRequestIds.size <= MAX_TIMED_OUT_REQUEST_IDS) return;
    const oldestId = this.timedOutRequestIds.values().next().value;
    if (oldestId !== undefined) this.timedOutRequestIds.delete(oldestId);
  }

  private createExitError(): AgentBackendProcessError {
    const outcome =
      this.exitSignal !== null
        ? `signal ${this.exitSignal}`
        : `code ${String(this.exitCode)}`;
    return new AgentBackendProcessError(
      `${this.label} process exited with ${outcome}.`,
      { details: { code: this.exitCode, signal: this.exitSignal } }
    );
  }
}

function validateOptions(
  options: Pick<
    JsonLineRpcTransportOptions<JsonLineRpcNotification, JsonLineRpcRequest>,
    'requestTimeoutMs' | 'shutdownTimeoutMs' | 'maxLineBytes'
  >
): string[] {
  const issues: string[] = [];
  for (const [name, value] of [
    ['requestTimeoutMs', options.requestTimeoutMs],
    ['shutdownTimeoutMs', options.shutdownTimeoutMs],
    ['maxLineBytes', options.maxLineBytes],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      issues.push(`${name} must be a positive finite number`);
    }
  }
  return issues;
}

function parseErrorObject(error: unknown): JsonLineRpcErrorObject {
  if (
    !isRecord(error) ||
    typeof error.code !== 'number' ||
    typeof error.message !== 'string'
  ) {
    return { code: -32603, message: 'Malformed JSON-RPC error response.' };
  }
  return {
    code: error.code,
    message: error.message,
    ...(hasOwn(error, 'data') ? { data: error.data } : {}),
  };
}

function createServerErrorDetails(
  error: JsonLineRpcErrorObject,
  includeDetails: boolean
): Readonly<Record<string, unknown>> {
  if (!includeDetails) return { code: error.code };
  const data = isRecord(error.data) ? error.data : undefined;
  return {
    code: error.code,
    serverMessage: limitErrorField(error.message),
    ...(data
      ? {
          ...(data.details !== undefined
            ? { serverDataDetails: limitErrorField(data.details) }
            : {}),
          ...(data.message !== undefined
            ? { serverDataMessage: limitErrorField(data.message) }
            : {}),
        }
      : {}),
  };
}

function limitErrorField(value: unknown): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  return text.slice(0, MAX_SERVER_ERROR_FIELD_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function toBuffer(chunk: Buffer | string): Buffer {
  return typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
}

function waitFor(promise: Promise<void>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeoutMs);
    void promise.then(() => {
      clearTimeout(timeoutId);
      resolve(true);
    });
  });
}

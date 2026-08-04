import { Buffer } from 'node:buffer';
import {
  AgentBackendProcessError,
  AgentBackendProtocolError,
  AgentConfigurationError,
  AgentTimeoutError,
} from '../../errors.js';
import type { CodexAppServerProcess } from './process.js';
import type {
  CodexAppServerErrorObject,
  CodexAppServerIncomingMessage,
  CodexAppServerNotification,
  CodexAppServerRequest,
  CodexAppServerRequestId,
} from './protocol.js';

const DEFAULT_MAX_LINE_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 2_000;
const MAX_DIAGNOSTIC_LENGTH = 8_192;

interface PendingRequest {
  readonly method: string;
  readonly resolve: (result: unknown) => void;
  readonly reject: (error: unknown) => void;
  readonly timeoutId: ReturnType<typeof setTimeout>;
}

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

export class CodexAppServerServerRequestError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'CodexAppServerServerRequestError';
    this.code = code;
    this.data = data;
  }
}

export class CodexAppServerTransport {
  private readonly process: CodexAppServerProcess;
  private readonly requestTimeoutMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly maxLineBytes: number;
  private readonly onNotification?: (
    notification: CodexAppServerNotification
  ) => void;
  private readonly onServerRequest?: (
    request: CodexAppServerRequest
  ) => Promise<unknown> | unknown;
  private readonly onDiagnostic?: (message: string) => void;
  private readonly onError?: (error: Error) => void;
  private readonly pendingRequests = new Map<number, PendingRequest>();
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
    process: CodexAppServerProcess,
    options: CodexAppServerTransportOptions = {}
  ) {
    const issues = validateOptions(options);
    if (issues.length > 0) {
      throw new AgentConfigurationError(
        'Codex app-server transport options are invalid.',
        issues
      );
    }
    this.process = process;
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
          'Codex app-server request timeout is invalid.',
          ['timeoutMs must be a positive finite number']
        )
      );
    }
    if (this.nextRequestId > Number.MAX_SAFE_INTEGER) {
      return Promise.reject(
        new AgentBackendProtocolError(
          'Codex app-server request ID space was exhausted.'
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
        pending.reject(
          new AgentTimeoutError(
            `Codex app-server request "${method}" timed out.`
          )
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
          'Codex app-server transport closed before requests completed.'
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
        new AgentBackendProcessError(
          'Failed to start or run Codex app-server.',
          { cause }
        )
      );
    });
    this.process.stdout.on('data', (chunk: Buffer | string) => {
      this.consumeStdoutChunk(toBuffer(chunk));
    });
    this.process.stdin.once('error', (cause) => {
      this.fail(
        new AgentBackendProcessError('Codex app-server stdin failed.', {
          cause,
        })
      );
    });
    this.process.stdout.once('end', () => {
      if (this.stdoutBytes > 0) {
        this.handleStdoutLine(this.joinStdoutParts());
      }
      if (!this.closing && !this.exited) {
        this.fail(
          new AgentBackendProcessError(
            'Codex app-server stdout closed unexpectedly.'
          )
        );
      }
    });
    this.process.stdout.once('error', (cause) => {
      this.fail(
        new AgentBackendProcessError('Codex app-server stdout failed.', {
          cause,
        })
      );
    });
    this.process.stderr.on('data', (chunk: Buffer | string) => {
      this.consumeStderr(String(chunk));
    });
    this.process.stderr.once('end', () => this.flushDiagnostic());
    this.process.stderr.once('error', (cause) => {
      this.emitDiagnostic(`Codex app-server stderr failed: ${String(cause)}`);
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
    if (start < chunk.length) {
      this.appendStdoutPart(chunk.subarray(start));
    }
  }

  private appendStdoutPart(part: Buffer): void {
    this.stdoutBytes += part.length;
    if (this.stdoutBytes > this.maxLineBytes) {
      this.fail(
        new AgentBackendProtocolError(
          `Codex app-server stdout line exceeded ${this.maxLineBytes} bytes.`
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
      this.fail(
        new AgentBackendProtocolError(
          'Codex app-server emitted an empty stdout line.'
        )
      );
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch (cause) {
      this.fail(
        new AgentBackendProtocolError(
          'Codex app-server emitted malformed JSON.',
          { cause }
        )
      );
      return;
    }
    this.dispatchMessage(message);
  }

  private dispatchMessage(message: unknown): void {
    if (!isRecord(message)) {
      this.fail(
        new AgentBackendProtocolError(
          'Codex app-server emitted a non-object message.'
        )
      );
      return;
    }
    const hasId =
      typeof message.id === 'string' || typeof message.id === 'number';
    if (typeof message.method === 'string') {
      if (hasId) {
        void this.handleServerRequest(
          message as unknown as CodexAppServerRequest
        ).catch((cause) => {
          this.fail(
            cause instanceof Error
              ? cause
              : new AgentBackendProtocolError(
                  'Codex app-server server request handling failed.',
                  { cause }
                )
          );
        });
      } else {
        try {
          this.onNotification?.(
            message as unknown as CodexAppServerNotification
          );
        } catch (cause) {
          this.fail(
            new AgentBackendProtocolError(
              'Codex app-server notification handling failed.',
              { cause }
            )
          );
        }
      }
      return;
    }
    if (hasId) {
      this.handleResponse(message as unknown as CodexAppServerIncomingMessage);
      return;
    }
    this.fail(
      new AgentBackendProtocolError(
        'Codex app-server emitted an unrecognized message.'
      )
    );
  }

  private handleResponse(message: CodexAppServerIncomingMessage): void {
    const response = message as {
      readonly id: CodexAppServerRequestId;
      readonly result?: unknown;
      readonly error?: unknown;
    };
    if (typeof response.id !== 'number') {
      this.fail(
        new AgentBackendProtocolError(
          `Codex app-server returned unexpected response ID "${String(
            response.id
          )}".`
        )
      );
      return;
    }
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      this.fail(
        new AgentBackendProtocolError(
          `Codex app-server returned unknown or duplicate response ID ${response.id}.`
        )
      );
      return;
    }
    const hasResult = hasOwn(response, 'result');
    const hasError = hasOwn(response, 'error');
    if (hasResult === hasError) {
      this.fail(
        new AgentBackendProtocolError(
          `Codex app-server response ${response.id} must contain exactly one of result or error.`
        )
      );
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(response.id);
    if (hasError) {
      const rpcError = parseErrorObject(response.error);
      pending.reject(
        new AgentBackendProtocolError(
          `Codex app-server request "${pending.method}" failed: ${rpcError.message}`,
          { details: { code: rpcError.code } }
        )
      );
    } else {
      pending.resolve(response.result);
    }
  }

  private async handleServerRequest(
    request: CodexAppServerRequest
  ): Promise<void> {
    if (!this.onServerRequest) {
      this.writeServerError(
        request.id,
        new CodexAppServerServerRequestError(
          -32601,
          `Unsupported server request method "${request.method}".`
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

  private writeServerError(id: CodexAppServerRequestId, error: unknown): void {
    const rpcError: CodexAppServerErrorObject =
      error instanceof CodexAppServerServerRequestError
        ? { code: error.code, message: error.message, data: error.data }
        : { code: -32603, message: 'Client failed to handle server request.' };
    this.writeMessage({ id, error: rpcError });
  }

  private writeMessage(message: unknown): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(message);
    } catch (cause) {
      throw new AgentBackendProtocolError(
        'Codex app-server message was not JSON serializable.',
        { cause }
      );
    }
    if (serialized === undefined) {
      throw new AgentBackendProtocolError(
        'Codex app-server message was not JSON serializable.'
      );
    }
    try {
      this.process.stdin.write(`${serialized}\n`);
    } catch (cause) {
      throw new AgentBackendProcessError(
        'Failed to write to Codex app-server stdin.',
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

  private assertWritable(): void {
    if (this.terminalError) throw this.terminalError;
    if (this.closing || this.exited) {
      throw new AgentBackendProcessError(
        'Codex app-server transport is closed.'
      );
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

  private createExitError(): AgentBackendProcessError {
    const outcome =
      this.exitSignal !== null
        ? `signal ${this.exitSignal}`
        : `code ${String(this.exitCode)}`;
    return new AgentBackendProcessError(
      `Codex app-server process exited with ${outcome}.`,
      { details: { code: this.exitCode, signal: this.exitSignal } }
    );
  }
}

function validateOptions(options: CodexAppServerTransportOptions): string[] {
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

function parseErrorObject(error: unknown): CodexAppServerErrorObject {
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

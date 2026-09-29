import {
  AgentBackendError,
  AgentBackendProcessError,
  AgentBackendProtocolError,
  AgentConfigurationError,
} from '../../errors.js';
import type { CursorAcpProcessFactory, CursorAcpProcess } from './process.js';
import { nodeCursorAcpProcessFactory } from './process.js';
import type {
  CursorAcpInitializeResult,
  CursorAcpLoadSessionResult,
  CursorAcpNewSessionResult,
  CursorAcpNotification,
  CursorAcpPromptResult,
  CursorAcpRequest,
  CursorAcpSessionConfiguration,
} from './protocol.js';
import { CURSOR_ACP_PROTOCOL_VERSION } from './protocol.js';
import {
  CursorAcpServerRequestError,
  CursorAcpTransport,
} from './transport.js';
import type { CursorAcpMode } from './types.js';

export interface CursorAcpClientOptions {
  readonly executable: string;
  readonly workingDirectory: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly onDiagnostic?: (message: string) => void;
}

export interface CursorAcpClientDependencies {
  readonly processFactory?: CursorAcpProcessFactory;
}

export interface CursorAcpOpenSessionOptions {
  readonly sessionId?: string;
  readonly cwd: string;
  readonly mode: CursorAcpMode;
  readonly model?: string;
}

export interface CursorAcpOpenSessionResult {
  readonly sessionId: string;
  readonly resumed: boolean;
}

export class CursorAcpClient {
  private readonly transport: CursorAcpTransport;
  private readonly onDiagnostic?: (message: string) => void;
  private readonly notificationListeners = new Set<
    (notification: CursorAcpNotification) => void
  >();
  private readonly errorListeners = new Set<(error: Error) => void>();
  private serverRequestHandler?: (
    request: CursorAcpRequest
  ) => Promise<unknown> | unknown;
  private agentCapabilities?: CursorAcpInitializeResult['agentCapabilities'];
  private suppressSessionUpdates = false;
  private initialized = false;

  private constructor(
    transport: CursorAcpTransport,
    onDiagnostic: ((message: string) => void) | undefined
  ) {
    this.transport = transport;
    this.onDiagnostic = onDiagnostic;
  }

  static async connect(
    options: CursorAcpClientOptions,
    dependencies: CursorAcpClientDependencies = {}
  ): Promise<CursorAcpClient> {
    const processFactory =
      dependencies.processFactory ?? nodeCursorAcpProcessFactory;
    let process: CursorAcpProcess;
    try {
      process = processFactory.spawn(options.executable, {
        cwd: options.workingDirectory,
        environment: options.environment,
      });
    } catch (cause) {
      throw new AgentBackendProcessError(
        `Failed to start Cursor CLI executable "${options.executable}".`,
        { cause }
      );
    }

    let client: CursorAcpClient | undefined;
    const transport = new CursorAcpTransport(process, {
      requestTimeoutMs: options.requestTimeoutMs,
      shutdownTimeoutMs: options.shutdownTimeoutMs,
      maxLineBytes: options.maxLineBytes,
      onDiagnostic: options.onDiagnostic,
      onError: (error) => client?.dispatchError(error),
      onNotification: (notification) =>
        client?.dispatchNotification(notification),
      onServerRequest: (request) => {
        if (!client?.serverRequestHandler) {
          throw new CursorAcpServerRequestError(
            -32601,
            `Unsupported agent request method "${request.method}".`
          );
        }
        return client.serverRequestHandler(request);
      },
    });
    client = new CursorAcpClient(transport, options.onDiagnostic);
    try {
      await client.initialize();
      await client.authenticate();
      return client;
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  onNotification(
    listener: (notification: CursorAcpNotification) => void
  ): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  onServerRequest(
    handler: (request: CursorAcpRequest) => Promise<unknown> | unknown
  ): void {
    this.serverRequestHandler = handler;
  }

  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  async openSession(
    options: CursorAcpOpenSessionOptions
  ): Promise<CursorAcpOpenSessionResult> {
    this.assertInitialized();
    const resumed = options.sessionId !== undefined;
    let configuration: CursorAcpSessionConfiguration;
    let sessionId: string;
    if (options.sessionId) {
      if (this.agentCapabilities?.loadSession !== true) {
        throw new AgentBackendProtocolError(
          'Cursor ACP does not advertise session resume support.'
        );
      }
      this.suppressSessionUpdates = true;
      try {
        const result = await this.request<unknown>('session/load', {
          sessionId: options.sessionId,
          cwd: options.cwd,
          mcpServers: [],
        });
        configuration = readSessionConfiguration(
          result,
          'session/load'
        ) as CursorAcpLoadSessionResult;
      } finally {
        this.suppressSessionUpdates = false;
      }
      sessionId = options.sessionId;
    } else {
      const result = await this.request<unknown>('session/new', {
        cwd: options.cwd,
        mcpServers: [],
      });
      const newSession = readNewSessionResult(result);
      configuration = newSession;
      sessionId = newSession.sessionId;
    }

    assertModeAvailable(configuration, options.mode);
    if (configuration.modes.currentModeId !== options.mode) {
      await this.request('session/set_mode', {
        sessionId,
        modeId: options.mode,
      });
    }
    if (options.model !== undefined) {
      assertModelAvailable(configuration, options.model);
      await this.request('session/set_model', {
        sessionId,
        modelId: options.model,
      });
    }
    return { sessionId, resumed };
  }

  async prompt(
    sessionId: string,
    text: string
  ): Promise<CursorAcpPromptResult> {
    this.assertInitialized();
    const result = await this.request<unknown>('session/prompt', {
      sessionId,
      prompt: [{ type: 'text', text }],
    });
    if (!isRecord(result) || typeof result.stopReason !== 'string') {
      throw new AgentBackendProtocolError(
        'Cursor ACP session/prompt response is malformed.'
      );
    }
    return result as unknown as CursorAcpPromptResult;
  }

  cancel(sessionId: string): void {
    this.assertInitialized();
    this.transport.notify('session/cancel', { sessionId });
  }

  close(): Promise<void> {
    return this.transport.close();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      throw new AgentBackendProtocolError(
        'Cursor ACP client was initialized more than once.'
      );
    }
    const result = await this.request<unknown>('initialize', {
      protocolVersion: CURSOR_ACP_PROTOCOL_VERSION,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
    });
    const initializeResult = readInitializeResult(result);
    this.agentCapabilities = initializeResult.agentCapabilities;
    this.initialized = true;
  }

  private async authenticate(): Promise<void> {
    try {
      await this.request('authenticate', { methodId: 'cursor_login' });
    } catch (cause) {
      throw new AgentBackendError(
        `Cursor CLI authentication failed${formatAuthenticationFailure(
          cause
        )}. Run "agent login" and try again, or check your network connection and Cursor service status.`,
        { cause }
      );
    }
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new AgentBackendProtocolError(
        'Cursor ACP client is not initialized.'
      );
    }
  }

  private request<TResult>(method: string, params?: unknown): Promise<TResult> {
    return this.transport.request<TResult>(method, params ?? {});
  }

  private dispatchNotification(notification: CursorAcpNotification): void {
    if (
      this.suppressSessionUpdates &&
      notification.method === 'session/update'
    ) {
      return;
    }
    for (const listener of this.notificationListeners) listener(notification);
  }

  private dispatchError(error: Error): void {
    for (const listener of this.errorListeners) listener(error);
  }

  emitDiagnostic(message: string): void {
    try {
      this.onDiagnostic?.(message);
    } catch {
      // Diagnostics are observational and must not affect protocol handling.
    }
  }
}

function readInitializeResult(value: unknown): CursorAcpInitializeResult {
  if (
    !isRecord(value) ||
    value.protocolVersion !== CURSOR_ACP_PROTOCOL_VERSION ||
    !isRecord(value.agentCapabilities) ||
    !Array.isArray(value.authMethods)
  ) {
    throw new AgentBackendProtocolError(
      'Cursor ACP initialize response is malformed or uses an unsupported protocol version.'
    );
  }
  const authMethods = value.authMethods;
  if (
    !authMethods.every(
      (method) => isRecord(method) && typeof method.id === 'string'
    ) ||
    !authMethods.some(
      (method) => isRecord(method) && method.id === 'cursor_login'
    )
  ) {
    throw new AgentBackendProtocolError(
      'Cursor ACP did not advertise the required cursor_login authentication method.'
    );
  }
  return value as unknown as CursorAcpInitializeResult;
}

function readNewSessionResult(value: unknown): CursorAcpNewSessionResult {
  const configuration = readSessionConfiguration(value, 'session/new');
  if (
    !isRecord(value) ||
    typeof value.sessionId !== 'string' ||
    !value.sessionId
  ) {
    throw new AgentBackendProtocolError(
      'Cursor ACP session/new response has no valid Session ID.'
    );
  }
  return {
    sessionId: value.sessionId,
    ...configuration,
  };
}

function readSessionConfiguration(
  value: unknown,
  method: string
): CursorAcpSessionConfiguration {
  if (
    !isRecord(value) ||
    !isRecord(value.modes) ||
    typeof value.modes.currentModeId !== 'string' ||
    !Array.isArray(value.modes.availableModes) ||
    !value.modes.availableModes.every(
      (mode) =>
        isRecord(mode) &&
        typeof mode.id === 'string' &&
        typeof mode.name === 'string'
    ) ||
    !isRecord(value.models) ||
    typeof value.models.currentModelId !== 'string' ||
    !Array.isArray(value.models.availableModels) ||
    !value.models.availableModels.every(
      (model) =>
        isRecord(model) &&
        typeof model.modelId === 'string' &&
        typeof model.name === 'string'
    )
  ) {
    throw new AgentBackendProtocolError(
      `Cursor ACP ${method} response is malformed.`
    );
  }
  return value as unknown as CursorAcpSessionConfiguration;
}

function assertModeAvailable(
  configuration: CursorAcpSessionConfiguration,
  mode: CursorAcpMode
): void {
  if (!configuration.modes.availableModes.some((entry) => entry.id === mode)) {
    throw new AgentConfigurationError(
      `Cursor ACP mode "${mode}" is not available.`,
      ['mode must be listed by the Cursor ACP Session']
    );
  }
}

function assertModelAvailable(
  configuration: CursorAcpSessionConfiguration,
  model: string
): void {
  if (
    !configuration.models.availableModels.some(
      (entry) => entry.modelId === model
    )
  ) {
    throw new AgentConfigurationError(
      `Cursor ACP model "${model}" is not available.`,
      ['model must be listed by the Cursor ACP Session']
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatAuthenticationFailure(cause: unknown): string {
  if (!(cause instanceof AgentBackendProtocolError) || !cause.details) {
    return '';
  }
  const fields: string[] = [];
  if (typeof cause.details.code === 'number') {
    fields.push(`ACP code ${cause.details.code}`);
  }
  for (const [label, key] of [
    ['message', 'serverMessage'],
    ['data.details', 'serverDataDetails'],
    ['data.message', 'serverDataMessage'],
  ] as const) {
    const value = cause.details[key];
    if (typeof value === 'string' && value) {
      fields.push(`${label}: ${value.slice(0, 512)}`);
    }
  }
  return fields.length > 0 ? ` (${fields.join('; ')})` : '';
}

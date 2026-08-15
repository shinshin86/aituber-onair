import {
  AgentBackendCompatibilityError,
  AgentBackendProcessError,
  AgentBackendProtocolError,
} from '../../errors.js';
import type {
  CodexAppServerProcess,
  CodexAppServerProcessFactory,
} from './process.js';
import { nodeCodexAppServerProcessFactory } from './process.js';
import {
  CODEX_APP_SERVER_MINIMUM_VERSION,
  CODEX_APP_SERVER_VERIFIED_VERSION,
} from './protocol.js';
import type {
  CodexAppServerAccountReadResult,
  CodexAppServerInitializeResponse,
  CodexAppServerModelListResult,
  CodexAppServerNotification,
  CodexAppServerRequest,
  CodexAppServerThreadResult,
  CodexAppServerTurnStartResult,
  CodexAppServerTurnSteerResult,
} from './protocol.js';
import {
  CodexAppServerServerRequestError,
  CodexAppServerTransport,
} from './transport.js';

export type CodexAppServerSandboxMode = 'read-only' | 'workspace-write';
export type CodexAppServerApprovalPolicy = 'untrusted' | 'on-request' | 'never';

export interface CodexAppServerClientCompatibility {
  readonly minimumVersion?: string;
  readonly onMismatch?: 'reject' | 'warn' | 'allow';
  readonly accept?: (actual: string, verified: string) => boolean;
}

export interface CodexAppServerClientOptions {
  readonly executable: string;
  readonly workingDirectory: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly compatibility?: CodexAppServerClientCompatibility;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly maxLineBytes?: number;
  readonly enableExperimentalApi?: boolean;
  readonly onDiagnostic?: (message: string) => void;
}

export interface CodexThreadConfiguration {
  readonly cwd: string;
  readonly developerInstructions: string;
  readonly sandbox: CodexAppServerSandboxMode;
  readonly approvalPolicy: CodexAppServerApprovalPolicy;
  readonly model?: string;
  readonly ephemeral?: boolean;
}

export interface CodexTurnInput {
  readonly type: 'text';
  readonly text: string;
  readonly text_elements: readonly [];
}

export interface CodexAppServerClientDependencies {
  readonly processFactory?: CodexAppServerProcessFactory;
}

export class CodexAppServerClient {
  private readonly transport: CodexAppServerTransport;
  private readonly experimentalApi: boolean;
  private readonly actualVersion: string;
  private readonly notificationListeners = new Set<
    (notification: CodexAppServerNotification) => void
  >();
  private readonly errorListeners = new Set<(error: Error) => void>();
  private serverRequestHandler?: (
    request: CodexAppServerRequest
  ) => Promise<unknown> | unknown;
  private initialized = false;

  private constructor(
    transport: CodexAppServerTransport,
    experimentalApi: boolean,
    actualVersion: string
  ) {
    this.transport = transport;
    this.experimentalApi = experimentalApi;
    this.actualVersion = actualVersion;
  }

  static async connect(
    options: CodexAppServerClientOptions,
    dependencies: CodexAppServerClientDependencies = {}
  ): Promise<CodexAppServerClient> {
    const processFactory =
      dependencies.processFactory ?? nodeCodexAppServerProcessFactory;
    let versionOutput: string;
    try {
      versionOutput = await processFactory.readVersion(
        options.executable,
        options.environment
      );
    } catch (cause) {
      throw new AgentBackendProcessError(
        `Failed to run Codex executable "${options.executable}".`,
        { cause }
      );
    }
    const actualVersion = parseCodexVersion(versionOutput);
    checkCompatibility(
      actualVersion,
      options.compatibility,
      options.onDiagnostic
    );

    let client: CodexAppServerClient | undefined;
    let process: CodexAppServerProcess;
    try {
      process = processFactory.spawn(options.executable, {
        cwd: options.workingDirectory,
        environment: options.environment,
      });
    } catch (cause) {
      throw new AgentBackendProcessError(
        `Failed to start Codex executable "${options.executable}".`,
        { cause }
      );
    }
    const transport = new CodexAppServerTransport(process, {
      requestTimeoutMs: options.requestTimeoutMs,
      shutdownTimeoutMs: options.shutdownTimeoutMs,
      maxLineBytes: options.maxLineBytes,
      onDiagnostic: options.onDiagnostic,
      onError: (error) => client?.dispatchError(error),
      onNotification: (notification) => {
        client?.dispatchNotification(notification);
      },
      onServerRequest: (request) => {
        if (!client?.serverRequestHandler) {
          throw new CodexAppServerServerRequestError(
            -32601,
            `Unsupported server request method "${request.method}".`
          );
        }
        return client.serverRequestHandler(request);
      },
    });
    client = new CodexAppServerClient(
      transport,
      options.enableExperimentalApi ?? false,
      actualVersion
    );
    try {
      await client.initialize();
      return client;
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  onNotification(
    listener: (notification: CodexAppServerNotification) => void
  ): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  onServerRequest(
    handler: (request: CodexAppServerRequest) => Promise<unknown> | unknown
  ): void {
    this.serverRequestHandler = handler;
  }

  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  async readAccount(
    refreshToken = false
  ): Promise<CodexAppServerAccountReadResult> {
    this.assertInitialized();
    const result = await this.request<unknown>('account/read', {
      refreshToken,
    });
    assertAccountReadResult(result);
    return result;
  }

  async listModels(
    input: {
      readonly cursor?: string | null;
      readonly limit?: number | null;
      readonly includeHidden?: boolean | null;
    } = {}
  ): Promise<CodexAppServerModelListResult> {
    this.assertInitialized();
    const result = await this.request<unknown>('model/list', input);
    return normalizeModelListResult(result);
  }

  startThread(
    configuration: CodexThreadConfiguration
  ): Promise<CodexAppServerThreadResult> {
    this.assertInitialized();
    return this.request('thread/start', buildThreadParams(configuration, true));
  }

  resumeThread(
    threadId: string,
    configuration: CodexThreadConfiguration
  ): Promise<CodexAppServerThreadResult> {
    this.assertInitialized();
    return this.request('thread/resume', {
      threadId,
      ...buildThreadParams(configuration, false),
    });
  }

  forkThread(
    threadId: string,
    configuration: CodexThreadConfiguration
  ): Promise<CodexAppServerThreadResult> {
    this.assertInitialized();
    return this.request('thread/fork', {
      threadId,
      ...buildThreadParams(configuration, true),
    });
  }

  startTurn(
    threadId: string,
    input: readonly CodexTurnInput[]
  ): Promise<CodexAppServerTurnStartResult> {
    this.assertInitialized();
    return this.request('turn/start', { threadId, input });
  }

  async steerTurn(
    threadId: string,
    turnId: string,
    input: readonly CodexTurnInput[]
  ): Promise<CodexAppServerTurnSteerResult> {
    this.assertInitialized();
    const result = await this.request<unknown>('turn/steer', {
      threadId,
      expectedTurnId: turnId,
      input,
    });
    if (!isRecord(result) || result.turnId !== turnId) {
      throw new AgentBackendProtocolError(
        'Codex app-server turn/steer response is malformed or mismatched.'
      );
    }
    return result as unknown as CodexAppServerTurnSteerResult;
  }

  interruptTurn(threadId: string, turnId: string): Promise<void> {
    this.assertInitialized();
    return this.request('turn/interrupt', { threadId, turnId });
  }

  close(): Promise<void> {
    return this.transport.close();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      throw new AgentBackendProtocolError(
        'Codex app-server client was initialized more than once.'
      );
    }
    const response = await this.request<CodexAppServerInitializeResponse>(
      'initialize',
      {
        clientInfo: {
          name: 'aituber_onair_agent',
          title: 'AITuber OnAir Agent',
          version: '0.0.0',
        },
        capabilities: {
          experimentalApi: this.experimentalApi,
          requestAttestation: false,
        },
      }
    );
    assertInitializeResponse(response);
    this.transport.notify('initialized');
    this.initialized = true;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new AgentBackendProtocolError(
        'Codex app-server client is not initialized.'
      );
    }
  }

  private async request<Result>(
    method: string,
    params?: unknown
  ): Promise<Result> {
    try {
      return await this.transport.request<Result>(method, params);
    } catch (error) {
      if (
        error instanceof AgentBackendProtocolError &&
        error.details?.code === -32601
      ) {
        throw new AgentBackendCompatibilityError(
          `Codex app-server method "${method}" is unavailable in CLI ${this.actualVersion}; this package was verified against CLI ${CODEX_APP_SERVER_VERIFIED_VERSION}.`,
          {
            cause: error,
            details: {
              method,
              actualVersion: this.actualVersion,
              verifiedVersion: CODEX_APP_SERVER_VERIFIED_VERSION,
            },
          }
        );
      }
      throw error;
    }
  }

  private dispatchNotification(notification: CodexAppServerNotification): void {
    for (const listener of this.notificationListeners) listener(notification);
  }

  private dispatchError(error: Error): void {
    for (const listener of this.errorListeners) listener(error);
  }
}

function checkCompatibility(
  actualVersion: string,
  compatibility: CodexAppServerClientCompatibility | undefined,
  onDiagnostic: ((message: string) => void) | undefined
): void {
  if (compatibility?.accept) {
    if (
      !compatibility.accept(actualVersion, CODEX_APP_SERVER_VERIFIED_VERSION)
    ) {
      throw new AgentBackendCompatibilityError(
        `Codex CLI ${actualVersion} was rejected by the custom compatibility policy for verified version ${CODEX_APP_SERVER_VERIFIED_VERSION}.`,
        {
          details: {
            actualVersion,
            verifiedVersion: CODEX_APP_SERVER_VERIFIED_VERSION,
          },
        }
      );
    }
    return;
  }

  const minimumVersion =
    compatibility?.minimumVersion ?? CODEX_APP_SERVER_MINIMUM_VERSION;
  if (compareCodexVersions(actualVersion, minimumVersion) < 0) {
    throw new AgentBackendCompatibilityError(
      `Codex CLI ${actualVersion} is older than the minimum supported version ${minimumVersion}.`,
      { details: { actualVersion, minimumVersion } }
    );
  }

  if (actualVersion === CODEX_APP_SERVER_VERIFIED_VERSION) return;

  const onMismatch = compatibility?.onMismatch ?? 'warn';
  if (onMismatch === 'reject') {
    throw new AgentBackendCompatibilityError(
      `Codex CLI ${actualVersion} does not match the verified version ${CODEX_APP_SERVER_VERIFIED_VERSION}.`,
      {
        details: {
          actualVersion,
          verifiedVersion: CODEX_APP_SERVER_VERIFIED_VERSION,
        },
      }
    );
  }
  if (onMismatch === 'warn') {
    emitDiagnostic(
      onDiagnostic,
      `Codex CLI ${actualVersion} differs from the verified version ${CODEX_APP_SERVER_VERIFIED_VERSION}; continuing.`
    );
  }
}

function emitDiagnostic(
  onDiagnostic: ((message: string) => void) | undefined,
  message: string
): void {
  try {
    onDiagnostic?.(message);
  } catch {
    // Diagnostics are observational and must not prevent a connection.
  }
}

function parseCodexVersion(output: string): string {
  const match = /^codex-cli\s+(\d+\.\d+\.\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(
    output.trim()
  );
  if (!match) {
    throw new AgentBackendCompatibilityError(
      'Codex CLI returned an unrecognized version string.',
      { details: { output: output.slice(0, 120) } }
    );
  }
  return match[1];
}

export function compareCodexVersions(left: string, right: string): number {
  const leftParts = parseComparableVersion(left);
  const rightParts = parseComparableVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function parseComparableVersion(version: string): readonly number[] {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) {
    throw new AgentBackendCompatibilityError(
      `Codex CLI compatibility version "${version}" is invalid.`,
      { details: { version } }
    );
  }
  return match.slice(1, 4).map(Number);
}

function buildThreadParams(
  configuration: CodexThreadConfiguration,
  includeEphemeral: boolean
): Record<string, unknown> {
  return {
    cwd: configuration.cwd,
    developerInstructions: configuration.developerInstructions,
    sandbox: configuration.sandbox,
    approvalPolicy: configuration.approvalPolicy,
    approvalsReviewer: 'user',
    ...(configuration.model ? { model: configuration.model } : {}),
    ...(includeEphemeral && configuration.ephemeral !== undefined
      ? { ephemeral: configuration.ephemeral }
      : {}),
  };
}

function assertInitializeResponse(
  response: CodexAppServerInitializeResponse
): void {
  if (
    !response ||
    typeof response.userAgent !== 'string' ||
    typeof response.codexHome !== 'string' ||
    typeof response.platformFamily !== 'string' ||
    typeof response.platformOs !== 'string'
  ) {
    throw new AgentBackendProtocolError(
      'Codex app-server initialize response is malformed.'
    );
  }
}

function assertAccountReadResult(
  result: unknown
): asserts result is CodexAppServerAccountReadResult {
  if (!isRecord(result) || typeof result.requiresOpenaiAuth !== 'boolean') {
    throw new AgentBackendProtocolError(
      'Codex app-server account/read response is malformed.'
    );
  }
  const account = result.account;
  if (account === null) return;
  if (!isRecord(account) || typeof account.type !== 'string') {
    throw new AgentBackendProtocolError(
      'Codex app-server account/read response is malformed.'
    );
  }
  const valid =
    account.type === 'apiKey' ||
    (account.type === 'chatgpt' &&
      (typeof account.email === 'string' || account.email === null) &&
      typeof account.planType === 'string') ||
    (account.type === 'amazonBedrock' &&
      typeof account.usesCodexManagedCredentials === 'boolean');
  if (!valid) {
    throw new AgentBackendProtocolError(
      'Codex app-server account/read response is malformed.'
    );
  }
}

function normalizeModelListResult(
  result: unknown
): CodexAppServerModelListResult {
  if (
    !isRecord(result) ||
    !Array.isArray(result.data) ||
    !(typeof result.nextCursor === 'string' || result.nextCursor === null)
  ) {
    throw new AgentBackendProtocolError(
      'Codex app-server model/list response is malformed.'
    );
  }
  const data: CodexAppServerModelListResult['data'][number][] = [];
  for (const model of result.data) {
    const inputModalities = isRecord(model)
      ? (model.inputModalities ?? ['text', 'image'])
      : undefined;
    if (
      !isRecord(model) ||
      typeof model.id !== 'string' ||
      typeof model.model !== 'string' ||
      typeof model.displayName !== 'string' ||
      typeof model.description !== 'string' ||
      typeof model.hidden !== 'boolean' ||
      typeof model.defaultReasoningEffort !== 'string' ||
      !Array.isArray(inputModalities) ||
      !inputModalities.every((value) => typeof value === 'string') ||
      typeof model.supportsPersonality !== 'boolean' ||
      typeof model.isDefault !== 'boolean'
    ) {
      throw new AgentBackendProtocolError(
        'Codex app-server model/list response contains a malformed model.'
      );
    }
    data.push({
      ...model,
      inputModalities,
    } as unknown as (typeof data)[number]);
  }
  return {
    ...result,
    data,
    nextCursor: result.nextCursor,
  } as CodexAppServerModelListResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

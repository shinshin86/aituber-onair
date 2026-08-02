import {
  AgentBackendError,
  AgentCapabilityError,
  AgentConfigurationError,
  AgentSessionClosedError,
} from '../errors.js';
import {
  assertAgentDefinition,
  snapshotBackendCapabilities,
} from '../internal/contracts.js';
import type {
  Agent,
  AgentBackendSessionInput,
  AgentOptions,
  AgentResumeSessionOptions,
  AgentSession,
  AgentSessionOptions,
  AgentToolSpec,
} from '../types.js';
import { AgentSessionRuntime } from './AgentSession.js';
import { createCorrelationId } from './ids.js';

export function createAgent(options: AgentOptions): Agent {
  return new AgentRuntime(options);
}

class AgentRuntime implements Agent {
  readonly id: string;
  readonly brief: string;
  readonly capabilities: Agent['capabilities'];

  private readonly backend: AgentOptions['backend'];
  private readonly toolsById: ReadonlyMap<string, AgentToolSpec>;
  private readonly sessions = new Map<string, AgentSessionRuntime>();
  private readonly startingSessionIds = new Set<string>();
  private readonly pendingSessionStarts = new Set<Promise<AgentSession>>();
  private closed = false;
  private closePromise?: Promise<void>;

  constructor(options: AgentOptions) {
    assertAgentDefinition(options);
    if (
      !options.backend ||
      typeof options.backend.startSession !== 'function'
    ) {
      throw new AgentConfigurationError('Agent backend is invalid.', [
        'backend.startSession must be a function',
      ]);
    }
    if (!options.backend.capabilities?.text) {
      throw new AgentCapabilityError('text', options.backend.name);
    }

    this.id = options.id;
    this.brief = options.brief;
    this.backend = options.backend;
    this.capabilities = snapshotBackendCapabilities(
      options.backend.capabilities
    );
    this.toolsById = createToolMap(options.tools ?? []);
  }

  startSession(options: AgentSessionOptions): Promise<AgentSession> {
    return this.trackSessionStart(this.createSession(options));
  }

  resumeSession(options: AgentResumeSessionOptions): Promise<AgentSession> {
    if (!this.capabilities.sessionResume) {
      return Promise.reject(
        new AgentCapabilityError('sessionResume', this.backend.name)
      );
    }
    return this.trackSessionStart(
      this.createSession(options, options.backendSessionId)
    );
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.closePromise = (async () => {
      await Promise.allSettled([...this.pendingSessionStarts]);
      const sessions = [...this.sessions.values()];
      await Promise.all(sessions.map((session) => session.close()));
    })();
    return this.closePromise;
  }

  private trackSessionStart(
    start: Promise<AgentSession>
  ): Promise<AgentSession> {
    this.pendingSessionStarts.add(start);
    const remove = () => this.pendingSessionStarts.delete(start);
    void start.then(remove, remove);
    return start;
  }

  private async createSession(
    options: AgentSessionOptions,
    backendSessionId?: string
  ): Promise<AgentSession> {
    this.assertOpen();
    const issues = validateSessionOptions(options, backendSessionId);
    const sessionId = options.id ?? createCorrelationId('session');
    if (
      this.sessions.has(sessionId) ||
      this.startingSessionIds.has(sessionId)
    ) {
      issues.push(`Session ID "${sessionId}" is already in use`);
    }

    const allowedTools = [...new Set(options.allowedTools ?? [])];
    const unknownTools = allowedTools.filter(
      (toolId) => !this.toolsById.has(toolId)
    );
    if (unknownTools.length > 0) {
      issues.push(
        `Session allowedTools contains unknown Tool IDs: ${unknownTools.join(', ')}`
      );
    }
    if (issues.length > 0) {
      throw new AgentConfigurationError(
        'Agent Session options are invalid.',
        issues
      );
    }

    const visibleTools = allowedTools.map(
      (toolId) => this.toolsById.get(toolId) as AgentToolSpec
    );
    const backendTools = visibleTools.map((tool) => ({
      id: tool.id,
      definition: tool.definition,
    }));
    const backendInput: AgentBackendSessionInput = {
      agentId: this.id,
      sessionId,
      purpose: options.purpose,
      audience: options.audience,
      inputTrust: options.inputTrust,
      brief: this.brief,
      tools: backendTools,
      ...(backendSessionId ? { backendSessionId } : {}),
    };

    this.startingSessionIds.add(sessionId);
    try {
      const backendSession = await this.backend.startSession(backendInput);
      if (this.closed) {
        await backendSession.close();
        throw new AgentSessionClosedError(
          'The Agent was closed while its Session was starting.'
        );
      }

      const session = new AgentSessionRuntime({
        id: sessionId,
        agentId: this.id,
        purpose: options.purpose,
        audience: options.audience,
        inputTrust: options.inputTrust,
        allowedTools,
        toolIdsByBackendName: new Map(
          visibleTools.map((tool) => [tool.definition.name, tool.id])
        ),
        backendName: this.backend.name,
        backendCapabilities: this.capabilities,
        backendSession,
        lifecycle: backendSessionId
          ? { type: 'resumed', backendSessionId }
          : { type: 'started' },
        onClosed: (closedSessionId) => {
          this.sessions.delete(closedSessionId);
        },
      });
      this.sessions.set(sessionId, session);
      return session;
    } catch (error) {
      if (
        error instanceof AgentConfigurationError ||
        error instanceof AgentCapabilityError ||
        error instanceof AgentSessionClosedError ||
        error instanceof AgentBackendError
      ) {
        throw error;
      }
      throw new AgentBackendError(
        `Backend "${this.backend.name}" failed to start an Agent Session.`,
        { cause: error }
      );
    } finally {
      this.startingSessionIds.delete(sessionId);
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new AgentSessionClosedError('The Agent is closed.');
    }
  }
}

function createToolMap(
  tools: readonly AgentToolSpec[]
): ReadonlyMap<string, AgentToolSpec> {
  const byId = new Map<string, AgentToolSpec>();
  const definitionNames = new Set<string>();
  const issues: string[] = [];

  for (const tool of tools) {
    if (!tool.id?.trim()) {
      issues.push('Tool IDs must be non-empty strings');
      continue;
    }
    if (byId.has(tool.id)) issues.push(`Duplicate Tool ID: ${tool.id}`);
    if (!tool.definition?.name?.trim()) {
      issues.push(`Tool "${tool.id}" must have a model-facing name`);
    } else if (definitionNames.has(tool.definition.name)) {
      issues.push(`Duplicate model-facing Tool name: ${tool.definition.name}`);
    }
    if (typeof tool.execute !== 'function') {
      issues.push(`Tool "${tool.id}" must provide an execute handler`);
    }

    byId.set(tool.id, tool);
    if (tool.definition?.name) definitionNames.add(tool.definition.name);
  }

  if (issues.length > 0) {
    throw new AgentConfigurationError(
      'Agent Tool registration failed.',
      issues
    );
  }
  return byId;
}

function validateSessionOptions(
  options: AgentSessionOptions,
  backendSessionId: string | undefined
): string[] {
  const issues: string[] = [];
  if (options.id !== undefined && !options.id.trim()) {
    issues.push('session.id must be a non-empty string when provided');
  }
  if (!options.purpose?.trim()) {
    issues.push('session.purpose must be a non-empty string');
  }
  if (backendSessionId !== undefined && !backendSessionId.trim()) {
    issues.push('backendSessionId must be a non-empty string');
  }
  if (
    options.allowedTools?.some(
      (toolId) => typeof toolId !== 'string' || !toolId.trim()
    )
  ) {
    issues.push('session.allowedTools must contain only non-empty strings');
  }
  return issues;
}

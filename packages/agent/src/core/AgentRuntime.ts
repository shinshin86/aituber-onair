import {
  AgentBackendError,
  AgentBackendProtocolError,
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
  AgentHook,
  AgentOptions,
  AgentPolicyConfig,
  AgentResumeSessionOptions,
  AgentRuntimeLimits,
  AgentSession,
  AgentSessionOptions,
  AgentToolSpec,
} from '../types.js';
import { createPolicy } from '../policy/DefaultAgentPolicy.js';
import { assertSupportedToolSchema } from '../tools/schemaValidation.js';
import { AgentSessionRuntime } from './AgentSession.js';
import { createCorrelationId } from './ids.js';

const DEFAULT_LIMITS = Object.freeze({
  maxToolCallsPerTurn: 8,
  approvalTimeoutMs: 30_000,
});

const TOOL_RISKS = new Set([
  'read',
  'draft',
  'write',
  'external',
  'destructive',
]);

const HOOK_PHASES = new Set([
  'input',
  'context',
  'before-tool',
  'after-tool',
  'draft-response',
  'output',
  'after-turn',
]);

const POLICY_CONFIG_KEYS = new Set([
  'allowTools',
  'defaultDecision',
  'denyTools',
  'requireApproval',
]);

const APPROVAL_RULE_KEYS = new Set(['riskAtLeast', 'tools']);

export function createAgent(options: AgentOptions): Agent {
  return new AgentRuntime(options);
}

class AgentRuntime implements Agent {
  readonly id: string;
  readonly brief: string;
  readonly capabilities: Agent['capabilities'];

  private readonly backend: AgentOptions['backend'];
  private readonly toolsById: ReadonlyMap<string, AgentToolSpec>;
  private readonly policy: ReturnType<typeof createPolicy>;
  private readonly hooks: readonly AgentHook[];
  private readonly limits: Required<AgentRuntimeLimits>;
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
    if (options.tools !== undefined && !Array.isArray(options.tools)) {
      throw new AgentConfigurationError('Agent Tool registration failed.', [
        'agent.tools must be an array',
      ]);
    }
    this.toolsById = createToolMap(options.tools ?? []);
    validatePolicyConfig(options.policy, this.toolsById);
    this.policy = createPolicy(options.policy);
    this.hooks = snapshotHooks(options.hooks ?? []);
    this.limits = snapshotLimits(options.limits);
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
    const optionsObject =
      typeof options === 'object' &&
      options !== null &&
      !Array.isArray(options);
    const sessionId =
      optionsObject && typeof options.id === 'string' && options.id
        ? options.id
        : createCorrelationId('session');
    if (
      this.sessions.has(sessionId) ||
      this.startingSessionIds.has(sessionId)
    ) {
      issues.push(`Session ID "${sessionId}" is already in use`);
    }

    const allowedTools = [
      ...new Set(
        optionsObject && Array.isArray(options.allowedTools)
          ? options.allowedTools
          : []
      ),
    ];
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
    if (visibleTools.length > 0 && !this.capabilities.tools) {
      throw new AgentCapabilityError('tools', this.backend.name);
    }
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
      if (
        visibleTools.length > 0 &&
        typeof backendSession.submitToolResult !== 'function'
      ) {
        await backendSession.close();
        throw new AgentBackendProtocolError(
          `Backend "${this.backend.name}" supports Tools but cannot receive Tool results.`
        );
      }
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
        toolsById: new Map(visibleTools.map((tool) => [tool.id, tool])),
        policy: this.policy,
        hooks: this.hooks,
        limits: this.limits,
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
        error instanceof AgentBackendProtocolError ||
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
    if (!tool.definition?.description?.trim()) {
      issues.push(`Tool "${tool.id}" must have a description`);
    }
    if (typeof tool.execute !== 'function') {
      issues.push(`Tool "${tool.id}" must provide an execute handler`);
    }

    if (!TOOL_RISKS.has(tool.risk)) {
      issues.push(`Tool "${tool.id}" has an invalid risk level`);
    }
    if (
      tool.timeoutMs !== undefined &&
      (!Number.isFinite(tool.timeoutMs) || tool.timeoutMs <= 0)
    ) {
      issues.push(`Tool "${tool.id}" timeoutMs must be positive and finite`);
    }
    if (
      tool.sensitiveFields?.some(
        (field) => typeof field !== 'string' || !field.trim()
      )
    ) {
      issues.push(
        `Tool "${tool.id}" sensitiveFields must contain non-empty paths`
      );
    }
    if (tool.definition?.parameters) {
      assertSupportedToolSchema(tool.definition.parameters, tool.id);
      if (tool.definition.parameters.type !== 'object') {
        issues.push(`Tool "${tool.id}" parameters must have type "object"`);
      }
    } else {
      issues.push(`Tool "${tool.id}" must have a parameters schema`);
    }

    byId.set(tool.id, snapshotTool(tool));
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

function snapshotTool(tool: AgentToolSpec): AgentToolSpec {
  return Object.freeze({
    ...tool,
    definition: Object.freeze({
      ...tool.definition,
      parameters: cloneAndFreeze(tool.definition.parameters),
    }),
    sensitiveFields: tool.sensitiveFields
      ? Object.freeze([...tool.sensitiveFields])
      : undefined,
  });
}

function cloneAndFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneAndFreeze)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          cloneAndFreeze(child),
        ])
      )
    ) as T;
  }
  return value;
}

function snapshotHooks(hooks: readonly AgentHook[]): readonly AgentHook[] {
  if (!Array.isArray(hooks)) {
    throw new AgentConfigurationError('Agent Hook registration failed.', [
      'agent.hooks must be an array',
    ]);
  }
  const ids = new Set<string>();
  const issues: string[] = [];
  const snapshot = hooks.map((hook) => {
    if (!hook.id?.trim()) issues.push('Hook IDs must be non-empty strings');
    else if (ids.has(hook.id)) issues.push(`Duplicate Hook ID: ${hook.id}`);
    if (!HOOK_PHASES.has(hook.phase)) {
      issues.push(`Hook "${hook.id}" has an invalid phase`);
    }
    if (hook.onError !== 'fail-turn' && hook.onError !== 'skip') {
      issues.push(`Hook "${hook.id}" has an invalid onError behavior`);
    }
    if (typeof hook.run !== 'function') {
      issues.push(`Hook "${hook.id}" must provide a run handler`);
    }
    ids.add(hook.id);
    return Object.freeze({ ...hook, run: hook.run.bind(hook) });
  });
  if (issues.length > 0) {
    throw new AgentConfigurationError(
      'Agent Hook registration failed.',
      issues
    );
  }
  return Object.freeze(snapshot);
}

function snapshotLimits(
  limits: AgentRuntimeLimits | undefined
): Required<AgentRuntimeLimits> {
  if (
    limits !== undefined &&
    (typeof limits !== 'object' || limits === null || Array.isArray(limits))
  ) {
    throw new AgentConfigurationError('Agent runtime limits are invalid.', [
      'agent.limits must be an object',
    ]);
  }
  const snapshot = { ...DEFAULT_LIMITS, ...limits };
  const issues: string[] = [];
  if (
    !Number.isInteger(snapshot.maxToolCallsPerTurn) ||
    snapshot.maxToolCallsPerTurn <= 0
  ) {
    issues.push('limits.maxToolCallsPerTurn must be a positive integer');
  }
  if (
    !Number.isFinite(snapshot.approvalTimeoutMs) ||
    snapshot.approvalTimeoutMs <= 0
  ) {
    issues.push('limits.approvalTimeoutMs must be positive and finite');
  }
  if (issues.length > 0) {
    throw new AgentConfigurationError(
      'Agent runtime limits are invalid.',
      issues
    );
  }
  return Object.freeze(snapshot);
}

function validatePolicyConfig(
  policy: AgentOptions['policy'],
  toolsById: ReadonlyMap<string, AgentToolSpec>
): void {
  if (!policy) return;
  if (typeof policy !== 'object' || Array.isArray(policy)) {
    throw new AgentConfigurationError('Agent policy is invalid.', [
      'agent.policy must be a policy object or policy configuration',
    ]);
  }
  if ('evaluate' in policy) {
    if (policy && typeof policy.evaluate !== 'function') {
      throw new AgentConfigurationError('Agent policy is invalid.', [
        'policy.evaluate must be a function',
      ]);
    }
    return;
  }

  const config = policy as AgentPolicyConfig;
  const issues: string[] = [];
  for (const key of Object.keys(config)) {
    if (!POLICY_CONFIG_KEYS.has(key)) {
      issues.push(`policy contains unsupported option "${key}"`);
    }
  }
  if (config.defaultDecision !== 'allow' && config.defaultDecision !== 'deny') {
    issues.push('policy.defaultDecision must be "allow" or "deny"');
  }
  if (
    config.requireApproval !== undefined &&
    (typeof config.requireApproval !== 'object' ||
      config.requireApproval === null ||
      Array.isArray(config.requireApproval))
  ) {
    issues.push('policy.requireApproval must be an object');
  } else if (config.requireApproval) {
    for (const key of Object.keys(config.requireApproval)) {
      if (!APPROVAL_RULE_KEYS.has(key)) {
        issues.push(
          `policy.requireApproval contains unsupported option "${key}"`
        );
      }
    }
    if (
      config.requireApproval.riskAtLeast !== undefined &&
      !TOOL_RISKS.has(config.requireApproval.riskAtLeast)
    ) {
      issues.push('policy.requireApproval.riskAtLeast is invalid');
    }
  }
  for (const [field, ids] of [
    ['allowTools', config.allowTools],
    ['denyTools', config.denyTools],
    ['requireApproval.tools', config.requireApproval?.tools],
  ] as const) {
    if (ids !== undefined && !Array.isArray(ids)) {
      issues.push(`policy.${field} must be an array`);
      continue;
    }
    for (const id of ids ?? []) {
      if (typeof id !== 'string' || !id.trim()) {
        issues.push(`policy.${field} must contain non-empty Tool IDs`);
      } else if (!toolsById.has(id)) {
        issues.push(`policy.${field} references unknown Tool "${id}"`);
      }
    }
  }
  if (issues.length > 0) {
    throw new AgentConfigurationError('Agent policy is invalid.', issues);
  }
}

function validateSessionOptions(
  options: AgentSessionOptions,
  backendSessionId: string | undefined
): string[] {
  const issues: string[] = [];
  if (
    typeof options !== 'object' ||
    options === null ||
    Array.isArray(options)
  ) {
    return ['session options must be an object'];
  }
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
    options.allowedTools !== undefined &&
    (!Array.isArray(options.allowedTools) ||
      options.allowedTools.some(
        (toolId) => typeof toolId !== 'string' || !toolId.trim()
      ))
  ) {
    issues.push('session.allowedTools must contain only non-empty strings');
  }
  return issues;
}

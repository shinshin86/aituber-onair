import type { AgentWorkspaceMetadata } from './types.js';

export interface AgentErrorOptions {
  readonly code?: string;
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class AgentError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? 'AGENT_ERROR';
    this.cause = options.cause;
    this.details = options.details;
  }
}

export class AgentConfigurationError extends AgentError {
  readonly issues: readonly string[];

  constructor(
    message: string,
    issues: readonly string[],
    options: Omit<AgentErrorOptions, 'code'> = {}
  ) {
    super(message, {
      ...options,
      code: 'AGENT_CONFIGURATION_ERROR',
      details: { ...options.details, issues },
    });
    this.issues = [...issues];
  }
}

export class AgentSessionClosedError extends AgentError {
  constructor(message = 'The Agent Session is closed.') {
    super(message, { code: 'AGENT_SESSION_CLOSED' });
  }
}

export class AgentTurnInProgressError extends AgentError {
  constructor(message = 'The Agent Session already has an active Turn.') {
    super(message, { code: 'AGENT_TURN_IN_PROGRESS' });
  }
}

export class AgentCapabilityError extends AgentError {
  readonly capability: string;

  constructor(capability: string, backendName?: string) {
    super(
      backendName
        ? `Backend "${backendName}" does not support "${capability}".`
        : `The selected backend does not support "${capability}".`,
      {
        code: 'AGENT_CAPABILITY_UNSUPPORTED',
        details: { backendName, capability },
      }
    );
    this.capability = capability;
  }
}

export class AgentPolicyDeniedError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_POLICY_DENIED' });
  }
}

export class AgentApprovalDeniedError extends AgentError {
  constructor(message = 'The requested operation was denied.') {
    super(message, { code: 'AGENT_APPROVAL_DENIED' });
  }
}

export class AgentApprovalTimeoutError extends AgentError {
  constructor(message = 'The approval request timed out.') {
    super(message, { code: 'AGENT_APPROVAL_TIMEOUT' });
  }
}

export class AgentToolNotFoundError extends AgentError {
  readonly toolId: string;

  constructor(toolId: string) {
    super(`Agent Tool "${toolId}" is not registered.`, {
      code: 'AGENT_TOOL_NOT_FOUND',
      details: { toolId },
    });
    this.toolId = toolId;
  }
}

export class AgentToolValidationError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_TOOL_VALIDATION' });
  }
}

export class AgentToolExecutionError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_TOOL_EXECUTION' });
  }
}

export class AgentToolLoopLimitError extends AgentError {
  constructor(message = 'The Agent Tool loop limit was reached.') {
    super(message, { code: 'AGENT_TOOL_LOOP_LIMIT' });
  }
}

export class AgentBootstrapInProgressError extends AgentError {
  constructor(
    message = 'The Agent already has an active bootstrap operation.'
  ) {
    super(message, { code: 'AGENT_BOOTSTRAP_IN_PROGRESS' });
  }
}

export class AgentBootstrapLimitError extends AgentError {
  readonly metadata: AgentWorkspaceMetadata;

  constructor(metadata: AgentWorkspaceMetadata) {
    super('The Agent bootstrap attempt limit was reached.', {
      code: 'AGENT_BOOTSTRAP_LIMIT',
      details: {
        attempt: metadata.attempt,
        status: metadata.status,
        targetVersion: metadata.targetVersion,
      },
    });
    this.metadata = metadata;
  }
}

export class AgentBootstrapError extends AgentError {
  readonly metadata: AgentWorkspaceMetadata;

  constructor(
    message: string,
    metadata: AgentWorkspaceMetadata,
    options: Omit<AgentErrorOptions, 'code'> = {}
  ) {
    super(message, {
      ...options,
      code: 'AGENT_BOOTSTRAP_FAILED',
      details: {
        ...options.details,
        attempt: metadata.attempt,
        status: metadata.status,
        targetVersion: metadata.targetVersion,
      },
    });
    this.metadata = metadata;
  }
}

export class AgentWorkspaceStateError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_WORKSPACE_STATE' });
  }
}

export class AgentSchemaKeywordUnsupportedError extends AgentError {
  readonly keyword: string;

  constructor(keyword: string) {
    super(`JSON Schema keyword "${keyword}" is not supported.`, {
      code: 'AGENT_SCHEMA_KEYWORD_UNSUPPORTED',
      details: { keyword },
    });
    this.keyword = keyword;
  }
}

export class AgentHookError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_HOOK_ERROR' });
  }
}

export class AgentBackendError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_ERROR' });
  }
}

export class AgentBackendProtocolError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_PROTOCOL' });
  }
}

export class AgentBackendProcessError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_PROCESS' });
  }
}

export class AgentBackendCompatibilityError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_COMPATIBILITY' });
  }
}

export class AgentInterruptedError extends AgentError {
  constructor(message = 'The Agent Turn was interrupted.') {
    super(message, { code: 'AGENT_INTERRUPTED' });
  }
}

export class AgentTimeoutError extends AgentError {
  constructor(message = 'The Agent Turn timed out.') {
    super(message, { code: 'AGENT_TIMEOUT' });
  }
}

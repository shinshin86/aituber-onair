import type { AgentWorkspaceMetadata } from './types.js';

/** Optional stable code, causal value, and diagnostic details for `AgentError`. */
export interface AgentErrorOptions {
  readonly code?: string;
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Base class for typed runtime failures with stable codes and optional causes. */
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

/** Reports invalid host configuration or public API input with actionable issues. */
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

/** Raised when an operation targets a Session that has already closed. */
export class AgentSessionClosedError extends AgentError {
  constructor(message = 'The Agent Session is closed.') {
    super(message, { code: 'AGENT_SESSION_CLOSED' });
  }
}

/** Raised when a second Turn is started before the current Turn finishes. */
export class AgentTurnInProgressError extends AgentError {
  constructor(message = 'The Agent Session already has an active Turn.') {
    super(message, { code: 'AGENT_TURN_IN_PROGRESS' });
  }
}

/** Reports that the selected backend did not declare a required feature. */
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

/** Raised when host policy denies a Tool call or returns an invalid decision. */
export class AgentPolicyDeniedError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_POLICY_DENIED' });
  }
}

/** Raised when a required host approval is explicitly denied. */
export class AgentApprovalDeniedError extends AgentError {
  constructor(message = 'The requested operation was denied.') {
    super(message, { code: 'AGENT_APPROVAL_DENIED' });
  }
}

/** Raised when an approval request exceeds the configured response deadline. */
export class AgentApprovalTimeoutError extends AgentError {
  constructor(message = 'The approval request timed out.') {
    super(message, { code: 'AGENT_APPROVAL_TIMEOUT' });
  }
}

/** Reports a backend Tool name or runtime Tool ID that is not registered. */
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

/** Reports Tool arguments that fail the supported JSON Schema contract. */
export class AgentToolValidationError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_TOOL_VALIDATION' });
  }
}

/** Wraps a host Tool handler failure or its Tool-specific timeout. */
export class AgentToolExecutionError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_TOOL_EXECUTION' });
  }
}

/** Raised when one Turn exceeds its maximum number of accepted Tool calls. */
export class AgentToolLoopLimitError extends AgentError {
  constructor(message = 'The Agent Tool loop limit was reached.') {
    super(message, { code: 'AGENT_TOOL_LOOP_LIMIT' });
  }
}

/** Raised when bootstrap is requested while another bootstrap operation is active. */
export class AgentBootstrapInProgressError extends AgentError {
  constructor(
    message = 'The Agent already has an active bootstrap operation.'
  ) {
    super(message, { code: 'AGENT_BOOTSTRAP_IN_PROGRESS' });
  }
}

/** Reports exhausted bootstrap attempts and carries the latest workspace metadata. */
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

/** Wraps a failed bootstrap Turn and carries the metadata saved for recovery. */
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

/** Reports invalid, conflicting, or stale host-owned workspace metadata. */
export class AgentWorkspaceStateError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_WORKSPACE_STATE' });
  }
}

/** Identifies a JSON Schema keyword unsupported by Agent Tool validation. */
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

/** Wraps a hook failure when that hook is configured to fail the Turn. */
export class AgentHookError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_HOOK_ERROR' });
  }
}

/** Wraps an operational failure reported by or while invoking a backend. */
export class AgentBackendError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_ERROR' });
  }
}

/** Reports malformed or out-of-order messages in a backend protocol. */
export class AgentBackendProtocolError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_PROTOCOL' });
  }
}

/** Reports backend child-process startup, I/O, or unexpected exit failures. */
export class AgentBackendProcessError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_PROCESS' });
  }
}

/** Reports an installed backend version outside the accepted compatibility range. */
export class AgentBackendCompatibilityError extends AgentError {
  constructor(message: string, options: AgentErrorOptions = {}) {
    super(message, { ...options, code: 'AGENT_BACKEND_COMPATIBILITY' });
  }
}

/** Terminal Turn error used for caller, host, or backend interruption. */
export class AgentInterruptedError extends AgentError {
  constructor(message = 'The Agent Turn was interrupted.') {
    super(message, { code: 'AGENT_INTERRUPTED' });
  }
}

/** Terminal Turn or backend request error used when an elapsed-time limit expires. */
export class AgentTimeoutError extends AgentError {
  constructor(message = 'The Agent Turn timed out.') {
    super(message, { code: 'AGENT_TIMEOUT' });
  }
}

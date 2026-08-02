import { AgentConfigurationError } from '../errors.js';
import type { AgentBackendCapabilities } from '../types.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Runtime validation used by createAgent.
 * Kept internal until a standalone validator has a demonstrated public use.
 */
export function assertAgentDefinition(value: unknown): asserts value is {
  readonly id: string;
  readonly brief: string;
} {
  const issues: string[] = [];
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;

  if (!candidate) {
    throw new AgentConfigurationError('Agent definition must be an object.', [
      'Agent options must be a non-null object',
    ]);
  }

  if (!isNonEmptyString(candidate.id)) {
    issues.push('agent.id must be a non-empty string');
  }
  if (!isNonEmptyString(candidate.brief)) {
    issues.push('agent.brief must be a non-empty string');
  }
  for (const key of ['character', 'memory', 'policy', 'hooks']) {
    if (candidate[key] !== undefined) {
      issues.push(`agent.${key} is not a supported createAgent option`);
    }
  }

  if (issues.length > 0) {
    throw new AgentConfigurationError('Agent definition is invalid.', issues);
  }
}

/**
 * Takes a stable, immutable snapshot so adapter-owned capability objects
 * cannot be mutated after registration.
 */
export function snapshotBackendCapabilities<
  TCapabilities extends AgentBackendCapabilities,
>(capabilities: TCapabilities): Readonly<TCapabilities> {
  return Object.freeze({ ...capabilities });
}

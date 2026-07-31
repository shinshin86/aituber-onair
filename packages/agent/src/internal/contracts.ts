import { AgentConfigurationError } from '../errors.js';
import type { AgentBackendCapabilities, CharacterProfile } from '../types.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasOnlyStrings(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

function validateOptionalStringArray(
  candidate: Record<string, unknown>,
  key: string,
  path: string,
  issues: string[]
): void {
  if (candidate[key] !== undefined && !hasOnlyStrings(candidate[key])) {
    issues.push(`${path} must contain only non-empty strings`);
  }
}

/**
 * Runtime validation used by the future createAgent implementation.
 * Kept internal until a standalone validator has a demonstrated public use.
 */
export function assertCharacterProfile(
  value: unknown
): asserts value is CharacterProfile {
  const issues: string[] = [];
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;

  if (!candidate) {
    throw new AgentConfigurationError('CharacterProfile must be an object.', [
      'character must be a non-null object',
    ]);
  }

  if (!isNonEmptyString(candidate.id)) {
    issues.push('character.id must be a non-empty string');
  }
  if (!isNonEmptyString(candidate.name)) {
    issues.push('character.name must be a non-empty string');
  }
  if (!isNonEmptyString(candidate.role)) {
    issues.push('character.role must be a non-empty string');
  }
  const persona =
    typeof candidate.persona === 'object' &&
    candidate.persona !== null &&
    !Array.isArray(candidate.persona)
      ? (candidate.persona as Record<string, unknown>)
      : undefined;

  if (!persona) {
    issues.push('character.persona must be an object');
  } else {
    for (const key of [
      'traits',
      'values',
      'priorities',
      'vocabulary',
      'prohibitedExpressions',
    ]) {
      validateOptionalStringArray(
        persona,
        key,
        `character.persona.${key}`,
        issues
      );
    }
    if (
      persona.speakingStyle !== undefined &&
      !isNonEmptyString(persona.speakingStyle)
    ) {
      issues.push('character.persona.speakingStyle must be a non-empty string');
    }
  }

  validateOptionalStringArray(
    candidate,
    'instructions',
    'character.instructions',
    issues
  );
  validateOptionalStringArray(
    candidate,
    'boundaries',
    'character.boundaries',
    issues
  );
  if (
    candidate.relationshipToUser !== undefined &&
    !isNonEmptyString(candidate.relationshipToUser)
  ) {
    issues.push('character.relationshipToUser must be a non-empty string');
  }

  if (issues.length > 0) {
    throw new AgentConfigurationError('CharacterProfile is invalid.', issues);
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

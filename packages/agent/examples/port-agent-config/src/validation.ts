/**
 * Shared input validation helpers, mirrored from the existing character-agent
 * example so the ported tools keep identical parsing behavior.
 */
import { randomUUID } from 'node:crypto';

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function createdAtNow(): string {
  return new Date().toISOString();
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return value;
}

export function optionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string')
    throw new Error(`${fieldName} must be a string.`);
  return value;
}

export function optionalNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || Number.isNaN(value))
    throw new Error(`${fieldName} must be a number.`);
  return value;
}

export function optionalStringArray(
  value: unknown,
  fieldName: string,
): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string')
  )
    throw new Error(`${fieldName} must be an array of strings.`);
  return value;
}

export function enumValue<TValue extends string>(
  value: unknown,
  fieldName: string,
  allowed: readonly TValue[],
): TValue {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`${fieldName} must be one of ${allowed.join(', ')}.`);
  }
  return value as TValue;
}

export function optionalEnumValue<TValue extends string>(
  value: unknown,
  fieldName: string,
  allowed: readonly TValue[],
  fallback: TValue,
): TValue {
  if (value === undefined) return fallback;
  return enumValue(value, fieldName, allowed);
}

/**
 * Converts a logical dotted tool id (`memo.save`) into a provider-safe
 * `definition.name` (`memo_save`). The old character-agent used underscores in
 * the model-facing name; the Agent runtime keeps a separate dotted `id` for
 * policy/auditing and a provider-safe `definition.name` for the model.
 */
export function toProviderToolName(toolId: string): string {
  return toolId.replace(/\./g, '_');
}

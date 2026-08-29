import type { AgentError } from '../errors.js';
import type { AgentEventError, JsonValue } from '../types.js';

const OMIT_JSON_VALUE = Symbol('omit-json-value');

export function createAgentEventError(error: AgentError): AgentEventError {
  const details = sanitizeJsonRecord(error.details);
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    ...(details ? { details } : {}),
  };
}

export function sanitizeJsonRecord(
  value: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, JsonValue>> | undefined {
  if (!value) return undefined;
  const sanitized = sanitizeJsonValue(value, new Set());
  if (
    sanitized === OMIT_JSON_VALUE ||
    sanitized === null ||
    typeof sanitized !== 'object' ||
    Array.isArray(sanitized)
  ) {
    return undefined;
  }
  const record = sanitized as Readonly<Record<string, JsonValue>>;
  return Object.keys(record).length > 0 ? record : undefined;
}

function sanitizeJsonValue(
  value: unknown,
  ancestors: Set<object>
): JsonValue | typeof OMIT_JSON_VALUE {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') return String(value);
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    return OMIT_JSON_VALUE;
  }
  if (typeof value !== 'object' || ancestors.has(value)) {
    return OMIT_JSON_VALUE;
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? value.toISOString() : OMIT_JSON_VALUE;
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const sanitized = sanitizeJsonValue(item, ancestors);
        return sanitized === OMIT_JSON_VALUE ? null : sanitized;
      });
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return OMIT_JSON_VALUE;
    }
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(value)) {
      let item: unknown;
      try {
        item = (value as Record<string, unknown>)[key];
      } catch {
        continue;
      }
      const sanitized = sanitizeJsonValue(item, ancestors);
      if (sanitized !== OMIT_JSON_VALUE) result[key] = sanitized;
    }
    return result;
  } catch {
    return OMIT_JSON_VALUE;
  } finally {
    ancestors.delete(value);
  }
}

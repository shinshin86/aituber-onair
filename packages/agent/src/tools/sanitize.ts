const REDACTED = '[REDACTED]';

export function snapshotToolArguments(value: unknown): unknown {
  return deepFreeze(cloneValue(value));
}

export function sanitizeToolArguments(
  value: unknown,
  sensitiveFields: readonly string[]
): unknown {
  const clone = cloneValue(value);
  for (const field of sensitiveFields) redactPath(clone, field.split('.'));
  return deepFreeze(clone);
}

function redactPath(value: unknown, path: readonly string[]): void {
  if (path.length === 0 || !isRecord(value)) return;
  const [head, ...tail] = path;
  if (!head || !hasOwn(value, head)) return;
  if (tail.length === 0) value[head] = REDACTED;
  else redactPath(value[head], tail);
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneValue(child)])
  );
}

function deepFreeze(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

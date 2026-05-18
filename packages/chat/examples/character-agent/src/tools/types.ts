import { randomUUID } from 'node:crypto';
import type { JsonStorage } from '../storage';

export type JsonSchemaObject = {
  type: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
};

export type JsonSchemaProperty = {
  type?: string;
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
  [key: string]: unknown;
};

export type SecretaryTool<TInput, TResult> = {
  name: string;
  description: string;
  parameters: JsonSchemaObject;
  execute(input: TInput): Promise<TResult>;
};

export type ToolFactoryOptions = {
  storage: JsonStorage;
};

export type ToolOkResult = {
  ok: true;
  message?: string;
};

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
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }

  return value;
}

export function optionalNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return value;
}

export function optionalStringArray(
  value: unknown,
  fieldName: string,
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }

  return value;
}

export function enumValue<TValue extends string>(
  value: unknown,
  fieldName: string,
  allowed: readonly TValue[],
): TValue {
  if (typeof value !== 'string' || !allowed.includes(value as TValue)) {
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
  if (value === undefined) {
    return fallback;
  }

  return enumValue(value, fieldName, allowed);
}

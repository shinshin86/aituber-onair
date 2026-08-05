import {
  AgentConfigurationError,
  AgentSchemaKeywordUnsupportedError,
  AgentToolValidationError,
} from '../errors.js';

const SUPPORTED_KEYWORDS = new Set([
  'additionalProperties',
  'description',
  'enum',
  'items',
  'properties',
  'required',
  'type',
]);

const SUPPORTED_TYPES = new Set([
  'array',
  'boolean',
  'integer',
  'null',
  'number',
  'object',
  'string',
]);

type Schema = Readonly<Record<string, unknown>>;

export function assertSupportedToolSchema(
  value: unknown,
  toolId: string
): asserts value is Schema {
  const issues: string[] = [];
  inspectSchema(value, '$', issues);
  if (issues.length > 0) {
    throw new AgentConfigurationError(
      `JSON Schema for Agent Tool "${toolId}" is invalid.`,
      issues
    );
  }
}

export function validateToolInput(schema: Schema, input: unknown): void {
  const issues: string[] = [];
  validateValue(schema, input, '$', issues);
  if (issues.length > 0) {
    throw new AgentToolValidationError('Agent Tool input is invalid.', {
      details: { issues },
    });
  }
}

function inspectSchema(value: unknown, path: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`${path} must be a JSON Schema object`);
    return;
  }

  for (const keyword of Object.keys(value)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      throw new AgentSchemaKeywordUnsupportedError(keyword);
    }
  }

  const type = value.type;
  if (typeof type !== 'string' || !SUPPORTED_TYPES.has(type)) {
    issues.push(`${path}.type must be one supported JSON type`);
    return;
  }
  if (
    value.description !== undefined &&
    typeof value.description !== 'string'
  ) {
    issues.push(`${path}.description must be a string`);
  }
  if (value.enum !== undefined) {
    if (!Array.isArray(value.enum) || value.enum.length === 0) {
      issues.push(`${path}.enum must be a non-empty array`);
    } else if (!value.enum.every(isJsonPrimitive)) {
      issues.push(`${path}.enum supports only JSON primitive values`);
    }
  }

  if (type === 'object') {
    inspectObjectSchema(value, path, issues);
  } else if (
    value.properties !== undefined ||
    value.required !== undefined ||
    value.additionalProperties !== undefined
  ) {
    issues.push(`${path} uses object keywords with type "${type}"`);
  }

  if (type === 'array') {
    if (value.items === undefined) {
      issues.push(`${path}.items is required for array schemas`);
    } else {
      inspectSchema(value.items, `${path}.items`, issues);
    }
  } else if (value.items !== undefined) {
    issues.push(`${path}.items requires type "array"`);
  }
}

function inspectObjectSchema(
  schema: Schema,
  path: string,
  issues: string[]
): void {
  const properties = schema.properties;
  if (properties !== undefined && !isRecord(properties)) {
    issues.push(`${path}.properties must be an object`);
  } else if (properties) {
    for (const [key, child] of Object.entries(properties)) {
      inspectSchema(child, `${path}.properties.${key}`, issues);
    }
  }

  if (schema.required !== undefined) {
    if (
      !Array.isArray(schema.required) ||
      !schema.required.every((key) => typeof key === 'string')
    ) {
      issues.push(`${path}.required must contain only property names`);
    } else if (properties && isRecord(properties)) {
      for (const key of schema.required) {
        if (!hasOwn(properties, key)) {
          issues.push(`${path}.required references unknown property "${key}"`);
        }
      }
    } else if (Array.isArray(schema.required)) {
      issues.push(`${path}.required cannot be used without properties`);
    }
  }

  if (
    schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== 'boolean'
  ) {
    issues.push(`${path}.additionalProperties must be a boolean`);
  }
}

function validateValue(
  schema: Schema,
  value: unknown,
  path: string,
  issues: string[]
): void {
  if (!matchesType(schema.type as string, value)) {
    issues.push(
      `${path} must be ${articleFor(schema.type as string)} ${String(schema.type)}`
    );
    return;
  }

  const enumValues = schema.enum;
  if (
    Array.isArray(enumValues) &&
    !enumValues.some((candidate) => Object.is(candidate, value))
  ) {
    issues.push(`${path} must be one of the allowed enum values`);
  }

  if (schema.type === 'object') {
    validateObject(schema, value as Record<string, unknown>, path, issues);
  } else if (schema.type === 'array') {
    const items = schema.items as Schema;
    (value as unknown[]).forEach((item, index) => {
      validateValue(items, item, `${path}[${index}]`, issues);
    });
  }
}

function validateObject(
  schema: Schema,
  value: Record<string, unknown>,
  path: string,
  issues: string[]
): void {
  const properties = (schema.properties ?? {}) as Record<string, Schema>;
  const required = (schema.required ?? []) as string[];
  for (const key of required) {
    if (!hasOwn(value, key)) issues.push(`${path}.${key} is required`);
  }
  for (const [key, child] of Object.entries(properties)) {
    if (hasOwn(value, key)) {
      validateValue(child, value[key], `${path}.${key}`, issues);
    }
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!hasOwn(properties, key)) {
        issues.push(`${path}.${key} is not allowed`);
      }
    }
  }
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return isRecord(value);
    case 'string':
      return typeof value === 'string';
    default:
      return false;
  }
}

function articleFor(type: string): string {
  return type === 'array' || type === 'integer' || type === 'object'
    ? 'an'
    : 'a';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isJsonPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'string'
  );
}

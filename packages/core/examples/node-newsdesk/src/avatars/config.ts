import path from 'node:path';
import { resolveFrom, resolveProjectRoot } from '../paths.js';
import type { BaseAvatarConfig } from './types.js';

export function configObject(
  raw: unknown,
  kind: string,
  allowed: readonly string[],
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error(`The ${kind} avatar config must be a JSON object.`);
  const value = raw as Record<string, unknown>;
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new Error(`Unknown ${kind} avatar config field: ${key}.`);
  return value;
}
export function configNumber(
  value: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const candidate = value[key] === undefined ? fallback : value[key];
  if (
    typeof candidate !== 'number' ||
    !Number.isFinite(candidate) ||
    candidate < min ||
    candidate > max
  )
    throw new Error(
      `avatar config ${key} must be a finite number between ${min} and ${max}.`,
    );
  return candidate;
}
export function baseConfig(
  value: Record<string, unknown>,
  defaults: BaseAvatarConfig,
): BaseAvatarConfig {
  return {
    scale: configNumber(value, 'scale', defaults.scale, 0.1, 3),
    x: configNumber(value, 'x', defaults.x, 0, 1),
    y: configNumber(value, 'y', defaults.y, 0, 1),
  };
}
export function modelPath(
  value: unknown,
  configFile: string,
  fallback: string,
): string {
  if (value === undefined) return path.resolve(resolveProjectRoot(), fallback);
  if (typeof value !== 'string' || !value.trim())
    throw new Error('avatar config model must be a non-empty path.');
  return resolveFrom(configFile, value);
}

import path from 'node:path';
import { resolveFrom, resolveProjectRoot } from '../paths.js';
import {
  AVATAR_KINDS,
  type AvatarConfig,
  type AvatarKind,
  type NodeAvatarAdapter,
} from './types.js';

export function parseAvatarKind(value: string): AvatarKind {
  if (!AVATAR_KINDS.includes(value as AvatarKind))
    throw new Error(
      `Unknown avatar "${value}". Choose ${AVATAR_KINDS.join(', ')}.`,
    );
  return value as AvatarKind;
}

/** No runtime module is loaded until its avatar is explicitly selected. */
export async function loadAvatar(kind: AvatarKind): Promise<NodeAvatarAdapter> {
  switch (kind) {
    case 'pngtuber':
      return (await import('./pngtuber/adapter.js')).createAdapter();
    case 'purupuru':
      return (await import('./purupuru/adapter.js')).createAdapter();
    default:
      throw new Error(
        `Avatar "${kind}" is not available in this example yet. Available: pngtuber, purupuru.`,
      );
  }
}

export function resolveAvatarConfig(
  kind: AvatarKind,
  raw: unknown,
  configFile: string,
): AvatarConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error(`The ${kind} avatar config must be a JSON object.`);
  const value = raw as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!['model', 'scale', 'x', 'y', 'intensity'].includes(key))
      throw new Error(`Unknown ${kind} avatar config field: ${key}.`);
  }
  if (
    value.model !== undefined &&
    (typeof value.model !== 'string' || !value.model.trim())
  )
    throw new Error('avatar config model must be a non-empty path.');
  const number = (
    key: string,
    fallback: number,
    min: number,
    max: number,
  ): number => {
    const candidate = value[key] ?? fallback;
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
  };
  return {
    model:
      typeof value.model === 'string'
        ? resolveFrom(configFile, value.model)
        : path.join(
            resolveProjectRoot(),
            'assets',
            kind === 'pngtuber' ? 'pngtuber' : 'miko.purupuru',
          ),
    scale: number('scale', 1, 0.1, 3),
    x: number('x', 0.5, 0, 1),
    y: number('y', 0.5, 0, 1),
    intensity: number('intensity', 1, 0, 3),
  };
}

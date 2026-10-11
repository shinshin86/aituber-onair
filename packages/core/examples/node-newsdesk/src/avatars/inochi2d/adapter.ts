import { homedir } from 'node:os';
import path from 'node:path';
import {
  baseConfig,
  configNumber,
  configObject,
  modelPath,
} from '../config.js';
import type { BrowserAvatarAdapter, Inochi2dAvatarConfig } from '../types.js';
import {
  DEFAULT_ASSET_ROOT,
  DEFAULT_FRAMING,
  DEFAULT_IDLE_ANIMATION,
} from './defaults.js';

function assetPath(
  value: unknown,
  configFile: string,
  fallback: string,
): string {
  return modelPath(
    typeof value === 'string' && value.startsWith('~/')
      ? path.join(homedir(), value.slice(2))
      : value,
    configFile,
    fallback,
  );
}

export function resolveConfig(
  raw: unknown,
  configFile: string,
): Inochi2dAvatarConfig {
  const value = configObject(raw, 'inochi2d', [
    'model',
    'runtime',
    'motion',
    'idleAnimation',
    'scale',
    'x',
    'y',
    'intensity',
    'framing',
  ]);
  const model = assetPath(
    value.model,
    configFile,
    `${DEFAULT_ASSET_ROOT}/models/Aka.original-rig.inx`,
  );
  if (!model.toLowerCase().endsWith('.inx'))
    throw new Error('Inochi2D model must point to an .inx file.');
  const motion =
    value.motion === null
      ? null
      : assetPath(
          value.motion,
          configFile,
          `${DEFAULT_ASSET_ROOT}/models/Aka.original.motion.json`,
        );
  if (motion && !motion.toLowerCase().endsWith('.json'))
    throw new Error('Inochi2D motion must point to a JSON file.');
  const idleAnimation =
    value.idleAnimation === undefined
      ? DEFAULT_IDLE_ANIMATION
      : value.idleAnimation;
  if (
    idleAnimation !== null &&
    (typeof idleAnimation !== 'string' || !idleAnimation.trim())
  )
    throw new Error(
      'Inochi2D idleAnimation must be a non-empty string or null.',
    );
  const framing = configObject(
    value.framing === undefined ? {} : value.framing,
    'inochi2d framing',
    ['scale', 'x', 'y'],
  );
  return {
    kind: 'inochi2d',
    ...baseConfig(value, { scale: 1, x: 0.5, y: 0.5 }),
    model,
    runtime: assetPath(
      value.runtime,
      configFile,
      `${DEFAULT_ASSET_ROOT}/runtime`,
    ),
    motion,
    idleAnimation,
    intensity: configNumber(value, 'intensity', 1, 0, 3),
    framing: {
      scale: configNumber(framing, 'scale', DEFAULT_FRAMING.scale, 0.05, 2),
      x: configNumber(framing, 'x', DEFAULT_FRAMING.x, -10000, 10000),
      y: configNumber(framing, 'y', DEFAULT_FRAMING.y, -10000, 10000),
    },
  };
}
export function createAdapter(): BrowserAvatarAdapter {
  return { kind: 'inochi2d', runtime: 'browser', resolveConfig };
}

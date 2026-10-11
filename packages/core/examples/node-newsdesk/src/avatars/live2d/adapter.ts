import { homedir } from 'node:os';
import path from 'node:path';
import { baseConfig, configNumber, configObject } from '../config.js';
import { resolveFrom } from '../../paths.js';
import type { BrowserAvatarAdapter, Live2dAvatarConfig } from '../types.js';
import {
  CUBISM_DOWNLOAD_URL,
  DEFAULT_FRAMING,
  DEFAULT_WARMUP_SECONDS,
} from './defaults.js';

function requiredPath(
  value: unknown,
  field: string,
  configFile: string,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    const guidance =
      field === 'cubismCore'
        ? `Provide your licensed Cubism SDK for Web Core/live2dcubismcore.min.js file (${CUBISM_DOWNLOAD_URL}). Cubism Core is not bundled or downloaded.`
        : 'Provide a licensed Cubism 4 .model3.json file and all referenced assets.';
    throw new Error(`Live2D avatar config requires ${field}. ${guidance}`);
  }
  const localPath = value.startsWith('~/')
    ? path.join(homedir(), value.slice(2))
    : value;
  return resolveFrom(configFile, localPath);
}

export function resolveConfig(
  raw: unknown,
  configFile: string,
): Live2dAvatarConfig {
  const value = configObject(raw, 'live2d', [
    'model',
    'cubismCore',
    'scale',
    'x',
    'y',
    'intensity',
    'framing',
    'idleMotionGroup',
    'warmupSeconds',
  ]);
  const cubismCore = requiredPath(value.cubismCore, 'cubismCore', configFile);
  const model = requiredPath(value.model, 'model', configFile);
  if (!model.toLowerCase().endsWith('.model3.json'))
    throw new Error('Live2D model must point to a .model3.json file.');
  const framing = configObject(
    value.framing === undefined ? {} : value.framing,
    'live2d framing',
    ['scale', 'x', 'y'],
  );
  const idleMotionGroup = value.idleMotionGroup ?? null;
  if (
    idleMotionGroup !== null &&
    (typeof idleMotionGroup !== 'string' || !idleMotionGroup.trim())
  )
    throw new Error(
      'Live2D idleMotionGroup must be a non-empty string or null.',
    );
  return {
    kind: 'live2d',
    ...baseConfig(value, { scale: 1, x: 0.5, y: 0.5 }),
    model,
    cubismCore,
    intensity: configNumber(value, 'intensity', 1, 0, 3),
    framing: {
      scale: configNumber(framing, 'scale', DEFAULT_FRAMING.scale, 0.1, 5),
      x: configNumber(framing, 'x', DEFAULT_FRAMING.x, 0, 1),
      y: configNumber(framing, 'y', DEFAULT_FRAMING.y, 0, 1),
    },
    idleMotionGroup,
    warmupSeconds: configNumber(
      value,
      'warmupSeconds',
      DEFAULT_WARMUP_SECONDS,
      0,
      30,
    ),
  };
}
export function createAdapter(): BrowserAvatarAdapter {
  return { kind: 'live2d', runtime: 'browser', resolveConfig };
}

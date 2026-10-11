import { homedir } from 'node:os';
import path from 'node:path';
import {
  baseConfig,
  configNumber,
  configObject,
  modelPath,
} from '../config.js';
import type {
  HybridAvatarAdapter,
  PsdAvatarConfig,
  PsdAvatarRoles,
} from '../types.js';

export function resolveConfig(
  raw: unknown,
  configFile: string,
): PsdAvatarConfig {
  const value = configObject(raw, 'psd', [
    'model',
    'mode',
    'roles',
    'scale',
    'x',
    'y',
    'intensity',
    'framing',
  ]);
  const mode = value.mode === undefined ? 'auto' : value.mode;
  if (mode !== 'auto' && mode !== 'static' && mode !== 'motion')
    throw new Error('PSD mode must be auto, static, or motion.');
  const model = modelPath(
    typeof value.model === 'string' && value.model.startsWith('~/')
      ? path.join(homedir(), value.model.slice(2))
      : value.model,
    configFile,
    'assets/sample-static.psd',
  );
  if (!model.toLowerCase().endsWith('.psd'))
    throw new Error(
      'PSD model must point to a .psd file (PSB is unsupported).',
    );
  const roleValues = configObject(
    value.roles === undefined ? {} : value.roles,
    'psd roles',
    ['mouthOpen', 'mouthClosed', 'eyesOpen', 'eyesClosed'],
  );
  const roles: PsdAvatarRoles = {};
  const framing = configObject(
    value.framing === undefined ? {} : value.framing,
    'psd motion framing',
    ['scale', 'x', 'y'],
  );
  for (const key of [
    'mouthOpen',
    'mouthClosed',
    'eyesOpen',
    'eyesClosed',
  ] as const) {
    const candidate = roleValues[key];
    if (candidate === undefined) continue;
    if (typeof candidate !== 'string' || !candidate.trim())
      throw new Error(`PSD roles.${key} must be a non-empty pixel-layer path.`);
    roles[key] = candidate;
  }
  return {
    kind: 'psd',
    ...baseConfig(value, { scale: 1, x: 0.5, y: 0.5 }),
    model,
    mode,
    roles,
    intensity: configNumber(value, 'intensity', 1, 0, 3),
    framing: {
      scale: configNumber(framing, 'scale', 2, 0.1, 3),
      x: configNumber(framing, 'x', 0.5, 0, 1),
      y: configNumber(framing, 'y', 0.8, 0, 1),
    },
  };
}
export function createAdapter(): HybridAvatarAdapter {
  return { kind: 'psd', runtime: 'hybrid', resolveConfig };
}

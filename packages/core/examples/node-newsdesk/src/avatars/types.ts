import type { Canvas } from '@napi-rs/canvas';
import type { LineEmotion } from '../types.js';

export const AVATAR_KINDS = [
  'pngtuber',
  'purupuru',
  'psd',
  'mesh',
  'vrm',
  'live2d',
  'inochi2d',
] as const;
export type AvatarKind = (typeof AVATAR_KINDS)[number];

/** Resolved adapter configuration. Paths are relative to the config file. */
export interface AvatarConfig {
  model: string;
  scale: number;
  x: number;
  y: number;
  intensity: number;
}

export interface AvatarPrepareInput {
  config: AvatarConfig;
  width: number;
  height: number;
  fps: number;
  duration: number;
  seed: number;
}

export interface AvatarFrameInput {
  frame: number;
  time: number;
  mouth: number;
  speaking: boolean;
  eyesClosed: boolean;
  emotion: LineEmotion;
  motion: { id: string; start: number } | null;
}

export interface AvatarAdapter<Layer> {
  readonly kind: AvatarKind;
  readonly runtime: 'node' | 'browser';
  prepare(input: AvatarPrepareInput): Promise<void>;
  render(input: AvatarFrameInput): Layer;
  dispose(): Promise<void>;
}

export type NodeAvatarAdapter = AvatarAdapter<Canvas> & { runtime: 'node' };

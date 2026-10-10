import type { Canvas } from '@napi-rs/canvas';
import type { AvatarAction } from '../screen/schedule.js';
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

/** Shared placement inside the screen avatar frame. */
export interface BaseAvatarConfig {
  scale: number;
  x: number;
  y: number;
}
export interface PngtuberAvatarConfig extends BaseAvatarConfig {
  kind: 'pngtuber';
  model: string;
  intensity: number;
}
export interface PurupuruAvatarConfig extends BaseAvatarConfig {
  kind: 'purupuru';
  model: string;
  intensity: number;
}
export interface MeshAvatarConfig extends BaseAvatarConfig {
  kind: 'mesh';
  model: string;
  padTop: number;
  padSide: number;
  talkGain: number;
}
export interface VrmAvatarConfig extends BaseAvatarConfig {
  kind: 'vrm';
  model: string;
  animation: string | null;
  intensity: number;
  framing: { visibleHeightRatio: number; lookAtHeightRatio: number };
  lighting: { ambientIntensity: number; directionalIntensity: number };
}
export interface Live2dAvatarConfig extends BaseAvatarConfig {
  kind: 'live2d';
  model: string;
  cubismCore: string;
  intensity: number;
  framing: { scale: number; x: number; y: number };
  idleMotionGroup: string | null;
  warmupSeconds: number;
}
export interface Inochi2dAvatarConfig extends BaseAvatarConfig {
  kind: 'inochi2d';
  model: string;
  runtime: string;
  motion: string | null;
  idleAnimation: string | null;
  intensity: number;
  framing: { scale: number; x: number; y: number };
}
export type BrowserAvatarConfig =
  | MeshAvatarConfig
  | VrmAvatarConfig
  | Live2dAvatarConfig
  | Inochi2dAvatarConfig;
export type NodeAvatarConfig = PngtuberAvatarConfig | PurupuruAvatarConfig;
export type AvatarConfig = NodeAvatarConfig | BrowserAvatarConfig;
export interface AvatarPrepareInput<
  Config extends AvatarConfig = AvatarConfig,
> {
  config: Config;
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
  cues: AvatarAction[];
  motion: { id: string; start: number } | null;
}

export interface AvatarAdapter<
  Layer,
  Config extends AvatarConfig = AvatarConfig,
> {
  readonly kind: AvatarKind;
  readonly runtime: 'node' | 'browser';
  prepare(input: AvatarPrepareInput<Config>): Promise<void>;
  render(input: AvatarFrameInput): Layer;
  dispose(): Promise<void>;
  describe?(): Record<string, unknown>;
}

export type NodeAvatarAdapter = AvatarAdapter<Canvas, NodeAvatarConfig> & {
  runtime: 'node';
  resolveConfig(raw: unknown, configFile: string): NodeAvatarConfig;
};
/** Browser renderer code is loaded in the harness, never evaluated in Node. */
export interface BrowserAvatarAdapter {
  readonly kind: BrowserAvatarConfig['kind'];
  readonly runtime: 'browser';
  resolveConfig(raw: unknown, configFile: string): BrowserAvatarConfig;
}
export type LoadedAvatar = NodeAvatarAdapter | BrowserAvatarAdapter;
export type BrowserAvatarRenderer = AvatarAdapter<
  HTMLCanvasElement | Promise<HTMLCanvasElement>,
  BrowserAvatarConfig
> & { runtime: 'browser' };

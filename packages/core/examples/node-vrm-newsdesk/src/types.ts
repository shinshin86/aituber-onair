/**
 * Shared types for the newsdesk video pipeline.
 *
 * A `NewsdeskScript` is the JSON document produced by `script-gen` and consumed
 * by `gen`. Paths inside a script are resolved relative to the script file.
 */

export type VoiceEngineName = 'sine' | 'say' | 'aituber-voice';

export interface ScriptVoice {
  engine: VoiceEngineName;
  options?: Record<string, unknown>;
}

export interface ScriptBackground {
  color?: string;
  /** Image path, relative to the script file. */
  image?: string;
}

export interface ScriptAvatarLayout {
  scale?: number;
  /** Horizontal anchor as a fraction of the canvas width (0..1). */
  x?: number;
  /** Vertical anchor as a fraction of the canvas height (0..1). */
  y?: number;
}

export interface ScriptAvatarFraming {
  /** Fraction of model height visible vertically; smaller values zoom in. */
  visibleHeightRatio?: number;
  /** Camera target height as a fraction of model height from the floor. */
  lookAtHeightRatio?: number;
}

export const DEFAULT_AVATAR_FRAMING = {
  visibleHeightRatio: 0.39,
  lookAtHeightRatio: 0.845,
} as const;

export interface ScriptAvatarLighting {
  /** Strength of the shadow-filling ambient light. */
  ambientIntensity?: number;
  /** Strength of the directional key light. */
  directionalIntensity?: number;
}

export const DEFAULT_AVATAR_LIGHTING = {
  ambientIntensity: 1.4,
  directionalIntensity: 2.35,
} as const;

export interface ScriptMotion {
  /** VRMA playback-rate multiplier clamped to 0..3. */
  intensity?: number;
}

export interface ScriptLine {
  /** Subtitle text; also the narration unless `reading` is set. */
  text: string;
  /** Narration text used for pronunciation control. */
  reading?: string;
  /** Topic label shown at the top of the screen from this line on. */
  chapter?: string;
  /** Set to false for a silent subtitle. */
  spoken?: boolean;
  /** Required when `spoken` is false. */
  duration?: number;
  /** Silence after this line, in seconds. */
  pauseAfter?: number;
}

export interface NewsdeskScript {
  /** VRM avatar file, relative to the script file. */
  avatar?: string;
  /** Optional VRMA animation file, relative to the script file. */
  avatarAnimation?: string;
  /** MP4 path, relative to the script file. `--output` takes precedence. */
  output?: string;
  voice?: ScriptVoice;
  leadIn?: number;
  leadOut?: number;
  defaultPauseAfter?: number;
  background?: ScriptBackground;
  /** Fixed title used only while no line `chapter` is active. */
  telop?: string;
  avatarLayout?: ScriptAvatarLayout;
  avatarFraming?: ScriptAvatarFraming;
  avatarLighting?: ScriptAvatarLighting;
  motion?: ScriptMotion;
  blinkSeed?: number;
  lines: ScriptLine[];
}

export interface TimedText {
  text: string;
  start: number;
  end: number;
}

/**
 * Fully resolved render configuration written beside the output as
 * `<name>.vrm-gen.config.json`. `--render-only` re-reads it.
 */
export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  background: { color: string; image?: string };
  avatarLayout: { scale: number; x: number; y: number };
  avatarFraming: {
    visibleHeightRatio: number;
    lookAtHeightRatio: number;
  };
  avatarLighting: {
    ambientIntensity: number;
    directionalIntensity: number;
  };
  motion: { intensity: number };
  blinkSeed: number;
  /** Absolute VRM avatar file. */
  avatar: string;
  /** Absolute optional VRMA animation file. */
  avatarAnimation?: string;
  /** Absolute path of the combined narration WAV. */
  audio: string;
  /** Absolute MP4 output path. */
  output: string;
  telop: string;
  subtitles: TimedText[];
  chapters: TimedText[];
  duration: number;
}

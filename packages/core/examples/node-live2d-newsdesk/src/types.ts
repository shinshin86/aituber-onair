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
  /** Multiplier applied after fitting the Live2D model to the canvas width. */
  scale?: number;
  /** Horizontal model anchor as a fraction of the harness width. */
  x?: number;
  /** Vertical model anchor as a fraction of the harness height. */
  y?: number;
}

export const DEFAULT_AVATAR_FRAMING = {
  scale: 2.5,
  x: 0.5,
  y: 0.4,
} as const;

export const DEFAULT_AVATAR_WARMUP_SECONDS = 3;
export const MAX_AVATAR_WARMUP_SECONDS = 30;

export interface ScriptAvatarMotion {
  /** Live2D motion group whose first entry is used as deterministic idle. */
  idle?: string;
}

export interface ScriptMotion {
  /** Live2D update-rate multiplier clamped to 0..3. */
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
  /** Cubism 4 model3.json file, relative to the script file or `~/...`. */
  avatar: string;
  /** Cubism Core JavaScript file, using the same path rules as `avatar`. */
  cubismCore: string;
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
  avatarMotion?: ScriptAvatarMotion;
  /** Uncaptured fixed-step settle time before video frame zero. */
  avatarWarmupSeconds?: number;
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
 * `<name>.live2d-gen.config.json`. `--render-only` re-reads it.
 */
export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  background: { color: string; image?: string };
  avatarLayout: { scale: number; x: number; y: number };
  avatarFraming: {
    scale: number;
    x: number;
    y: number;
  };
  avatarMotion: { idle: string | null };
  avatarWarmupSeconds: number;
  motion: { intensity: number };
  blinkSeed: number;
  /** Absolute Cubism 4 model3.json file. */
  avatar: string;
  /** Absolute Cubism Core JavaScript file. */
  cubismCore: string;
  /** Absolute path of the combined narration WAV. */
  audio: string;
  /** Absolute MP4 output path. */
  output: string;
  telop: string;
  subtitles: TimedText[];
  chapters: TimedText[];
  duration: number;
}

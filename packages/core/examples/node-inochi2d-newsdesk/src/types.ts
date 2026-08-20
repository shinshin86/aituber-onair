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
  /** Inochi2D camera scale in model space. */
  scale?: number;
  /** Horizontal Inochi2D camera offset in model-space pixels. */
  x?: number;
  /** Vertical Inochi2D camera offset in model-space pixels. */
  y?: number;
}

export const DEFAULT_AVATAR_FRAMING = {
  scale: 0.65,
  x: 0,
  y: 1450,
} as const;

export const DEFAULT_IDLE_ANIMATION = 'original_idle_calm_breath';

export interface ScriptMotion {
  /** Weight applied to the looping Inochi2D idle animation, clamped to 0..3. */
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
  /** Inochi2D .inx file, relative to the script file or `~/...`. */
  avatar: string;
  /** Optional Inochi2D motion JSON, using the same path rules as `avatar`. */
  avatarMotion?: string;
  /** Directory containing the unmodified Inochi2D Web runtime bridge. */
  inochi2dRuntime: string;
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
 * `<name>.inochi2d-gen.config.json`. `--render-only` re-reads it.
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
  /** Absolute optional motion JSON path. */
  avatarMotion: string | null;
  /** Absolute directory containing the Inochi2D Web runtime bridge. */
  inochi2dRuntime: string;
  motion: { intensity: number };
  blinkSeed: number;
  /** Absolute Inochi2D .inx model file. */
  avatar: string;
  /** Absolute path of the combined narration WAV. */
  audio: string;
  /** Absolute MP4 output path. */
  output: string;
  telop: string;
  subtitles: TimedText[];
  chapters: TimedText[];
  duration: number;
}

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

export interface ScriptMotion {
  /** Motion multiplier clamped to 0..3. */
  intensity?: number;
}

export interface ScriptAvatarRoles {
  /** Exact PSD pixel-layer path used while the mouth is open. */
  mouthOpen?: string;
  /** Exact PSD pixel-layer path used while the mouth is closed. */
  mouthClosed?: string;
  /** Exact PSD pixel-layer path used while the eyes are open. */
  eyesOpen?: string;
  /** Exact PSD pixel-layer path used while the eyes are closed. */
  eyesClosed?: string;
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
  /** PSD avatar path, relative to the script file. */
  avatar?: string;
  /** Optional exact layer paths that override automatic role detection. */
  avatarRoles?: ScriptAvatarRoles;
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
 * `<name>.psd-gen.config.json`. `--render-only` re-reads it.
 */
export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  background: { color: string; image?: string };
  avatarLayout: { scale: number; x: number; y: number };
  motion: { intensity: number };
  blinkSeed: number;
  /** Absolute PSD avatar path. */
  avatar: string;
  avatarRoles?: ScriptAvatarRoles;
  /** Absolute path of the combined narration WAV. */
  audio: string;
  /** Absolute MP4 output path. */
  output: string;
  telop: string;
  subtitles: TimedText[];
  chapters: TimedText[];
  duration: number;
}

/**
 * Shared types for the mesh-avatar newsdesk video pipeline.
 *
 * A `NewsdeskScript` is the JSON document produced by `script-gen` and consumed
 * by `gen`. Paths inside a script are resolved relative to the script file.
 */

export type VoiceEngineName = 'sine' | 'say' | 'aituber-voice';

/** AITuber OnAir emotion tags. They pick the face, the motion and the screen effect. */
export type LineEmotion =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'relaxed';

export const LINE_EMOTIONS: readonly LineEmotion[] = [
  'neutral',
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
];

export interface ScriptVoice {
  engine: VoiceEngineName;
  options?: Record<string, unknown>;
}

export interface ScriptShow {
  /** Program name in the header. */
  title?: string;
  /** Small label under the title (e.g. the source name). */
  subtitle?: string;
  /** Time shown in the header clock ("HH:MM"). Defaults to 10:00. */
  clock?: string;
}

export interface ScriptLine {
  /** Subtitle text; also the narration unless `reading` is set. */
  text: string;
  /** Narration text used for pronunciation control. */
  reading?: string;
  /** Topic headline shown in the news panel from this line on. */
  chapter?: string;
  /** Short bullet added to the news panel when this line starts. */
  point?: string;
  /** Words or numbers popped up beside the avatar. Auto-detected when omitted. */
  keywords?: string[];
  /** Face, motion and screen effect for this line. Defaults to `neutral`. */
  emotion?: LineEmotion;
  /** Set to false for a silent subtitle. */
  spoken?: boolean;
  /** Required when `spoken` is false. */
  duration?: number;
  /** Silence after this line, in seconds. */
  pauseAfter?: number;
}

export interface NewsdeskScript {
  /**
   * Mesh avatar folder (layers.json + layer PNGs), relative to the script file.
   * Defaults to the avatar bundled with `react-mesh-avatar-app`.
   */
  avatar?: string;
  /** MP4 path, relative to the script file. `--output` takes precedence. */
  output?: string;
  voice?: ScriptVoice;
  leadIn?: number;
  leadOut?: number;
  defaultPauseAfter?: number;
  show?: ScriptShow;
  /** Seed for the avatar's random choices (idle picks, blinks, effects). */
  seed?: number;
  lines: ScriptLine[];
}

export interface TimedText {
  text: string;
  start: number;
  end: number;
}

/** One line on the render timeline (seconds). */
export interface TimedLine {
  index: number;
  text: string;
  chapter: string | null;
  point: string | null;
  keywords: string[];
  emotion: LineEmotion;
  spoken: boolean;
  /** Narration start / end. */
  start: number;
  end: number;
}

/**
 * Fully resolved render configuration written beside the output as
 * `<name>.mesh-gen.config.json`. `--render-only` re-reads it.
 */
export interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  /** Absolute mesh avatar folder. */
  avatar: string;
  show: Required<ScriptShow>;
  seed: number;
  /** Absolute path of the combined narration WAV. */
  audio: string;
  /** Absolute MP4 output path. */
  output: string;
  lines: TimedLine[];
  duration: number;
}

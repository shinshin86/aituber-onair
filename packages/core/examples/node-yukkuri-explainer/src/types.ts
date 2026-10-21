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
  engine: 'sine' | 'aituber-voice';
  /** Passed to the sine engine or Core's VoiceServiceOptions. */
  options?: Record<string, unknown>;
}

export const AVATAR_STATES = [
  'mouth_close_eyes_open',
  'mouth_open_eyes_open',
  'mouth_close_eyes_close',
  'mouth_open_eyes_close',
] as const;

export type AvatarState = (typeof AVATAR_STATES)[number];
export type AvatarImages = string | Record<AvatarState, string>;

export interface PerformanceOptions {
  mouthMode?: 'flap' | 'rms';
  /** Duration of each open/closed state in seconds. */
  flapInterval?: number;
  /** Normalized RMS gate used in both mouth modes. */
  mouthThreshold?: number;
  motion?: 'bounce' | 'subtle' | 'none';
}

export interface ScriptSpeaker extends PerformanceOptions {
  name: string;
  /** Relative to the JSON script. */
  image: AvatarImages;
  voice: ScriptVoice;
  position: 'left' | 'right';
  subtitleColor: string;
  mirror?: boolean;
}

export interface ScriptShow {
  title?: string;
  subtitle?: string;
}

export type ScriptSlide = { text: string } | { image: string };

export interface ScriptLine {
  speaker: string;
  text: string;
  reading?: string;
  chapter?: string;
  point?: string;
  keywords?: string[];
  /** Controls the strength of the speaking bounce. */
  emotion?: LineEmotion;
  slide?: ScriptSlide;
  spoken?: boolean;
  /** Required for a silent line, in seconds. */
  duration?: number;
  pauseAfter?: number;
}

export interface ExplainerScript extends PerformanceOptions {
  output?: string;
  speakers: Record<string, ScriptSpeaker>;
  show?: ScriptShow;
  seed?: number;
  leadIn?: number;
  leadOut?: number;
  defaultPauseAfter?: number;
  lines: ScriptLine[];
}

export interface TimedLine extends ScriptLine {
  index: number;
  spoken: boolean;
  start: number;
  end: number;
}

export interface RenderConfig extends PerformanceOptions {
  width: number;
  height: number;
  fps: number;
  speakers: Record<string, ScriptSpeaker>;
  show: Required<ScriptShow>;
  seed: number;
  audio: string;
  output: string;
  lines: TimedLine[];
  duration: number;
}

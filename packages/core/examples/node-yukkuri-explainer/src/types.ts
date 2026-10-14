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

export interface ScriptSpeaker {
  name: string;
  /** Relative to the JSON script. */
  image: string;
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

export interface ExplainerScript {
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

export interface RenderConfig {
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

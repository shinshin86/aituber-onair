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
  flapInterval?: number;
  mouthThreshold?: number;
  motion?: 'bounce' | 'subtle' | 'none';
}
export interface ScriptSpeaker extends PerformanceOptions {
  name: string;
  image: AvatarImages;
  mirror?: boolean;
  textColor?: string;
  voice: {
    engine: 'sine' | 'aituber-voice';
    options?: Record<string, unknown>;
  };
}
export type Time = number | string;
export interface ScriptLine {
  id?: string;
  speaker: string;
  text: string;
  reading?: string;
  at?: Time;
  spoken?: boolean;
  duration?: number;
  pauseAfter?: number;
  emotion?: 'neutral' | 'happy' | 'surprised' | 'sad' | 'angry' | 'relaxed';
}
export interface MainClip {
  at: Time;
  until?: Time;
  video?: string;
  image?: string;
  color?: string;
  from?: number;
  to?: number;
  speed?: number;
  audio?: boolean;
  speedBadge?: boolean;
  fit?: 'contain' | 'cover';
}
export interface Panel {
  at: Time;
  box: 'top' | 'main' | 'bottom';
  text?: string;
  items?: { text: string; color?: 'yellow' | 'white' }[];
  image?: string;
  clear?: true;
}
export interface Timer {
  start: Time;
  stop?: Time;
  offset?: number;
  format?: 'H:MM:SS.cc';
  position?: 'main-bottom-right' | 'right-bottom';
}
export interface BiimScript extends PerformanceOptions {
  $schema?: string;
  canvas?: '16:9' | '4:3';
  fps?: number;
  seed?: number;
  output?: string;
  speakers: Record<string, ScriptSpeaker>;
  defaults?: { pauseAfter?: number; mainAudioVolume?: number };
  lines: ScriptLine[];
  main?: MainClip[];
  panels?: Panel[];
  timer?: Timer;
  counter?: { label: string; events: { at: Time; value: number }[] };
}
export interface TimedLine extends ScriptLine {
  index: number;
  spoken: boolean;
  start: number;
  end: number;
  pages: { start: number; end: number; rows: string[] }[];
}
export type TimedMain = MainClip & {
  start: number;
  end: number;
  index: number;
  playbackEnd?: number;
};
export type TimedPanel = Panel & { start: number; end: number };
export interface Timeline {
  estimated: boolean;
  width: number;
  height: number;
  fps: number;
  duration: number;
  lines: TimedLine[];
  main: TimedMain[];
  panels: TimedPanel[];
  timer?: Timer & { start: number; stop: number };
  counter?: {
    label: string;
    events: { at: number; end: number; value: number }[];
  };
}
export interface RenderConfig extends PerformanceOptions, Timeline {
  speakers: Record<string, ScriptSpeaker>;
  seed: number;
  audio: string;
  output: string;
}

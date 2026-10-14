import type { RenderConfig, TimedLine } from '../types.js';
import type { DecodedAudio } from './audio.js';
import {
  advanceBouncyAvatarMotion,
  createBouncyAvatarMotionState,
} from './bounce.js';

export function activeLine(
  lines: TimedLine[],
  time: number,
): TimedLine | undefined {
  return lines.find((line) => time >= line.start && time < line.end);
}

export interface CharacterPose {
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  level: number;
  speaking: boolean;
}

/** Precompute at a fixed clock so seeking and fresh runs produce identical poses. */
export function buildMotion(
  config: RenderConfig,
  audio: DecodedAudio,
): Record<string, CharacterPose[]> {
  const result: Record<string, CharacterPose[]> = {};
  const totalFrames = Math.ceil(config.duration * config.fps);
  for (const [id] of Object.entries(config.speakers)) {
    const state = createBouncyAvatarMotionState();
    const phase =
      (Array.from(id).reduce(
        (n, c) => (n * 31 + (c.codePointAt(0) ?? 0)) >>> 0,
        config.seed >>> 0,
      ) %
        6283) /
      1000;
    state.direction = Math.sin(phase) > 0 ? 1 : -1;
    let smoothed = 0;
    const frames: CharacterPose[] = [];
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / config.fps;
      const line = activeLine(config.lines, time);
      const speaking = line?.speaker === id && line.spoken;
      let sum = 0;
      let count = 0;
      if (speaking && line) {
        // Clip to this line so adjacent speakers never share an RMS window.
        const start = Math.max(
          Math.floor(time * audio.sampleRate),
          Math.ceil(line.start * audio.sampleRate),
        );
        const end = Math.min(
          audio.samples.length,
          Math.floor(
            Math.min(time + 1 / config.fps, line.end) * audio.sampleRate,
          ),
        );
        for (let i = start; i < end; i++) {
          sum += audio.samples[i] ** 2;
          count++;
        }
      }
      const rms = Math.sqrt(sum / Math.max(1, count));
      smoothed = smoothed * 0.5 + rms * 0.5;
      const level = Math.min(smoothed / 0.12, 1);
      const emotion = line?.emotion;
      const energy =
        emotion === 'happy' || emotion === 'surprised'
          ? 1.1
          : emotion === 'sad' || emotion === 'relaxed'
            ? 0.8
            : 1;
      const pose = advanceBouncyAvatarMotion(
        state,
        level * energy,
        Boolean(speaking),
        time * 1000,
        frame === 0 ? 0 : 1 / config.fps,
      );
      const breath = Math.sin(time * 1.8 + phase);
      frames.push({
        ...pose,
        y: pose.y + breath * 2,
        scaleY: pose.scaleY + breath * 0.006,
        level,
        speaking: Boolean(speaking),
      });
    }
    result[id] = frames;
  }
  return result;
}

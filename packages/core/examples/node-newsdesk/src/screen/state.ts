import type { RenderConfig } from '../types.js';
import type { AvatarFrameInput } from '../avatars/types.js';
import type { Timeline } from './schedule.js';
import type { SceneState } from './scene.js';

/** Resolve generic cues directly from time; seeking does not replay actions. */
export function resolveFrameState(
  config: RenderConfig,
  timeline: Timeline,
  frame: number,
  mouth: number,
  eyesClosed: boolean,
  mouthHistory?: readonly number[],
): { scene: SceneState; avatar: AvatarFrameInput } {
  const time = frame / config.fps;
  const current =
    config.lines.find((line) => time >= line.start && time < line.end) ?? null;
  const lastLine =
    [...config.lines].reverse().find((line) => line.start <= time) ?? null;
  const line = current?.spoken ? current : null;
  let emotion: SceneState['emotion'] = 'neutral';
  let emotionStart = 0;
  let motion: AvatarFrameInput['motion'] = null;
  for (const scheduled of timeline.actions) {
    if (scheduled.time > time) break;
    if (scheduled.action.type === 'emotion') {
      if (scheduled.action.tag !== emotion)
        emotionStart = Math.ceil(scheduled.time * config.fps) / config.fps;
      emotion = scheduled.action.tag;
    } else motion = { id: scheduled.action.id, start: scheduled.time };
  }
  return {
    scene: {
      time,
      mouth: line ? mouth : 0,
      line,
      lastLine,
      chapter:
        timeline.chapters.find((c) => time >= c.start && time < c.end) ?? null,
      emotion,
      emotionStart: line ? emotionStart : (lastLine?.end ?? 0),
      mouthHistory,
    },
    avatar: {
      frame,
      time,
      mouth: line ? mouth : 0,
      speaking: Boolean(line),
      eyesClosed,
      emotion,
      motion,
      cues: timeline.actions
        .filter(
          (cue) =>
            cue.time <= time &&
            (frame === 0 || cue.time > (frame - 1) / config.fps),
        )
        .map((cue) => cue.action),
    },
  };
}

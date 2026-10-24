import type { Timeline } from '../types.js';

/** Pure clock-based effects: seeks and fresh renderer instances are identical. */
export function effectPose(
  effects: Timeline['effects'],
  speaker: string,
  time: number,
) {
  let grayscale = false;
  let x = 0;
  let y = 0;
  for (const effect of effects ?? []) {
    if (effect.speaker !== speaker || time < effect.start || time >= effect.end)
      continue;
    if (effect.effect === 'grayscale') grayscale = true;
    else {
      const elapsed = time - effect.start;
      const envelope = 1 - elapsed / (effect.end - effect.start);
      const amplitude = (effect.amplitude ?? 8) * envelope;
      x += Math.cos(elapsed * 97) * amplitude;
      y += Math.sin(elapsed * 131) * amplitude * 0.55;
    }
  }
  return {
    grayscale,
    x: Math.max(-40, Math.min(40, x)),
    y: Math.max(-40, Math.min(40, y)),
  };
}

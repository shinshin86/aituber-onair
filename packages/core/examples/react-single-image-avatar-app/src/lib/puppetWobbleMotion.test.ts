import { describe, expect, it } from 'vitest';
import {
  advancePuppetWobbleMotion,
  createPuppetWobbleMotionState,
} from './puppetWobbleMotion';

describe('puppetWobbleMotion', () => {
  it('stays still before speech starts', () => {
    const state = createPuppetWobbleMotionState();

    const frame = advancePuppetWobbleMotion(state, 0, false, 1 / 60);

    expect(frame).toEqual({
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
  });

  it('adds a quick, visible wobble while speaking', () => {
    const state = createPuppetWobbleMotionState();
    let minY = 0;
    let minRotation = 0;
    let maxRotation = 0;

    for (let frameIndex = 0; frameIndex < 180; frameIndex += 1) {
      const frame = advancePuppetWobbleMotion(state, 0.75, true, 1 / 60);
      minY = Math.min(minY, frame.y);
      minRotation = Math.min(minRotation, frame.rotation);
      maxRotation = Math.max(maxRotation, frame.rotation);
    }

    expect(minY).toBeLessThan(-4);
    expect(minY).toBeGreaterThanOrEqual(-15);
    expect(minRotation).toBeLessThan(-0.04);
    expect(maxRotation).toBeGreaterThan(0.04);
  });

  it('returns close to rest after speech stops', () => {
    const state = createPuppetWobbleMotionState();

    for (let frameIndex = 0; frameIndex < 90; frameIndex += 1) {
      advancePuppetWobbleMotion(state, 0.8, true, 1 / 60);
    }
    let frame = advancePuppetWobbleMotion(state, 0, false, 1 / 60);
    for (let frameIndex = 0; frameIndex < 240; frameIndex += 1) {
      frame = advancePuppetWobbleMotion(state, 0, false, 1 / 60);
    }

    expect(Math.abs(frame.y)).toBeLessThan(0.01);
    expect(Math.abs(frame.rotation)).toBeLessThan(0.001);
    expect(frame.scaleX).toBe(1);
    expect(frame.scaleY).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  advanceBouncyAvatarMotion,
  createBouncyAvatarMotionState,
  getMotionPreviewLevel,
} from './bouncyAvatarMotion';

describe('bouncy avatar motion', () => {
  it('turns a voice peak into an upward impulse', () => {
    const state = createBouncyAvatarMotionState();
    const frame = advanceBouncyAvatarMotion(state, 0.8, true, 100, 1 / 60);

    expect(frame.impulseTriggered).toBe(true);
    expect(frame.y).toBeLessThan(0);
    expect(state.velocityY).toBeLessThan(0);
  });

  it('alternates the tilt direction between voice impulses', () => {
    const state = createBouncyAvatarMotionState();
    advanceBouncyAvatarMotion(state, 0.8, true, 100, 1 / 60);
    const firstDirection = Math.sign(state.angularVelocity);

    state.y = 0;
    state.velocityY = 0;
    state.previousVoiceLevel = 0;
    const second = advanceBouncyAvatarMotion(state, 0.8, true, 400, 1 / 60);

    expect(second.impulseTriggered).toBe(true);
    expect(Math.sign(state.angularVelocity)).toBe(-firstDirection);
  });

  it('squashes on landing and settles while silent', () => {
    const state = createBouncyAvatarMotionState();
    state.y = -1;
    state.velocityY = 260;
    const landing = advanceBouncyAvatarMotion(state, 0, false, 100, 1 / 60);

    expect(landing.y).toBe(0);
    expect(landing.scaleX).toBeGreaterThan(1);
    expect(landing.scaleY).toBeLessThan(1);

    let frame = landing;
    for (let index = 0; index < 180; index += 1) {
      frame = advanceBouncyAvatarMotion(
        state,
        0,
        false,
        116 + index * 16,
        1 / 60,
      );
    }

    expect(frame.y).toBe(0);
    expect(frame.rotation).toBeCloseTo(0, 3);
    expect(frame.scaleX).toBeCloseTo(1, 3);
    expect(frame.scaleY).toBeCloseTo(1, 3);
  });

  it('provides a finite silent preview sequence', () => {
    expect(getMotionPreviewLevel(90)).toBeGreaterThan(0.5);
    expect(getMotionPreviewLevel(250)).toBeLessThan(0.1);
    expect(getMotionPreviewLevel(3300)).toBe(0);
  });
});

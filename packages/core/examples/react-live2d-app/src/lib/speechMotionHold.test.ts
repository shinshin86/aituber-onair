import { describe, expect, it, vi } from 'vitest';
import {
  holdIdleMotion,
  loopSpeechMotion,
  type SpeechMotionManager,
} from './speechMotionHold';

describe('speech motion hold', () => {
  it('pauses the model idle group and restores it after speech', () => {
    const manager = {
      groups: { idle: 'CustomIdle' },
      motionGroups: {},
      queueManager: { _motions: [] },
    };
    const restore = holdIdleMotion(manager);

    expect(manager.groups.idle).not.toBe('CustomIdle');
    restore();
    expect(manager.groups.idle).toBe('CustomIdle');
  });

  it('repeats the selected middle section without restarting playback or audio', () => {
    let isLoop = false;
    let isLoopFadeIn = true;
    let startTime = 0;
    let endTime = 5;
    let beforeUpdate: (() => void) | undefined;
    const motion = {
      isLoop: () => isLoop,
      setIsLoop: vi.fn((value: boolean) => {
        isLoop = value;
      }),
      isLoopFadeIn: () => isLoopFadeIn,
      setIsLoopFadeIn: vi.fn((value: boolean) => {
        isLoopFadeIn = value;
      }),
      getLoopDuration: () => 5,
    };
    const entry = {
      _motion: motion,
      isStarted: () => true,
      getStartTime: () => startTime,
      setStartTime: vi.fn((value: number) => {
        startTime = value;
      }),
      setEndTime: vi.fn((value: number) => {
        endTime = value;
      }),
    };
    const manager: SpeechMotionManager = {
      groups: { idle: 'Idle' },
      motionGroups: { Sad: [motion] },
      queueManager: { _motions: [entry] },
    };
    const model = {
      elapsedTime: 0,
      internalModel: {
        on: vi.fn((_event: string, listener: () => void) => {
          beforeUpdate = listener;
        }),
        off: vi.fn(() => {
          beforeUpdate = undefined;
        }),
      },
    };

    const restore = loopSpeechMotion(manager, model, {
      group: 'Sad',
      index: 0,
      speechLoopStartPercent: 40,
      speechLoopEndPercent: 70,
    });
    expect(isLoop).toBe(true);
    expect(isLoopFadeIn).toBe(false);
    model.elapsedTime = 3500;
    beforeUpdate?.();
    expect(startTime).toBe(1.5);
    expect(endTime).toBe(-1);
    expect(entry.setStartTime).toHaveBeenCalledTimes(1);

    restore?.();
    expect(isLoop).toBe(false);
    expect(isLoopFadeIn).toBe(true);
    expect(endTime).toBe(6.5);
    expect(beforeUpdate).toBeUndefined();
    expect(
      loopSpeechMotion(manager, model, { group: 'Missing', index: 0 }),
    ).toBeNull();
  });
});

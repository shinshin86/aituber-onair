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

  it('loops the entire selected motion without restarting playback or audio', () => {
    let isLoop = false;
    let startTime = 0;
    let endTime = 5;
    let beforeUpdate: (() => void) | undefined;
    const motion = {
      isLoop: () => isLoop,
      setIsLoop: vi.fn((value: boolean) => {
        isLoop = value;
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
      internalModel: {
        on: vi.fn((_event: string, listener: () => void) => {
          beforeUpdate = listener;
        }),
        off: vi.fn(() => {
          beforeUpdate = undefined;
        }),
      },
    };

    const restore = loopSpeechMotion(manager, model, 'Sad', 0);
    expect(isLoop).toBe(true);
    beforeUpdate?.();
    expect(endTime).toBe(-1);
    expect(entry.setStartTime).not.toHaveBeenCalled();

    // The SDK advances its own start time at the end of the full motion.
    startTime = 5;
    beforeUpdate?.();
    expect(entry.setStartTime).not.toHaveBeenCalled();

    restore?.();
    expect(isLoop).toBe(false);
    expect(endTime).toBe(10);
    expect(beforeUpdate).toBeUndefined();
    expect(loopSpeechMotion(manager, model, 'Missing', 0)).toBeNull();
  });
});

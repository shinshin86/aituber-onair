import { describe, expect, it } from 'vitest';
import {
  getSpeechLoopRange,
  getAssignedLive2DMotion,
  listLive2DMotions,
  normalizeLive2DModelMotionMaps,
} from './live2dMotions';

describe('Live2D emotion motions', () => {
  const motions = listLive2DMotions({
    Idle: [{ File: 'idle.motion3.json' }],
    Tap: [{ File: 'smile.motion3.json' }, { File: 'wave.motion3.json' }],
  });

  it('keeps model motion group and index from the model definition', () => {
    expect(motions).toEqual([
      { group: 'Idle', index: 0, file: 'idle.motion3.json' },
      { group: 'Tap', index: 0, file: 'smile.motion3.json' },
      { group: 'Tap', index: 1, file: 'wave.motion3.json' },
    ]);
  });

  it('accepts valid saved assignments and ignores missing motions', () => {
    const maps = normalizeLive2DModelMotionMaps({
      'model.model3.json': {
        happy: { group: 'Tap', index: 1 },
        sad: { group: 'Missing', index: 0 },
        angry: { group: 'Tap', index: -1 },
      },
    });
    expect(
      getAssignedLive2DMotion(maps, 'model.model3.json', ' HAPPY ', motions),
    ).toEqual({ group: 'Tap', index: 1 });
    expect(
      getAssignedLive2DMotion(maps, 'model.model3.json', 'sad', motions),
    ).toBeNull();
    expect(
      getAssignedLive2DMotion(maps, 'other.model3.json', 'happy', motions),
    ).toBeNull();
    expect(maps['model.model3.json'].angry).toBeUndefined();
  });

  it('keeps valid speech loop ranges and rejects invalid saved ranges', () => {
    const maps = normalizeLive2DModelMotionMaps({
      'model.model3.json': {
        sad: {
          group: 'Tap',
          index: 0,
          speechLoopStartPercent: 25,
          speechLoopEndPercent: 80,
        },
        happy: {
          group: 'Tap',
          index: 1,
          speechLoopStartPercent: 90,
          speechLoopEndPercent: 20,
        },
      },
    });
    expect(getSpeechLoopRange(maps['model.model3.json'].sad!)).toEqual({
      startPercent: 25,
      endPercent: 80,
    });
    expect(maps['model.model3.json'].happy).toEqual({
      group: 'Tap',
      index: 1,
    });
    expect(getSpeechLoopRange(maps['model.model3.json'].happy!)).toEqual({
      startPercent: 40,
      endPercent: 70,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  getSelectedLive2DIdleMotions,
  normalizeLive2DModelIdleMotionMaps,
} from './live2dIdleMotions';
import { listLive2DMotions } from './live2dMotions';
import {
  configureLive2DIdleMotions,
  type Live2DModelJson,
} from './live2dModel';

describe('Live2D idle motion selection', () => {
  it('uses all model Idle motions until the user chooses an override', () => {
    const motions = listLive2DMotions({
      Idle: [{ File: 'idle-1.motion3.json' }, { File: 'idle-2.motion3.json' }],
      Action: [{ File: 'wave.motion3.json' }],
    });

    expect(
      getSelectedLive2DIdleMotions({}, 'hiyori.model3.json', motions),
    ).toEqual([
      { group: 'Idle', index: 0 },
      { group: 'Idle', index: 1 },
    ]);
    expect(
      getSelectedLive2DIdleMotions(
        { 'hiyori.model3.json': [] },
        'hiyori.model3.json',
        motions,
      ),
    ).toEqual([]);
  });

  it('accepts a saved motion from an unnamed group and ignores stale entries', () => {
    const motions = listLive2DMotions({
      '': [
        { File: 'haru-idle.motion3.json' },
        { File: 'haru-wave.motion3.json' },
      ],
    });
    const maps = normalizeLive2DModelIdleMotionMaps({
      'haru.model3.json': [
        { group: '', index: 0 },
        { group: '', index: 0 },
        { group: '', index: 99 },
        { group: '', index: -1 },
      ],
    });

    expect(
      getSelectedLive2DIdleMotions(maps, 'haru.model3.json', motions),
    ).toEqual([{ group: '', index: 0 }]);
  });

  it('builds a runtime-only idle group from selected motion definitions', () => {
    const original: Live2DModelJson = {
      FileReferences: {
        Motions: {
          '': [
            { File: 'haru-idle.motion3.json' },
            { File: 'haru-wave.motion3.json' },
          ],
          Action: [{ File: 'haru-sad.motion3.json' }],
        },
      },
    };

    const { modelJson, idleMotionGroup } = configureLive2DIdleMotions(
      original,
      [{ group: '', index: 0 }],
    );

    expect(modelJson.FileReferences?.Motions?.[idleMotionGroup]).toEqual([
      { File: 'haru-idle.motion3.json' },
    ]);
    expect(modelJson.FileReferences?.Motions?.['']).toHaveLength(2);
    expect(original.FileReferences?.Motions?.[idleMotionGroup]).toBeUndefined();
  });
});

import { createMouthValues } from '../src/gen/audio.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import {
  createHairSpringState,
  updateHairSpring,
} from '../src/gen/hairSpring.js';
import { resolveMouthState } from '../src/gen/renderer.js';

describe('deterministic animation helpers', () => {
  it('creates the same blink schedule for the same seed', () => {
    const first = createBlinkSchedule(300, 30, 42);
    const second = createBlinkSchedule(300, 30, 42);
    const different = createBlinkSchedule(300, 30, 43);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
    expect(first.includes(1)).toBe(true);
  });

  it('keeps RMS mouth values normalized and maps their states', () => {
    const empty = createMouthValues(
      { samples: new Float32Array(), sampleRate: 48_000 },
      30,
      2,
    );
    const loud = createMouthValues(
      { samples: new Float32Array(3_200).fill(1), sampleRate: 48_000 },
      30,
      2,
    );

    expect([...empty]).toEqual([0, 0]);
    expect([...loud].every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(resolveMouthState(0.21)).toBe('closed');
    expect(resolveMouthState(0.22)).toBe('half');
    expect(resolveMouthState(0.78)).toBe('open');
  });

  it('keeps the hair spring finite at boundary inputs', () => {
    const state = createHairSpringState();
    const output = updateHairSpring(state, {
      deltaSeconds: 10,
      hairSpring: 100,
      poseVelocityX: Number.POSITIVE_INFINITY,
      poseVelocityY: Number.NEGATIVE_INFINITY,
      poseRotationVelocity: Number.NaN,
      layerResponse: 10,
    });

    expect(Object.values(output).every(Number.isFinite)).toBe(true);
  });
});

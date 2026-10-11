import path from 'node:path';
import { resolveConfig } from '../src/avatars/mesh/adapter.js';
import { createMouthValues } from '../src/avatars/mesh/mouth.js';
import { resolveLocalAssetPath } from '../src/gen/compositor/browser.js';

it('keeps Mesh options distinct from native avatar options', () => {
  expect(resolveConfig({}, 'config.json')).toMatchObject({
    kind: 'mesh',
    model: expect.stringMatching(/\/avatar\/miko-qipao\.mavatar$/),
    padTop: -0.07,
    padSide: -0.18,
    talkGain: 0.55,
  });
  expect(resolveConfig({ model: 'avatar' }, '/path/to/config.json').model).toBe(
    '/path/to/avatar',
  );
  for (const config of [
    { intensity: 1 },
    { padSide: -0.5 },
    { talkGain: null },
  ]) {
    expect(() => resolveConfig(config, 'config.json')).toThrow();
  }
});

it('preserves syllabic mouth movement when the voice volume changes', () => {
  const sampleRate = 48000;
  const samples = Float32Array.from({ length: sampleRate }, (_, i) => {
    const t = i / sampleRate;
    return (
      (0.5 + 0.45 * Math.sin(2 * Math.PI * 7 * t)) *
      Math.sin(2 * Math.PI * 220 * t)
    );
  });
  const loud = createMouthValues({ samples, sampleRate }, 30, 30);
  const quiet = createMouthValues(
    { samples: samples.map((value) => value * 0.02), sampleRate },
    30,
    30,
  );
  for (let i = 0; i < loud.length; i++)
    expect(quiet[i]).toBeCloseTo(loud[i], 5);
  expect(Math.max(...loud) - Math.min(...loud)).toBeGreaterThan(0.5);
  expect(
    createMouthValues(
      { samples: new Float32Array(sampleRate), sampleRate },
      30,
      30,
    ),
  ).toEqual(new Float32Array(30));
});

it('serves avatar assets only beneath the selected local root', () => {
  expect(
    resolveLocalAssetPath('/path/to/model', '/avatar/', '/avatar/face.png'),
  ).toBe(path.resolve('/path/to/model/face.png'));
  for (const url of [
    '/avatar/../secret',
    '/avatar/%2e%2e/secret',
    '/avatar/%2fsecret',
    '/avatar/..%5csecret',
    '/avatar/%ZZ',
    '/other/face.png',
  ]) {
    expect(resolveLocalAssetPath('/path/to/model', '/avatar/', url)).toBeNull();
  }
});

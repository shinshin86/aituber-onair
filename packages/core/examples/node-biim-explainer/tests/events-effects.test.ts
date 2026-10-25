import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, it, expect } from 'vitest';
import { validateScript } from '../src/schema.js';
import { resolveTimeline } from '../src/timeline.js';
import { createCompositor, fitPanelText } from '../src/compositor.js';
import { effectPose } from '../src/gen/effects.js';
import type { BiimScript, RenderConfig } from '../src/types.js';

const script: BiimScript = {
  speakers: {
    dango: {
      name: 'A',
      image: path.resolve('assets/yukkuri/dango'),
      voice: { engine: 'sine' },
    },
  },
  lines: [{ id: 'a', speaker: 'dango', text: 'before', at: 0 }],
  main: [{ at: 0, until: 4, color: '#204060' }],
  effects: [
    { at: 1, until: 3, speaker: 'dango', effect: 'grayscale' },
    { at: 1, until: 1.4, speaker: 'dango', effect: 'shake', amplitude: 8 },
  ],
};
describe('avatar effects and event bounds', () => {
  it('validates speaker, duration, amplitude and reaction lower bounds', async () => {
    await expect(validateScript(script, '.')).resolves.toEqual(script);
    const bad = structuredClone(script);
    if (bad.effects) bad.effects[0].speaker = 'missing';
    await expect(validateScript(bad, '.')).rejects.toThrow('unknown speaker');
    bad.effects = [{ at: 1, until: 1, speaker: 'dango', effect: 'grayscale' }];
    await expect(validateScript(bad, '.')).rejects.toThrow('must be > at');
    bad.effects = [{ at: 1, until: 3.1, speaker: 'dango', effect: 'shake' }];
    await expect(validateScript(bad, '.')).rejects.toThrow('at most 2 seconds');
    bad.effects = [
      { at: 1, until: 2, speaker: 'dango', effect: 'grayscale', amplitude: 9 },
    ];
    await expect(validateScript(bad, '.')).rejects.toThrow();
    bad.effects = [];
    bad.lines[0].eventAt = 1;
    await expect(validateScript(bad, '.')).rejects.toThrow('must not precede');
    const anchored = structuredClone(script);
    anchored.lines.push({
      id: 'reaction',
      speaker: 'dango',
      text: 'oh',
      at: 1,
      eventAt: '@a:end',
    });
    expect(() => resolveTimeline(anchored, [2, 0.5], false)).toThrow(
      'must not precede',
    );
  });
  it('renders grayscale only inside the interval and only on the avatar', async () => {
    const noShake = structuredClone(script);
    noShake.motion = 'none';
    noShake.effects = noShake.effects?.slice(0, 1);
    const timeline = resolveTimeline(noShake, [0.5], false);
    const config: RenderConfig = {
      ...noShake,
      ...timeline,
      timer: timeline.timer,
      counter: timeline.counter,
      seed: 1,
      audio: '',
      output: '',
    };
    const renderer = await createCompositor(
      config,
      { samples: new Float32Array(48000 * 4), sampleRate: 48000, duration: 4 },
      '.',
    );
    async function saturation(frame: number) {
      const png = (await renderer.renderFrame(frame)).png();
      const image = await loadImage(png);
      const canvas = createCanvas(1920, 1080);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 880, 240, 200).data;
      let chroma = 0;
      for (let i = 0; i < data.length; i += 4)
        chroma +=
          Math.max(data[i], data[i + 1], data[i + 2]) -
          Math.min(data[i], data[i + 1], data[i + 2]);
      expect(
        Array.from(ctx.getImageData(100, 100, 1, 1).data).slice(0, 3),
      ).toEqual([32, 64, 96]);
      return chroma;
    }
    expect(await saturation(0)).toBeGreaterThan(10000);
    expect(await saturation(45)).toBe(0);
    expect(await saturation(90)).toBeGreaterThan(10000);
  });
  it('has deterministic short shake offsets and no unrequested startup displacement', () => {
    const effects = resolveTimeline(script, [0.5], false).effects;
    const runs = Array.from({ length: 3 }, () =>
      Array.from({ length: 600 }, (_, i) =>
        effectPose(effects, 'dango', i / 60),
      ),
    );
    expect(runs[0]).toEqual(runs[1]);
    expect(runs[1]).toEqual(runs[2]);
    expect(
      runs[0].slice(0, 60).every((v) => v.x === 0 && v.y === 0 && !v.grayscale),
    ).toBe(true);
    expect(runs[0][60].x).toBe(8);
    expect(runs[0][84].x).toBe(0);
  });
});
describe('panel wrapping', () => {
  it('shrinks text to avoid a short isolated final word', () => {
    expect(
      fitPanelText([{ text: '4回目の挑戦\n門' }], 400, 160, 46).fontSize,
    ).toBe(46);
    const fit = fitPanelText([{ text: '手前で点滅を待つ' }], 400, 500, 56);
    expect(
      fit.rows.length === 1 ||
        Array.from(fit.rows.at(-1)?.text ?? '').length > 3,
    ).toBe(true);
  });
});

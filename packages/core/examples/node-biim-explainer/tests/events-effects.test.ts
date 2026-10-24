import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, it, expect } from 'vitest';
import { validateScript } from '../src/schema.js';
import { resolveTimeline } from '../src/timeline.js';
import { createCompositor, fitPanelText } from '../src/compositor.js';
import { effectPose } from '../src/gen/effects.js';
import { eventWidgets, parseEvents } from '../src/autoscript/events.js';
import { loadProfile, parsePanels } from '../src/autoscript/contracts.js';
import { generateScript } from '../src/autoscript/pipeline.js';
import { sampleVideo } from '../src/autoscript/frames.js';
import { synthesizeTimeline } from '../src/synthesis.js';
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
describe('external events and measured scheduling', () => {
  it('preserves exact times and maps real instant respawns without fake gray duration', () => {
    const events = parseEvents(
      {
        events: [
          { id: 'fall', at: 1, kind: 'death' },
          { id: 'instant', at: 1, kind: 'respawn' },
          { id: 'dead', at: 2, kind: 'death' },
          { id: 'retry', at: 3, kind: 'respawn' },
        ],
      },
      4,
    );
    const result = eventWidgets(events, 'dango', 4);
    expect(result.effects.filter((e) => e.effect === 'grayscale')).toEqual([
      { at: 2, until: 3, speaker: 'dango', effect: 'grayscale' },
    ]);
    expect(result.counter.events).toEqual([
      { at: 0, value: 0 },
      { at: 1, value: 1 },
      { at: 2, value: 2 },
    ]);
    expect(() =>
      parseEvents(
        [
          { id: 'a', at: 0, kind: 'death' },
          { id: 'a', at: 1, kind: 'death' },
        ],
        4,
      ),
    ).toThrow();
    expect(() => parseEvents([{ at: 4, kind: 'death' }], 4)).toThrow();
  });
  it('uses real audio length to reject intervening speech and never anticipates an event', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'biim-event-test-'));
    try {
      const events = parseEvents(
        [
          { id: 'fall', at: 1, kind: 'death' },
          { id: 'back', at: 3, kind: 'respawn' },
          { id: 'clear', at: 3.5, kind: 'stage-clear' },
        ],
        4,
      );
      const profile = await loadProfile('profiles/game.json');
      const scene = {
        sceneChanged: false,
        context: { phase: 'test', location: 'test', goal: '' },
        facts: [],
        events: [],
        metrics: {},
      };
      const result = await generateScript({
        input: path.resolve('work/demo.mp4'),
        output: path.join(dir, 'auto.json'),
        duration: 4,
        frames: [0, 1, 3.5].map((at) => ({
          at,
          difference: 0,
          reasons: ['external-event'],
          image: 'fixture',
        })),
        events,
        profile,
        memo: '',
        voice: { engine: 'sine', options: { secondsPerChar: 0.25 } },
        voiceCache: path.join(dir, 'cache'),
        transport: async (r) =>
          JSON.stringify(
            r.role === 'observer'
              ? scene
              : r.role === 'panels'
                ? {}
                : r.input.at === 0
                  ? { text: 'あ'.repeat(14) }
                  : r.input.at === 1
                    ? { text: '落ちた、悔しい…', eventId: 'fall' }
                    : { text: 'よし', eventId: 'clear' },
          ),
      });
      expect(
        result.debug.decisions.some(
          (d) => d.reason === 'audio-does-not-fit-before-event' && !d.accepted,
        ),
      ).toBe(true);
      const audio = await synthesizeTimeline(
        result.script,
        dir,
        path.join(dir, 'cache'),
      );
      expect(audio.timeline.lines).toHaveLength(2);
      expect(audio.timeline.lines[0].start).toBe(1);
      expect(audio.timeline.lines[1].start).toBe(3.5);
      expect(
        audio.timeline.lines.every((l) => l.start >= Number(l.eventAt)),
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30000);
  it('extracts an event frame outside the normal interval and rejects insufficient frame caps', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'biim-event-frame-'));
    try {
      const result = await sampleVideo('work/demo.mp4', dir, {
        interval: 2,
        threshold: 0.12,
        cap: 4,
        times: [1.1],
      });
      expect(
        result.frames.some(
          (f) => f.at === 1.1 && f.reasons.includes('external-event'),
        ),
      ).toBe(true);
      await expect(
        sampleVideo('work/demo.mp4', dir, {
          interval: 2,
          threshold: 0.12,
          cap: 1,
          times: [1.1, 2.3],
        }),
      ).rejects.toThrow('increase the cap');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30000);
});
describe('panel writing and wrapping', () => {
  it('rejects repeated items and shrinks text to avoid a short isolated final word', async () => {
    const profile = await loadProfile('profiles/game.json');
    const scene = {
      sceneChanged: false,
      context: { phase: '', location: '', goal: '' },
      facts: [
        { text: '鍵は奥にある', source: 'screen' as const, confidence: 1 },
      ],
      events: [],
      metrics: {},
    };
    expect(() =>
      parsePanels(
        {
          main: [
            { text: '鍵は奥にある', fact: 0 },
            { text: '鍵は奥にあるよ', fact: 0 },
          ],
        },
        profile,
        scene,
      ),
    ).toThrow('restate');
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

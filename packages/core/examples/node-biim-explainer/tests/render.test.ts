import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { createCompositor, formatTimer } from '../src/compositor.js';
import { SAMPLE_RATE } from '../src/gen/audio.js';
import { runCli } from '../src/gen/cli.js';
import { buildMotion } from '../src/gen/motion.js';
import { resolveTimeline } from '../src/timeline.js';
import type { BiimScript, RenderConfig } from '../src/types.js';

function silentScript(): BiimScript {
  return {
    canvas: '4:3',
    fps: 10,
    speakers: {
      a: {
        name: 'A',
        image: path.resolve('assets/yukkuri/dango'),
        voice: { engine: 'sine' },
      },
      b: {
        name: 'B',
        image: path.resolve('assets/yukkuri/bob'),
        voice: { engine: 'sine' },
      },
    },
    lines: [
      {
        id: 'intro',
        speaker: 'a',
        text: '字幕を二行以内に表示します。',
        spoken: false,
        duration: 1,
      },
    ],
    main: [{ at: 0, color: '#14283d' }],
    panels: [
      { at: 0, box: 'top', text: '見出し' },
      { at: 0, box: 'main', items: [{ text: '要点', color: 'yellow' }] },
    ],
  };
}

describe('compositor', () => {
  it('renders black background, borders and main content at both aspect ratios', async () => {
    for (const ratio of ['4:3', '16:9'] as const) {
      const script = silentScript();
      script.canvas = ratio;
      const timeline = resolveTimeline(script, [1], false);
      const config: RenderConfig = {
        ...script,
        ...timeline,
        timer: timeline.timer,
        counter: timeline.counter,
        audio: '',
        output: '',
        seed: 1,
      };
      const narration = {
        samples: new Float32Array(SAMPLE_RATE * 2),
        sampleRate: SAMPLE_RATE,
        duration: 2,
      };
      const renderer = await createCompositor(config, narration, '.');
      const frame = await renderer.renderFrame(0);
      const image = await loadImage(frame.png());
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const pixel = (x: number, y: number) =>
        Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3);
      expect(pixel(0, 0)).toEqual([0, 0, 0]);
      expect(pixel(100, 10)).toEqual([255, 255, 255]);
      expect(pixel(100, 100)).toEqual([20, 40, 61]);
      const motion = buildMotion(config, narration);
      expect(motion.a.every((p) => !p.mouthOpen)).toBe(true);
      expect(motion.b.every((p) => !p.mouthOpen)).toBe(true);
    }
  });
  it('formats clock carry correctly', () => {
    expect(formatTimer(3599.999)).toBe('0:59:59.99');
    expect(formatTimer(3600)).toBe('1:00:00.00');
  });
});

const hasFfmpeg = !spawnSync('ffmpeg', ['-version']).error;
describe.skipIf(!hasFfmpeg)('sine MP4 pipeline (requires ffmpeg)', () => {
  it('encodes speech, sped-up source audio, held video, and timeline artifacts', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'biim-test-'));
    try {
      const script = silentScript();
      script.fps = 5;
      script.lines = [
        { id: 'intro', speaker: 'a', text: 'test' },
        { speaker: 'b', text: 'caption', spoken: false, duration: 0.8 },
      ];
      script.main = [
        {
          at: 0,
          video: path.resolve('work/demo.mp4'),
          from: 0,
          to: 1,
          speed: 2,
          audio: true,
        },
      ];
      const input = path.join(dir, 'script.json');
      const output = path.join(dir, 'out.mp4');
      await writeFile(input, JSON.stringify(script));
      await runCli(['gen', input, '--out', output]);
      const result = JSON.parse(
        spawnSync(
          'ffprobe',
          [
            '-v',
            'error',
            '-show_streams',
            '-show_format',
            '-of',
            'json',
            output,
          ],
          { encoding: 'utf8' },
        ).stdout,
      );
      expect(
        result.streams.map((s: { codec_type: string }) => s.codec_type),
      ).toEqual(['video', 'audio']);
      const timeline = JSON.parse(
        await readFile(path.join(dir, 'out.timeline.json'), 'utf8'),
      );
      expect(Number(result.format.duration)).toBeCloseTo(timeline.duration, 0);
      expect(timeline.main[0].playbackEnd).toBe(0.5);
      expect(
        (await readFile(path.join(dir, 'out.mixed.wav'))).length,
      ).toBeGreaterThan(1000);
      await runCli([
        'preview',
        input,
        '--at',
        '@intro',
        '--out',
        path.join(dir, 'frames'),
      ]);
      expect(
        (await readFile(path.join(dir, 'frames/01-0.000.png')))
          .subarray(1, 4)
          .toString(),
      ).toBe('PNG');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 30000);
});

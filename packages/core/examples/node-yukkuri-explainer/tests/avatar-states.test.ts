import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { AVATAR_STATES, type RenderConfig } from '../src/types.js';
import { parseScript } from '../src/schema.js';
import {
  avatarState,
  isMouthOpen,
  loadAvatarStates,
  performanceOptions,
  resolveImagePaths,
} from '../src/gen/avatarStates.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import { buildMotion, speakerSeed } from '../src/gen/motion.js';

const raw = await readFile(
  new URL('../samples/yukkuri-hello-sine.json', import.meta.url),
  'utf8',
);
const defaults = performanceOptions({}, {});

describe('avatar images', () => {
  it('resolves directory and explicit state paths relative to the script', () => {
    const dir = path.resolve('samples');
    const paths = resolveImagePaths('../assets/yukkuri/dango', dir);
    expect(Object.keys(paths)).toEqual([...AVATAR_STATES]);
    expect(paths.mouth_open_eyes_open).toBe(
      path.resolve('assets/yukkuri/dango/mouth_open_eyes_open.png'),
    );
    expect(resolveImagePaths(paths, '/unused')).toEqual(paths);
    const script = parseScript(raw);
    script.speakers.dango.image = paths;
    expect(parseScript(JSON.stringify(script)).speakers.dango.image).toEqual(
      paths,
    );
    expect(() =>
      parseScript(
        JSON.stringify({
          ...script,
          speakers: {
            ...script.speakers,
            dango: {
              ...script.speakers.dango,
              image: { mouth_open_eyes_open: 'only.png' },
            },
          },
        }),
      ),
    ).toThrow(/mouth_close_eyes_open/);
  });
  it('keeps the original open/open files byte-identical and all four states distinct', async () => {
    const hashes = {
      dango: '867cf4efece91de4b4eb95b62700c4d0f37c869958cb31ab3e203b933cf72dc7',
      bob: '72e5e4083755b83f713e5efc629813c750bb1f792ac8afbdb92c76cfe89c890a',
    };
    for (const name of ['dango', 'bob'] as const) {
      const paths = resolveImagePaths(`assets/yukkuri/${name}`, '.');
      const anchor = await readFile(paths.mouth_open_eyes_open);
      expect(createHash('sha256').update(anchor).digest('hex')).toBe(
        hashes[name],
      );
      const states = await loadAvatarStates(paths, name);
      const canvas = createCanvas(1254, 1254);
      const ctx = canvas.getContext('2d');
      const pixelHashes = new Set<string>();
      let alpha: Uint8Array | undefined;
      for (const state of AVATAR_STATES) {
        expect([states[state].width, states[state].height]).toEqual([
          1254, 1254,
        ]);
        ctx.clearRect(0, 0, 1254, 1254);
        ctx.drawImage(states[state], 0, 0);
        const pixels = ctx.getImageData(0, 0, 1254, 1254).data;
        pixelHashes.add(createHash('sha256').update(pixels).digest('hex'));
        const currentAlpha = Uint8Array.from(
          pixels.filter((_, index) => index % 4 === 3),
        );
        if (alpha)
          expect(Buffer.from(currentAlpha).equals(Buffer.from(alpha))).toBe(
            true,
          );
        alpha = currentAlpha;
      }
      expect(pixelHashes.size).toBe(4);
    }
  });
  it('rejects missing or mismatched state images with the speaker identified', async () => {
    await expect(
      loadAvatarStates('missing-avatar', 'test-speaker'),
    ).rejects.toThrow(/test-speaker/);
    const dir = await mkdtemp(path.join(tmpdir(), 'yukkuri-size-'));
    try {
      const image = path.join(dir, 'small.png');
      const { writeFile } = await import('node:fs/promises');
      await writeFile(image, createCanvas(8, 8).toBuffer('image/png'));
      const paths = resolveImagePaths('assets/yukkuri/dango', '.');
      paths.mouth_close_eyes_open = image;
      await expect(loadAvatarStates(paths, 'dango')).rejects.toThrow(
        /same dimensions/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('mouth and blink timing', () => {
  it('flaps every 0.12 seconds, closes on silence, and never moves the listener mouth', () => {
    expect(defaults).toEqual({
      mouthMode: 'flap',
      flapInterval: 0.12,
      mouthThreshold: 0.08,
      motion: 'subtle',
    });
    for (const time of [0, 0.06, 0.119, 0.24, 0.3])
      expect(isMouthOpen(true, 0.5, time, defaults)).toBe(true);
    for (const time of [0.12, 0.18, 0.239, 0.36])
      expect(isMouthOpen(true, 0.5, time, defaults)).toBe(false);
    expect(isMouthOpen(true, 0, 0, defaults)).toBe(false);
    expect(isMouthOpen(false, 1, 0, defaults)).toBe(false);
    const rms = performanceOptions(
      { mouthMode: 'rms', mouthThreshold: 0.2 },
      defaults,
    );
    expect(isMouthOpen(true, 0.2, 0.18, rms)).toBe(true);
    expect(isMouthOpen(true, 0.199, 0, rms)).toBe(false);
  });
  it('maps all mouth/eye combinations and lets speakers override global settings', () => {
    expect([
      avatarState(false, false),
      avatarState(true, false),
      avatarState(false, true),
      avatarState(true, true),
    ]).toEqual([...AVATAR_STATES]);
    expect(
      performanceOptions(
        { motion: 'none', mouthMode: 'rms' },
        { motion: 'bounce', flapInterval: 0.15 },
      ),
    ).toMatchObject({ motion: 'none', mouthMode: 'rms', flapInterval: 0.15 });
  });
  it('uses stable independent blink schedules and short blinks for short clips', () => {
    const dango = createBlinkSchedule(900, 30, speakerSeed('dango', 42));
    const bob = createBlinkSchedule(900, 30, speakerSeed('bob', 42));
    expect(createBlinkSchedule(900, 30, speakerSeed('dango', 42))).toEqual(
      dango,
    );
    expect(bob).not.toEqual(dango);
    expect(dango.slice(0, 60).includes(1)).toBe(false);
    const lengths: number[] = [];
    let count = 0;
    for (const closed of dango) {
      if (closed) count++;
      else if (count) {
        lengths.push(count);
        count = 0;
      }
    }
    expect(lengths.length).toBeGreaterThan(2);
    expect(lengths.every((n) => n >= 3 && n <= 6)).toBe(true);
    expect(createBlinkSchedule(30, 30).includes(1)).toBe(true);
    expect(createBlinkSchedule(0, 30).length).toBe(0);
  });
  it.each([
    { mouthMode: 'smooth' },
    { motion: 'jump' },
    { flapInterval: 0 },
    { flapInterval: 2 },
    { mouthThreshold: 0 },
    { mouthThreshold: 1.1 },
  ])('rejects invalid settings %j', (invalid) => {
    expect(() =>
      parseScript(JSON.stringify({ ...JSON.parse(raw), ...invalid })),
    ).toThrow(/script\./);
    const script = JSON.parse(raw);
    Object.assign(script.speakers.dango, invalid);
    expect(() => parseScript(JSON.stringify(script))).toThrow(/speakers.dango/);
  });
  it('gates in-line silence immediately, blinks listeners, and makes none fully stationary', () => {
    const script = parseScript(raw);
    const config: RenderConfig = {
      width: 1920,
      height: 1080,
      fps: 30,
      seed: 42,
      duration: 10,
      audio: '',
      output: '',
      speakers: script.speakers,
      show: { title: 'Test', subtitle: 'Test' },
      lines: [
        {
          speaker: 'dango',
          text: 'Test',
          index: 0,
          spoken: true,
          start: 0.5,
          end: 9,
        },
      ],
    };
    const samples = new Float32Array(48000 * 10).fill(0.12);
    samples.fill(0, 48000, 48000 * 2);
    const audio = { samples, sampleRate: 48000, duration: 10 };
    const motion = buildMotion(config, audio);
    expect(motion.dango.slice(30, 60).every((p) => !p.mouthOpen)).toBe(true);
    expect(motion.dango.slice(18, 30).some((p) => p.mouthOpen)).toBe(true);
    expect(motion.dango.slice(18, 30).some((p) => !p.mouthOpen)).toBe(true);
    expect(motion.bob.every((p) => !p.mouthOpen)).toBe(true);
    expect(motion.bob.some((p) => p.eyesClosed)).toBe(true);
    expect(motion.dango.every((p) => Math.abs(p.y) < 9)).toBe(true);
    expect(buildMotion(config, audio)).toEqual(motion);
    config.motion = 'none';
    const still = buildMotion(config, audio);
    expect(
      still.dango.every(
        (p) =>
          p.y === 0 && p.rotation === 0 && p.scaleX === 1 && p.scaleY === 1,
      ),
    ).toBe(true);
    expect(still.dango.some((p) => p.mouthOpen)).toBe(true);
  });
});

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { createMouthValues } from '../src/gen/audio.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import {
  AVATAR_IMAGE_FILES,
  loadPngtuberAvatar,
  selectImageKey,
} from '../src/gen/pngtuberAvatar.js';
import {
  MOUTH_OPEN_THRESHOLD,
  resolveIdlePose,
  resolveMouthState,
} from '../src/gen/renderer.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const avatarDirectory = path.resolve(testDirectory, '../assets/avatar');

describe('deterministic animation helpers', () => {
  it('creates the same blink schedule for the same seed', () => {
    const first = createBlinkSchedule(300, 30, 42);
    const second = createBlinkSchedule(300, 30, 42);
    const different = createBlinkSchedule(300, 30, 43);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
    expect(first.includes(1)).toBe(true);
  });

  it('keeps RMS normalized and applies the binary mouth threshold', () => {
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
    expect(resolveMouthState(MOUTH_OPEN_THRESHOLD - 0.001)).toBe('closed');
    expect(resolveMouthState(MOUTH_OPEN_THRESHOLD)).toBe('open');
  });

  it('selects all four mouth and eye combinations', () => {
    expect(selectImageKey(false, false)).toBe('mouth_close_eyes_open');
    expect(selectImageKey(false, true)).toBe('mouth_close_eyes_close');
    expect(selectImageKey(true, false)).toBe('mouth_open_eyes_open');
    expect(selectImageKey(true, true)).toBe('mouth_open_eyes_close');
  });

  it('disables video-only idle motion at zero intensity', () => {
    expect(resolveIdlePose(75, 30, 0)).toEqual({
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
    });
    expect(resolveIdlePose(75, 30, 1).y).not.toBe(0);
  });
});

describe('PNGTuber avatar loader', () => {
  it('loads the four bundled PNGs with matching dimensions', async () => {
    const avatar = await loadPngtuberAvatar(avatarDirectory);

    expect(Object.keys(avatar.images)).toEqual(Object.keys(AVATAR_IMAGE_FILES));
    expect(avatar.width).toBe(1024);
    expect(avatar.height).toBe(1024);
  });

  it('rejects missing files and invalid PNG signatures', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pngtuber-avatar-'));
    try {
      await expect(loadPngtuberAvatar(root)).rejects.toThrow(
        /Missing PNGTuber avatar image/,
      );
      await Promise.all(
        Object.values(AVATAR_IMAGE_FILES).map((fileName) =>
          writeFile(path.join(root, fileName), 'not a PNG'),
        ),
      );
      await expect(loadPngtuberAvatar(root)).rejects.toThrow(/is not a PNG/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects state images with unequal dimensions', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pngtuber-avatar-'));
    const states = path.join(root, 'states');
    await mkdir(states);
    try {
      const files = Object.values(AVATAR_IMAGE_FILES);
      await Promise.all(
        files.map((fileName, index) => {
          const canvas = createCanvas(index === files.length - 1 ? 3 : 2, 2);
          return writeFile(
            path.join(states, fileName),
            canvas.toBuffer('image/png'),
          );
        }),
      );
      await expect(loadPngtuberAvatar(states)).rejects.toThrow(
        /must have equal dimensions/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

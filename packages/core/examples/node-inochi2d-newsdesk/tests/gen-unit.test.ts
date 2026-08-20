import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createMouthValues } from '../src/gen/audio.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import {
  createRenderer,
  MOUTH_OPEN_THRESHOLD,
  resolveMouthState,
} from '../src/gen/renderer.js';
import {
  resolveLocalAssetPath,
  resolveModelAssetPath,
  type Inochi2DAvatarDiagnostics,
  type Inochi2DFrameInput,
  type Inochi2DFrameSource,
} from '../src/gen/inochi2dAvatar.js';
import { VirtualClock } from '../harness/virtualClock.js';
import { expandHomePath, resolveFrom } from '../src/paths.js';
import type { RenderConfig } from '../src/types.js';

const diagnostics: Inochi2DAvatarDiagnostics = {
  runtime: 'inox2d-wasm-webgl2',
  canvasSize: { width: 1_080, height: 1_920 },
  mouthParameterId: 'Mouth:: Shape',
  mouthParameterKind: 'vec2',
  eyeParameterIds: ['Eye:: Left:: Blink', 'Eye:: Right:: Blink'],
  idleAnimation: 'original_idle_calm_breath',
  idleAnimationActive: true,
  avatarFraming: {
    scale: 0.65,
    x: 0,
    y: 1450,
  },
  virtualClock: {
    seed: 42,
    timeMs: 0,
    callbacksPerFrame: 1,
    pendingCallbacks: 1,
  },
  launchMode: 'swiftshader',
  captureMode: 'playwright-png-screenshot',
};

describe('deterministic animation helpers', () => {
  it('creates the same blink schedule for the same seed', () => {
    const first = createBlinkSchedule(300, 30, 42);
    const second = createBlinkSchedule(300, 30, 42);
    const different = createBlinkSchedule(300, 30, 43);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
    expect(first.includes(1)).toBe(true);
  });

  it('flushes rAF callbacks in order and defers nested callbacks', () => {
    const clock = new VirtualClock();
    const calls: string[] = [];
    clock.reset(42);
    clock.requestAnimationFrame(() => {
      calls.push('first');
      clock.requestAnimationFrame(() => calls.push('nested'));
    });
    clock.requestAnimationFrame(() => calls.push('second'));

    clock.advance(1 / 30);
    expect(clock.flushAnimationFrame()).toBe(2);
    expect(calls).toEqual(['first', 'second']);
    expect(clock.pendingAnimationFrames()).toBe(1);
    clock.advance(1 / 30);
    expect(clock.flushAnimationFrame()).toBe(1);
    expect(calls).toEqual(['first', 'second', 'nested']);
  });

  it('replays mulberry32 values from the same seed', () => {
    const first = new VirtualClock();
    const second = new VirtualClock();
    const different = new VirtualClock();
    first.reset(42);
    second.reset(42);
    different.reset(43);

    const firstValues = [first.random(), first.random(), first.random()];
    expect([second.random(), second.random(), second.random()]).toEqual(
      firstValues,
    );
    expect([
      different.random(),
      different.random(),
      different.random(),
    ]).not.toEqual(firstValues);
  });

  it('keeps RMS normalized and applies the mouth reporting threshold', () => {
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
});

describe('local Inochi2D paths', () => {
  it('expands the current user home only for a leading tilde segment', () => {
    expect(expandHomePath('~/models/avatar.inx')).not.toContain('~');
    expect(expandHomePath('other/~/avatar.inx')).toBe('other/~/avatar.inx');
    expect(resolveFrom('/tmp/scripts/news.json', '~/model.json')).toBe(
      expandHomePath('~/model.json'),
    );
  });

  it('keeps model asset requests inside the served model directory', () => {
    expect(
      resolveModelAssetPath('/models/avatar', '/model/textures/texture.png'),
    ).toBe('/models/avatar/textures/texture.png');
    expect(
      resolveModelAssetPath('/models/avatar', '/model/../private.txt'),
    ).toBeNull();
    expect(
      resolveModelAssetPath('/models/avatar', '/model/%2e%2e/private.txt'),
    ).toBeNull();
    expect(
      resolveModelAssetPath('/models/avatar', '/model/..%5cprivate.txt'),
    ).toBeNull();
    expect(
      resolveLocalAssetPath('/runtime', '/runtime/', '/runtime/inochi2d.js'),
    ).toBe('/runtime/inochi2d.js');
    expect(
      resolveLocalAssetPath('/runtime', '/runtime/', '/runtime/%2e%2e/key'),
    ).toBeNull();
  });
});

describe('Inochi2D frame-source contract', () => {
  it('passes mouth, blink, and fixed-step animation values sequentially', async () => {
    const inputs: Inochi2DFrameInput[] = [];
    const source = await createFakeFrameSource(inputs);
    const renderer = await createRenderer(createConfig(), source);

    await renderer.render(0, 0.75, true);
    await renderer.render(1, 0.25, false);

    expect(inputs).toEqual([
      {
        frameNumber: 0,
        time: 0,
        deltaSeconds: 0,
        mouth: 0.75,
        eyesClosed: true,
      },
      {
        frameNumber: 1,
        time: 0.1,
        deltaSeconds: 0.1,
        mouth: 0.25,
        eyesClosed: false,
      },
    ]);
  });

  it('places the transparent browser frame using avatarLayout', async () => {
    const source = await createFakeFrameSource([]);
    const renderer = await createRenderer(createConfig(), source);

    await renderer.render(0, 0, false);
    const context = renderer.canvas.getContext('2d');
    const background = context.getImageData(0, 0, 1, 1).data;
    const avatarCenter = context.getImageData(5, 15, 1, 1).data;

    expect([...background]).toEqual([0, 0, 0, 255]);
    expect([...avatarCenter]).toEqual([255, 0, 0, 255]);
  });

  it('rejects non-sequential frame requests before calling the source', async () => {
    const inputs: Inochi2DFrameInput[] = [];
    const source = await createFakeFrameSource(inputs);
    const renderer = await createRenderer(createConfig(), source);

    await expect(renderer.render(1, 0, false)).rejects.toThrow(
      /Frames must be rendered sequentially/,
    );
    expect(inputs).toEqual([]);
  });
});

async function createFakeFrameSource(
  inputs: Inochi2DFrameInput[],
): Promise<Inochi2DFrameSource> {
  const canvas = createCanvas(4, 4);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ff0000';
  context.fillRect(0, 0, 4, 4);
  const image = await loadImage(canvas.toBuffer('image/png'));
  return {
    width: 4,
    height: 4,
    diagnostics,
    async renderFrame(input) {
      inputs.push(input);
      return { image, elapsedMs: 2.5 };
    },
    async close() {},
  };
}

function createConfig(): RenderConfig {
  return {
    width: 20,
    height: 20,
    fps: 10,
    background: { color: '#000000' },
    avatarLayout: { scale: 2, x: 0.25, y: 0.75 },
    avatarFraming: {
      scale: 0.65,
      x: 0,
      y: 1450,
    },
    avatarMotion: '/model/avatar.motion.json',
    inochi2dRuntime: '/runtime',
    motion: { intensity: 2 },
    blinkSeed: 42,
    avatar: '/model/avatar.inx',
    audio: '/audio.wav',
    output: '/video.mp4',
    telop: '',
    subtitles: [],
    chapters: [],
    duration: 1,
  };
}

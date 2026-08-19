import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createMouthValues } from '../src/gen/audio.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import {
  createRenderer,
  MOUTH_OPEN_THRESHOLD,
  resolveMouthState,
} from '../src/gen/renderer.js';
import type {
  VrmAvatarDiagnostics,
  VrmFrameInput,
  VrmFrameSource,
} from '../src/gen/vrmAvatar.js';
import type { RenderConfig } from '../src/types.js';

const diagnostics: VrmAvatarDiagnostics = {
  modelHeight: 1.6,
  expressions: ['aa', 'blink'],
  mouthExpression: 'aa',
  blinkExpression: 'blink',
  animationLoaded: true,
  webglVersion: 'fake WebGL 2',
  webglRenderer: 'fake renderer',
  cameraDistance: 1.2,
  avatarFraming: {
    visibleHeightRatio: 0.39,
    lookAtHeightRatio: 0.845,
    portraitWidthAdjusted: true,
  },
  avatarLighting: {
    ambientIntensity: 1.4,
    directionalIntensity: 2.35,
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

describe('VRM frame-source contract', () => {
  it('passes mouth, blink, and fixed-step animation values sequentially', async () => {
    const inputs: VrmFrameInput[] = [];
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
        deltaSeconds: 0.2,
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
    const inputs: VrmFrameInput[] = [];
    const source = await createFakeFrameSource(inputs);
    const renderer = await createRenderer(createConfig(), source);

    await expect(renderer.render(1, 0, false)).rejects.toThrow(
      /Frames must be rendered sequentially/,
    );
    expect(inputs).toEqual([]);
  });
});

async function createFakeFrameSource(
  inputs: VrmFrameInput[],
): Promise<VrmFrameSource> {
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
      visibleHeightRatio: 0.39,
      lookAtHeightRatio: 0.845,
    },
    avatarLighting: {
      ambientIntensity: 1.4,
      directionalIntensity: 2.35,
    },
    motion: { intensity: 2 },
    blinkSeed: 42,
    avatar: '/model/avatar.vrm',
    avatarAnimation: '/model/idle.vrma',
    audio: '/audio.wav',
    output: '/video.mp4',
    telop: '',
    subtitles: [],
    chapters: [],
    duration: 1,
  };
}

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createMouthValues } from '../src/gen/audio.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import {
  createRenderer,
  MOUTH_OPEN_THRESHOLD,
  resolveMouthState,
} from '../src/gen/renderer.js';
import {
  resolveModelAssetPath,
  type Live2DAvatarDiagnostics,
  type Live2DFrameDriver,
  type Live2DFrameInput,
  type Live2DFrameSource,
  warmUpLive2DAvatar,
} from '../src/gen/live2dAvatar.js';
import { expandHomePath, resolveFrom } from '../src/paths.js';
import type { RenderConfig } from '../src/types.js';

const diagnostics: Live2DAvatarDiagnostics = {
  coreVersion: '5.0.0',
  modelSize: { width: 2_048, height: 4_096 },
  mouthParameterId: 'ParamMouthOpenY',
  eyeParameterIds: ['ParamEyeLOpen', 'ParamEyeROpen'],
  idleMotionGroup: 'Idle',
  idleMotionActive: true,
  avatarFraming: {
    scale: 2.5,
    x: 0.5,
    y: 0.4,
    renderedScale: 0.5,
  },
  avatarWarmup: {
    configuredSeconds: 3,
    settledSeconds: 3,
    frames: 30,
    fixedDeltaSeconds: 0.1,
    capturedFrames: 0,
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

describe('local Live2D paths', () => {
  it('expands the current user home only for a leading tilde segment', () => {
    expect(expandHomePath('~/models/avatar.model3.json')).not.toContain('~');
    expect(expandHomePath('other/~/avatar.model3.json')).toBe(
      'other/~/avatar.model3.json',
    );
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
  });
});

describe('Live2D frame-source contract', () => {
  it('advances fixed warm-up steps without capturing video frames', async () => {
    const updates: Array<Omit<Live2DFrameInput, 'frameNumber'>> = [];
    let captures = 0;
    const driver: Live2DFrameDriver = {
      async update(input) {
        updates.push(input);
      },
      async capture() {
        captures += 1;
        return Buffer.alloc(0);
      },
    };

    const warmup = await warmUpLive2DAvatar(driver, {
      seconds: 0.25,
      fps: 10,
    });

    expect(warmup).toEqual({
      configuredSeconds: 0.25,
      settledSeconds: 0.3,
      frames: 3,
      fixedDeltaSeconds: 0.1,
      capturedFrames: 0,
    });
    expect(updates).toEqual([
      { time: 0.1, deltaSeconds: 0.1, mouth: 0, eyesClosed: false },
      { time: 0.2, deltaSeconds: 0.1, mouth: 0, eyesClosed: false },
      { time: 0.3, deltaSeconds: 0.1, mouth: 0, eyesClosed: false },
    ]);
    expect(captures).toBe(0);
  });

  it('passes mouth, blink, and fixed-step animation values sequentially', async () => {
    const inputs: Live2DFrameInput[] = [];
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
    const inputs: Live2DFrameInput[] = [];
    const source = await createFakeFrameSource(inputs);
    const renderer = await createRenderer(createConfig(), source);

    await expect(renderer.render(1, 0, false)).rejects.toThrow(
      /Frames must be rendered sequentially/,
    );
    expect(inputs).toEqual([]);
  });
});

async function createFakeFrameSource(
  inputs: Live2DFrameInput[],
): Promise<Live2DFrameSource> {
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
      scale: 2.5,
      x: 0.5,
      y: 0.4,
    },
    avatarMotion: { idle: 'Idle' },
    avatarWarmupSeconds: 3,
    motion: { intensity: 2 },
    blinkSeed: 42,
    avatar: '/model/avatar.model3.json',
    cubismCore: '/vendor/live2dcubismcore.min.js',
    audio: '/audio.wav',
    output: '/video.mp4',
    telop: '',
    subtitles: [],
    chapters: [],
    duration: 1,
  };
}

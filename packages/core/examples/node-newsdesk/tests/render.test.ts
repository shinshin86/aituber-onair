import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { resolveAvatarConfig, loadAvatar } from '../src/avatars/registry.js';
import type { AvatarKind } from '../src/avatars/types.js';
import { parseScript } from '../src/gen/cli.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import { openNodeCompositor } from '../src/gen/compositor/node.js';
import {
  createScene,
  AVATAR_FRAME,
  H,
  W,
  type SceneContext,
} from '../src/screen/scene.js';
import { buildTimeline } from '../src/screen/schedule.js';
import { resolveFrameState } from '../src/screen/state.js';
import type { RenderConfig } from '../src/types.js';

function configFor(avatar: AvatarKind = 'pngtuber'): RenderConfig {
  return {
    width: W,
    height: H,
    fps: 30,
    avatar,
    avatarConfig: resolveAvatarConfig(avatar, {}, 'samples/script.json'),
    show: { title: 'AI NEWS DESK', subtitle: 'テスト', clock: '10:00' },
    seed: 42,
    audio: '',
    output: '',
    duration: 12,
    lines: [
      {
        index: 0,
        text: 'こんにちは。',
        chapter: '最初の話題',
        point: '要点',
        keywords: ['口パク'],
        emotion: 'happy',
        spoken: true,
        start: 1,
        end: 4,
      },
      {
        index: 1,
        text: '字幕だけです。',
        chapter: null,
        point: null,
        keywords: [],
        emotion: 'surprised',
        spoken: false,
        start: 5,
        end: 6,
      },
      {
        index: 2,
        text: 'また次回。',
        chapter: 'まとめ',
        point: null,
        keywords: [],
        emotion: 'relaxed',
        spoken: true,
        start: 7,
        end: 9,
      },
    ],
  };
}

describe('isomorphic scene', () => {
  it('keeps queued encoder frame bytes stable while drawing later frames', async () => {
    const config = configFor();
    const stage = await openNodeCompositor(config, new Float32Array(360));
    try {
      const frame = (await stage.renderFrame(60, 0)).rgba;
      const expected = Buffer.from(frame);
      for (let next = 61; next < 72; next++) await stage.renderFrame(next, 1);
      expect(frame.equals(expected)).toBe(true);
    } finally {
      await stage.close();
    }
  });

  it('accepts both native and browser Canvas2D without casts', () => {
    const canvas = createCanvas(W, H);
    const native: SceneContext<Canvas> = canvas.getContext('2d');
    const browserCompatible = (
      context: CanvasRenderingContext2D,
    ): SceneContext<HTMLCanvasElement> => context;
    expect(native.measureText('日本語').width).toBeGreaterThan(0);
    expect(typeof browserCompatible).toBe('function');
  });

  it('renders the same frame after a seek and with a fresh scene', () => {
    const config = configFor();
    const timeline = buildTimeline(config.lines, config.duration, config.seed);
    const canvas = createCanvas(W, H);
    const layer = createCanvas(AVATAR_FRAME.w, AVATAR_FRAME.h);
    layer.getContext('2d').fillRect(100, 100, 200, 200);
    const scene = createScene(canvas.getContext('2d'), config, timeline);
    const first = resolveFrameState(config, timeline, 75, 0.8, false).scene;
    scene.draw(first, layer);
    const expected = canvas.toBuffer('image/png');
    scene.draw(resolveFrameState(config, timeline, 230, 0, false).scene, layer);
    scene.draw(first, layer);
    expect(canvas.toBuffer('image/png').equals(expected)).toBe(true);
    const fresh = createCanvas(W, H);
    createScene(fresh.getContext('2d'), config, timeline).draw(first, layer);
    expect(fresh.toBuffer('image/png').equals(expected)).toBe(true);
  });

  it('resolves emotions, motions and silent-line speech state by time', () => {
    const config = configFor();
    const timeline = buildTimeline(config.lines, config.duration, config.seed);
    const speaking = resolveFrameState(config, timeline, 60, 0.8, true);
    expect(speaking.avatar).toMatchObject({
      speaking: true,
      mouth: 0.8,
      eyesClosed: true,
      emotion: 'happy',
    });
    expect(speaking.avatar.motion?.id).toBe('greet');
    const silent = resolveFrameState(config, timeline, 165, 0.8, false);
    expect(silent.avatar).toMatchObject({
      speaking: false,
      mouth: 0,
      emotion: 'surprised',
    });
    expect(silent.scene.lastLine?.text).toBe('字幕だけです。');
  });
});

describe.each(['pngtuber', 'purupuru'] as const)('%s adapter', (kind) => {
  it('reproduces frames across seeks and three fresh starts', async () => {
    let expected: Buffer | null = null;
    for (let restart = 0; restart < 3; restart++) {
      const config = configFor(kind);
      const mouth = new Float32Array(360).fill(0.8);
      const stage = await openNodeCompositor(config, mouth);
      try {
        const first = (await stage.renderFrame(60, 0.8)).png();
        await stage.renderFrame(330, 0);
        const replay = (await stage.renderFrame(60, 0.8)).png();
        expect(replay.equals(first)).toBe(true);
        if (expected) expect(first.equals(expected)).toBe(true);
        expected = first;
      } finally {
        await stage.close();
      }
    }
  });

  it('changes mouth/eye images while retaining an opaque-free avatar layer', async () => {
    const config = configFor(kind);
    const avatar = await loadAvatar(kind);
    await avatar.prepare({
      config: config.avatarConfig,
      width: 660,
      height: 700,
      fps: 30,
      duration: 12,
      seed: 42,
    });
    const input = {
      frame: 60,
      time: 2,
      mouth: 0,
      speaking: true,
      eyesClosed: false,
      emotion: 'happy' as const,
      motion: null,
    };
    try {
      const closed = avatar.render(input).toBuffer('image/png');
      const open = avatar.render({ ...input, mouth: 1 }).toBuffer('image/png');
      const blink = avatar
        .render({ ...input, eyesClosed: true })
        .toBuffer('image/png');
      expect(open.equals(closed)).toBe(false);
      expect(blink.equals(closed)).toBe(false);
      const image = avatar
        .render(input)
        .getContext('2d')
        .getImageData(0, 0, 660, 700).data;
      expect(image[3]).toBe(0);
      expect(
        Array.from(image).some((value, index) => index % 4 === 3 && value > 0),
      ).toBe(true);
    } finally {
      await avatar.dispose();
    }
  });
});

describe('strict avatar-independent input', () => {
  it('rejects legacy avatar settings and invalid timing before synthesis', () => {
    const script = {
      voice: { engine: 'sine' },
      lines: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
    };
    expect(parseScript(JSON.stringify(script))).toEqual(script);
    for (const key of [
      'avatar',
      'avatarLayout',
      'background',
      'telop',
      'motion',
      'blinkSeed',
    ])
      expect(() =>
        parseScript(JSON.stringify({ ...script, [key]: 'x' })),
      ).toThrow(/is not allowed/);
    expect(() =>
      parseScript(JSON.stringify({ ...script, leadIn: -1 })),
    ).toThrow(/at least 0/);
    expect(() =>
      parseScript(
        JSON.stringify({
          ...script,
          lines: [{ text: 'a', spoken: false }, { text: 'b' }, { text: 'c' }],
        }),
      ),
    ).toThrow(/duration is required/);
  });

  it('validates config fields and resolves model paths relative to the config', () => {
    const result = resolveAvatarConfig(
      'pngtuber',
      { model: 'avatar', scale: 1.1 },
      '/path/to/config.json',
    );
    expect(result.model).toBe('/path/to/avatar');
    expect(result.scale).toBe(1.1);
    expect(() =>
      resolveAvatarConfig('pngtuber', { cubismCore: 'x' }, 'config.json'),
    ).toThrow(/Unknown pngtuber/);
    expect(() =>
      resolveAvatarConfig('purupuru', { intensity: -1 }, 'config.json'),
    ).toThrow(/intensity/);
    expect(() =>
      resolveAvatarConfig('purupuru', { scale: 'large' }, 'config.json'),
    ).toThrow(/scale/);
  });

  it('uses a seeded blink schedule with visible closed-eye frames', () => {
    const a = createBlinkSchedule(360, 30, 42);
    expect(a).toEqual(createBlinkSchedule(360, 30, 42));
    expect(a.includes(1)).toBe(true);
    expect(a).not.toEqual(createBlinkSchedule(360, 30, 1));
  });
});

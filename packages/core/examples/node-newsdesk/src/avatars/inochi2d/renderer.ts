import type { BrowserAvatarRenderer, Inochi2dAvatarConfig } from '../types.js';
import { loadInochi2d } from './engine.js';

function filename(value: string): string {
  return encodeURIComponent(value.replaceAll('\\', '/').split('/').pop() ?? '');
}

export function createRenderer(): BrowserAvatarRenderer {
  let engine: Awaited<ReturnType<typeof loadInochi2d>> | null = null;
  let source: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;
  let config: Inochi2dAvatarConfig;
  let fps = 30;
  let nextFrame = 0;
  return {
    kind: 'inochi2d',
    runtime: 'browser',
    async prepare(input) {
      if (input.config.kind !== 'inochi2d')
        throw new Error('Expected inochi2d avatar configuration.');
      config = input.config;
      fps = input.fps;
      source = document.createElement('canvas');
      canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      engine = await loadInochi2d(source, {
        bridgeUrl: '/runtime/inochi_bridge.js',
        wasmUrl: '/runtime/inochi2d_bg.wasm',
        modelUrl: `/model/${filename(config.model)}`,
        motionUrl: config.motion
          ? `/motion/${filename(config.motion)}`
          : undefined,
        width: input.width,
        height: input.height,
        blinkSeed: input.seed,
        avatarFraming: config.framing,
        idleAnimation: config.idleAnimation,
        motionIntensity: config.intensity,
      });
      nextFrame = 0;
    },
    async render(input) {
      if (!engine) throw new Error('Inochi2D adapter is not prepared.');
      if (input.frame !== nextFrame)
        throw new Error(
          `Inochi2D frames must be sequential (expected ${nextFrame}, got ${input.frame}).`,
        );
      await engine.renderFrame({
        time: input.time,
        deltaSeconds: input.frame === 0 ? 0 : 1 / fps,
        mouth: input.mouth,
        eyesClosed: input.eyesClosed,
      });
      const g = canvas.getContext('2d');
      if (!g) throw new Error('Inochi2D output Canvas2D is unavailable.');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.save();
      g.translate(canvas.width * config.x, canvas.height * config.y);
      g.scale(config.scale, config.scale);
      g.drawImage(source, -canvas.width / 2, -canvas.height / 2);
      g.restore();
      nextFrame++;
      return canvas;
    },
    describe: () => (engine ? { ...engine.diagnostics } : {}),
    async dispose() {
      await engine?.dispose();
      engine = null;
    },
  };
}

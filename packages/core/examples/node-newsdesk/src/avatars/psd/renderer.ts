import type { BrowserAvatarRenderer, PsdAvatarConfig } from '../types.js';
import { loadPsdMotion } from './engine.js';

export function createRenderer(): BrowserAvatarRenderer {
  let engine: Awaited<ReturnType<typeof loadPsdMotion>> | null = null;
  let source: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;
  let config: PsdAvatarConfig;
  let fps = 30;
  let nextFrame = 0;
  return {
    kind: 'psd',
    runtime: 'browser',
    async prepare(input) {
      if (input.config.kind !== 'psd' || input.config.mode === 'static')
        throw new Error('Expected PSD auto/motion configuration.');
      config = input.config;
      fps = input.fps;
      source = document.createElement('canvas');
      canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      engine = await loadPsdMotion(source, {
        runtimeUrl: '/harness/motion-runtime.js',
        avatarUrl: '/model/psd',
        blinkSeed: input.seed,
        motionIntensity: Math.min(2, config.intensity),
      });
      nextFrame = 0;
    },
    render(input) {
      if (!engine || !engine.detection.usable)
        throw new Error('PSD motion adapter has no usable rig.');
      if (input.frame !== nextFrame)
        throw new Error(
          `PSD motion frames must be sequential (expected ${nextFrame}, got ${input.frame}).`,
        );
      engine.renderFrame({
        time: input.time,
        deltaSeconds: input.frame === 0 ? 0 : 1 / fps,
        mouth: input.mouth,
        eyesClosed: input.eyesClosed,
      });
      const g = canvas.getContext('2d');
      if (!g) throw new Error('PSD output Canvas2D is unavailable.');
      const fit =
        Math.min(
          (canvas.width * 0.96) / source.width,
          (canvas.height * 0.9) / source.height,
        ) * config.scale;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.save();
      g.translate(
        canvas.width * (config.x + (config.framing.x - 0.5) * config.scale),
        canvas.height * (config.y + (config.framing.y - 0.5) * config.scale),
      );
      g.scale(fit * config.framing.scale, fit * config.framing.scale);
      g.drawImage(source, -source.width / 2, -source.height / 2);
      g.restore();
      nextFrame++;
      return canvas;
    },
    describe: () =>
      engine
        ? {
            runtime: 'anime25drig-webgl',
            mode: 'motion',
            requestedMode: config.mode,
            detection: engine.detection,
            canvasSize: engine.canvasSize,
            virtualClock: engine.virtualClock,
            eyeInput: engine.eyeInput,
            motionIntensity: Math.min(2, config.intensity),
            framing: config.framing,
          }
        : {},
    async dispose() {
      engine?.dispose();
      engine = null;
    },
  };
}

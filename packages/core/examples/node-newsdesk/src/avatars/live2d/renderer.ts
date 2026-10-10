import { createSeededRandom } from '../../screen/schedule.js';
import type { BrowserAvatarRenderer, Live2dAvatarConfig } from '../types.js';
import { loadLive2d } from './engine.js';
import { warmUpLive2d } from './warmup.js';

export function createRenderer(): BrowserAvatarRenderer {
  let engine: Awaited<ReturnType<typeof loadLive2d>> | null = null;
  let source: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;
  let config: Live2dAvatarConfig;
  let warmup: ReturnType<typeof warmUpLive2d>;
  let fps = 30;
  let nextFrame = 0;
  const originalRandom = Math.random;
  return {
    kind: 'live2d',
    runtime: 'browser',
    async prepare(input) {
      if (input.config.kind !== 'live2d')
        throw new Error('Expected live2d avatar configuration.');
      config = input.config;
      fps = input.fps;
      Math.random = createSeededRandom(input.seed);
      source = document.createElement('canvas');
      canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      const filename = config.model.replaceAll('\\', '/').split('/').pop();
      engine = await loadLive2d(source, {
        modelUrl: `/model/${encodeURIComponent(filename ?? '')}`,
        cubismCoreUrl: '/cubism/live2dcubismcore.min.js',
        width: input.width,
        height: input.height,
        avatarFraming: config.framing,
        idleMotionGroup: config.idleMotionGroup ?? undefined,
      });
      warmup = warmUpLive2d(engine.renderFrame, config.warmupSeconds, fps);
      nextFrame = 0;
    },
    render(input) {
      if (!engine) throw new Error('Live2D adapter is not prepared.');
      if (input.frame !== nextFrame)
        throw new Error(
          `Live2D frames must be sequential (expected ${nextFrame}, got ${input.frame}).`,
        );
      engine.renderFrame({
        time: input.time,
        deltaSeconds: input.frame === 0 ? 0 : config.intensity / fps,
        mouth: input.mouth,
        eyesClosed: input.eyesClosed,
      });
      const g = canvas.getContext('2d');
      if (!g) throw new Error('Live2D output Canvas2D is unavailable.');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.save();
      g.translate(canvas.width * config.x, canvas.height * config.y);
      g.scale(config.scale, config.scale);
      g.drawImage(source, -canvas.width / 2, -canvas.height / 2);
      g.restore();
      nextFrame++;
      return canvas;
    },
    describe: () =>
      engine ? { ...engine.diagnostics, avatarWarmup: warmup } : {},
    async dispose() {
      engine?.dispose();
      engine = null;
      Math.random = originalRandom;
    },
  };
}

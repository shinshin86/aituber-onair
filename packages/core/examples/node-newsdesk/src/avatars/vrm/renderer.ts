import { createSeededRandom } from '../../screen/schedule.js';
import type { BrowserAvatarRenderer, VrmAvatarConfig } from '../types.js';
import { loadVrm } from './engine.js';

export function createRenderer(): BrowserAvatarRenderer {
  let engine: Awaited<ReturnType<typeof loadVrm>> | null = null;
  let source: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;
  let config: VrmAvatarConfig;
  let fps = 30;
  let nextFrame = 0;
  const originalRandom = Math.random;
  return {
    kind: 'vrm',
    runtime: 'browser',
    async prepare(input) {
      if (input.config.kind !== 'vrm')
        throw new Error('Expected vrm avatar configuration.');
      config = input.config;
      fps = input.fps;
      Math.random = createSeededRandom(input.seed);
      source = document.createElement('canvas');
      canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      engine = await loadVrm(source, {
        vrmUrl: '/model/vrm',
        vrmaUrl: config.animation ? '/model/vrma' : undefined,
        width: input.width,
        height: input.height,
        avatarFraming: config.framing,
        avatarLighting: config.lighting,
      });
      nextFrame = 0;
    },
    render(input) {
      if (!engine) throw new Error('VRM adapter is not prepared.');
      if (input.frame !== nextFrame)
        throw new Error(
          `VRM frames must be sequential (expected ${nextFrame}, got ${input.frame}).`,
        );
      engine.renderFrame({
        time: input.time,
        deltaSeconds: input.frame === 0 ? 0 : config.intensity / fps,
        mouth: input.mouth,
        eyesClosed: input.eyesClosed,
        emotion: input.emotion,
      });
      const g = canvas.getContext('2d');
      if (!g) throw new Error('VRM output Canvas2D is unavailable.');
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
      engine?.dispose();
      engine = null;
      Math.random = originalRandom;
    },
  };
}

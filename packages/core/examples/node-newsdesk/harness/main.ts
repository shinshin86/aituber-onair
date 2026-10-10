import type { BrowserAvatarRenderer } from '../src/avatars/types.js';
import { AVATAR_FRAME, createScene } from '../src/screen/scene.js';
import { buildTimeline } from '../src/screen/schedule.js';
import { resolveFrameState } from '../src/screen/state.js';
import type { RenderConfig } from '../src/types.js';

interface HarnessInput {
  config: RenderConfig;
  mouthValues: number[];
}
let avatar: BrowserAvatarRenderer | null = null;
let draw: ((frame: number, mouth: number) => void) | null = null;

async function load({ config, mouthValues }: HarnessInput) {
  if (config.avatarConfig.kind !== 'mesh')
    throw new Error('Unsupported browser avatar.');
  await avatar?.dispose();
  avatar = (await import('../src/avatars/mesh/renderer.js')).createRenderer();
  const stage = document.querySelector<HTMLCanvasElement>('#stage');
  if (!stage) throw new Error('Harness stage canvas was not found.');
  stage.width = config.width;
  stage.height = config.height;
  const g = stage.getContext('2d');
  if (!g) throw new Error('Canvas2D is unavailable.');
  await avatar.prepare({
    config: config.avatarConfig,
    width: AVATAR_FRAME.w,
    height: AVATAR_FRAME.h,
    fps: config.fps,
    duration: config.duration,
    seed: config.seed,
  });
  const timeline = buildTimeline(config.lines, config.duration, config.seed);
  const scene = createScene(g, config, timeline);
  const renderer = avatar;
  draw = (frame, mouth) => {
    const history = Array.from({ length: 24 }, (_, i) => {
      const f = frame - 23 + i;
      return f < 0
        ? 0
        : resolveFrameState(config, timeline, f, mouthValues[f], false).scene
            .mouth;
    });
    const state = resolveFrameState(
      config,
      timeline,
      frame,
      mouth,
      false,
      history,
    );
    scene.draw(state.scene, renderer.render(state.avatar));
  };
  return { lines: config.lines.length, actions: timeline.actions.length };
}

declare global {
  interface Window {
    load(input: HarnessInput): ReturnType<typeof load>;
    renderFrame(input: { frame: number; mouth: number }): void;
  }
}
window.load = load;
window.renderFrame = ({ frame, mouth }) => {
  if (!draw) throw new Error('Call window.load before rendering.');
  draw(frame, mouth);
};

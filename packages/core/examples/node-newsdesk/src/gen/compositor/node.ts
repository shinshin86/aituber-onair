import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { loadAvatar } from '../../avatars/registry.js';
import { AVATAR_FRAME, createScene } from '../../screen/scene.js';
import { buildTimeline } from '../../screen/schedule.js';
import { resolveFrameState } from '../../screen/state.js';
import type { RenderConfig } from '../../types.js';
import { createBlinkSchedule } from '../blink.js';

export async function openNodeCompositor(
  config: RenderConfig,
  mouthValues: Float32Array,
) {
  // Native canvas discovers system fonts; allow an explicit Linux font file.
  if (
    process.env.NEWSDESK_FONT_PATH &&
    !GlobalFonts.registerFromPath(
      process.env.NEWSDESK_FONT_PATH,
      'Noto Sans JP',
    )
  )
    throw new Error(
      'Could not load NEWSDESK_FONT_PATH. Use a Japanese-capable font such as Noto Sans JP.',
    );
  const canvas = createCanvas(config.width, config.height);
  const context = canvas.getContext('2d');
  const timeline = buildTimeline(config.lines, config.duration, config.seed);
  const scene = createScene(context, config, timeline);
  const totalFrames = Math.max(1, Math.ceil(config.duration * config.fps));
  const blink = createBlinkSchedule(totalFrames, config.fps, config.seed);
  const avatar = await loadAvatar(config.avatar);
  try {
    await avatar.prepare({
      config: config.avatarConfig,
      width: AVATAR_FRAME.w,
      height: AVATAR_FRAME.h,
      fps: config.fps,
      duration: config.duration,
      seed: config.seed,
    });
  } catch (error) {
    await avatar.dispose();
    throw error;
  }
  return {
    launchMode: 'node',
    actions: timeline.actions.length,
    async renderFrame(frame: number, mouth: number) {
      const start = performance.now();
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
        Boolean(blink[frame]),
        history,
      );
      scene.draw(state.scene, avatar.render(state.avatar));
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return {
        // Own the bytes while ffmpeg consumes them asynchronously. The native
        // image data can otherwise be released before the pipe finishes.
        rgba: Buffer.from(data),
        png: () => canvas.toBuffer('image/png'),
        elapsedMs: performance.now() - start,
      };
    },
    close: () => avatar.dispose(),
  };
}

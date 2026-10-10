import {
  createMeshAvatar,
  type MeshAvatar,
} from '../../../../react-mesh-avatar-app/src/meshAvatar/createMeshAvatar.js';
import { createSeededRandom } from '../../screen/schedule.js';
import type { BrowserAvatarRenderer, MeshAvatarConfig } from '../types.js';

/** Browser-only mesh layer, driven by the same fixed clock as the old example. */
export function createRenderer(): BrowserAvatarRenderer {
  let avatar: MeshAvatar | null = null;
  let source: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;
  let config: MeshAvatarConfig;
  let fps = 30;
  let nextFrame = 0;
  const originalRandom = Math.random;
  return {
    kind: 'mesh',
    runtime: 'browser',
    async prepare(input) {
      config = input.config;
      fps = input.fps;
      Math.random = createSeededRandom(input.seed);
      source = document.createElement('canvas');
      source.width = input.width;
      source.height = input.height;
      source.style.width = `${input.width}px`;
      source.style.height = `${input.height}px`;
      source.style.position = 'absolute';
      source.style.left = '0';
      source.style.top = '0';
      source.style.visibility = 'hidden';
      document.body.append(source);
      canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      avatar = await createMeshAvatar(source, {
        assetsBase: '/avatar/',
        manual: true,
        padTop: config.padTop,
        padSide: config.padSide,
      });
      avatar.setAutoIdle(false);
      avatar.setAutoMotion(false);
      avatar.setTalkGain(config.talkGain);
      avatar.advance(1.5);
      nextFrame = 0;
    },
    render(input) {
      if (!avatar) throw new Error('Mesh adapter is not prepared.');
      if (input.frame !== nextFrame)
        throw new Error(
          `Mesh frames must be sequential (expected ${nextFrame}, got ${input.frame}).`,
        );
      for (const cue of input.cues) {
        if (cue.type === 'emotion')
          avatar.setEmotion(cue.tag, { playMotion: false });
        else avatar.play(cue.id);
      }
      avatar.setSpeaking(input.speaking);
      avatar.setVoiceLevel(input.mouth);
      avatar.advance(1 / fps, fps);
      const g = canvas.getContext('2d');
      if (!g) throw new Error('Mesh output Canvas2D is unavailable.');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.save();
      g.translate(canvas.width * config.x, canvas.height * config.y);
      g.scale(config.scale, config.scale);
      g.drawImage(source, -canvas.width / 2, -canvas.height / 2);
      g.restore();
      nextFrame++;
      return canvas;
    },
    async dispose() {
      avatar?.destroy();
      avatar = null;
      source?.remove();
      Math.random = originalRandom;
    },
  };
}

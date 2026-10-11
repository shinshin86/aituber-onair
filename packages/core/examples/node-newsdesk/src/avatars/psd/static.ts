import { createCanvas, type Canvas } from '@napi-rs/canvas';
import type { PsdAvatarConfig, NodeAvatarAdapter } from '../types.js';
import { resolveConfig } from './adapter.js';
import { loadPsdAvatar, type PsdAvatar } from './psdBinding.js';
import type { PsdModel } from './psdModel.js';
import { getVisibleLayerIds } from './psdVisibility.js';
import type { SKRSContext2D } from '@napi-rs/canvas';
interface Pose {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export function createStaticAdapter(): NodeAvatarAdapter {
  let avatar: PsdAvatar | null = null;
  let source: Canvas;
  let canvas: Canvas;
  let config: PsdAvatarConfig;
  let fps = 30;
  return {
    kind: 'psd',
    runtime: 'node',
    resolveConfig,
    async prepare(input) {
      if (input.config.kind !== 'psd')
        throw new Error('Expected PSD configuration.');
      config = input.config;
      fps = input.fps;
      avatar = await loadPsdAvatar(config.model, config.roles);
      source = createCanvas(avatar.model.width, avatar.model.height);
      canvas = createCanvas(input.width, input.height);
    },
    render(input) {
      if (!avatar) throw new Error('Static PSD adapter is not prepared.');
      compositePsdAvatar(
        source.getContext('2d'),
        avatar,
        input.mouth >= 0.45,
        input.eyesClosed,
      );
      const pose = resolveIdlePose(input.frame, fps, config.intensity);
      const fit =
        Math.min(
          (canvas.width * 0.96) / source.width,
          (canvas.height * 0.9) / source.height,
        ) * config.scale;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.save();
      g.translate(
        canvas.width * config.x + pose.x * fit,
        canvas.height * config.y + pose.y * fit,
      );
      g.rotate(pose.rotation);
      g.scale(fit * pose.scale, fit * pose.scale);
      g.drawImage(source, -source.width / 2, -source.height / 2);
      g.restore();
      return canvas;
    },
    describe: () =>
      avatar
        ? {
            mode: 'static',
            canvasSize: {
              width: avatar.model.width,
              height: avatar.model.height,
            },
            roles: avatar.roles,
            unsupported: avatar.model.unsupported,
          }
        : {},
    async dispose() {
      avatar = null;
    },
  };
}

/** Resolve the deterministic video-only breathing and roll pose. */
export function resolveIdlePose(
  frameNumber: number,
  fps: number,
  intensity: number,
): Pose {
  const safeIntensity = Number.isFinite(intensity)
    ? Math.max(0, Math.min(3, intensity))
    : 1;
  if (safeIntensity === 0) {
    return { x: 0, y: 0, rotation: 0, scale: 1 };
  }
  const seconds = frameNumber / fps;
  const breath = Math.sin(seconds * Math.PI * 2 * 0.34);
  const roll = Math.sin(seconds * Math.PI * 2 * 0.12 + 0.35);
  return {
    x: 0,
    y: breath * 8 * safeIntensity,
    rotation: roll * 0.008 * safeIntensity,
    scale: 1 + breath * 0.004 * safeIntensity,
  };
}

function compositePsdAvatar(
  context: SKRSContext2D,
  avatar: PsdAvatar,
  mouthOpen: boolean,
  eyesClosed: boolean,
): void {
  const { model } = avatar;
  context.clearRect(0, 0, model.width, model.height);
  const layerIds = getVisibleLayerIds(model, avatar.visibility, avatar.roles, {
    mouthOpen,
    eyesClosed,
  });
  for (const nodeId of layerIds) {
    const node = model.nodes[nodeId];
    if (!node || node.kind !== 'layer' || !node.image) continue;
    context.save();
    context.globalAlpha = getComposedOpacityForNode(model, node.id);
    context.drawImage(node.image, node.left, node.top);
    context.restore();
  }
}

/** Multiply a pixel layer opacity by every ancestor group opacity. */
export function getComposedOpacityForNode(
  model: PsdModel,
  nodeId: string,
): number {
  let opacity = 1;
  let current: PsdModel['nodes'][string] | undefined = model.nodes[nodeId];
  while (current) {
    opacity *= Math.max(0, Math.min(current.opacity / 255, 1));
    current = current.parentId ? model.nodes[current.parentId] : undefined;
  }
  return opacity;
}

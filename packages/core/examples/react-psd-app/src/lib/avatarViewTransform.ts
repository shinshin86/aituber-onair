import type { AvatarViewTransform } from '../types/settings';

const AVATAR_VIEW_MIN_SCALE = 0.2;
const AVATAR_VIEW_MAX_SCALE = 3;
const AVATAR_VIEW_MAX_OFFSET = 2_000;
const AVATAR_VIEW_MIN_VISIBLE_PX = 64;

export interface AvatarViewBounds {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sanitizeAvatarViewTransform(
  transform: AvatarViewTransform,
  bounds?: AvatarViewBounds,
): AvatarViewTransform {
  const scale = clamp(
    transform.scale || 1,
    AVATAR_VIEW_MIN_SCALE,
    AVATAR_VIEW_MAX_SCALE,
  );
  const maxX = bounds
    ? Math.max(
        0,
        (bounds.width * scale + bounds.width) / 2 - AVATAR_VIEW_MIN_VISIBLE_PX,
      )
    : AVATAR_VIEW_MAX_OFFSET;
  const maxY = bounds
    ? Math.max(
        0,
        (bounds.height * scale + bounds.height) / 2 -
          AVATAR_VIEW_MIN_VISIBLE_PX,
      )
    : AVATAR_VIEW_MAX_OFFSET;

  return {
    x: clamp(transform.x || 0, -maxX, maxX),
    y: clamp(transform.y || 0, -maxY, maxY),
    scale,
  };
}

export function calculateCenteredZoomTransform(
  transform: AvatarViewTransform,
  nextScale: number,
  bounds: AvatarViewBounds,
): AvatarViewTransform {
  return sanitizeAvatarViewTransform(
    {
      x: transform.x,
      y: transform.y,
      scale: nextScale,
    },
    bounds,
  );
}

export function clampAvatarViewScale(value: number): number {
  return clamp(value, AVATAR_VIEW_MIN_SCALE, AVATAR_VIEW_MAX_SCALE);
}

export const AVATAR_VIEW_WHEEL_STEP = 0.08;

export interface AvatarView {
  scale: number;
  x: number;
  y: number;
}

export const DEFAULT_VIEW: AvatarView = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 3;
export const VIEW_STORAGE_KEY = 'react-media-avatar-app-view';

export function clampScale(scale: number): number {
  return Number.isFinite(scale)
    ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    : DEFAULT_VIEW.scale;
}

export function loadView(): AvatarView {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    const view: unknown = raw ? JSON.parse(raw) : null;
    if (view && typeof view === 'object') {
      const { scale, x, y } = view as Partial<AvatarView>;
      if (
        typeof scale === 'number' &&
        Number.isFinite(scale) &&
        typeof x === 'number' &&
        Number.isFinite(x) &&
        typeof y === 'number' &&
        Number.isFinite(y)
      ) {
        return { scale: clampScale(scale), x, y };
      }
    }
  } catch {
    // Storage may be unavailable or contain malformed JSON.
  }
  return { ...DEFAULT_VIEW };
}

/** Keep the avatar point under the cursor fixed, using the untransformed centre. */
export function calculateCursorZoomTransform(
  view: AvatarView,
  nextScale: number,
  cursor: { x: number; y: number },
  centre: { x: number; y: number },
): AvatarView {
  const scale = clampScale(nextScale);
  const ratio = scale / view.scale;
  return {
    scale,
    x: cursor.x - centre.x - (cursor.x - centre.x - view.x) * ratio,
    y: cursor.y - centre.y - (cursor.y - centre.y - view.y) * ratio,
  };
}

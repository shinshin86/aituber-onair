import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface AvatarView {
  scale: number;
  x: number;
  y: number;
}

const DEFAULT_VIEW: AvatarView = { scale: 1, x: 0, y: 0 };
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const STORAGE_KEY = 'react-mesh-avatar-app-view';
export const RESET_VIEW_EVENT = 'mesh-avatar-view-reset';

// gestures never start on the chat UI or on controls
const UI_SELECTOR =
  '.chat-message, .chat-input, button, input, textarea, select, label, a, ' +
  '.settings-dialog-overlay, .avatar-expression-controls, .avatar-anchor-editor, ' +
  '.broadcast-caption, .avatar-effect-canvas.is-anchor-editing';

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

function loadView(): AvatarView {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW;
    const v = JSON.parse(raw) as Partial<AvatarView>;
    if (
      typeof v.scale === 'number' &&
      typeof v.x === 'number' &&
      typeof v.y === 'number'
    ) {
      return { scale: clampScale(v.scale), x: v.x, y: v.y };
    }
  } catch {
    // storage unavailable (private mode etc.): use the default view
  }
  return DEFAULT_VIEW;
}

/**
 * Zoom and pan the avatar with the mouse (wheel / drag / double-click to reset) or touch
 * (pinch / one-finger drag). Listens on `surfaceRef` (the chat panel) because the avatar
 * itself sits behind the chat UI and does not receive pointer events.
 * `targetRef` is the element whose centre is the zoom reference.
 */
export function useAvatarViewGesture(
  surfaceRef: RefObject<HTMLElement | null>,
  targetRef: RefObject<HTMLElement | null>,
) {
  const [view, setView] = useState<AvatarView>(loadView);
  const viewRef = useRef(view);

  const commit = useCallback((next: AvatarView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
    } catch {
      // ignore: the view just won't be remembered
    }
  }, [view]);

  const reset = useCallback(() => commit(DEFAULT_VIEW), [commit]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    // zoom by `factor` keeping the screen point (px, py) fixed
    const zoomAt = (factor: number, px: number, py: number) => {
      const target = targetRef.current;
      if (!target) return;
      const v = viewRef.current;
      const scale = clampScale(v.scale * factor);
      const k = scale / v.scale;
      const r = target.getBoundingClientRect();
      // centre of the untransformed box
      const cx = r.left + r.width / 2 - v.x;
      const cy = r.top + r.height / 2 - v.y;
      commit({
        scale,
        x: px - cx - (px - cx - v.x) * k,
        y: py - cy - (py - cy - v.y) * k,
      });
    };

    const isUi = (e: Event) =>
      e.target instanceof Element && Boolean(e.target.closest(UI_SELECTOR));

    const onWheel = (e: WheelEvent) => {
      if (isUi(e)) return;
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; mx: number; my: number } | null = null;

    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isUi(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinch = pinchState();
      try {
        surface.setPointerCapture(e.pointerId);
      } catch {
        // pointer already gone (or synthetic): the gesture still works without capture
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2 && pinch) {
        const next = pinchState();
        const v = viewRef.current;
        // pan with the midpoint, then zoom around it
        viewRef.current = {
          ...v,
          x: v.x + next.mx - pinch.mx,
          y: v.y + next.my - pinch.my,
        };
        zoomAt(next.dist / Math.max(1, pinch.dist), next.mx, next.my);
        pinch = next;
      } else if (pointers.size === 1) {
        const v = viewRef.current;
        commit({
          ...v,
          x: v.x + e.clientX - prev.x,
          y: v.y + e.clientY - prev.y,
        });
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (surface.hasPointerCapture(e.pointerId)) {
        surface.releasePointerCapture(e.pointerId);
      }
      pinch = pointers.size === 2 ? pinchState() : null;
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (!isUi(e)) reset();
    };

    surface.addEventListener('wheel', onWheel, { passive: false });
    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerup', onPointerEnd);
    surface.addEventListener('pointercancel', onPointerEnd);
    surface.addEventListener('dblclick', onDoubleClick);
    window.addEventListener(RESET_VIEW_EVENT, reset);
    return () => {
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', onPointerEnd);
      surface.removeEventListener('pointercancel', onPointerEnd);
      surface.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener(RESET_VIEW_EVENT, reset);
    };
  }, [commit, reset, surfaceRef, targetRef]);

  return { view, reset };
}

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type AvatarView,
  DEFAULT_VIEW,
  VIEW_STORAGE_KEY,
  calculateCursorZoomTransform,
  loadView,
} from '../lib/avatarView';

export const RESET_VIEW_EVENT = 'media-avatar-view-reset';

const UI_SELECTOR =
  '.chat-message, .chat-input, button, input, textarea, select, label, a, ' +
  '[contenteditable], [role="button"], .settings-dialog-overlay, ' +
  '.avatar-expression-controls, .avatar-anchor-editor, .broadcast-caption, ' +
  '.avatar-effect-canvas.is-anchor-editing';

/** Mouse gestures on the chat surface; media and effects share the target transform. */
export function useAvatarViewGesture(
  surfaceRef: RefObject<HTMLElement | null>,
  targetRef: RefObject<HTMLElement | null>,
  anchorEditorOpen: boolean,
) {
  const [view, setView] = useState<AvatarView>(loadView);
  const viewRef = useRef(view);
  const commit = useCallback((next: AvatarView) => {
    viewRef.current = next;
    setView(next);
  }, []);
  const reset = useCallback(() => commit({ ...DEFAULT_VIEW }), [commit]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
    } catch {
      // Gestures still work when browser storage is unavailable.
    }
  }, [view]);

  useEffect(() => {
    window.addEventListener(RESET_VIEW_EVENT, reset);
    return () => window.removeEventListener(RESET_VIEW_EVENT, reset);
  }, [reset]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || anchorEditorOpen) return;
    let drag: { pointerId: number; x: number; y: number } | null = null;
    const isUi = (event: Event) =>
      event.target instanceof Element &&
      Boolean(event.target.closest(UI_SELECTOR));

    const onWheel = (event: WheelEvent) => {
      const target = targetRef.current;
      if (isUi(event) || !target) return;
      event.preventDefault();
      const current = viewRef.current;
      const rect = target.getBoundingClientRect();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? surface.clientHeight
            : 1;
      // Bound the exponent so even large wheel deltas remain finite.
      const exponent = Math.max(
        -10,
        Math.min(10, -event.deltaY * unit * 0.0015),
      );
      commit(
        calculateCursorZoomTransform(
          current,
          current.scale * Math.exp(exponent),
          { x: event.clientX, y: event.clientY },
          {
            x: rect.left + rect.width / 2 - current.x,
            y: rect.top + rect.height / 2 - current.y,
          },
        ),
      );
    };

    const endDrag = () => {
      if (!drag) return;
      const { pointerId } = drag;
      drag = null;
      if (surface.hasPointerCapture(pointerId))
        surface.releasePointerCapture(pointerId);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        isUi(event) ||
        event.pointerType !== 'mouse' ||
        event.button !== 0 ||
        drag
      )
        return;
      event.preventDefault();
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      surface.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!(event.buttons & 1)) {
        endDrag();
        return;
      }
      event.preventDefault();
      const current = viewRef.current;
      commit({
        ...current,
        x: current.x + event.clientX - drag.x,
        y: current.y + event.clientY - drag.y,
      });
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (drag?.pointerId === event.pointerId) endDrag();
    };
    const onDoubleClick = (event: MouseEvent) => {
      if (isUi(event)) return;
      event.preventDefault();
      endDrag();
      reset();
    };

    surface.addEventListener('wheel', onWheel, { passive: false });
    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerup', onPointerEnd);
    surface.addEventListener('pointercancel', onPointerEnd);
    surface.addEventListener('lostpointercapture', onPointerEnd);
    surface.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('blur', endDrag);
    return () => {
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', onPointerEnd);
      surface.removeEventListener('pointercancel', onPointerEnd);
      surface.removeEventListener('lostpointercapture', onPointerEnd);
      surface.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('blur', endDrag);
      endDrag();
    };
  }, [anchorEditorOpen, commit, reset, surfaceRef, targetRef]);

  return { view, reset };
}

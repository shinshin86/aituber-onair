export interface DialogDragPoint {
  x: number;
  y: number;
}

export interface DialogDragRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface DialogDragViewport {
  width: number;
  height: number;
}

export const DIALOG_VIEWPORT_MARGIN = 12;

function clamp(value: number, min: number, max: number): number {
  if (min > max) return 0;
  return Math.min(max, Math.max(min, value));
}

export function clampDialogDragDelta(
  delta: DialogDragPoint,
  rect: DialogDragRect,
  viewport: DialogDragViewport,
  margin = DIALOG_VIEWPORT_MARGIN,
): DialogDragPoint {
  return {
    x: clamp(
      delta.x,
      margin - rect.left,
      viewport.width - margin - rect.right,
    ),
    y: clamp(
      delta.y,
      margin - rect.top,
      viewport.height - margin - rect.bottom,
    ),
  };
}

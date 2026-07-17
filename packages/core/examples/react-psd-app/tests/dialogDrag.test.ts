import { describe, expect, it } from 'vitest';
import {
  clampDialogDragDelta,
  DIALOG_VIEWPORT_MARGIN,
} from '../src/lib/dialogDrag';

const rect = {
  left: 260,
  right: 740,
  top: 100,
  bottom: 700,
};
const viewport = { width: 1000, height: 800 };

describe('settings dialog drag clamping', () => {
  it('keeps a drag delta that remains inside the viewport', () => {
    expect(clampDialogDragDelta({ x: 40, y: -30 }, rect, viewport)).toEqual({
      x: 40,
      y: -30,
    });
  });

  it('keeps the dialog margin visible on every edge', () => {
    expect(
      clampDialogDragDelta({ x: -1000, y: -1000 }, rect, viewport),
    ).toEqual({
      x: DIALOG_VIEWPORT_MARGIN - rect.left,
      y: DIALOG_VIEWPORT_MARGIN - rect.top,
    });
    expect(
      clampDialogDragDelta({ x: 1000, y: 1000 }, rect, viewport),
    ).toEqual({
      x: viewport.width - DIALOG_VIEWPORT_MARGIN - rect.right,
      y: viewport.height - DIALOG_VIEWPORT_MARGIN - rect.bottom,
    });
  });

  it('uses the current dialog rect as the drag origin', () => {
    const movedRect = {
      left: DIALOG_VIEWPORT_MARGIN,
      right: 492,
      top: 60,
      bottom: 660,
    };

    expect(
      clampDialogDragDelta({ x: -20, y: 20 }, movedRect, viewport),
    ).toEqual({ x: 0, y: 20 });
  });

  it('falls back to no movement when the dialog cannot fit on an axis', () => {
    expect(
      clampDialogDragDelta(
        { x: 30, y: 30 },
        { left: 0, right: 1200, top: 100, bottom: 700 },
        viewport,
      ),
    ).toEqual({ x: 0, y: 30 });
  });
});

/** All geometry is in 1080p pixels; the main column scales with the canvas. */
export const STYLE = {
  wideWidth: 1920,
  classicWidth: 1440,
  height: 1080,
  mainFraction: 0.75,
  mainHeight: 0.79,
  margin: 10,
  gap: 16,
  border: 3,
  radius: 14,
  topHeight: 180,
  bottomHeight: 90,
  avatar: 250,
  avatarOverhang: 30,
  bubbleTop: 875,
  bubbleHeight: 190,
  bubbleInset: 280,
  textPadding: 28,
  subtitleSize: 42,
  panelSize: 56,
  densePanelSize: 38,
  topSize: 36,
  counterSize: 38,
  bottomTextPadding: 12,
  timerSize: 38,
  tail: 22,
  timerWidth: 310,
  timerHeight: 68,
  badgeSize: 32,
  lineHeight: 1.5,
  minimumPanelSize: 12,
  panelSizeStep: 2,
} as const;

export function canvasWidth(ratio?: '16:9' | '4:3') {
  return ratio === '4:3' ? STYLE.classicWidth : STYLE.wideWidth;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export function layout(width: number, duo: boolean, bottom: boolean) {
  const s = STYLE;
  const main: Rect = {
    x: s.margin,
    y: s.margin,
    w: width * s.mainFraction - s.gap / 2 - s.margin,
    h: Math.round(s.height * s.mainHeight) - s.margin,
  };
  const right = {
    x: width * s.mainFraction + s.gap / 2,
    w: width * (1 - s.mainFraction) - s.gap / 2 - s.margin,
  };
  const top = { ...right, y: s.margin, h: s.topHeight };
  const low = {
    ...right,
    y: main.y + main.h - s.bottomHeight,
    h: s.bottomHeight,
  };
  const middle = {
    ...right,
    y: top.y + top.h + s.gap,
    h: (bottom ? low.y - s.gap : main.y + main.h) - (top.y + top.h + s.gap),
  };
  const bubble = {
    x: s.bubbleInset,
    y: s.bubbleTop,
    w: width - s.bubbleInset - (duo ? s.bubbleInset : s.margin),
    h: s.bubbleHeight,
  };
  return { main, top, middle, bottom: low, bubble };
}
export function inner(rect: Rect): Rect {
  return {
    x: rect.x + STYLE.border,
    y: rect.y + STYLE.border,
    w: rect.w - STYLE.border * 2,
    h: rect.h - STYLE.border * 2,
  };
}

import type { PuruPuruEffectAnchor } from '../types/settings';
import type { PuruPuruEmotionEffect } from './purupuruReactions';

export interface PuruPuruEffectGeometry {
  width: number;
  height: number;
  anchor: PuruPuruEffectAnchor;
}

interface ColorGrade {
  color: string;
  alpha: number;
}

interface AuraStyle {
  xRatio: number;
  yRatio: number;
  radiusRatio: number;
  color: string;
  pulse: boolean;
}

const MIN_EFFECT_WEIGHT = 0.002;
const TWO_PI = Math.PI * 2;

const COLOR_GRADES: Record<PuruPuruEmotionEffect, ColorGrade> = {
  happy: { color: '#ffd05e', alpha: 0.06 },
  surprised: { color: '#fff1ad', alpha: 0.09 },
  sad: { color: '#5596df', alpha: 0.11 },
  angry: { color: '#ef5368', alpha: 0.07 },
  relaxed: { color: '#83ddc8', alpha: 0.055 },
  thinking: { color: '#82aee8', alpha: 0.045 },
};

const AURA_STYLES: Record<PuruPuruEmotionEffect, AuraStyle> = {
  happy: {
    xRatio: 0,
    yRatio: 0,
    radiusRatio: 0.36,
    color: 'rgba(255, 205, 70, 0.32)',
    pulse: true,
  },
  surprised: {
    xRatio: 0,
    yRatio: 0,
    radiusRatio: 0.34,
    color: 'rgba(255, 244, 170, 0.32)',
    pulse: true,
  },
  sad: {
    xRatio: 0,
    yRatio: 0.05,
    radiusRatio: 0.38,
    color: 'rgba(72, 145, 230, 0.28)',
    pulse: false,
  },
  angry: {
    xRatio: 0,
    yRatio: 0,
    radiusRatio: 0.4,
    color: 'rgba(238, 52, 73, 0.34)',
    pulse: true,
  },
  relaxed: {
    xRatio: 0,
    yRatio: 0,
    radiusRatio: 0.4,
    color: 'rgba(114, 232, 206, 0.24)',
    pulse: true,
  },
  thinking: {
    xRatio: 0.05,
    yRatio: 0,
    radiusRatio: 0.34,
    color: 'rgba(132, 178, 255, 0.2)',
    pulse: false,
  },
};

const HAPPY_SPARKLE_POSITIONS = [
  [-0.28, -0.09],
  [0.3, -0.05],
  [-0.34, 0.08],
  [0.33, 0.14],
  [-0.2, 0.2],
  [0.22, 0.25],
] as const;

const ANGER_MARK_ARMS = [
  [-1, -1, -0.2, -0.2],
  [1, -1, 0.2, -0.2],
  [-1, 1, -0.2, 0.2],
  [1, 1, 0.2, 0.2],
] as const;

const RELAXED_BUBBLES = [
  [-0.3, 0.14, 0.025],
  [0.31, 0.04, 0.018],
  [-0.24, -0.12, 0.014],
  [0.27, 0.21, 0.03],
] as const;

export function drawPuruPuruReactionColorGrade(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  effect: PuruPuruEmotionEffect | null,
  weight: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;

  const grade = COLOR_GRADES[effect];
  context.save();
  context.globalCompositeOperation = 'source-atop';
  context.globalAlpha = amount * grade.alpha;
  context.fillStyle = grade.color;
  context.fillRect(
    -geometry.width / 2,
    -geometry.height / 2,
    geometry.width,
    geometry.height,
  );
  context.restore();
}

export function drawPuruPuruReactionBackEffect(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  effect: PuruPuruEmotionEffect | null,
  weight: number,
  now: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;

  const style = AURA_STYLES[effect];
  const { anchor } = geometry;
  const faceX = geometry.width * anchor.faceX;
  const faceY = geometry.height * anchor.faceY;
  const pulse = style.pulse ? 0.92 + Math.sin(now * 0.004) * 0.08 : 1;
  const x = faceX + geometry.width * style.xRatio * anchor.effectScale;
  const y = faceY + geometry.height * style.yRatio * anchor.effectScale;
  const radius =
    geometry.width * style.radiusRatio * pulse * anchor.effectScale;

  drawAura(context, x, y, radius, style.color, amount);
  if (effect === 'surprised') {
    drawPulseRing(
      context,
      faceX,
      faceY,
      geometry.width * 0.3 * anchor.effectScale,
      amount,
      now,
    );
  }
}

export function drawPuruPuruReactionFrontEffect(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  effect: PuruPuruEmotionEffect | null,
  weight: number,
  now: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;

  const faceX = geometry.width * geometry.anchor.faceX;
  const faceY = geometry.height * geometry.anchor.faceY;
  const time = now / 1000;

  if (effect === 'happy') {
    drawHappyEffect(context, geometry, faceX, faceY, amount, time);
  } else if (effect === 'surprised') {
    drawSurprisedEffect(context, geometry, faceX, faceY, amount, time);
  } else if (effect === 'sad') {
    drawSadEffect(context, geometry, amount, time);
  } else if (effect === 'angry') {
    drawAngerMark(
      context,
      faceX + geometry.width * 0.25 * geometry.anchor.effectScale,
      faceY - geometry.height * 0.16 * geometry.anchor.effectScale,
      geometry.width * 0.06 * geometry.anchor.effectScale,
      amount,
    );
  } else if (effect === 'relaxed') {
    drawFloatingBubbles(context, geometry, faceX, faceY, amount, time);
  } else {
    drawThinkingMark(context, geometry, faceX, faceY, amount, time);
  }
}

export function drawPuruPuruEffectAnchorGuides(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
): void {
  const { anchor, width, height } = geometry;
  const markerRadius = Math.max(width * 0.018, 5);
  drawAnchorMarker(
    context,
    width * anchor.faceX,
    height * anchor.faceY,
    markerRadius * 1.25,
    '#ffc857',
    '顔',
  );
  drawAnchorMarker(
    context,
    width * anchor.leftEyeX,
    height * anchor.leftEyeY,
    markerRadius,
    '#66d9ff',
    '左',
  );
  drawAnchorMarker(
    context,
    width * anchor.rightEyeX,
    height * anchor.rightEyeY,
    markerRadius,
    '#ff91ca',
    '右',
  );
}

function drawHappyEffect(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  faceX: number,
  faceY: number,
  amount: number,
  time: number,
): void {
  HAPPY_SPARKLE_POSITIONS.forEach(([xRatio, yRatio], index) => {
    const shimmer = 0.55 + Math.sin(time * 4 + index * 1.4) * 0.45;
    drawSparkle(
      context,
      faceX + geometry.width * xRatio * geometry.anchor.effectScale,
      faceY + geometry.height * yRatio * geometry.anchor.effectScale,
      geometry.width *
        (0.015 + (index % 2) * 0.006) *
        geometry.anchor.effectScale,
      amount * shimmer,
    );
  });
}

function drawSurprisedEffect(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  faceX: number,
  faceY: number,
  amount: number,
  time: number,
): void {
  const scale = geometry.anchor.effectScale;
  drawSurpriseRays(context, geometry.width * scale, faceX, faceY, amount, time);
  drawEmotionText(
    context,
    '!',
    faceX + geometry.width * 0.28 * scale,
    faceY - geometry.height * 0.18 * scale,
    geometry.width * 0.09 * scale,
    '#fff4a8',
    amount,
  );
}

function drawSadEffect(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  amount: number,
  time: number,
): void {
  const fall = (time * geometry.height * 0.07) % (geometry.height * 0.08);
  drawTeardrop(
    context,
    geometry.width * geometry.anchor.leftEyeX,
    geometry.height * geometry.anchor.leftEyeY + fall,
    geometry.width * 0.018 * geometry.anchor.effectScale,
    amount,
  );
  drawTeardrop(
    context,
    geometry.width * geometry.anchor.rightEyeX,
    geometry.height * geometry.anchor.rightEyeY + fall * 0.7,
    geometry.width * 0.014 * geometry.anchor.effectScale,
    amount * 0.8,
  );
}

function drawAura(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  context.save();
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.58, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.globalAlpha = alpha;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TWO_PI);
  context.fill();
  context.restore();
}

function drawPulseRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseRadius: number,
  alpha: number,
  now: number,
): void {
  const progress = (now % 900) / 900;
  context.save();
  context.globalAlpha = alpha * (1 - progress) * 0.55;
  context.strokeStyle = '#fff4a8';
  context.lineWidth = baseRadius * 0.022;
  context.beginPath();
  context.arc(x, y, baseRadius * (0.72 + progress * 0.38), 0, TWO_PI);
  context.stroke();
  context.restore();
}

function drawSparkle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = '#ffe47a';
  context.shadowColor = '#fff2a6';
  context.shadowBlur = radius;
  context.beginPath();
  context.moveTo(x, y - radius * 1.5);
  context.quadraticCurveTo(x, y, x + radius * 1.5, y);
  context.quadraticCurveTo(x, y, x, y + radius * 1.5);
  context.quadraticCurveTo(x, y, x - radius * 1.5, y);
  context.quadraticCurveTo(x, y, x, y - radius * 1.5);
  context.fill();
  context.restore();
}

function drawSurpriseRays(
  context: CanvasRenderingContext2D,
  width: number,
  faceX: number,
  faceY: number,
  alpha: number,
  time: number,
): void {
  context.save();
  context.translate(faceX, faceY);
  context.rotate(Math.sin(time * 2.5) * 0.025);
  context.globalAlpha = alpha * 0.72;
  context.strokeStyle = '#fff4a8';
  context.lineCap = 'round';
  context.lineWidth = width * 0.008;
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * TWO_PI;
    const inner = width * 0.31;
    const outer = width * (0.35 + (index % 2) * 0.025);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }
  context.restore();
}

function drawTeardrop(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = '#75c7ff';
  context.strokeStyle = 'rgba(225, 248, 255, 0.9)';
  context.lineWidth = radius * 0.2;
  context.beginPath();
  context.moveTo(x, y - radius * 1.6);
  context.bezierCurveTo(
    x - radius * 0.3,
    y - radius * 0.6,
    x - radius,
    y,
    x,
    y + radius,
  );
  context.bezierCurveTo(
    x + radius,
    y,
    x + radius * 0.3,
    y - radius * 0.6,
    x,
    y - radius * 1.6,
  );
  context.fill();
  context.stroke();
  context.restore();
}

function drawAngerMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
): void {
  context.save();
  context.translate(x, y);
  context.globalAlpha = alpha;
  context.strokeStyle = '#ff5168';
  context.shadowColor = '#ff5168';
  context.shadowBlur = size * 0.28;
  context.lineWidth = size * 0.18;
  context.lineCap = 'round';
  for (const [x1, y1, x2, y2] of ANGER_MARK_ARMS) {
    context.beginPath();
    context.moveTo(x1 * size, y1 * size);
    context.lineTo(x2 * size, y2 * size);
    context.stroke();
  }
  context.restore();
}

function drawFloatingBubbles(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  faceX: number,
  faceY: number,
  alpha: number,
  time: number,
): void {
  const scale = geometry.anchor.effectScale;
  for (const [xRatio, yRatio, sizeRatio] of RELAXED_BUBBLES) {
    const floatOffset =
      Math.sin(time * 1.4 + xRatio * 8) * geometry.height * 0.014 * scale;
    context.save();
    context.globalAlpha = alpha * 0.56;
    context.fillStyle = 'rgba(175, 255, 237, 0.22)';
    context.strokeStyle = '#a8f3df';
    context.lineWidth = geometry.width * 0.004 * scale;
    context.beginPath();
    context.arc(
      faceX + geometry.width * xRatio * scale,
      faceY + geometry.height * yRatio * scale + floatOffset,
      geometry.width * sizeRatio * scale,
      0,
      TWO_PI,
    );
    context.fill();
    context.stroke();
    context.restore();
  }
}

function drawThinkingMark(
  context: CanvasRenderingContext2D,
  geometry: PuruPuruEffectGeometry,
  faceX: number,
  faceY: number,
  alpha: number,
  time: number,
): void {
  const scale = geometry.anchor.effectScale;
  const floatOffset = Math.sin(time * 1.8) * geometry.height * 0.012 * scale;
  const x = faceX + geometry.width * 0.27 * scale;
  const y = faceY - geometry.height * 0.14 * scale + floatOffset;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = 'rgba(42, 61, 94, 0.84)';
  context.strokeStyle = '#b8d4ff';
  context.lineWidth = geometry.width * 0.006 * scale;
  context.beginPath();
  context.arc(x, y, geometry.width * 0.075 * scale, 0, TWO_PI);
  context.fill();
  context.stroke();
  context.restore();
  drawEmotionText(
    context,
    '?',
    x,
    y + geometry.width * 0.004 * scale,
    geometry.width * 0.075 * scale,
    '#dceaff',
    alpha,
  );
  for (let index = 0; index < 2; index += 1) {
    context.save();
    context.globalAlpha = alpha * (0.72 - index * 0.16);
    context.fillStyle = '#b8d4ff';
    context.beginPath();
    context.arc(
      x - geometry.width * (0.09 + index * 0.045) * scale,
      y + geometry.height * (0.075 + index * 0.045) * scale,
      geometry.width * (0.014 - index * 0.003) * scale,
      0,
      TWO_PI,
    );
    context.fill();
    context.restore();
  }
}

function drawAnchorMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  label: string,
): void {
  context.save();
  context.globalAlpha = 0.95;
  context.strokeStyle = color;
  context.fillStyle = 'rgba(15, 23, 42, 0.78)';
  context.lineWidth = Math.max(radius * 0.18, 2);
  context.beginPath();
  context.arc(x, y, radius, 0, TWO_PI);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(x - radius * 1.45, y);
  context.lineTo(x + radius * 1.45, y);
  context.moveTo(x, y - radius * 1.45);
  context.lineTo(x, y + radius * 1.45);
  context.stroke();
  context.fillStyle = color;
  context.font = `700 ${Math.max(radius, 9)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.fillText(label, x, y - radius * 1.65);
  context.restore();
}

function drawEmotionText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.strokeStyle = 'rgba(22, 33, 62, 0.72)';
  context.lineWidth = size * 0.08;
  context.font = `700 ${size}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.strokeText(text, x, y);
  context.fillText(text, x, y);
  context.restore();
}

function clampWeight(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

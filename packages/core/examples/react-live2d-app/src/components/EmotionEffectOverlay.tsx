import { useEffect, useRef, type MutableRefObject } from 'react';
import type { EmotionEffectAnchor } from '../lib/emotionEffectAnchor';

type EmotionEffect =
  | 'happy'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'relaxed'
  | 'thinking';

export interface EmotionEffectReactionLike {
  id: number;
  effect: EmotionEffect;
  durationMs?: number;
}

interface EffectPlayback {
  effect: EmotionEffect | null;
  weight: number;
}

export interface EmotionEffectGeometry {
  faceX: number;
  faceY: number;
  leftEyeX: number;
  leftEyeY: number;
  rightEyeX: number;
  rightEyeY: number;
  unit: number;
}

interface EmotionEffectOverlayProps {
  reaction: EmotionEffectReactionLike | null;
  anchor: EmotionEffectAnchor;
  geometryRef?: MutableRefObject<EmotionEffectGeometry | null>;
  anchorEditorOpen?: boolean;
  onAnchorPoint?: (x: number, y: number) => void;
}

const EFFECT_FADE_IN_MS = 180;
const EFFECT_FADE_OUT_MS = 320;
const MIN_EFFECT_WEIGHT = 0.002;
const TWO_PI = Math.PI * 2;
const AURA_COLORS: Record<EmotionEffect, string> = {
  happy: 'rgba(255, 205, 70, 0.34)',
  surprised: 'rgba(255, 242, 160, 0.36)',
  sad: 'rgba(72, 145, 230, 0.3)',
  angry: 'rgba(238, 52, 73, 0.36)',
  relaxed: 'rgba(114, 232, 206, 0.28)',
  thinking: 'rgba(132, 178, 255, 0.24)',
};

function useEmotionEffectPlayback(
  reaction: EmotionEffectReactionLike | null,
): MutableRefObject<EffectPlayback> {
  const playbackRef = useRef<EffectPlayback>({ effect: null, weight: 0 });

  useEffect(() => {
    let animationFrame = 0;
    const start = performance.now();
    const startPlayback = playbackRef.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (!reaction) {
        const weight = Math.max(
          0,
          startPlayback.weight * (1 - elapsed / EFFECT_FADE_OUT_MS),
        );
        playbackRef.current = {
          effect: weight > 0 ? startPlayback.effect : null,
          weight,
        };
        if (weight > 0) animationFrame = requestAnimationFrame(tick);
        return;
      }

      const fadeIn = Math.min(elapsed / EFFECT_FADE_IN_MS, 1);
      const fadeOut = reaction.durationMs
        ? Math.max(
            0,
            Math.min((reaction.durationMs - elapsed) / EFFECT_FADE_OUT_MS, 1),
          )
        : 1;
      const weight = Math.min(fadeIn, fadeOut);
      playbackRef.current = {
        effect: weight > 0 ? reaction.effect : null,
        weight,
      };
      if (!reaction.durationMs || elapsed < reaction.durationMs) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [reaction]);

  return playbackRef;
}

export function EmotionEffectOverlay({
  reaction,
  anchor,
  geometryRef,
  anchorEditorOpen = false,
  onAnchorPoint,
}: EmotionEffectOverlayProps) {
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useEmotionEffectPlayback(reaction);

  useEffect(() => {
    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    const container = frontCanvas?.parentElement;
    if (!backCanvas || !frontCanvas || !container) return;

    let animationFrame = 0;
    let width = 1;
    let height = 1;
    let devicePixelRatio = 1;

    const resize = () => {
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      for (const canvas of [backCanvas, frontCanvas]) {
        canvas.width = Math.round(width * devicePixelRatio);
        canvas.height = Math.round(height * devicePixelRatio);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const draw = (now: number) => {
      const backContext = backCanvas.getContext('2d');
      const frontContext = frontCanvas.getContext('2d');
      if (backContext && frontContext) {
        for (const context of [backContext, frontContext]) {
          context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
          context.clearRect(0, 0, width, height);
        }
        const playback = playbackRef.current;
        const geometry =
          geometryRef?.current || createViewportGeometry(width, height, anchor);
        drawEmotionEffectBack(
          backContext,
          geometry,
          playback.effect,
          playback.weight,
          now,
        );
        drawEmotionEffectFront(
          frontContext,
          geometry,
          playback.effect,
          playback.weight,
          now,
        );
        if (anchorEditorOpen) {
          drawEmotionEffectAnchorGuides(frontContext, geometry);
        }
      }
      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [anchor, anchorEditorOpen, geometryRef, playbackRef]);

  return (
    <>
      <canvas
        ref={backCanvasRef}
        className="avatar-effect-canvas is-back"
        aria-hidden="true"
      />
      <canvas
        ref={frontCanvasRef}
        className={`avatar-effect-canvas is-front${
          anchorEditorOpen ? ' is-anchor-editing' : ''
        }`}
        aria-hidden={!anchorEditorOpen}
        aria-label={
          anchorEditorOpen ? '感情表現エフェクトアンカー配置エリア' : undefined
        }
        onPointerDown={(event) => {
          if (!anchorEditorOpen || !onAnchorPoint || event.button !== 0) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return;
          event.preventDefault();
          event.stopPropagation();
          onAnchorPoint(
            ((event.clientX - bounds.left) / bounds.width) *
              event.currentTarget.clientWidth,
            ((event.clientY - bounds.top) / bounds.height) *
              event.currentTarget.clientHeight,
          );
        }}
      />
    </>
  );
}

function createViewportGeometry(
  width: number,
  height: number,
  anchor: EmotionEffectAnchor,
): EmotionEffectGeometry {
  return {
    faceX: width * anchor.faceX,
    faceY: height * anchor.faceY,
    leftEyeX: width * anchor.leftEyeX,
    leftEyeY: height * anchor.leftEyeY,
    rightEyeX: width * anchor.rightEyeX,
    rightEyeY: height * anchor.rightEyeY,
    unit: Math.min(width, height) * anchor.effectScale,
  };
}

function drawEmotionEffectBack(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  effect: EmotionEffect | null,
  weight: number,
  now: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;
  const unit = Math.max(geometry.unit, 1);
  const pulse = 0.94 + Math.sin(now * 0.004) * 0.06;
  const radiusScale = effect === 'angry' ? 0.45 : 0.39;
  drawAura(
    context,
    geometry.faceX,
    geometry.faceY,
    unit * radiusScale * pulse,
    AURA_COLORS[effect],
    amount,
  );

  if (effect === 'surprised') {
    const ringProgress = (now % 1100) / 1100;
    context.save();
    context.globalAlpha = amount * (1 - ringProgress) * 0.7;
    context.strokeStyle = '#fff0a0';
    context.lineWidth = Math.max(2, unit * 0.008);
    context.beginPath();
    context.arc(
      geometry.faceX,
      geometry.faceY,
      unit * (0.2 + ringProgress * 0.22),
      0,
      TWO_PI,
    );
    context.stroke();
    context.restore();
  }
}

function drawEmotionEffectFront(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  effect: EmotionEffect | null,
  weight: number,
  now: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;
  if (effect === 'happy') drawHappy(context, geometry, amount, now);
  if (effect === 'surprised') drawSurprised(context, geometry, amount, now);
  if (effect === 'sad') drawSad(context, geometry, amount, now);
  if (effect === 'angry') drawAngry(context, geometry, amount, now);
  if (effect === 'relaxed') drawRelaxed(context, geometry, amount, now);
  if (effect === 'thinking') drawThinking(context, geometry, amount, now);
}

function drawHappy(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const positions = [
    [-0.3, -0.16],
    [0.31, -0.12],
    [-0.34, 0.05],
    [0.34, 0.09],
    [-0.22, 0.2],
    [0.24, 0.22],
  ];
  positions.forEach(([offsetX, offsetY], index) => {
    const twinkle = 0.7 + Math.sin(now * 0.006 + index * 1.7) * 0.3;
    drawSparkle(
      context,
      geometry.faceX + geometry.unit * offsetX,
      geometry.faceY + geometry.unit * offsetY,
      geometry.unit * (0.025 + (index % 2) * 0.009) * twinkle,
      amount,
    );
  });
}

function drawSurprised(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const pulse = 0.92 + Math.sin(now * 0.008) * 0.08;
  context.save();
  context.globalAlpha = amount;
  context.strokeStyle = '#fff2a7';
  context.lineCap = 'round';
  context.lineWidth = Math.max(3, geometry.unit * 0.012);
  for (let index = 0; index < 10; index += 1) {
    const angle = (TWO_PI * index) / 10 - Math.PI / 2;
    const inner = geometry.unit * 0.27 * pulse;
    const outer = geometry.unit * (index % 2 ? 0.38 : 0.43) * pulse;
    context.beginPath();
    context.moveTo(
      geometry.faceX + Math.cos(angle) * inner,
      geometry.faceY + Math.sin(angle) * inner,
    );
    context.lineTo(
      geometry.faceX + Math.cos(angle) * outer,
      geometry.faceY + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.restore();
}

function drawSad(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const fall = ((now / 1000) % 1.1) * geometry.unit * 0.1;
  drawTear(
    context,
    geometry.leftEyeX,
    geometry.leftEyeY + geometry.unit * 0.045 + fall,
    geometry.unit * 0.018,
    amount,
  );
  drawTear(
    context,
    geometry.rightEyeX,
    geometry.rightEyeY + geometry.unit * 0.05 + fall * 0.7,
    geometry.unit * 0.014,
    amount * 0.85,
  );
}

function drawAngry(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const pulse = 0.9 + Math.sin(now * 0.012) * 0.1;
  const centerX = geometry.faceX + geometry.unit * 0.25;
  const centerY = geometry.faceY - geometry.unit * 0.17;
  const size = geometry.unit * 0.07 * pulse;
  context.save();
  context.globalAlpha = amount;
  context.strokeStyle = '#ef4359';
  context.lineWidth = Math.max(4, geometry.unit * 0.014);
  context.lineCap = 'round';
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    context.beginPath();
    context.moveTo(centerX + sx * size, centerY + sy * size);
    context.lineTo(centerX + sx * size * 0.25, centerY + sy * size * 0.25);
    context.lineTo(centerX + sx * size * 0.25, centerY - sy * size * 0.45);
    context.stroke();
  }
  context.restore();
}

function drawRelaxed(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const bubbles = [
    [-0.3, 0.13, 0.035],
    [0.31, 0.05, 0.024],
    [-0.24, -0.12, 0.02],
    [0.27, 0.2, 0.042],
  ];
  bubbles.forEach(([offsetX, offsetY, radius], index) => {
    const drift = Math.sin(now * 0.0015 + index) * geometry.unit * 0.015;
    context.save();
    context.globalAlpha = amount * 0.8;
    context.strokeStyle = '#9af1df';
    context.lineWidth = Math.max(2, geometry.unit * 0.007);
    context.beginPath();
    context.arc(
      geometry.faceX + geometry.unit * offsetX + drift,
      geometry.faceY + geometry.unit * offsetY - drift,
      geometry.unit * radius,
      0,
      TWO_PI,
    );
    context.stroke();
    context.restore();
  });
}

function drawThinking(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const drift = Math.sin(now * 0.002) * geometry.unit * 0.012;
  const centerX = geometry.faceX + geometry.unit * 0.29;
  const centerY = geometry.faceY - geometry.unit * 0.16 + drift;
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = 'rgba(210, 228, 255, 0.88)';
  context.strokeStyle = '#79a9ed';
  context.lineWidth = Math.max(2, geometry.unit * 0.007);
  for (const [offsetX, offsetY, radius] of [
    [0, 0, 0.055],
    [0.055, -0.01, 0.045],
    [-0.05, 0.008, 0.04],
    [-0.08, 0.08, 0.018],
    [-0.13, 0.13, 0.012],
  ]) {
    context.beginPath();
    context.arc(
      centerX + geometry.unit * offsetX,
      centerY + geometry.unit * offsetY,
      geometry.unit * radius,
      0,
      TWO_PI,
    );
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawEmotionEffectAnchorGuides(
  context: CanvasRenderingContext2D,
  geometry: EmotionEffectGeometry,
) {
  drawAnchorMarker(context, geometry.faceX, geometry.faceY, '#ffcf5a', '顔');
  drawAnchorMarker(
    context,
    geometry.leftEyeX,
    geometry.leftEyeY,
    '#63c8ff',
    '左目',
  );
  drawAnchorMarker(
    context,
    geometry.rightEyeX,
    geometry.rightEyeY,
    '#ff82b2',
    '右目',
  );
}

function drawAnchorMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 8, 0, Math.PI * 2);
  context.moveTo(x - 12, y);
  context.lineTo(x + 12, y);
  context.moveTo(x, y - 12);
  context.lineTo(x, y + 12);
  context.stroke();
  context.font = 'bold 12px sans-serif';
  context.fillText(label, x + 12, y - 10);
  context.restore();
}

function drawSparkle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = '#ffe775';
  context.strokeStyle = '#fff6bf';
  context.lineWidth = Math.max(1.5, radius * 0.18);
  context.beginPath();
  context.moveTo(x, y - radius * 1.8);
  context.lineTo(x + radius * 0.45, y - radius * 0.45);
  context.lineTo(x + radius * 1.8, y);
  context.lineTo(x + radius * 0.45, y + radius * 0.45);
  context.lineTo(x, y + radius * 1.8);
  context.lineTo(x - radius * 0.45, y + radius * 0.45);
  context.lineTo(x - radius * 1.8, y);
  context.lineTo(x - radius * 0.45, y - radius * 0.45);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawTear(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = 'rgba(93, 190, 255, 0.92)';
  context.strokeStyle = '#d6f3ff';
  context.lineWidth = Math.max(1.5, radius * 0.18);
  context.beginPath();
  context.moveTo(x, y - radius * 1.4);
  context.bezierCurveTo(
    x + radius * 1.15,
    y - radius * 0.2,
    x + radius,
    y + radius * 1.2,
    x,
    y + radius * 1.35,
  );
  context.bezierCurveTo(
    x - radius,
    y + radius * 1.2,
    x - radius * 1.15,
    y - radius * 0.2,
    x,
    y - radius * 1.4,
  );
  context.fill();
  context.stroke();
  context.restore();
}

function drawAura(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  amount: number,
): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.6, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TWO_PI);
  context.fill();
  context.restore();
}

function clampWeight(weight: number): number {
  return Math.min(Math.max(Number.isFinite(weight) ? weight : 0, 0), 1);
}

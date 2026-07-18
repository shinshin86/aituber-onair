export type EmotionEffect =
  | 'happy'
  | 'surprised'
  | 'sad'
  | 'angry'
  | 'relaxed'
  | 'thinking';

const AURA_COLORS: Record<EmotionEffect, string> = {
  happy: 'rgba(255, 205, 70, 0.34)',
  surprised: 'rgba(255, 242, 160, 0.36)',
  sad: 'rgba(72, 145, 230, 0.3)',
  angry: 'rgba(238, 52, 73, 0.36)',
  relaxed: 'rgba(114, 232, 206, 0.28)',
  thinking: 'rgba(132, 178, 255, 0.24)',
};

export function drawEmotionEffectAura(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  effect: EmotionEffect,
  amount: number,
): void {
  const color = AURA_COLORS[effect];
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.6, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

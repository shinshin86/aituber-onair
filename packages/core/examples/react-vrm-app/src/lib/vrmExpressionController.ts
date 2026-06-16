import type { VRM } from '@pixiv/three-vrm';

const EMOTION_NAMES = [
  'neutral',
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
] as const;

type ExpressionNameCandidate = string | readonly string[];

export interface VrmExpressionPart {
  name: ExpressionNameCandidate;
  intensity?: number;
  fadeMs?: number;
  holdMs?: number;
}

interface ExpressionChannel {
  current: number;
  target: number;
  fadeMs: number;
  holdUntil: number | null;
}

export class VrmExpressionController {
  readonly available: ReadonlySet<string>;

  private readonly expressionManager: NonNullable<VRM['expressionManager']>;
  private readonly channels = new Map<string, ExpressionChannel>();
  private blinkWaitSeconds = 1 + Math.random() * 3;
  private blinkElapsedSeconds: number | null = null;

  autoBlink = true;

  constructor(vrm: VRM) {
    if (!vrm.expressionManager) {
      throw new Error('VRM expression manager is unavailable.');
    }

    this.expressionManager = vrm.expressionManager;
    this.available = new Set(
      this.expressionManager.expressions.map(
        (expression) => expression.expressionName,
      ),
    );
  }

  resolveExpressionName(candidate: ExpressionNameCandidate): string | null {
    if (typeof candidate !== 'string') {
      return (
        candidate.find((name) => this.available.has(name.toString())) ?? null
      );
    }

    return this.available.has(candidate) ? candidate : null;
  }

  set(
    candidate: ExpressionNameCandidate,
    intensity = 1,
    fadeMs = 150,
    holdMs: number | null = null,
  ): boolean {
    const name = this.resolveExpressionName(candidate);
    if (!name) {
      return false;
    }

    const channel = this.getChannel(name);
    channel.target = clamp01(intensity);
    channel.fadeMs = Math.max(1, fadeMs);
    channel.holdUntil =
      holdMs == null ? null : window.performance.now() + Math.max(0, holdMs);
    return true;
  }

  emote(
    name: string,
    intensity = 1,
    fadeMs = 250,
    holdMs: number | null = null,
  ) {
    for (const emotionName of EMOTION_NAMES) {
      if (emotionName !== name) {
        this.set(emotionName, 0, fadeMs);
      }
    }

    if (name !== 'neutral') {
      this.set(name, intensity, fadeMs, holdMs);
    }
  }

  gesture(
    parts: readonly VrmExpressionPart[],
    fadeMs = 200,
    holdMs: number | null = null,
  ) {
    for (const part of parts) {
      this.set(
        part.name,
        part.intensity ?? 1,
        part.fadeMs ?? fadeMs,
        part.holdMs ?? holdMs,
      );
    }
  }

  reset(fadeMs = 200) {
    for (const name of this.channels.keys()) {
      this.set(name, 0, fadeMs);
    }
  }

  update(deltaSeconds: number) {
    const now = window.performance.now();
    const blinkWeight = this.updateBlink(deltaSeconds);

    for (const [name, channel] of this.channels) {
      if (channel.holdUntil != null && now >= channel.holdUntil) {
        channel.target = 0;
        channel.holdUntil = null;
      }

      const k = Math.min(1, (deltaSeconds * 1000) / channel.fadeMs);
      channel.current += (channel.target - channel.current) * k;
      if (Math.abs(channel.current - channel.target) < 0.001) {
        channel.current = channel.target;
      }
      this.expressionManager.setValue(name, channel.current);
    }

    const blinkName = this.resolveExpressionName([
      'blink',
      'eyeBlink',
      'eyeBlinkLeft',
      'eyeBlinkRight',
    ]);
    const manualBlink = blinkName ? this.channels.get(blinkName) : null;
    if (
      blinkWeight != null &&
      blinkName &&
      (!manualBlink || manualBlink.target === 0)
    ) {
      this.expressionManager.setValue(blinkName, blinkWeight);
    }
  }

  private getChannel(name: string): ExpressionChannel {
    const existing = this.channels.get(name);
    if (existing) return existing;

    const channel: ExpressionChannel = {
      current: 0,
      target: 0,
      fadeMs: 150,
      holdUntil: null,
    };
    this.channels.set(name, channel);
    return channel;
  }

  private updateBlink(deltaSeconds: number): number | null {
    if (!this.autoBlink || this.blinkElapsedSeconds == null) {
      this.blinkWaitSeconds -= deltaSeconds;
      if (this.autoBlink && this.blinkWaitSeconds <= 0) {
        this.blinkElapsedSeconds = 0;
        this.blinkWaitSeconds = 1.5 + Math.random() * 4;
      }
    }

    if (this.blinkElapsedSeconds == null) {
      return null;
    }

    this.blinkElapsedSeconds += deltaSeconds;
    const elapsed = this.blinkElapsedSeconds;

    if (elapsed < 0.08) return elapsed / 0.08;
    if (elapsed < 0.12) return 1;
    if (elapsed < 0.25) return 1 - (elapsed - 0.12) / 0.13;

    this.blinkElapsedSeconds = null;
    return null;
  }
}

export type VrmOneShotAnimationName = 'laugh' | 'pout' | 'teary';

export async function runVrmOneShotAnimation(
  name: VrmOneShotAnimationName,
  setExpression: (
    name: ExpressionNameCandidate,
    intensity: number,
    fadeMs?: number,
  ) => void,
  isAlive: () => boolean,
) {
  if (name === 'laugh') {
    setExpression('happy', 0.85);
    for (let i = 0; i < 8 && isAlive(); i += 1) {
      setExpression('aa', i % 2 ? 0.45 : 0.12, 100);
      await sleep(130);
    }
    setExpression('aa', 0, 100);
    await sleep(450);
    if (!isAlive()) return;
    setExpression('happy', 0, 300);
    setExpression('relaxed', 0.4, 250);
    await sleep(650);
    return;
  }

  if (name === 'pout') {
    setExpression('angry', 0.8);
    setExpression('browDownLeft', 0.5);
    setExpression('browDownRight', 0.5);
    for (let i = 0; i < 3 && isAlive(); i += 1) {
      setExpression('mouthPucker', 0.7, 120);
      await sleep(260);
      setExpression('mouthPucker', 0.25, 120);
      await sleep(220);
    }
    await sleep(500);
    return;
  }

  for (let value = 0.2; value <= 0.85 && isAlive(); value += 0.16) {
    setExpression('sad', value, 140);
    setExpression('browInnerUp', value, 140);
    await sleep(180);
  }
  for (let i = 0; i < 3 && isAlive(); i += 1) {
    setExpression(['blink', 'eyeBlinkLeft', 'eyeBlinkRight'], 1, 60);
    await sleep(110);
    setExpression(['blink', 'eyeBlinkLeft', 'eyeBlinkRight'], 0, 80);
    await sleep(140);
  }
  if (!isAlive()) return;
  setExpression('mouthFrownLeft', 0.45, 160);
  setExpression('mouthFrownRight', 0.45, 160);
  await sleep(1000);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

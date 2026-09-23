export interface BouncyAvatarMotionState {
  y: number;
  velocityY: number;
  rotation: number;
  angularVelocity: number;
  squash: number;
  direction: 1 | -1;
  previousVoiceLevel: number;
  lastImpulseAt: number;
}

export interface BouncyAvatarMotionFrame {
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  impulseTriggered: boolean;
}

const GRAVITY = 1200;
const MIN_VOICE_LEVEL = 0.16;
const MIN_IMPULSE_INTERVAL_MS = 90;
const FORCED_IMPULSE_INTERVAL_MS = 230;
const MAX_JUMP_HEIGHT = -42;
const MAX_ROTATION = 0.13;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createBouncyAvatarMotionState(): BouncyAvatarMotionState {
  return {
    y: 0,
    velocityY: 0,
    rotation: 0,
    angularVelocity: 0,
    squash: 0,
    direction: 1,
    previousVoiceLevel: 0,
    lastImpulseAt: Number.NEGATIVE_INFINITY,
  };
}

export function advanceBouncyAvatarMotion(
  state: BouncyAvatarMotionState,
  voiceLevelInput: number,
  isSpeaking: boolean,
  nowMs: number,
  deltaSecondsInput: number,
): BouncyAvatarMotionFrame {
  const voiceLevel = clamp(voiceLevelInput, 0, 1);
  const deltaSeconds = clamp(deltaSecondsInput, 0, 0.034);
  const sinceImpulse = nowMs - state.lastImpulseAt;
  const risingEdge = voiceLevel - state.previousVoiceLevel >= 0.025;
  const canImpulse = state.y > -24 && sinceImpulse >= MIN_IMPULSE_INTERVAL_MS;
  const impulseTriggered =
    isSpeaking &&
    voiceLevel >= MIN_VOICE_LEVEL &&
    canImpulse &&
    (risingEdge || sinceImpulse >= FORCED_IMPULSE_INTERVAL_MS);

  if (impulseTriggered) {
    state.velocityY = -(190 + voiceLevel * 170);
    state.angularVelocity = state.direction * (0.7 + voiceLevel * 0.8);
    state.direction = state.direction === 1 ? -1 : 1;
    state.lastImpulseAt = nowMs;
    state.squash *= 0.35;
  }

  if (state.y < 0 || state.velocityY !== 0) {
    state.velocityY += GRAVITY * deltaSeconds;
    state.y += state.velocityY * deltaSeconds;
  }

  if (state.y > 0) {
    const impactSpeed = Math.max(state.velocityY, 0);
    state.y = 0;
    state.velocityY = 0;
    state.squash = Math.max(state.squash, clamp(impactSpeed / 520, 0, 1));
  } else if (state.y < MAX_JUMP_HEIGHT) {
    state.y = MAX_JUMP_HEIGHT;
    state.velocityY = Math.max(0, state.velocityY);
  }

  const rotationAcceleration = -state.rotation * 42;
  state.angularVelocity += rotationAcceleration * deltaSeconds;
  state.angularVelocity *= Math.exp(-7.5 * deltaSeconds);
  state.rotation += state.angularVelocity * deltaSeconds;
  state.rotation = clamp(state.rotation, -MAX_ROTATION, MAX_ROTATION);

  state.squash *= Math.exp(-14 * deltaSeconds);
  if (!isSpeaking && state.y === 0) {
    state.rotation *= Math.exp(-5 * deltaSeconds);
  }

  state.previousVoiceLevel = voiceLevel;

  const airborneStretch = clamp(-state.velocityY / 1200, -0.015, 0.025);
  return {
    y: state.y,
    rotation: state.rotation,
    scaleX: 1 + state.squash * 0.08 - airborneStretch * 0.35,
    scaleY: 1 - state.squash * 0.1 + airborneStretch,
    impulseTriggered,
  };
}

export function getMotionPreviewLevel(elapsedMs: number): number {
  if (elapsedMs < 0 || elapsedMs >= 3200) return 0;
  const beat = elapsedMs % 360;
  if (beat >= 190) return 0.04;
  return 0.18 + Math.sin((beat / 190) * Math.PI) * 0.72;
}

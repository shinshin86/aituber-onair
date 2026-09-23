export interface PuppetWobbleMotionState {
  y: number;
  velocityY: number;
  rotation: number;
  angularVelocity: number;
  phase: number;
}

export interface PuppetWobbleMotionFrame {
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

const VERTICAL_STIFFNESS = 120;
const VERTICAL_DAMPING = 12;
const ROTATION_STIFFNESS = 125;
const ROTATION_DAMPING = 10;
const MAX_OFFSET_Y = 15;
const MAX_ROTATION = 0.12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createPuppetWobbleMotionState(): PuppetWobbleMotionState {
  return {
    y: 0,
    velocityY: 0,
    rotation: 0,
    angularVelocity: 0,
    phase: 0,
  };
}

export function advancePuppetWobbleMotion(
  state: PuppetWobbleMotionState,
  voiceLevelInput: number,
  isSpeaking: boolean,
  deltaSecondsInput: number,
): PuppetWobbleMotionFrame {
  const voiceLevel = clamp(voiceLevelInput, 0, 1);
  const deltaSeconds = clamp(deltaSecondsInput, 0, 0.034);
  const energy = isSpeaking ? 0.2 + voiceLevel * 0.8 : 0;

  if (isSpeaking) {
    state.phase += deltaSeconds * (8.5 + voiceLevel * 5.5);
  }

  const targetY = isSpeaking
    ? -energy * 6.6 + Math.sin(state.phase * 1.6) * energy * 3.5
    : 0;
  const targetRotation = isSpeaking
    ? Math.sin(state.phase) * energy * MAX_ROTATION
    : 0;

  state.velocityY += (targetY - state.y) * VERTICAL_STIFFNESS * deltaSeconds;
  state.velocityY *= Math.exp(-VERTICAL_DAMPING * deltaSeconds);
  state.y += state.velocityY * deltaSeconds;
  state.y = clamp(state.y, -MAX_OFFSET_Y, 2);

  state.angularVelocity +=
    (targetRotation - state.rotation) * ROTATION_STIFFNESS * deltaSeconds;
  state.angularVelocity *= Math.exp(-ROTATION_DAMPING * deltaSeconds);
  state.rotation += state.angularVelocity * deltaSeconds;
  state.rotation = clamp(state.rotation, -MAX_ROTATION, MAX_ROTATION);

  const pulse = isSpeaking
    ? (Math.sin(state.phase * 2 + Math.PI / 2) + 1) / 2
    : 0;
  const squash = energy * pulse * 0.024;

  return {
    y: state.y,
    rotation: state.rotation,
    scaleX: 1 + squash,
    scaleY: 1 - squash * 0.72,
  };
}

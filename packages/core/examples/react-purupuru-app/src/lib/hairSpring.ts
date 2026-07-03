export interface HairSpringState {
  angle: number;
  angleVelocity: number;
  offsetX: number;
  offsetY: number;
  offsetVelocityX: number;
  offsetVelocityY: number;
  stretchX: number;
  stretchY: number;
  stretchVelocityX: number;
  stretchVelocityY: number;
}

export interface HairSpringInput {
  deltaSeconds: number;
  hairSpring: number;
  poseVelocityX: number;
  poseVelocityY: number;
  poseRotationVelocity: number;
  layerResponse: number;
}

export interface HairSpringOutput {
  angle: number;
  offsetX: number;
  offsetY: number;
  stretchX: number;
  stretchY: number;
}

const MAX_DELTA_SECONDS = 1 / 30;
const MAX_ANGLE = 0.075;
const MAX_OFFSET = 16;
const MAX_STRETCH_DELTA = 0.035;

export function createHairSpringState(): HairSpringState {
  return {
    angle: 0,
    angleVelocity: 0,
    offsetX: 0,
    offsetY: 0,
    offsetVelocityX: 0,
    offsetVelocityY: 0,
    stretchX: 1,
    stretchY: 1,
    stretchVelocityX: 0,
    stretchVelocityY: 0,
  };
}

export function resetHairSpring(state: HairSpringState): void {
  state.angle = 0;
  state.angleVelocity = 0;
  state.offsetX = 0;
  state.offsetY = 0;
  state.offsetVelocityX = 0;
  state.offsetVelocityY = 0;
  state.stretchX = 1;
  state.stretchY = 1;
  state.stretchVelocityX = 0;
  state.stretchVelocityY = 0;
}

export function triggerHairSpringBounce(
  state: HairSpringState,
  strength: number,
): void {
  const impulse = clamp(strength, -1, 1);
  state.angleVelocity += impulse * 0.09;
  state.offsetVelocityY += impulse * 14;
  state.stretchVelocityX += impulse * 0.05;
  state.stretchVelocityY -= impulse * 0.06;
  clampState(state);
}

export function updateHairSpring(
  state: HairSpringState,
  input: HairSpringInput,
): HairSpringOutput {
  const response = clamp(input.hairSpring / 100, 0, 1);
  if (response <= 0) {
    resetHairSpring(state);
    return toOutput(state);
  }

  const deltaSeconds = clamp(input.deltaSeconds, 0, MAX_DELTA_SECONDS);
  if (deltaSeconds <= 0) return toOutput(state);

  const layerResponse = clamp(input.layerResponse, 0.2, 1.6);
  const drive = response * layerResponse;
  const targetAngle = clamp(
    -input.poseRotationVelocity * 0.018 * drive -
      input.poseVelocityX * 0.0036 * drive,
    -MAX_ANGLE,
    MAX_ANGLE,
  );
  const targetOffsetX = clamp(
    -input.poseVelocityX * 0.22 * drive,
    -MAX_OFFSET,
    MAX_OFFSET,
  );
  const targetOffsetY = clamp(
    -input.poseVelocityY * 0.16 * drive,
    -MAX_OFFSET,
    MAX_OFFSET,
  );
  const motionEnergy = clamp(
    (Math.abs(input.poseVelocityX) + Math.abs(input.poseVelocityY)) *
      0.0025 *
      drive,
    0,
    MAX_STRETCH_DELTA,
  );

  const stiffness = 58 + response * 96 * layerResponse;
  const damping = 10 + response * 11;
  integrateSpringAxis(
    state,
    'angle',
    'angleVelocity',
    targetAngle,
    stiffness * 1.15,
    damping,
    deltaSeconds,
  );
  integrateSpringAxis(
    state,
    'offsetX',
    'offsetVelocityX',
    targetOffsetX,
    stiffness,
    damping,
    deltaSeconds,
  );
  integrateSpringAxis(
    state,
    'offsetY',
    'offsetVelocityY',
    targetOffsetY,
    stiffness * 0.92,
    damping,
    deltaSeconds,
  );
  integrateSpringAxis(
    state,
    'stretchX',
    'stretchVelocityX',
    1 + motionEnergy,
    stiffness * 1.45,
    damping * 1.12,
    deltaSeconds,
  );
  integrateSpringAxis(
    state,
    'stretchY',
    'stretchVelocityY',
    1 - motionEnergy * 0.8,
    stiffness * 1.45,
    damping * 1.12,
    deltaSeconds,
  );

  clampState(state);
  return toOutput(state);
}

function integrateSpringAxis(
  state: HairSpringState,
  positionKey:
    | 'angle'
    | 'offsetX'
    | 'offsetY'
    | 'stretchX'
    | 'stretchY',
  velocityKey:
    | 'angleVelocity'
    | 'offsetVelocityX'
    | 'offsetVelocityY'
    | 'stretchVelocityX'
    | 'stretchVelocityY',
  target: number,
  stiffness: number,
  damping: number,
  deltaSeconds: number,
): void {
  const displacement = target - state[positionKey];
  state[velocityKey] +=
    (displacement * stiffness - state[velocityKey] * damping) * deltaSeconds;
  state[positionKey] += state[velocityKey] * deltaSeconds;
}

function clampState(state: HairSpringState): void {
  state.angle = sanitize(clamp(state.angle, -MAX_ANGLE, MAX_ANGLE), 0);
  state.angleVelocity = sanitize(clamp(state.angleVelocity, -0.8, 0.8), 0);
  state.offsetX = sanitize(clamp(state.offsetX, -MAX_OFFSET, MAX_OFFSET), 0);
  state.offsetY = sanitize(clamp(state.offsetY, -MAX_OFFSET, MAX_OFFSET), 0);
  state.offsetVelocityX = sanitize(
    clamp(state.offsetVelocityX, -160, 160),
    0,
  );
  state.offsetVelocityY = sanitize(
    clamp(state.offsetVelocityY, -160, 160),
    0,
  );
  state.stretchX = sanitize(
    clamp(state.stretchX, 1 - MAX_STRETCH_DELTA, 1 + MAX_STRETCH_DELTA),
    1,
  );
  state.stretchY = sanitize(
    clamp(state.stretchY, 1 - MAX_STRETCH_DELTA, 1 + MAX_STRETCH_DELTA),
    1,
  );
  state.stretchVelocityX = sanitize(
    clamp(state.stretchVelocityX, -0.7, 0.7),
    0,
  );
  state.stretchVelocityY = sanitize(
    clamp(state.stretchVelocityY, -0.7, 0.7),
    0,
  );
}

function toOutput(state: HairSpringState): HairSpringOutput {
  return {
    angle: state.angle,
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    stretchX: state.stretchX,
    stretchY: state.stretchY,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitize(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

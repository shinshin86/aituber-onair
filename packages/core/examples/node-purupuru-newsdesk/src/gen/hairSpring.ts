/**
 * Minimal spring model for hair layers, ported from the PuruPuru PNGTuber
 * motion design (see the react-purupuru-app example). Pose velocity drives a
 * damped spring on angle, offset, and stretch, clamped for stability.
 */

const MAX_DELTA_SECONDS = 1 / 30;
const MAX_ANGLE = 0.075;
const MAX_OFFSET = 16;
const MAX_STRETCH_DELTA = 0.035;

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
  /** Package `hairSpring` setting, 0..100. */
  hairSpring: number;
  poseVelocityX: number;
  poseVelocityY: number;
  poseRotationVelocity: number;
  /** Per-layer response multiplier (back hair reacts less than front). */
  layerResponse: number;
}

export interface HairSpringOutput {
  angle: number;
  offsetX: number;
  offsetY: number;
  stretchX: number;
  stretchY: number;
}

type PositionKey = 'angle' | 'offsetX' | 'offsetY' | 'stretchX' | 'stretchY';
type VelocityKey =
  | 'angleVelocity'
  | 'offsetVelocityX'
  | 'offsetVelocityY'
  | 'stretchVelocityX'
  | 'stretchVelocityY';

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

export function updateHairSpring(
  state: HairSpringState,
  input: HairSpringInput,
): HairSpringOutput {
  const response = clamp(input.hairSpring / 100, 0, 1);
  if (response <= 0) return toOutput(state);
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
  integrate(
    state,
    'angle',
    'angleVelocity',
    targetAngle,
    stiffness * 1.15,
    damping,
    deltaSeconds,
  );
  integrate(
    state,
    'offsetX',
    'offsetVelocityX',
    targetOffsetX,
    stiffness,
    damping,
    deltaSeconds,
  );
  integrate(
    state,
    'offsetY',
    'offsetVelocityY',
    targetOffsetY,
    stiffness * 0.92,
    damping,
    deltaSeconds,
  );
  integrate(
    state,
    'stretchX',
    'stretchVelocityX',
    1 + motionEnergy,
    stiffness * 1.45,
    damping * 1.12,
    deltaSeconds,
  );
  integrate(
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

function integrate(
  state: HairSpringState,
  positionKey: PositionKey,
  velocityKey: VelocityKey,
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
  state.offsetVelocityX = sanitize(clamp(state.offsetVelocityX, -160, 160), 0);
  state.offsetVelocityY = sanitize(clamp(state.offsetVelocityY, -160, 160), 0);
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

export type IdleGazeMode = 'idle' | 'turning' | 'holding' | 'returning';

export interface IdleGazeState {
  mode: IdleGazeMode;
  gaze: number;
  velocity: number;
  target: number;
  waitSeconds: number;
  holdSeconds: number;
  justSettledPending: boolean;
  rng: () => number;
}

export interface IdleGazeUpdateInput {
  deltaSeconds: number;
  enabled: boolean;
  amplitudeScale: number;
  frequencyScale: number;
}

export interface IdleGazeUpdateOutput {
  gaze: number;
  justSettled: boolean;
}

const MIN_WAIT_SECONDS = 5;
const MAX_WAIT_SECONDS = 14;
const MIN_HOLD_SECONDS = 0.6;
const MAX_HOLD_SECONDS = 1.8;
const MAX_DELTA_SECONDS = 0.05;
const FULL_TURN_MIN = 0.45;
const FULL_TURN_MAX = 1;
const SMALL_TURN_MAX = 0.3;
const SMALL_TURN_CHANCE = 0.3;

export function createIdleGazeState(
  rng: () => number = Math.random,
): IdleGazeState {
  const state: IdleGazeState = {
    mode: 'idle',
    gaze: 0,
    velocity: 0,
    target: 0,
    waitSeconds: 0,
    holdSeconds: 0,
    justSettledPending: false,
    rng,
  };
  scheduleIdleWait(state);
  return state;
}

export function resetIdleGaze(state: IdleGazeState): void {
  state.mode = 'idle';
  state.gaze = 0;
  state.velocity = 0;
  state.target = 0;
  state.holdSeconds = 0;
  state.justSettledPending = false;
  scheduleIdleWait(state);
}

export function updateIdleGaze(
  state: IdleGazeState,
  input: IdleGazeUpdateInput,
): IdleGazeUpdateOutput {
  const deltaSeconds = clamp(input.deltaSeconds, 0, MAX_DELTA_SECONDS);
  const amplitudeScale = clamp(input.amplitudeScale, 0, 1.4);
  const frequencyScale = clamp(input.frequencyScale, 0.35, 1.8);
  let justSettled = false;

  if (!input.enabled || amplitudeScale <= 0.001) {
    state.mode = 'idle';
    state.target = 0;
    state.waitSeconds = Math.max(state.waitSeconds, 0.5);
    state.holdSeconds = 0;
    state.justSettledPending = false;
    followGaze(state, 0, deltaSeconds, 16, 8);
    sanitizeState(state);
    return { gaze: state.gaze, justSettled: false };
  }

  if (state.justSettledPending) {
    justSettled = true;
    state.justSettledPending = false;
  }

  if (state.mode === 'idle') {
    state.waitSeconds -= deltaSeconds * frequencyScale;
    if (state.waitSeconds <= 0) {
      state.target = pickTarget(state) * amplitudeScale;
      state.mode = 'turning';
    }
  }

  if (state.mode === 'turning') {
    followGaze(state, state.target, deltaSeconds, 18, 9);
    if (isNear(state.gaze, state.target, state.velocity)) {
      state.gaze = state.target;
      state.velocity = 0;
      state.holdSeconds = randomBetween(
        state,
        MIN_HOLD_SECONDS,
        MAX_HOLD_SECONDS,
      );
      state.mode = 'holding';
    }
  } else if (state.mode === 'holding') {
    state.holdSeconds -= deltaSeconds * frequencyScale;
    followGaze(state, state.target, deltaSeconds, 20, 10);
    if (state.holdSeconds <= 0) {
      state.mode = 'returning';
      state.target = 0;
    }
  } else if (state.mode === 'returning') {
    followGaze(state, 0, deltaSeconds, 16, 8.5);
    if (isNear(state.gaze, 0, state.velocity)) {
      state.gaze = 0;
      state.velocity = 0;
      state.mode = 'idle';
      state.justSettledPending = true;
      scheduleIdleWait(state);
    }
  }

  sanitizeState(state);
  return { gaze: state.gaze, justSettled };
}

function followGaze(
  state: IdleGazeState,
  target: number,
  deltaSeconds: number,
  stiffness: number,
  damping: number,
): void {
  if (deltaSeconds <= 0) return;
  state.velocity +=
    ((target - state.gaze) * stiffness - state.velocity * damping) *
    deltaSeconds;
  state.gaze += state.velocity * deltaSeconds;
}

function pickTarget(state: IdleGazeState): number {
  const side = state.rng() < 0.5 ? -1 : 1;
  if (state.rng() < SMALL_TURN_CHANCE) {
    return side * randomBetween(state, 0.12, SMALL_TURN_MAX);
  }
  return side * randomBetween(state, FULL_TURN_MIN, FULL_TURN_MAX);
}

function scheduleIdleWait(state: IdleGazeState): void {
  state.waitSeconds = randomBetween(
    state,
    MIN_WAIT_SECONDS,
    MAX_WAIT_SECONDS,
  );
}

function randomBetween(
  state: IdleGazeState,
  min: number,
  max: number,
): number {
  return min + safeRandom(state) * (max - min);
}

function safeRandom(state: IdleGazeState): number {
  const value = state.rng();
  return Number.isFinite(value) ? clamp(value, 0, 0.999999) : 0.5;
}

function isNear(value: number, target: number, velocity: number): boolean {
  return Math.abs(value - target) < 0.01 && Math.abs(velocity) < 0.04;
}

function sanitizeState(state: IdleGazeState): void {
  state.gaze = sanitize(clamp(state.gaze, -1, 1), 0);
  state.velocity = sanitize(clamp(state.velocity, -4, 4), 0);
  state.target = sanitize(clamp(state.target, -1, 1), 0);
  state.waitSeconds = sanitize(clamp(state.waitSeconds, 0, 60), 5);
  state.holdSeconds = sanitize(clamp(state.holdSeconds, 0, 8), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitize(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

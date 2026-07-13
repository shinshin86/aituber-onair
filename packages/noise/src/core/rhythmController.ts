import type {
  RhythmDecision,
  RhythmMemoryState,
  RhythmOptions,
} from './types.js';

export const DEFAULT_RHYTHM_OPTIONS: Required<RhythmOptions> = {
  minPlatformTurns: 0,
  cooldownTurns: 1,
  tiltThreshold: 0.35,
  forcedTiltAfter: 6,
};

export function createInitialRhythmState(): RhythmMemoryState {
  return {
    totalTurns: 0,
    platformTurns: 0,
    turnsSinceTilt: -1,
    cooldownRemaining: 0,
    repairRemaining: 0,
  };
}

/**
 * Decide whether this turn may tilt (apply noise) or must stay on the
 * platform. The controller enforces the platform -> tilt -> platform rhythm:
 * a deviation only reads as an event against a stretch of in-character turns,
 * and uniform noise flattens into a new, weirder predictable harmony.
 */
export function decideRhythm(input: {
  state: RhythmMemoryState;
  diagnosisScore: number;
  options?: RhythmOptions;
  forceTilt?: boolean;
}): RhythmDecision {
  const options = { ...DEFAULT_RHYTHM_OPTIONS, ...input.options };
  const state = input.state;

  if (input.forceTilt) {
    return {
      apply: true,
      phase: 'tilt',
      reason: 'Tilt forced by the caller.',
    };
  }

  if (state.repairRemaining > 0) {
    return {
      apply: false,
      phase: 'repair',
      reason:
        'A recent deviation landed badly; staying in-character until trust recovers.',
    };
  }

  if (state.cooldownRemaining > 0) {
    return {
      apply: false,
      phase: 'cooldown',
      reason:
        'Cooling down after the last tilt so it reads as an event, not a baseline.',
    };
  }

  if (state.platformTurns < options.minPlatformTurns) {
    return {
      apply: false,
      phase: 'platform',
      reason: `Building the platform: ${state.platformTurns}/${options.minPlatformTurns} in-character turns.`,
    };
  }

  if (input.diagnosisScore < options.tiltThreshold) {
    const dryStretch =
      state.turnsSinceTilt === -1 ? state.totalTurns : state.turnsSinceTilt;

    if (dryStretch >= options.forcedTiltAfter && input.diagnosisScore > 0) {
      return {
        apply: true,
        phase: 'tilt',
        reason: `No tilt for ${dryStretch} turns; tilting to avoid a flat baseline.`,
      };
    }

    return {
      apply: false,
      phase: 'platform',
      reason: 'The draft is not predictable enough to justify a tilt.',
    };
  }

  return {
    apply: true,
    phase: 'tilt',
    reason: 'The draft lands too predictably and the rhythm allows a tilt.',
  };
}

/** Advance the rhythm state after a turn has been processed. */
export function advanceRhythmState(input: {
  state: RhythmMemoryState;
  tilted: boolean;
  options?: RhythmOptions;
}): RhythmMemoryState {
  const options = { ...DEFAULT_RHYTHM_OPTIONS, ...input.options };
  const state = input.state;

  if (input.tilted) {
    return {
      totalTurns: state.totalTurns + 1,
      platformTurns: 0,
      turnsSinceTilt: 0,
      cooldownRemaining: options.cooldownTurns,
      repairRemaining: 0,
    };
  }

  return {
    totalTurns: state.totalTurns + 1,
    platformTurns: state.platformTurns + 1,
    turnsSinceTilt: state.turnsSinceTilt === -1 ? -1 : state.turnsSinceTilt + 1,
    cooldownRemaining: Math.max(0, state.cooldownRemaining - 1),
    repairRemaining: Math.max(0, state.repairRemaining - 1),
  };
}

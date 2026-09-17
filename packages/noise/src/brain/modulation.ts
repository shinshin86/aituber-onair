import type {
  ContextFingerprint,
  FrictionParameters,
  InterventionKind,
  NoiseMode,
  PredictabilityDiagnosis,
} from '../core/types.js';

export interface NoiseModulatorInput {
  /** Designed input channels: threat, reward, social, novelty, demand, repetition. */
  stimulus?: readonly number[];
  /** Opaque stable content bindings; no text or selected response enters the circuit. */
  readoutKeys?: readonly number[];
  context: ContextFingerprint;
  diagnosis: PredictabilityDiagnosis;
  intensity: number;
  mode: NoiseMode;
}

export interface BrainActivity {
  globalActivity: number;
  descendingActivity: number;
  leftRightBalance: number;
  dispersion: number;
  axes: number[];
}

/** Compact temporal readout. Axes are designed projections, not language regions. */
export interface BrainReadoutFrame {
  startStep: number;
  endStep: number;
  activity: number;
  axes: number[];
  /** Signed population projections aligned to modulation.contentKeys. */
  contentAxes?: number[];
}

export interface NoiseModulation {
  contentKeys?: number[];
  readoutTrace?: BrainReadoutFrame[];
  provider?: 'virtual' | 'malecns' | 'custom';
  intensityScale: number;
  interventionBias?: Partial<Record<InterventionKind, number>>;
  personaDelta?: Partial<FrictionParameters['persona']>;
  brainState?: BrainActivity;
}

export interface NoiseModulator {
  modulate(input: NoiseModulatorInput): Promise<NoiseModulation>;
}

export function bounded(
  value: unknown,
  min: number,
  max: number,
  fallback = 0
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function normalizeModulation(value: NoiseModulation): NoiseModulation {
  const interventionBias: NoiseModulation['interventionBias'] = {};
  for (const kind of INTERVENTIONS) {
    if (value.interventionBias?.[kind] !== undefined) {
      interventionBias[kind] = bounded(
        value.interventionBias[kind],
        -0.25,
        0.25
      );
    }
  }
  const personaDelta: NoiseModulation['personaDelta'] = {};
  for (const key of PERSONA_KEYS) {
    if (value.personaDelta?.[key] !== undefined) {
      personaDelta[key] = bounded(value.personaDelta[key], -0.2, 0.2);
    }
  }
  const state = value.brainState;
  return {
    provider:
      value.provider === 'virtual' || value.provider === 'malecns'
        ? value.provider
        : 'custom',
    intensityScale: bounded(value.intensityScale, 0.75, 1.25, 1),
    interventionBias,
    personaDelta,
    ...(value.contentKeys ? { contentKeys: [...value.contentKeys] } : {}),
    ...(Array.isArray(value.readoutTrace)
      ? {
          readoutTrace: normalizeReadoutTrace(
            value.readoutTrace,
            value.contentKeys
          ),
        }
      : {}),
    ...(state
      ? {
          brainState: {
            globalActivity: bounded(state.globalActivity, 0, 1),
            descendingActivity: bounded(state.descendingActivity, 0, 1),
            leftRightBalance: bounded(state.leftRightBalance, -1, 1),
            dispersion: bounded(state.dispersion, 0, 1),
            axes: Array.isArray(state.axes)
              ? state.axes.slice(0, 4).map((v) => bounded(v, -1, 1))
              : [],
          },
        }
      : {}),
  };
}

export const PERSONA_KEYS = [
  'warmth',
  'bluntness',
  'volatility',
  'humor',
  'politeness',
] as const;
const INTERVENTIONS: InterventionKind[] = [
  'shift_attention',
  'ground_in_recent_comment',
  'add_streamer_judgment',
  'soft_disagreement',
  'contrarian_reframe',
  'self_repair',
  'unfinished_margin',
  'reduce_over_apology',
  'reduce_over_agreement',
  'increase_specificity',
  'acknowledge_tension',
  'break_clean_closing',
  'callback',
  'dispreferred_shape',
  'boke_bait',
  'tsukkomi',
  'withheld_uptake',
  'status_seesaw',
  'response_length_violation',
];

function normalizeReadoutTrace(
  frames: BrainReadoutFrame[],
  contentKeys?: number[]
): BrainReadoutFrame[] {
  if (
    contentKeys &&
    (!contentKeys.length ||
      contentKeys.length > 64 ||
      !contentKeys.every(
        (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff
      ))
  )
    return [];
  let end = 0;
  if (frames.length > 64) return [];
  const result: BrainReadoutFrame[] = [];
  for (const frame of frames) {
    if (
      !frame ||
      frame.startStep !== end ||
      !Number.isInteger(frame.endStep) ||
      frame.endStep <= end ||
      frame.endStep > 1000 ||
      !Number.isFinite(frame.activity) ||
      frame.activity < 0 ||
      frame.activity > 1 ||
      !Array.isArray(frame.axes) ||
      frame.axes.length !== 4 ||
      !frame.axes.every((v) => Number.isFinite(v) && Math.abs(v) <= 1) ||
      (contentKeys &&
        (!Array.isArray(frame.contentAxes) ||
          frame.contentAxes.length !== contentKeys.length ||
          !frame.contentAxes.every(
            (v) => Number.isFinite(v) && Math.abs(v) <= 1
          )))
    )
      return [];
    result.push({
      ...frame,
      axes: [...frame.axes],
      ...(contentKeys
        ? { contentAxes: [...(frame.contentAxes ?? [])] }
        : { contentAxes: undefined }),
    });
    end = frame.endStep;
  }
  return result;
}

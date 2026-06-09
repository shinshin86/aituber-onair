import { buildInterventionPlan } from './frictionPlanner.js';
import { diagnosePredictability } from './predictabilityDiagnosis.js';
import type {
  ContextFingerprint,
  InterventionPlan,
  NoiseMemory,
  NoiseMode,
} from './types.js';

/**
 * @deprecated Use diagnosePredictability() and buildInterventionPlan().
 */
export function planStains(input: {
  draft: string;
  context: ContextFingerprint;
  predictability: number;
  intensity: number;
  mode: NoiseMode;
  memory?: NoiseMemory;
  seed?: string | number;
}): InterventionPlan {
  const diagnosis = diagnosePredictability({
    draft: input.draft,
    context: input.context,
  });

  return buildInterventionPlan({
    diagnosis: {
      ...diagnosis,
      score: input.predictability,
    },
    context: input.context,
    intensity: input.intensity,
    mode: input.mode,
    memory: input.memory,
  });
}

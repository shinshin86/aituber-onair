import { clamp01 } from './random.js';
import {
  getRecentlyOverusedStains,
  getRepeatedClosingPatterns,
} from '../memory/noiseMemory.js';
import type {
  ContaminateConstraints,
  ContextFingerprint,
  FrictionParameters,
  InterventionKind,
  InterventionPlan,
  NoiseMemory,
  NoiseMode,
  PlannedIntervention,
  PredictabilityDiagnosis,
  PredictabilityIssueKind,
} from './types.js';

const ISSUE_TO_INTERVENTIONS: Record<
  PredictabilityIssueKind,
  InterventionKind[]
> = {
  generic_closing: ['break_clean_closing', 'unfinished_margin'],
  over_agreement: ['reduce_over_agreement', 'soft_disagreement'],
  over_apology: ['reduce_over_apology', 'acknowledge_tension'],
  forced_positive: ['acknowledge_tension', 'soft_disagreement'],
  low_context_grounding: ['ground_in_recent_comment'],
  low_specificity: ['increase_specificity'],
  repeated_phrase: ['add_streamer_judgment', 'ground_in_recent_comment'],
  too_complete: ['break_clean_closing', 'self_repair'],
  no_streamer_judgment: ['add_streamer_judgment'],
  persona_flattening: ['self_repair', 'unfinished_margin'],
};

export function buildInterventionPlan(input: {
  diagnosis: PredictabilityDiagnosis;
  context: ContextFingerprint;
  intensity: number;
  mode: NoiseMode;
  memory?: NoiseMemory;
}): InterventionPlan {
  const intensity = clamp01(input.intensity);
  const maxCount =
    input.mode === 'subtle' ? 2 : input.mode === 'chaotic' ? 5 : 3;
  const planned: PlannedIntervention[] = [];
  const repeatedClosings = input.memory
    ? getRepeatedClosingPatterns(input.memory)
    : [];

  for (const issue of input.diagnosis.issues) {
    for (const kind of ISSUE_TO_INTERVENTIONS[issue.kind]) {
      planned.push({
        kind,
        reason: `${issue.evidence} (${issue.kind})`,
        strength: clamp01(issue.severity * (0.55 + intensity * 0.65)),
      });
    }
  }

  if (repeatedClosings.length > 0) {
    planned.push({
      kind: 'break_clean_closing',
      reason: 'Recent memory shows repeated closing patterns.',
      strength: clamp01(0.55 + intensity * 0.35),
    });
  }

  if (input.context.repetitionLevel >= 0.45) {
    planned.push({
      kind: 'add_streamer_judgment',
      reason: 'Recent comments show repetition pressure.',
      strength: clamp01(input.context.repetitionLevel),
    });
  }

  const selected = selectInterventions({
    interventions: planned.length > 0 ? planned : createFallbackPlan(input),
    maxCount,
    memory: input.memory,
  });

  return {
    intensity,
    targetIssues: input.diagnosis.issues.map((issue) => issue.kind),
    interventions: selected,
    preserve: {
      meaning: true,
      persona: true,
      facts: true,
      safety: true,
    },
  };
}

export function buildFrictionParameters(input: {
  diagnosis: PredictabilityDiagnosis;
  context: ContextFingerprint;
  plan: InterventionPlan;
  constraints?: ContaminateConstraints;
}): FrictionParameters {
  const predictability = createIssueRecord();

  for (const issue of input.diagnosis.issues) {
    predictability[issue.kind] = Math.max(
      predictability[issue.kind],
      issue.severity
    );
  }

  return {
    predictability,
    conversation: {
      repetitionPressure: input.context.repetitionLevel,
      topicBias: input.context.topicHints.length >= 3 ? 0.55 : 0.2,
      viewerTension: input.context.streamTension,
      commonGroundStrength:
        input.context.commonGroundHints.length > 0 ? 0.65 : 0.2,
    },
    persona: {
      warmth: inferPersonaWarmth(input.context),
      bluntness: inferPersonaBluntness(input.context),
      volatility: input.context.personaVolatility,
      humor: input.context.userEnergy >= 0.55 ? 0.55 : 0.25,
      politeness: inferPersonaPoliteness(input.context),
    },
    interventions: input.plan.interventions,
    constraints: {
      preserveMeaning: true,
      preservePersona: true,
      preserveFacts: true,
      avoidAggression: input.constraints?.avoidIdentityAttack !== false,
      avoidUngroundedDetail: true,
      maxAddedChars: input.constraints?.maxAddedChars,
    },
  };
}

function selectInterventions(input: {
  interventions: PlannedIntervention[];
  maxCount: number;
  memory?: NoiseMemory;
}): PlannedIntervention[] {
  const overused = new Set(
    input.memory ? getRecentlyOverusedStains(input.memory) : []
  );
  const byKind = new Map<InterventionKind, PlannedIntervention>();

  for (const intervention of input.interventions) {
    if (overused.has(intervention.kind)) {
      continue;
    }

    const current = byKind.get(intervention.kind);

    if (!current || intervention.strength > current.strength) {
      byKind.set(intervention.kind, intervention);
    }
  }

  const selected = [...byKind.values()]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, input.maxCount);

  return selected.length > 0
    ? selected
    : input.interventions
        .sort((a, b) => b.strength - a.strength)
        .slice(0, input.maxCount);
}

function createFallbackPlan(input: {
  diagnosis: PredictabilityDiagnosis;
  context: ContextFingerprint;
  intensity: number;
}): PlannedIntervention[] {
  if (input.diagnosis.score < 0.25) {
    return [
      {
        kind: 'ground_in_recent_comment',
        reason: 'The draft is already fairly natural; keep changes minimal.',
        strength: 0.25,
      },
    ];
  }

  return [
    {
      kind: 'increase_specificity',
      reason: 'The draft needs one concrete anchor.',
      strength: clamp01(0.4 + input.intensity * 0.35),
    },
    {
      kind: 'break_clean_closing',
      reason: 'The draft should avoid closing too neatly.',
      strength: clamp01(0.35 + input.intensity * 0.35),
    },
  ];
}

function createIssueRecord(): Record<PredictabilityIssueKind, number> {
  return {
    generic_closing: 0,
    over_agreement: 0,
    over_apology: 0,
    forced_positive: 0,
    low_context_grounding: 0,
    low_specificity: 0,
    repeated_phrase: 0,
    too_complete: 0,
    no_streamer_judgment: 0,
    persona_flattening: 0,
  };
}

function inferPersonaWarmth(context: ContextFingerprint): number {
  return context.personaVolatility >= 0.6 ? 0.45 : 0.7;
}

function inferPersonaBluntness(context: ContextFingerprint): number {
  return context.personaVolatility >= 0.6 || context.streamTension >= 0.5
    ? 0.55
    : 0.25;
}

function inferPersonaPoliteness(context: ContextFingerprint): number {
  return context.personaVolatility >= 0.6 ? 0.35 : 0.65;
}

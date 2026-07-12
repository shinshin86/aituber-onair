import {
  addMemorableMoment,
  applyReactionToMemory,
  createInitialNoiseMemory,
  markMomentUsed,
  normalizeNoiseMemory,
  pickCallbackMoment,
  recordLastTilt,
  updateNoiseMemory,
} from '../memory/noiseMemory.js';
import { createChatRewriteModel } from '../models/chatRewriteModel.js';
import { createOpenAICompatibleRewriteModel } from '../models/openAICompatibleRewriteModel.js';
import {
  evaluateRewriteCandidates,
  selectBestCandidate,
} from './candidateEvaluator.js';
import { generateRewriteCandidates } from './candidateGenerator.js';
import { createContextFingerprint } from './contextFingerprint.js';
import {
  buildFrictionParameters,
  buildInterventionPlan,
} from './frictionPlanner.js';
import { diagnosePredictability } from './predictabilityDiagnosis.js';
import { clamp01 } from './random.js';
import {
  gateMode,
  getAllowedInterventions,
  resolveRelationshipTier,
} from './relationshipGate.js';
import { advanceRhythmState, decideRhythm } from './rhythmController.js';
import {
  protectSensitiveSpans,
  restoreSensitiveSpans,
  safetyGuard,
} from './safetyGuard.js';
import { assessSincerity } from './sincerityGate.js';
import type {
  ContaminateGates,
  ContaminateInput,
  ContaminateOutput,
  Contaminator,
  ContextFingerprint,
  CreateContaminatorOptions,
  InterventionKind,
  InterventionPlan,
  NoiseEvent,
  NoiseMemory,
  NoiseMode,
  NoiseQualityReport,
  NoiseReactionInput,
  NoiseReactionResult,
  NoiseSkipReason,
  PlannedIntervention,
  PredictabilityDiagnosis,
  RecordMomentInput,
  RewriteCandidate,
  RewriteModel,
  RhythmDecision,
} from './types.js';

const DEFAULT_RELATIONSHIP_CAPITAL = 0.5;

export function createContaminator(
  options: CreateContaminatorOptions = {}
): Contaminator {
  const defaultIntensity = clamp01(options.intensity ?? 0.3);
  const requestedMode: NoiseMode = options.mode ?? 'performer';
  const model = resolveRewriteModel(options);
  const sincerityGateEnabled = options.sincerityGate !== false;
  // Session-local memory used when no store is configured, so the rhythm
  // controller and reaction loop still work within the contaminator lifetime.
  let sessionMemory: NoiseMemory = createInitialNoiseMemory();

  const emit = (event: NoiseEvent): void => {
    options.onNoiseEvent?.(event);
  };

  const loadMemory = async (): Promise<NoiseMemory> => {
    if (!options.memory) {
      return sessionMemory;
    }

    const loaded = await options.memory.store.load(options.memory.scopeId);
    return normalizeNoiseMemory(loaded);
  };

  const saveMemory = async (memory: NoiseMemory): Promise<void> => {
    sessionMemory = memory;

    if (options.memory && options.memory.autoUpdate !== false) {
      await options.memory.store.save(options.memory.scopeId, memory);
    }
  };

  // contaminate/reportReaction/recordMoment all do load -> (async work) ->
  // save on the same memory, so overlapping calls would silently drop each
  // other's updates (last write wins). Serialize them; turns in a stream are
  // sequential anyway.
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };

  const runContaminate = async (
    input: ContaminateInput
  ): Promise<ContaminateOutput> => {
    if (!model) {
      throw new Error(
        'Noise requires an LLM rewrite model. Provide createContaminator({ model }) or createContaminator({ llm: { apiKey, model } }).'
      );
    }

    const memory = await loadMemory();
    // The rhythm turn counter before this turn is recorded; also what
    // recordLastTilt stores, so reactions can be matched to their tilt.
    const turnId = memory.rhythm.totalTurns;
    const context = createContextFingerprint({
      systemPrompt: input.systemPrompt,
      messages: input.messages,
      streamContext: input.streamContext,
    });
    const diagnosis = diagnosePredictability({
      draft: input.draft,
      context,
      memory,
    });

    // Gate 1: sincerity. Failed uptake of a sincere bid is the worst-case
    // violation, so it overrides everything including forceTilt.
    const sincerity = sincerityGateEnabled
      ? assessSincerity({ messages: input.messages })
      : { serious: false, score: 0, reasons: [] };

    // Gate 2: relationship capital decides the violation budget ceiling.
    const capital = clamp01(
      input.relationshipCapital ??
        options.relationshipCapital ??
        DEFAULT_RELATIONSHIP_CAPITAL
    );
    const tier = resolveRelationshipTier(capital);
    const effectiveMode = gateMode(requestedMode, tier);

    // Gate 3: rhythm. A tilt only reads as an event against a platform.
    const rhythm: RhythmDecision = sincerity.serious
      ? {
          apply: false,
          phase: 'platform',
          reason: 'The user made a sincere bid; noise is suppressed.',
        }
      : decideRhythm({
          state: memory.rhythm,
          diagnosisScore: diagnosis.score,
          options: options.rhythm,
          forceTilt: input.forceTilt,
        });

    const gates: ContaminateGates = {
      sincerity,
      relationship: {
        capital,
        tier,
        effectiveMode,
      },
      rhythm,
    };

    if (!rhythm.apply) {
      const reason: NoiseSkipReason = sincerity.serious
        ? 'sincerity'
        : skipReasonFromPhase(rhythm);
      const skippedOutput = createSkippedOutput({
        input,
        context,
        diagnosis,
        gates,
        reason,
        turnId,
      });

      await saveMemory({
        ...memory,
        rhythm: advanceRhythmState({
          state: memory.rhythm,
          tilted: false,
          options: options.rhythm,
        }),
      });
      emit({
        type: 'noise_skipped',
        reason,
        detail: rhythm.reason,
      });

      return skippedOutput;
    }

    const violationBudget = memory.violationBudget;
    const intensity = clamp01(
      clamp01(input.intensity ?? defaultIntensity) *
        (0.5 + violationBudget * 0.5)
    );
    const allowedInterventions = getAllowedInterventions(tier);
    const callbackMoment = allowedInterventions.has('callback')
      ? pickCallbackMoment(memory)
      : undefined;
    const plan = buildInterventionPlan({
      diagnosis,
      context,
      intensity,
      mode: effectiveMode,
      memory,
      allowedInterventions,
      callbackMaterial: callbackMoment?.summary,
    });
    // The relationship gate can strip every planned intervention (e.g. a
    // stranger-tier audience while the diagnosis only suggests higher-tier
    // moves). There is nothing licensed to ask the model for, so skip
    // before spending an LLM call.
    if (plan.interventions.length === 0) {
      const detail =
        'The relationship tier licenses none of the planned interventions this turn.';
      const skippedOutput = createSkippedOutput({
        input,
        context,
        diagnosis,
        gates,
        reason: 'no_licensed_intervention',
        detail,
        turnId,
      });

      await saveMemory({
        ...memory,
        rhythm: advanceRhythmState({
          state: memory.rhythm,
          tilted: false,
          options: options.rhythm,
        }),
      });
      emit({
        type: 'noise_skipped',
        reason: 'no_licensed_intervention',
        detail,
      });

      return skippedOutput;
    }

    const friction = buildFrictionParameters({
      diagnosis,
      context,
      plan,
      constraints: input.constraints,
    });
    const protectedDraft = protectSensitiveSpans(input.draft, {
      preserveCodeBlocks: input.constraints?.preserveCodeBlocks ?? true,
      preserveUrls: input.constraints?.preserveUrls ?? true,
      preserveNumbers: input.constraints?.preserveNumbers ?? true,
    });
    let generatedCandidates: RewriteCandidate[];

    try {
      generatedCandidates = await withTimeout(
        generateRewriteCandidates({
          draft: protectedDraft.text,
          systemPrompt: input.systemPrompt,
          messages: input.messages,
          context,
          plan,
          friction,
          model,
          mode: effectiveMode,
          candidateCount: getCandidateCount(effectiveMode),
          protectedTokens: protectedDraft.spans.map((span) => span.token),
        }),
        options.modelTimeoutMs
      );
    } catch (error) {
      // Noise is a post-generation effect: losing a rewrite is fine on a
      // live stream, losing the reply is not, so degrade to the draft.
      const detail = `The rewrite model failed; returning the draft unchanged. (${describeError(error)})`;
      const skippedOutput = createSkippedOutput({
        input,
        context,
        diagnosis,
        gates,
        reason: 'model_error',
        detail,
        turnId,
      });

      await saveMemory({
        ...memory,
        rhythm: advanceRhythmState({
          state: memory.rhythm,
          tilted: false,
          options: options.rhythm,
        }),
      });
      emit({
        type: 'noise_skipped',
        reason: 'model_error',
        detail,
      });

      return skippedOutput;
    }
    const safeCandidates = generatedCandidates.map((candidate) => {
      const restored = restoreSensitiveSpans(
        candidate.text,
        protectedDraft.spans
      );

      // If the model dropped or mangled a protected span (the safety guard
      // does not cover code blocks), the candidate is unusable: degrade it
      // to the draft instead of silently shipping a reply that lost
      // protected content.
      if (!protectedSpansSurvived(restored, protectedDraft.spans)) {
        return {
          ...candidate,
          text: input.draft,
          appliedInterventions: [],
        };
      }

      const safe = safetyGuard({
        before: input.draft,
        after: restored,
        constraints: input.constraints,
      });

      return {
        ...candidate,
        text: safe.text,
      };
    });
    const plannedKinds = plan.interventions.map(
      (intervention) => intervention.kind
    );
    const candidates = evaluateRewriteCandidates({
      before: input.draft,
      candidates: safeCandidates,
      context,
      mode: effectiveMode,
      qualityOptions: options.quality,
      recentResponses: memory.recentResponses,
      plannedInterventions: plannedKinds,
    });
    const { candidate: bestCandidate, index: selectedIndex } =
      selectBestCandidate(candidates, plannedKinds);

    if (options.fallbackToDraftOnQualityFail && !bestCandidate.quality.passed) {
      const detail =
        'Every candidate failed the quality report; returning the draft unchanged.';

      await saveMemory({
        ...memory,
        rhythm: advanceRhythmState({
          state: memory.rhythm,
          tilted: false,
          options: options.rhythm,
        }),
      });
      emit({
        type: 'noise_skipped',
        reason: 'quality_fail',
        detail,
      });

      return {
        text: input.draft,
        turnId,
        score: {
          predictability: diagnosis.score,
          rewrittenPredictability: diagnosis.score,
          contamination: 0,
        },
        // Keep the failing report and candidates observable so apps can
        // see why the rewrite was rejected.
        quality: bestCandidate.quality,
        diagnosis,
        plan,
        candidates,
        selectedIndex,
        applied: [],
        gates,
        skipped: {
          reason: 'quality_fail',
          detail,
        },
      };
    }

    // Single source of truth for "what was actually applied": the
    // intervention must be both in the plan and claimed by the selected
    // candidate. The same normalized list feeds the public output, memory,
    // and events so they never disagree.
    const appliedInterventions = resolveAppliedInterventions(
      bestCandidate.appliedInterventions,
      plan
    );
    const appliedKinds = appliedInterventions.map(
      (intervention) => intervention.kind
    );
    const output: ContaminateOutput = {
      text: bestCandidate.text,
      turnId,
      score: {
        predictability: diagnosis.score,
        rewrittenPredictability:
          bestCandidate.quality.checks.predictabilityAfter,
        contamination: plan.intensity,
      },
      quality: bestCandidate.quality,
      diagnosis,
      plan,
      candidates,
      selectedIndex,
      applied: appliedInterventions.map((intervention) => ({
        kind: intervention.kind,
        reason: intervention.reason,
      })),
      gates,
    };

    let nextMemory = updateNoiseMemory({
      memory,
      before: input.draft,
      after: output.text,
      context,
      applied: appliedInterventions,
      maxRecentEntries: options.memory?.maxRecentEntries,
    });
    const callbackUsed =
      callbackMoment !== undefined && appliedKinds.includes('callback');

    if (callbackUsed) {
      nextMemory = markMomentUsed({
        memory: nextMemory,
        momentId: callbackMoment.id,
      });
      emit({ type: 'callback_used', summary: callbackMoment.summary });
    }

    nextMemory = recordLastTilt({
      memory: nextMemory,
      text: output.text,
      interventions: appliedKinds,
    });
    nextMemory = {
      ...nextMemory,
      rhythm: advanceRhythmState({
        state: nextMemory.rhythm,
        tilted: true,
        options: options.rhythm,
      }),
    };
    await saveMemory(nextMemory);
    emit({
      type: 'tilt_applied',
      interventions: appliedKinds,
      text: output.text,
    });

    return output;
  };

  const runReportReaction = async (
    reaction: NoiseReactionInput
  ): Promise<NoiseReactionResult> => {
    const memory = await loadMemory();
    const result = applyReactionToMemory({
      memory,
      signal: reaction.signal,
      detail: reaction.detail,
      turnId: reaction.turnId,
    });

    await saveMemory(result.memory);

    if (result.repairAdvised) {
      emit({
        type: 'repair_advised',
        detail:
          reaction.detail ??
          'The last deviation landed badly; return to the platform and repair in character.',
      });
    }

    if (result.promotedMoment) {
      emit({
        type: 'moment_recorded',
        summary: result.promotedMoment.summary,
      });
    }

    return {
      violationBudget: result.memory.violationBudget,
      repairAdvised: result.repairAdvised,
      promotedMoment: result.promotedMoment,
    };
  };

  const runRecordMoment = async (moment: RecordMomentInput): Promise<void> => {
    const memory = await loadMemory();
    const next = addMemorableMoment({
      memory,
      summary: moment.summary,
      source: moment.source,
    });

    await saveMemory(next);
    emit({ type: 'moment_recorded', summary: moment.summary });
  };

  return {
    contaminate: (input) => serialize(() => runContaminate(input)),
    reportReaction: (reaction) => serialize(() => runReportReaction(reaction)),
    recordMoment: (moment) => serialize(() => runRecordMoment(moment)),
  };
}

/**
 * Reconcile the LLM's self-reported applied interventions against the plan.
 * Only interventions that the plan authorized AND the selected candidate
 * claimed count as actually applied. The plan supplies the reason/strength so
 * downstream consumers keep the structured metadata.
 */
function resolveAppliedInterventions(
  claimed: InterventionKind[],
  plan: InterventionPlan
): PlannedIntervention[] {
  const claimedKinds = new Set(claimed);

  return plan.interventions.filter((intervention) =>
    claimedKinds.has(intervention.kind)
  );
}

function skipReasonFromPhase(rhythm: RhythmDecision): NoiseSkipReason {
  switch (rhythm.phase) {
    case 'repair':
      return 'repair';
    case 'cooldown':
      return 'cooldown';
    default:
      return rhythm.reason.includes('not predictable enough')
        ? 'low_predictability'
        : 'platform';
  }
}

function createSkippedOutput(input: {
  input: ContaminateInput;
  context: ContextFingerprint;
  diagnosis: PredictabilityDiagnosis;
  gates: ContaminateGates;
  reason: NoiseSkipReason;
  detail?: string;
  turnId: number;
}): ContaminateOutput {
  return {
    text: input.input.draft,
    turnId: input.turnId,
    score: {
      predictability: input.diagnosis.score,
      rewrittenPredictability: input.diagnosis.score,
      contamination: 0,
    },
    quality: createPassthroughQualityReport(input.diagnosis.score),
    diagnosis: input.diagnosis,
    plan: {
      intensity: 0,
      targetIssues: [],
      interventions: [],
      preserve: {
        meaning: true,
        persona: true,
        facts: true,
        safety: true,
      },
    },
    candidates: [],
    selectedIndex: -1,
    applied: [],
    gates: input.gates,
    skipped: {
      reason: input.reason,
      detail: input.detail ?? input.gates.rhythm.reason,
    },
  };
}

const LEFTOVER_SPAN_TOKEN_PATTERN = /__AITUBER_NOISE_SPAN_\d+__/;

/**
 * Whether every protected span value made it back into the restored text and
 * no placeholder token was left behind (e.g. mangled by the model so the
 * restore step could not replace it).
 */
function protectedSpansSurvived(
  restored: string,
  spans: Array<{ token: string; value: string }>
): boolean {
  if (spans.length === 0) {
    return true;
  }

  if (LEFTOVER_SPAN_TOKEN_PATTERN.test(restored)) {
    return false;
  }

  return spans.every((span) => restored.includes(span.value));
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number | undefined
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(`The rewrite model timed out after ${timeoutMs}ms.`)
          );
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    // The losing promise may still settle later; swallow its rejection so a
    // timed-out model call cannot surface as an unhandled rejection.
    promise.catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createPassthroughQualityReport(
  predictability: number
): NoiseQualityReport {
  return {
    passed: true,
    score: 1,
    issues: [],
    checks: {
      predictabilityBefore: predictability,
      predictabilityAfter: predictability,
      predictabilityDelta: 0,
      lengthRatio: 1,
      preservedCharacter: true,
      avoidedOvercorrection: true,
      groundedInContext: true,
    },
  };
}

function getCandidateCount(mode: NoiseMode): number {
  switch (mode) {
    case 'subtle':
      return 3;
    case 'performer':
      return 4;
    case 'bold':
    case 'inversion':
      return 5;
    case 'chaotic':
      return 6;
    default:
      return 4;
  }
}

function resolveRewriteModel(
  options: CreateContaminatorOptions
): RewriteModel | undefined {
  if (options.model) {
    return options.model;
  }

  if (options.chat) {
    return createChatRewriteModel(options.chat);
  }

  if (options.llm) {
    return createOpenAICompatibleRewriteModel(options.llm);
  }

  return undefined;
}

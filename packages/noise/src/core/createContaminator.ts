import { createContextFingerprint } from './contextFingerprint.js';
import {
  evaluateRewriteCandidates,
  selectBestCandidate,
} from './candidateEvaluator.js';
import { generateRewriteCandidates } from './candidateGenerator.js';
import {
  buildFrictionParameters,
  buildInterventionPlan,
} from './frictionPlanner.js';
import { diagnosePredictability } from './predictabilityDiagnosis.js';
import { clamp01 } from './random.js';
import {
  normalizeNoiseMemory,
  updateNoiseMemory,
} from '../memory/noiseMemory.js';
import { createOpenAICompatibleRewriteModel } from '../models/openAICompatibleRewriteModel.js';
import {
  protectSensitiveSpans,
  restoreSensitiveSpans,
  safetyGuard,
} from './safetyGuard.js';
import { createChatRewriteModel } from '../models/chatRewriteModel.js';
import type {
  ContaminateInput,
  ContaminateOutput,
  Contaminator,
  CreateContaminatorOptions,
  RewriteModel,
} from './types.js';

export function createContaminator(
  options: CreateContaminatorOptions = {}
): Contaminator {
  const defaultIntensity = clamp01(options.intensity ?? 0.3);
  const mode = options.mode ?? 'performer';
  const model = resolveRewriteModel(options);

  return {
    async contaminate(input: ContaminateInput): Promise<ContaminateOutput> {
      if (!model) {
        throw new Error(
          'Noise requires an LLM rewrite model. Provide createContaminator({ model }) or createContaminator({ llm: { apiKey, model } }).'
        );
      }

      const intensity = clamp01(input.intensity ?? defaultIntensity);
      const loadedMemory = options.memory
        ? await options.memory.store.load(options.memory.scopeId)
        : undefined;
      const memory = options.memory
        ? normalizeNoiseMemory(loadedMemory)
        : undefined;
      const context = createContextFingerprint({
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        streamContext: input.streamContext,
      });
      const diagnosis = diagnosePredictability({
        draft: input.draft,
        context,
      });
      const plan = buildInterventionPlan({
        diagnosis,
        context,
        intensity,
        mode,
        memory,
      });
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
      const generatedCandidates = await generateRewriteCandidates({
        draft: protectedDraft.text,
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        context,
        plan,
        friction,
        model,
        candidateCount: mode === 'subtle' ? 3 : 4,
      });
      const safeCandidates = generatedCandidates.map((candidate) => {
        const restored = restoreSensitiveSpans(
          candidate.text,
          protectedDraft.spans
        );
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
      const candidates = evaluateRewriteCandidates({
        before: input.draft,
        candidates: safeCandidates,
        context,
        qualityOptions: options.quality,
      });
      const { candidate: bestCandidate, index: selectedIndex } =
        selectBestCandidate(candidates);
      const output: ContaminateOutput = {
        text: bestCandidate.text,
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
        applied: plan.interventions.map((intervention) => ({
          kind: intervention.kind,
          reason: intervention.reason,
        })),
      };

      if (options.memory?.autoUpdate !== false) {
        await options.memory?.store.save(
          options.memory.scopeId,
          updateNoiseMemory({
            memory,
            before: input.draft,
            after: output.text,
            context,
            applied: plan.interventions,
            maxRecentEntries: options.memory.maxRecentEntries,
          })
        );
      }

      return output;
    },
  };
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

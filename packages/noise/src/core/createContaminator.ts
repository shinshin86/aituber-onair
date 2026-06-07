import { createContextFingerprint } from './contextFingerprint.js';
import { scorePredictability } from './predictability.js';
import { evaluateNoiseQuality } from './qualityEvaluator.js';
import { clamp01 } from './random.js';
import { rewriteWithStains } from './rewriteEngine.js';
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
import { planStains } from './stainPlanner.js';
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
      });
      const predictability = scorePredictability({
        draft: input.draft,
        context,
      });
      const plan = planStains({
        draft: input.draft,
        context,
        predictability,
        intensity,
        mode,
        memory,
        seed: input.seed,
      });
      const protectedDraft = protectSensitiveSpans(input.draft, {
        preserveCodeBlocks: input.constraints?.preserveCodeBlocks ?? true,
        preserveUrls: input.constraints?.preserveUrls ?? true,
        preserveNumbers: input.constraints?.preserveNumbers ?? true,
      });
      const rewritten = await rewriteWithStains({
        draft: protectedDraft.text,
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        context,
        plan,
        model,
      });
      const restored = restoreSensitiveSpans(rewritten, protectedDraft.spans);
      const safe = safetyGuard({
        before: input.draft,
        after: restored,
        constraints: input.constraints,
      });
      const quality = evaluateNoiseQuality({
        before: input.draft,
        after: safe.text,
        context,
        options: options.quality,
      });
      const output: ContaminateOutput = {
        text: safe.text,
        score: {
          predictability,
          rewrittenPredictability: quality.checks.predictabilityAfter,
          contamination: plan.intensity,
        },
        quality,
        applied: plan.stains.map((stain) => ({
          kind: stain.kind,
          reason: stain.reason,
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
            applied: plan.stains,
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

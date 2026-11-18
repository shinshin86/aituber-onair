import type {
  CommentAnalysisLLMProvider,
  LLMCommentAnalysisResult,
} from '../types/llm.js';
import {
  buildCommentDecisions,
  parseCommentDecisions,
} from '../jev/commentDecisions.js';
import type { DecisionsCommentDecision } from '../jev/commentDecisions.js';
import { resolveMaxComments } from '../jev/questionLimits.js';
import type { DecisionsTransport } from '../jev/types.js';
import { createOpenRouterDecisionTransport } from '../jev/openRouterTransport.js';
import { createTypeSafeDecisionTransport } from '../jev/typeSafeTransport.js';

export type DecisionsCommentAnalysisOptions = {
  transport: DecisionsTransport;
  apiKey: string;
  model?: string;
  /** Uncalibrated starting threshold; tune against your own comment data. */
  minConfidence?: number;
  /**
   * First N eligible comments in caller order. Explicit values exceeding the
   * transport ceiling are rejected at creation, reserving 3 questions per
   * comment (7 with responsePlan). Default: the smaller of 20 and the ceiling.
   * TypeSafe and OpenRouter retain their 50-comment ceiling.
   */
  maxComments?: number;
  /** Cancels the HTTP request; default 2500 ms. */
  timeoutMs?: number;
  /**
   * Also asks how much thought each reply needs and whether a moderator
   * should look at the comment, in the same request. Default false.
   */
  responsePlan?: boolean | DecisionsResponsePlanOptions;
  fetch?: typeof globalThis.fetch;
};

export type DecisionsResponsePlanOptions = {
  /**
   * Uncalibrated safety-risk probability that sets `notifyModerator`;
   * default 0.8.
   */
  moderatorThreshold?: number;
  /**
   * Uncalibrated probability that sets `needsAttention` and
   * `pointsOutError`; default 0.5.
   */
  signalThreshold?: number;
};

export type DecisionsCommentAnalysisResult = LLMCommentAnalysisResult & {
  decisions: DecisionsCommentDecision[];
};

export type DecisionsCommentAnalysisProvider = Omit<
  CommentAnalysisLLMProvider,
  'analyze'
> & {
  analyze(
    input: Parameters<CommentAnalysisLLMProvider['analyze']>[0]
  ): Promise<DecisionsCommentAnalysisResult>;
};

export function createDecisionsCommentAnalysisProvider(
  options: DecisionsCommentAnalysisOptions
): DecisionsCommentAnalysisProvider {
  if (options.transport !== 'openrouter' && options.transport !== 'typesafe')
    throw new Error('Unsupported Jev transport');
  const errorPrefix =
    options.transport === 'typesafe' || options.transport === 'openrouter'
      ? 'Jev'
      : 'Decisions';
  if (!options.apiKey?.trim())
    throw new Error(
      `${errorPrefix} requires a ${options.transport === 'typesafe' ? 'TypeSafe AI' : 'OpenRouter'} API key`
    );
  const minConfidence = options.minConfidence ?? 0.7;
  const timeoutMs = options.timeoutMs ?? 2500;
  if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1)
    throw new Error(`${errorPrefix} minConfidence must be between 0 and 1`);
  const responsePlan = Boolean(options.responsePlan);
  const maxComments = resolveMaxComments(
    options.transport,
    options.maxComments,
    responsePlan
  );
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error(`${errorPrefix} timeoutMs must be positive`);
  const planOptions =
    typeof options.responsePlan === 'object' ? options.responsePlan : {};
  const moderatorThreshold = planOptions.moderatorThreshold ?? 0.8;
  const signalThreshold = planOptions.signalThreshold ?? 0.5;
  for (const [name, value] of [
    ['moderatorThreshold', moderatorThreshold],
    ['signalThreshold', signalThreshold],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new Error(`${errorPrefix} ${name} must be between 0 and 1`);
  }
  const model =
    options.model ??
    (options.transport === 'typesafe' ? 'jev-latest' : '~typesafe/jev-latest');
  if (!model.trim()) throw new Error(`${errorPrefix} model must not be empty`);
  const createTransport =
    options.transport === 'typesafe'
      ? createTypeSafeDecisionTransport
      : createOpenRouterDecisionTransport;
  const request = createTransport({
    apiKey: options.apiKey.trim(),
    model,
    fetch: options.fetch,
  });

  return {
    inputScope: 'eligible-comments',
    async analyze(input) {
      const batch = buildCommentDecisions(input, maxComments, {
        responsePlan,
        errorPrefix,
      });
      if (!batch.keys.length)
        return {
          semanticAssessments: [],
          decisions: [],
          ...(responsePlan ? { responsePlans: [] } : {}),
        };
      const controller = new AbortController();
      const abort = () => controller.abort();
      input.signal?.addEventListener('abort', abort, { once: true });
      if (input.signal?.aborted) controller.abort();
      const timer = setTimeout(abort, timeoutMs);
      try {
        if (controller.signal.aborted)
          throw new Error(`${errorPrefix} request aborted`);
        const response = await request(batch.request, controller.signal);
        if (controller.signal.aborted)
          throw new Error(`${errorPrefix} request aborted`);
        return parseCommentDecisions(response, batch.keys, minConfidence, {
          responsePlan,
          moderatorThreshold,
          signalThreshold,
          errorPrefix,
        });
      } finally {
        clearTimeout(timer);
        input.signal?.removeEventListener('abort', abort);
      }
    },
  };
}

/** Backwards-compatible alias with identical options and behavior. */
export const createJevCommentAnalysisProvider =
  createDecisionsCommentAnalysisProvider;

export type JevCommentAnalysisOptions = DecisionsCommentAnalysisOptions;
export type JevResponsePlanOptions = DecisionsResponsePlanOptions;
export type JevCommentAnalysisResult = DecisionsCommentAnalysisResult;
export type JevCommentAnalysisProvider = DecisionsCommentAnalysisProvider;

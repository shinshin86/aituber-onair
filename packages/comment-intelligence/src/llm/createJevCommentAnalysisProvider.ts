import type {
  CommentAnalysisLLMProvider,
  LLMCommentAnalysisResult,
} from '../types/llm.js';
import {
  buildCommentDecisions,
  parseCommentDecisions,
} from '../jev/commentDecisions.js';
import type { JevCommentDecision } from '../jev/commentDecisions.js';
import { createOpenRouterDecisionTransport } from '../jev/openRouterTransport.js';
import { createTypeSafeDecisionTransport } from '../jev/typeSafeTransport.js';

export type JevCommentAnalysisOptions = {
  transport: 'openrouter' | 'typesafe';
  apiKey: string;
  model?: string;
  /** Uncalibrated starting threshold; tune against your own comment data. */
  minConfidence?: number;
  /** First N eligible comments in caller order, 1-50; default 20. */
  maxComments?: number;
  /** Cancels the HTTP request; default 2500 ms. */
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

export type JevCommentAnalysisResult = LLMCommentAnalysisResult & {
  decisions: JevCommentDecision[];
};

export type JevCommentAnalysisProvider = Omit<
  CommentAnalysisLLMProvider,
  'analyze'
> & {
  analyze(
    input: Parameters<CommentAnalysisLLMProvider['analyze']>[0]
  ): Promise<JevCommentAnalysisResult>;
};

export function createJevCommentAnalysisProvider(
  options: JevCommentAnalysisOptions
): JevCommentAnalysisProvider {
  if (options.transport !== 'openrouter' && options.transport !== 'typesafe')
    throw new Error('Unsupported Jev transport');
  if (!options.apiKey?.trim())
    throw new Error(
      `Jev requires a ${options.transport === 'typesafe' ? 'TypeSafe AI' : 'OpenRouter'} API key`
    );
  const minConfidence = options.minConfidence ?? 0.7;
  const maxComments = options.maxComments ?? 20;
  const timeoutMs = options.timeoutMs ?? 2500;
  if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1)
    throw new Error('Jev minConfidence must be between 0 and 1');
  if (!Number.isInteger(maxComments) || maxComments < 1 || maxComments > 50)
    throw new Error('Jev maxComments must be an integer between 1 and 50');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error('Jev timeoutMs must be positive');
  const model =
    options.model ??
    (options.transport === 'typesafe' ? 'jev-latest' : '~typesafe/jev-latest');
  if (!model.trim()) throw new Error('Jev model must not be empty');
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
      const batch = buildCommentDecisions(input, maxComments);
      if (!batch.keys.length) return { semanticAssessments: [], decisions: [] };
      const controller = new AbortController();
      const abort = () => controller.abort();
      input.signal?.addEventListener('abort', abort, { once: true });
      if (input.signal?.aborted) controller.abort();
      const timer = setTimeout(abort, timeoutMs);
      try {
        if (controller.signal.aborted) throw new Error('Jev request aborted');
        const response = await request(batch.request, controller.signal);
        if (controller.signal.aborted) throw new Error('Jev request aborted');
        return parseCommentDecisions(response, batch.keys, minConfidence);
      } finally {
        clearTimeout(timer);
        input.signal?.removeEventListener('abort', abort);
      }
    },
  };
}

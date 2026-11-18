import type { DecisionsTransport } from './types.js';

const QUESTION_LIMITS = {
  openai: 400,
  liquid: 128,
  cloudflare: 64,
  google: 1000,
} as const;

// Future transport limits are prepared here without advertising API support.
type TransportWithLimit =
  | DecisionsTransport
  | 'microsoft'
  | keyof typeof QUESTION_LIMITS;

/**
 * Reserve the worst-case number of questions, regardless of current context.
 * Reject explicit oversized batches at creation; reduce only the default 20.
 * Transports without a question limit retain the existing 50-comment ceiling.
 */
export function resolveMaxComments(
  transport: TransportWithLimit,
  requested: number | undefined,
  responsePlan: boolean
): number {
  const questionLimit = Object.prototype.hasOwnProperty.call(
    QUESTION_LIMITS,
    transport
  )
    ? QUESTION_LIMITS[transport as keyof typeof QUESTION_LIMITS]
    : undefined;
  const questionsPerComment = responsePlan ? 7 : 3;
  const ceiling = questionLimit
    ? Math.floor(questionLimit / questionsPerComment)
    : 50;
  const maxComments = requested ?? Math.min(20, ceiling);
  if (
    !Number.isInteger(maxComments) ||
    maxComments < 1 ||
    maxComments > ceiling
  ) {
    if (transport === 'typesafe' || transport === 'openrouter')
      throw new Error('Jev maxComments must be an integer between 1 and 50');
    const detail = questionLimit
      ? ` (${questionLimit} questions per request, up to ${questionsPerComment} per comment)`
      : '';
    throw new Error(
      `Decisions ${transport} maxComments must be an integer between 1 and ${ceiling}${detail}`
    );
  }
  return maxComments;
}

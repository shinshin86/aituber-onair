export type DecisionsTransport =
  | 'openrouter'
  | 'typesafe'
  | 'microsoft'
  | 'liquid'
  | 'google'
  | 'openai'
  | 'cloudflare';

/** Workers AI binding; the consuming application supplies its own instance. */
export type CloudflareDecisionsBinding = {
  run(model: string, input: unknown): Promise<unknown>;
};

export type DecisionsRequestHandler = (
  request: DecisionsRequest,
  signal: AbortSignal
) => Promise<unknown>;

export type DecisionsChoiceQuestion = {
  type: 'choice';
  instructions: string;
  criteria: Record<'yes' | 'no' | 'uncertain', string>;
};

/** Ordered levels, from low to high. */
export type DecisionsScoreQuestion = {
  type: 'score';
  instructions: string;
  criteria: string[];
};

export type DecisionsNoulQuestion = {
  type: 'noul';
  instructions: string;
  criteria: Record<'true' | 'false', string>;
};

export type DecisionsQuestion =
  | DecisionsChoiceQuestion
  | DecisionsScoreQuestion
  | DecisionsNoulQuestion;

export type DecisionsRequest = {
  state: unknown;
  questions: Record<string, DecisionsQuestion>;
};

export type JevChoiceQuestion = DecisionsChoiceQuestion;
export type JevScoreQuestion = DecisionsScoreQuestion;
export type JevNoulQuestion = DecisionsNoulQuestion;
export type JevQuestion = DecisionsQuestion;
export type JevDecisionRequest = DecisionsRequest;

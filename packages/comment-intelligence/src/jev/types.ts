export type JevChoiceQuestion = {
  type: 'choice';
  instructions: string;
  criteria: Record<'yes' | 'no' | 'uncertain', string>;
};

/** Ordered levels, from low to high. */
export type JevScoreQuestion = {
  type: 'score';
  instructions: string;
  criteria: string[];
};

export type JevNoulQuestion = {
  type: 'noul';
  instructions: string;
  criteria: Record<'true' | 'false', string>;
};

export type JevQuestion =
  | JevChoiceQuestion
  | JevScoreQuestion
  | JevNoulQuestion;

export type JevDecisionRequest = {
  state: unknown;
  questions: Record<string, JevQuestion>;
};

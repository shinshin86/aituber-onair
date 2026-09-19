export type JevChoiceQuestion = {
  type: 'choice';
  instructions: string;
  criteria: Record<'yes' | 'no' | 'uncertain', string>;
};

export type JevDecisionRequest = {
  state: unknown;
  questions: Record<string, JevChoiceQuestion>;
};

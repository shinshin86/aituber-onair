export type SafetyCategory =
  | 'prompt_injection'
  | 'personal_info'
  | 'harassment'
  | 'sexual'
  | 'violence'
  | 'spam'
  | 'url'
  | 'repetition'
  | 'viewer_blocked'
  | 'unknown';

export type SafetyReport = {
  commentId: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  categories: SafetyCategory[];
  shouldIgnore: boolean;
  reason?: string;
};

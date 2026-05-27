import type { CommentIntelligenceResult } from '../types/result';
import { resolveLanguage } from '../utils/language';

export function buildInstruction(
  result: CommentIntelligenceResult,
  language?: 'ja' | 'en' | 'auto'
): string {
  if (result.instructionForLLM) {
    return result.instructionForLLM;
  }

  const resolvedLanguage = resolveLanguage(language);

  if (result.selectedComments.length === 0) {
    return resolvedLanguage === 'ja'
      ? '安全に拾うべきコメントがないため、自然な雑談を短く続けてください。'
      : 'No safe comment is ready to answer. Continue with brief, natural stream chatter.';
  }

  return resolvedLanguage === 'ja'
    ? '選ばれたコメントに短く自然に返答し、配信のテンポを保ってください。'
    : 'Reply briefly and naturally to the selected comment, and keep the stream moving.';
}

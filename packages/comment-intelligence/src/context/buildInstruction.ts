import type { CommentIntelligenceResult } from '../types/result';

export function buildInstruction(result: CommentIntelligenceResult): string {
  if (result.instructionForLLM) {
    return result.instructionForLLM;
  }

  if (result.selectedComments.length === 0) {
    return '安全に拾うべきコメントがないため、自然な雑談を短く続けてください。';
  }

  return '選ばれたコメントに短く自然に返答し、配信のテンポを保ってください。';
}

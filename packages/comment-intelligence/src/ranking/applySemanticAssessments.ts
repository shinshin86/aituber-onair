import type { CommentIntelligenceConfig } from '../types/config.js';
import type { StreamState } from '../types/context.js';
import type { CommentSemanticAssessment } from '../types/llm.js';
import type { RankedComment } from '../types/ranking.js';
import { getStrategyWeights } from './strategies.js';

/** Preserve factual scores and exclusions; replace only assessed signals. */
export function applySemanticAssessments(
  comments: RankedComment[],
  assessments: CommentSemanticAssessment[],
  config: CommentIntelligenceConfig['ranking'],
  streamState?: StreamState
): RankedComment[] {
  const byId = new Map(assessments.map((a) => [a.commentId, a]));
  const weights = {
    ...getStrategyWeights(config?.strategy),
    ...config?.weights,
  };
  if (config?.topicFilter === 'off') weights.topicRelevance = 0;
  return comments
    .map((comment) => {
      const assessment = byId.get(comment.id);
      if (!assessment || comment.safetyReport?.shouldIgnore) return comment;
      const breakdown = { ...comment.scoreBreakdown };
      let reasons = [...comment.reasons];
      let score = comment.score;
      if (typeof assessment.question === 'boolean') {
        const question = assessment.question ? 1 : 0;
        score += (question - breakdown.question) * weights.question;
        breakdown.question = question;
        reasons = reasons.filter((r) => r !== 'direct_question');
        if (question) reasons.push('direct_question');
      }
      if (
        typeof assessment.topicRelated === 'boolean' &&
        streamState?.topic?.trim() &&
        config?.topicFilter !== 'off'
      ) {
        const related = assessment.topicRelated ? 1 : 0;
        score += (related - breakdown.topicRelevance) * weights.topicRelevance;
        breakdown.topicRelevance = related;
        reasons = reasons.filter(
          (r) => r !== 'topic_related' && r !== 'topic_unrelated'
        );
        reasons.push(related ? 'topic_related' : 'topic_unrelated');
      }
      if (assessment.alreadyAnswered === true) {
        reasons.push('answered_in_context');
        // A semantic match is a soft penalty, never a persistent answered mark.
        if (!reasons.includes('ignored_recently')) {
          breakdown.penalty += 0.75;
          score -= 0.75;
        }
      }
      return { ...comment, score, scoreBreakdown: breakdown, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

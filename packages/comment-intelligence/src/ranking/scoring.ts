import type { LiveComment } from '../types/comment.js';
import type { StreamState } from '../types/context.js';
import type {
  CommentScoreBreakdown,
  RankingReason,
  RankingWeights,
} from '../types/ranking.js';
import type { SafetyReport } from '../types/safety.js';
import type { ViewerProfile } from '../types/viewer.js';
import { normalizeText } from '../utils/text.js';

const questionPatterns: Array<string | RegExp> = [
  '？',
  '?',
  'なに',
  '何',
  'どう',
  'いつ',
  'どこ',
  '誰',
  'なんで',
  '教えて',
  /\bwhat\b/i,
  /\bhow\b/i,
  /\bwhen\b/i,
  /\bwhere\b/i,
  /\bwho\b/i,
  /\bwhy\b/i,
];

export function isQuestion(text: string): boolean {
  return questionPatterns.some((pattern) =>
    typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
  );
}

export function isTopicRelated(
  text: string,
  streamState?: StreamState
): boolean {
  const topic = streamState?.topic?.trim();
  if (!topic) {
    return false;
  }

  const normalizedText = normalizeText(text);
  const normalizedTopic = normalizeText(topic);
  if (normalizedText.includes(normalizedTopic)) {
    return true;
  }

  return normalizedTopic
    .split(/[,\s、。]+/)
    .filter((token) => token.length >= 2)
    .some((token) => normalizedText.includes(token));
}

export function scoreComment(input: {
  comment: LiveComment;
  safetyReport?: SafetyReport;
  viewerProfile?: ViewerProfile;
  duplicate: boolean;
  freshestTimestamp: number;
  streamState?: StreamState;
  weights: RankingWeights;
  safetyPenaltyMultiplier: number;
}): {
  score: number;
  scoreBreakdown: CommentScoreBreakdown;
  reasons: RankingReason[];
} {
  const {
    comment,
    duplicate,
    freshestTimestamp,
    safetyPenaltyMultiplier,
    safetyReport,
    streamState,
    viewerProfile,
    weights,
  } = input;
  const reasons: RankingReason[] = [];
  const question = isQuestion(comment.text) ? 1 : 0;
  if (question > 0) {
    reasons.push('direct_question');
  }

  const topicRelevance = isTopicRelated(comment.text, streamState) ? 1 : 0;
  if (topicRelevance > 0) {
    reasons.push('topic_related');
  } else if (streamState?.topic?.trim()) {
    reasons.push('topic_unrelated');
  }

  const messageCount = viewerProfile?.messageCount ?? 0;
  const relationshipLevel = viewerProfile?.relationshipLevel ?? 0;
  const isNewViewer =
    comment.text.includes('初見') || !viewerProfile || messageCount <= 1;
  const isReturningViewer = messageCount >= 10 || relationshipLevel >= 5;
  const novelty = isNewViewer ? 1 : 0;
  if (isNewViewer) {
    reasons.push('new_viewer');
  }

  const viewerRelationship = Math.min(
    1,
    relationshipLevel / 10 + Math.min(messageCount, 50) / 100
  );
  if (isReturningViewer) {
    reasons.push('returning_viewer');
  }

  const safety =
    safetyReport?.riskLevel === 'high'
      ? -1
      : safetyReport?.riskLevel === 'medium'
        ? 0.3
        : safetyReport?.riskLevel === 'low'
          ? 0.7
          : 1;
  if (safetyReport?.shouldIgnore || safetyReport?.riskLevel === 'high') {
    reasons.push('unsafe');
  }

  const freshness =
    freshestTimestamp > 0
      ? Math.max(0, 1 - (freshestTimestamp - comment.timestamp) / 60_000)
      : 1;
  if (freshness > 0.8) {
    reasons.push('fresh');
  }

  let priorityBoost = 0;
  if (comment.author.roles?.includes('moderator')) {
    priorityBoost += 0.12;
    reasons.push('moderator');
  }
  if (
    comment.author.roles?.includes('member') ||
    comment.author.roles?.includes('subscriber')
  ) {
    priorityBoost += 0.06;
  }
  if (comment.metadata?.superChat) {
    priorityBoost += 0.2;
    reasons.push('super_chat');
  }

  let penalty = 0;
  if (duplicate) {
    penalty += 0.25;
    reasons.push('duplicate');
  }
  if (comment.text.length > 180) {
    penalty += 0.2;
    reasons.push('spam_like');
  }
  if (safetyReport?.categories.includes('url')) {
    penalty += 0.15;
  }
  if (safetyReport?.riskLevel === 'high') {
    penalty += 1 * safetyPenaltyMultiplier;
  }

  const scoreBreakdown = {
    question,
    topicRelevance,
    viewerRelationship,
    novelty,
    safety,
    freshness,
    priorityBoost,
    penalty,
  };
  const score =
    question * weights.question +
    topicRelevance * weights.topicRelevance +
    viewerRelationship * weights.viewerRelationship +
    novelty * weights.novelty +
    safety * weights.safety +
    freshness * weights.freshness +
    priorityBoost -
    penalty;

  return { score, scoreBreakdown, reasons };
}

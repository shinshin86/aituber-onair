import type { RankingStrategy, RankingWeights } from '../types/ranking.js';

export const defaultRankingWeights: RankingWeights = {
  question: 0.25,
  topicRelevance: 0.2,
  viewerRelationship: 0.15,
  novelty: 0.15,
  safety: 0.2,
  freshness: 0.05,
};

export function getStrategyWeights(
  strategy: RankingStrategy = 'balanced'
): RankingWeights {
  const weights = { ...defaultRankingWeights };

  if (strategy === 'new-viewer-friendly') {
    weights.novelty = 0.3;
    weights.viewerRelationship = 0.1;
  }

  if (strategy === 'loyal-viewer-friendly') {
    weights.viewerRelationship = 0.3;
    weights.novelty = 0.05;
  }

  if (strategy === 'topic-focused') {
    weights.topicRelevance = 0.35;
  }

  if (strategy === 'chaos-resistant') {
    weights.safety = 0.4;
  }

  if (strategy === 'q-and-a') {
    weights.question = 0.45;
  }

  return weights;
}

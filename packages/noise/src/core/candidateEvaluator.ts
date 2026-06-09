import { scorePredictability } from './predictability.js';
import { evaluateNoiseQuality } from './qualityEvaluator.js';
import type {
  CandidateEvaluation,
  ContextFingerprint,
  EvaluatedCandidate,
  NoiseQualityOptions,
  RewriteCandidate,
} from './types.js';

const AGGRESSION_PATTERN =
  /黙れ|うるさい|知らん|勝手に|馬鹿|バカ|最悪|shut up|stupid|idiot|whatever/i;
const META_WORD_PATTERN = /予定調和|ノイズ|noise/i;

export function evaluateRewriteCandidates(input: {
  before: string;
  candidates: RewriteCandidate[];
  context: ContextFingerprint;
  qualityOptions?: NoiseQualityOptions;
}): EvaluatedCandidate[] {
  const beforePredictability = scorePredictability({
    draft: input.before,
    context: input.context,
  });

  return input.candidates.map((candidate) => {
    const quality = evaluateNoiseQuality({
      before: input.before,
      after: candidate.text,
      context: input.context,
      options: input.qualityOptions,
    });
    const afterPredictability = quality.checks.predictabilityAfter;
    const evaluation = evaluateCandidate({
      before: input.before,
      after: candidate.text,
      context: input.context,
      beforePredictability,
      afterPredictability,
      qualityPassed: quality.passed,
    });

    return {
      ...candidate,
      evaluation,
      quality,
    };
  });
}

export function selectBestCandidate(candidates: EvaluatedCandidate[]): {
  candidate: EvaluatedCandidate;
  index: number;
} {
  const ranked = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      return (
        scoreForSelection(right.candidate) - scoreForSelection(left.candidate)
      );
    });

  return ranked[0];
}

function scoreForSelection(candidate: EvaluatedCandidate): number {
  const errorPenalty = candidate.quality.issues.some(
    (issue) => issue.severity === 'error'
  )
    ? 0.5
    : 0;
  const interventionBonus = Math.min(
    0.12,
    candidate.appliedInterventions.length * 0.04
  );

  return candidate.evaluation.finalScore + interventionBonus - errorPenalty;
}

function evaluateCandidate(input: {
  before: string;
  after: string;
  context: ContextFingerprint;
  beforePredictability: number;
  afterPredictability: number;
  qualityPassed: boolean;
}): CandidateEvaluation {
  const issues: string[] = [];
  const predictabilityReduction = Math.max(
    0,
    input.beforePredictability - input.afterPredictability
  );
  const contextGrounding = scoreContextGrounding(input.after, input.context);
  const specificityGain = Math.max(
    0,
    scoreSpecificity(input.after, input.context) -
      scoreSpecificity(input.before, input.context)
  );
  const overAggressionRisk = scoreRisk(input.after, AGGRESSION_PATTERN);
  const ungroundedDetailRisk = scoreUngroundedDetailRisk(input);
  const overRewriteRisk = scoreOverRewriteRisk(input.before, input.after);
  const meaningPreservation = Math.max(0, 1 - overRewriteRisk * 0.65);
  const personaPreservation = Math.max(0, 1 - overAggressionRisk);

  if (META_WORD_PATTERN.test(input.after)) {
    issues.push('meta_word');
  }

  if (overAggressionRisk > 0.25) {
    issues.push('aggression_risk');
  }

  if (ungroundedDetailRisk > 0.35) {
    issues.push('ungrounded_detail_risk');
  }

  if (input.after.trim() === input.before.trim()) {
    issues.push('unchanged');
  }

  const finalScore =
    predictabilityReduction * 0.25 +
    contextGrounding * 0.2 +
    specificityGain * 0.15 +
    personaPreservation * 0.2 +
    meaningPreservation * 0.2 -
    overAggressionRisk * 0.3 -
    ungroundedDetailRisk * 0.3 -
    overRewriteRisk * 0.12 +
    (input.qualityPassed ? 0.08 : -0.08);

  return {
    predictabilityReduction,
    contextGrounding,
    specificityGain,
    personaPreservation,
    meaningPreservation,
    overAggressionRisk,
    ungroundedDetailRisk,
    overRewriteRisk,
    finalScore: Number(Math.max(0, Math.min(1, finalScore)).toFixed(3)),
    issues,
  };
}

function scoreContextGrounding(
  text: string,
  context: ContextFingerprint
): number {
  if (context.commonGroundHints.length === 0) {
    return 0.45;
  }

  const matched = context.commonGroundHints.filter((hint) =>
    text.includes(hint)
  ).length;

  return Math.min(1, matched / Math.max(1, context.commonGroundHints.length));
}

function scoreSpecificity(text: string, context: ContextFingerprint): number {
  let score = 0;

  if (/\d/.test(text)) {
    score += 0.2;
  }

  if (
    /ここで|先に|画面|音|コメント|質問|ゲーム|紹介|止め|切り替え/.test(text)
  ) {
    score += 0.35;
  }

  if (context.topicHints.some((hint) => text.includes(hint))) {
    score += 0.3;
  }

  if (text.length >= 30 && text.length <= 180) {
    score += 0.15;
  }

  return Math.min(1, score);
}

function scoreRisk(text: string, pattern: RegExp): number {
  return pattern.test(text) ? 0.8 : 0;
}

function scoreUngroundedDetailRisk(input: {
  before: string;
  after: string;
  context: ContextFingerprint;
}): number {
  const beforeTerms = extractTerms(input.before);
  const contextTerms = extractTerms(
    `${input.context.recentUserText}\n${input.context.topicHints.join('\n')}`
  );
  const afterTerms = extractTerms(input.after);
  const newTerms = [...afterTerms].filter(
    (term) => !beforeTerms.has(term) && !contextTerms.has(term)
  );

  return Math.min(1, newTerms.length * 0.08);
}

function scoreOverRewriteRisk(before: string, after: string): number {
  if (!before || !after) {
    return 1;
  }

  const beforeTerms = extractTerms(before);
  const afterTerms = extractTerms(after);
  const overlap = [...beforeTerms].filter((term) =>
    afterTerms.has(term)
  ).length;
  const denominator = Math.max(1, Math.min(beforeTerms.size, afterTerms.size));

  return 1 - overlap / denominator;
}

function extractTerms(text: string): Set<string> {
  const terms =
    text.match(/[A-Za-z0-9_-]{3,}|[\u30a0-\u30ff]{2,}|[\u3400-\u9fff]{2,}/g) ??
    [];

  return new Set(terms.map((term) => term.toLowerCase()));
}

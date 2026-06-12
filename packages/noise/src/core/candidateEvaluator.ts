import { changedFinalSentence, scoreGenericity } from './genericity.js';
import { hasPlayMarker, requiresPlayMarker } from './playMarkers.js';
import { scorePredictability } from './predictability.js';
import { evaluateNoiseQuality } from './qualityEvaluator.js';
import type {
  CandidateEvaluation,
  ContextFingerprint,
  EvaluatedCandidate,
  NoiseMode,
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
  mode?: NoiseMode;
  qualityOptions?: NoiseQualityOptions;
  /** Character's own recent outputs, used for the genericity penalty. */
  recentResponses?: string[];
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
      appliedInterventions: candidate.appliedInterventions,
    });
    const afterPredictability = quality.checks.predictabilityAfter;
    const evaluation = evaluateCandidate({
      before: input.before,
      after: candidate.text,
      context: input.context,
      beforePredictability,
      afterPredictability,
      qualityPassed: quality.passed,
      mode: input.mode ?? 'performer',
      candidate,
      recentResponses: input.recentResponses,
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
  mode: NoiseMode;
  candidate: RewriteCandidate;
  recentResponses?: string[];
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
  const genericityRisk = scoreGenericity({
    text: input.after,
    recentResponses: input.recentResponses,
  });
  const modeProfile = getModeEvaluationProfile(input.mode);
  const meaningPreservation = Math.max(
    0,
    1 - overRewriteRisk * modeProfile.meaningRiskWeight
  );
  const personaPreservation = Math.max(0, 1 - overAggressionRisk);
  const missingPlayMarker =
    requiresPlayMarker(input.candidate.appliedInterventions) &&
    !hasPlayMarker(input.after);

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

  if (genericityRisk > 0.45) {
    issues.push('generic_reply');
  }

  if (missingPlayMarker) {
    issues.push('missing_play_marker');
  }

  const finalScore =
    predictabilityReduction * 0.25 +
    contextGrounding * 0.2 +
    specificityGain * 0.15 +
    personaPreservation * 0.2 +
    meaningPreservation * 0.2 -
    overAggressionRisk * 0.3 -
    ungroundedDetailRisk * 0.3 -
    genericityRisk * 0.15 -
    (missingPlayMarker ? 0.12 : 0) -
    overRewriteRisk * modeProfile.overRewritePenalty +
    noveltyBonus(overRewriteRisk, input.mode) +
    (changedFinalSentence(input.before, input.after) ? 0.06 : 0) +
    atypicalityBonus(input.candidate.typicality) +
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
    genericityRisk,
    finalScore: Number(Math.max(0, Math.min(1, finalScore)).toFixed(3)),
    issues,
  };
}

/**
 * Verbalized-sampling style bonus: when the model reports how typical each
 * candidate is, gently prefer the distribution tail.
 */
function atypicalityBonus(typicality: number | undefined): number {
  if (typeof typicality !== 'number') {
    return 0;
  }

  return (1 - typicality) * 0.04;
}

function getModeEvaluationProfile(mode: NoiseMode): {
  meaningRiskWeight: number;
  overRewritePenalty: number;
} {
  switch (mode) {
    case 'subtle':
      return {
        meaningRiskWeight: 0.75,
        overRewritePenalty: 0.14,
      };
    case 'performer':
      return {
        meaningRiskWeight: 0.65,
        overRewritePenalty: 0.12,
      };
    case 'bold':
      return {
        meaningRiskWeight: 0.5,
        overRewritePenalty: 0.06,
      };
    case 'inversion':
      return {
        meaningRiskWeight: 0.44,
        overRewritePenalty: 0.04,
      };
    case 'chaotic':
      return {
        meaningRiskWeight: 0.4,
        overRewritePenalty: 0.02,
      };
  }
}

function noveltyBonus(overRewriteRisk: number, mode: NoiseMode): number {
  if (mode === 'subtle' || mode === 'performer') {
    return 0;
  }

  if (overRewriteRisk < 0.18 || overRewriteRisk > 0.72) {
    return 0;
  }

  switch (mode) {
    case 'bold':
      return 0.04;
    case 'inversion':
      return 0.07;
    case 'chaotic':
      return 0.08;
    default:
      return 0;
  }
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

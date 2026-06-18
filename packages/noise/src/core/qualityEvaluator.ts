import { hasPlayMarker, requiresPlayMarker } from './playMarkers.js';
import { scorePredictability } from './predictability.js';
import type {
  ContextFingerprint,
  InterventionKind,
  NoiseQualityIssue,
  NoiseQualityOptions,
  NoiseQualityReport,
} from './types.js';

const PERSONA_DRIFT_PATTERN =
  /黙れ|うるさい|知らん|勝手に|馬鹿|バカ|最悪|shut up|stupid|idiot|whatever/i;
const OVERDONE_NOISE_PATTERN =
  /全部を綺麗に受け止める顔|なかったことにはしない|壊す|狂|バグ|glitch|broken/i;
const UNGROUNDED_DETAIL_PATTERN =
  /画面の端|水槽|シール|知らないけど|たぶん.*はず|some random|unrelated/i;

export function evaluateNoiseQuality(input: {
  before: string;
  after: string;
  context: ContextFingerprint;
  options?: NoiseQualityOptions;
  appliedInterventions?: InterventionKind[];
}): NoiseQualityReport {
  const before = input.before.trim();
  const after = input.after.trim();
  const predictabilityBefore = scorePredictability({
    draft: before,
    context: input.context,
  });
  const predictabilityAfter = scorePredictability({
    draft: after,
    context: input.context,
  });
  const predictabilityDelta = predictabilityBefore - predictabilityAfter;
  const lengthRatio = before.length > 0 ? after.length / before.length : 1;
  const issues: NoiseQualityIssue[] = [];
  const maxLengthRatio = input.options?.maxLengthRatio ?? 1.8;

  if (!after) {
    issues.push({
      kind: 'empty_output',
      severity: 'error',
      message: 'The rewrite returned an empty response.',
    });
  }

  if (before && before === after) {
    issues.push({
      kind: 'unchanged',
      severity: 'warning',
      message: 'The rewrite did not change the predictable draft.',
    });
  }

  if (predictabilityBefore >= 0.3 && predictabilityDelta < 0.05) {
    issues.push({
      kind: 'still_predictable',
      severity: 'warning',
      message: 'The response still looks close to the predictable draft.',
    });
  }

  if (
    PERSONA_DRIFT_PATTERN.test(after) &&
    !PERSONA_DRIFT_PATTERN.test(before)
  ) {
    issues.push({
      kind: 'persona_drift',
      severity: 'error',
      message: 'The rewrite may have changed the character too aggressively.',
    });
  }

  if (
    OVERDONE_NOISE_PATTERN.test(after) &&
    !OVERDONE_NOISE_PATTERN.test(before)
  ) {
    issues.push({
      kind: 'overdone_noise',
      severity: 'warning',
      message:
        'The rewrite may be explaining the noise instead of sounding natural.',
    });
  }

  if (
    UNGROUNDED_DETAIL_PATTERN.test(after) &&
    !UNGROUNDED_DETAIL_PATTERN.test(before) &&
    !UNGROUNDED_DETAIL_PATTERN.test(input.context.recentUserText)
  ) {
    issues.push({
      kind: 'ungrounded_detail',
      severity: 'error',
      message: 'The rewrite appears to introduce details outside the context.',
    });
  }

  if (lengthRatio > maxLengthRatio) {
    issues.push({
      kind: 'overdone_noise',
      severity: 'warning',
      message: 'The rewrite is much longer than the original draft.',
    });
  }

  if (requiresPlayMarker(input.appliedInterventions) && !hasPlayMarker(after)) {
    issues.push({
      kind: 'missing_play_marker',
      severity: 'warning',
      message:
        'A teasing-class intervention was applied without a playful marker, so the violation may read as hostility instead of play.',
    });
  }

  const score = calculateQualityScore({
    issues,
    predictabilityDelta,
    predictabilityBefore,
    lengthRatio,
    maxLengthRatio,
  });
  const minScore = input.options?.minScore ?? 0.65;

  return {
    passed:
      score >= minScore &&
      !issues.some(
        (issue) => issue.severity === 'error' || issue.kind === 'overdone_noise'
      ),
    score,
    issues,
    checks: {
      predictabilityBefore,
      predictabilityAfter,
      predictabilityDelta,
      lengthRatio,
      preservedCharacter: !issues.some(
        (issue) => issue.kind === 'persona_drift'
      ),
      avoidedOvercorrection: !issues.some(
        (issue) => issue.kind === 'overdone_noise'
      ),
      groundedInContext: !issues.some(
        (issue) => issue.kind === 'ungrounded_detail'
      ),
    },
  };
}

function calculateQualityScore(input: {
  issues: NoiseQualityIssue[];
  predictabilityDelta: number;
  predictabilityBefore: number;
  lengthRatio: number;
  maxLengthRatio: number;
}): number {
  let score = 0.72;

  if (input.predictabilityBefore < 0.3) {
    score += 0.08;
  } else if (input.predictabilityDelta >= 0.12) {
    score += 0.18;
  } else if (input.predictabilityDelta >= 0.05) {
    score += 0.08;
  }

  if (input.lengthRatio <= input.maxLengthRatio) {
    score += 0.05;
  }

  for (const issue of input.issues) {
    score -= issue.severity === 'error' ? 0.35 : 0.12;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

import { normalizeText } from '../utils/text';

export type FeedbackToneEvaluation = {
  isHostile: boolean;
  score: number;
  signals: string[];
};

const HOSTILE_THRESHOLD = 4;

const targetPatterns: RegExp[] = [
  /(この)?配信/u,
  /喋り方|しゃべり方|話し方/u,
  /声|内容|画面/u,
  /お前|あなた|こいつ|この人/u,
  /\b(stream|voice|talking|content|screen|you)\b/i,
];

const negativeStancePatterns: RegExp[] = [
  /つまらない|つまんない|おもんない/u,
  /嫌い|きらい/u,
  /最悪|ひどい|見る価値ない/u,
  /\bboring\b/i,
  /\bhate\b/i,
  /\bawful\b|\bterrible\b/i,
];

const constructivePatterns: RegExp[] = [
  /少し|ちょっと|もう少し/u,
  /かも|かもしれない/u,
  /してほしい|して欲しい|してください/u,
  /した方が|すると良さそう|お願いします/u,
  /小さい|大きい|聞こえない|見づらい|見にくい/u,
  /改善|提案|調整/u,
  /\bplease\b|\bcould you\b|\bmaybe\b|\btoo (quiet|loud|fast|slow)\b/i,
];

const positiveReversalPatterns: RegExp[] = [
  /つまらな(い|かった).{0,12}(けど|けれど|でも).{0,12}(面白|楽しい|好き)/u,
  /(boring|awful|terrible).{0,24}\b(but|though)\b.{0,24}\b(good|fun|great|like)\b/i,
];

export function evaluateFeedbackTone(text: string): FeedbackToneEvaluation {
  const normalized = normalizeText(text);
  const signals: string[] = [];
  let score = 0;

  const hasPositiveReversal = positiveReversalPatterns.some((pattern) =>
    pattern.test(normalized)
  );
  if (hasPositiveReversal) {
    return { isHostile: false, score: 0, signals: ['positive_reversal'] };
  }

  const hasNegativeStance = negativeStancePatterns.some((pattern) =>
    pattern.test(normalized)
  );
  if (hasNegativeStance) {
    score += 2;
    signals.push('negative_stance');
  }

  const targetsStreamOrSpeaker = targetPatterns.some((pattern) =>
    pattern.test(normalized)
  );
  if (targetsStreamOrSpeaker) {
    score += 1;
    signals.push('targets_stream_or_speaker');
  }

  const hasConstructiveCue = constructivePatterns.some((pattern) =>
    pattern.test(normalized)
  );
  if (hasConstructiveCue) {
    score -= 2;
    signals.push('constructive_cue');
  }

  const isShortDismissal = hasNegativeStance && normalized.length <= 14;
  if (isShortDismissal) {
    score += 1;
    signals.push('short_dismissal');
  }

  const isNonConstructive = hasNegativeStance && !hasConstructiveCue;
  if (isNonConstructive) {
    score += 1;
    signals.push('non_constructive');
  }

  return {
    isHostile: score >= HOSTILE_THRESHOLD,
    score,
    signals,
  };
}

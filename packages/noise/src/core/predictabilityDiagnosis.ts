import {
  getLoopedTopicPatterns,
  getOverusedPhrases,
  getRepeatedClosingPatterns,
} from '../memory/noiseMemory.js';
import { getFinalSentence } from './genericity.js';
import { scorePredictability } from './predictability.js';
import { clamp01 } from './random.js';
import type {
  ContextFingerprint,
  NoiseMemory,
  PredictabilityDiagnosis,
  PredictabilityIssue,
  PredictabilityIssueKind,
} from './types.js';

const ISSUE_PATTERNS: Array<{
  kind: PredictabilityIssueKind;
  pattern: RegExp;
  evidence: string;
  severity: number;
}> = [
  {
    kind: 'generic_closing',
    pattern:
      /次回も楽しみに|また来て|よろしくお願いします|良い一日|see you next|have a great/i,
    evidence: 'The draft uses a clean closing phrase.',
    severity: 0.72,
  },
  {
    kind: 'over_agreement',
    pattern:
      /その通り|いいですね|素晴らしい|もちろん|嬉しいです|証拠なので|absolutely|great point/i,
    evidence: 'The draft agrees or accepts too smoothly.',
    severity: 0.62,
  },
  {
    kind: 'over_apology',
    pattern:
      /申し訳ありません|すみません|ご不便をおかけ|お待ちください|sorry|apologize/i,
    evidence: 'The draft leans on a service apology.',
    severity: 0.68,
  },
  {
    kind: 'forced_positive',
    pattern:
      /楽しい時間|明るく進め|楽しんでもらえる|みんなで楽しく|positive|fun time/i,
    evidence: 'The draft forces a positive landing.',
    severity: 0.66,
  },
  {
    kind: 'too_complete',
    pattern: /まとめると|結論として|最後に|順番に答えて|in summary|finally/i,
    evidence: 'The draft closes the interaction too neatly.',
    severity: 0.58,
  },
];

export function diagnosePredictability(input: {
  draft: string;
  context: ContextFingerprint;
  /**
   * Adaptive noise memory. When provided, the character's own recorded
   * habits (repeated closings, overused phrases, topic loops) count as
   * predictability on top of the built-in lexicon.
   */
  memory?: NoiseMemory;
}): PredictabilityDiagnosis {
  const issues: PredictabilityIssue[] = [];

  for (const issue of ISSUE_PATTERNS) {
    if (issue.pattern.test(input.draft)) {
      issues.push({
        kind: issue.kind,
        severity: issue.severity,
        evidence: issue.evidence,
      });
    }
  }

  if (hasLowContextGrounding(input.draft, input.context)) {
    issues.push({
      kind: 'low_context_grounding',
      severity: 0.7,
      evidence: 'The draft barely uses recent comments or stream context.',
    });
  }

  if (hasLowSpecificity(input.draft, input.context)) {
    issues.push({
      kind: 'low_specificity',
      severity: 0.62,
      evidence: 'The draft has few concrete anchors.',
    });
  }

  if (
    input.context.repetitionLevel >= 0.45 ||
    /同じ質問|何度|何回/.test(input.draft)
  ) {
    issues.push({
      kind: 'repeated_phrase',
      severity: Math.max(0.55, input.context.repetitionLevel),
      evidence: 'Recent context suggests repetition pressure.',
    });
  }

  if (
    input.context.streamTension >= 0.4 &&
    !/ここで|先に|まとめて|止め|変え|切り替え|確認/.test(input.draft)
  ) {
    issues.push({
      kind: 'no_streamer_judgment',
      severity: 0.68,
      evidence: 'The draft avoids making a streamer-side judgment.',
    });
  }

  if (
    input.context.personaVolatility >= 0.6 &&
    /丁寧|ありがとうございます|申し訳ありません|少しお待ち/.test(input.draft)
  ) {
    issues.push({
      kind: 'persona_flattening',
      severity: 0.56,
      evidence: 'The draft flattens a more volatile persona into polite prose.',
    });
  }

  const memoryIssues = input.memory
    ? diagnoseFromMemory(input.draft, input.context, input.memory)
    : [];
  issues.push(...memoryIssues);

  const score = clamp01(
    scorePredictability(input) + (memoryIssues.length > 0 ? 0.15 : 0)
  );

  return {
    score,
    issues: dedupeIssues(issues),
  };
}

/**
 * Learned-habit checks: the deepest predictable harmony is the character
 * repeating itself, which no static lexicon can know in advance.
 */
function diagnoseFromMemory(
  draft: string,
  context: ContextFingerprint,
  memory: NoiseMemory
): PredictabilityIssue[] {
  const issues: PredictabilityIssue[] = [];
  // Match the normalization used when closings are recorded in memory.
  const draftClosing = getFinalSentence(draft).slice(0, 80);

  if (
    draftClosing &&
    getRepeatedClosingPatterns(memory).includes(draftClosing)
  ) {
    issues.push({
      kind: 'generic_closing',
      severity: 0.75,
      evidence:
        'Memory shows the character has landed on this exact closing multiple times.',
    });
  }

  const lowerDraft = draft.toLowerCase();
  if (
    getOverusedPhrases(memory).some((phrase) => lowerDraft.includes(phrase))
  ) {
    issues.push({
      kind: 'repeated_phrase',
      severity: 0.6,
      evidence:
        'The draft reuses a phrase the character has already leaned on repeatedly.',
    });
  }

  if (
    draftClosing &&
    getLoopedTopicPatterns(memory).some(
      (loop) =>
        loop.pattern === draftClosing && context.topicHints.includes(loop.topic)
    )
  ) {
    issues.push({
      kind: 'too_complete',
      severity: 0.6,
      evidence:
        'This topic has repeatedly ended on the same closing; the loop is becoming a pattern.',
    });
  }

  return issues;
}

function hasLowContextGrounding(
  draft: string,
  context: ContextFingerprint
): boolean {
  if (context.commonGroundHints.length === 0) {
    return false;
  }

  return !context.commonGroundHints.some((hint) => draft.includes(hint));
}

function hasLowSpecificity(
  draft: string,
  context: ContextFingerprint
): boolean {
  const hasNumber = /\d/.test(draft);
  const hasTopic = context.topicHints.some((hint) => draft.includes(hint));
  const hasConcreteAction =
    /ここで|先に|画面|音|コメント|質問|ゲーム|紹介/.test(draft);

  return draft.length >= 40 && !hasNumber && !hasTopic && !hasConcreteAction;
}

function dedupeIssues(issues: PredictabilityIssue[]): PredictabilityIssue[] {
  const byKind = new Map<PredictabilityIssueKind, PredictabilityIssue>();

  for (const issue of issues) {
    const current = byKind.get(issue.kind);

    if (!current || issue.severity > current.severity) {
      byKind.set(issue.kind, issue);
    }
  }

  return [...byKind.values()].sort((a, b) => b.severity - a.severity);
}

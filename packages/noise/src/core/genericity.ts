import { matchesStockReplyLexicon } from './lexicon.js';
import type { NoiseLexicon } from './types.js';

/**
 * MMI-style anti-genericity scoring: a reply that would be a plausible
 * response to *any* prompt (stock phrases) or that closely repeats the
 * character's own recent outputs is the deepest form of predictable harmony,
 * independent of surface polish.
 */
const STOCK_REPLY_PATTERN =
  /そうなんですね|なるほどですね|いいですね|すごいですね|素敵ですね|頑張ってください|応援しています|楽しんでいきましょう|その気持ち、?わかります|また何かあれば|お役に立てて|great question|that'?s so true|thanks for sharing|i appreciate that|good luck|sounds great|happy to help/i;

export function scoreGenericity(input: {
  text: string;
  recentResponses?: string[];
  /** App-supplied phrases that also count as stock replies. */
  lexicon?: NoiseLexicon;
}): number {
  const stockScore =
    STOCK_REPLY_PATTERN.test(input.text) ||
    matchesStockReplyLexicon(input.text, input.lexicon)
      ? 0.5
      : 0;
  const responses = input.recentResponses ?? [];
  let maxSimilarity = 0;

  for (const previous of responses) {
    maxSimilarity = Math.max(
      maxSimilarity,
      termOverlapSimilarity(input.text, previous)
    );
  }

  return Math.min(1, stockScore + maxSimilarity * 0.5);
}

/** Extract the final sentence, the highest-value surprise position. */
export function getFinalSentence(text: string): string {
  const sentences = text
    .split(/(?<=[。.!！？?])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences[sentences.length - 1] ?? '';
}

/**
 * Whether the rewrite materially changed the landing of the reply. Humor
 * research locates the punchline at end-position surprisal, so a changed
 * final sentence earns a selection bonus.
 */
export function changedFinalSentence(before: string, after: string): boolean {
  const beforeFinal = getFinalSentence(before);
  const afterFinal = getFinalSentence(after);

  if (!beforeFinal || !afterFinal) {
    return false;
  }

  return termOverlapSimilarity(beforeFinal, afterFinal) < 0.6;
}

function termOverlapSimilarity(left: string, right: string): number {
  const leftTerms = extractTerms(left);
  const rightTerms = extractTerms(right);

  if (leftTerms.size === 0 || rightTerms.size === 0) {
    return left.trim() === right.trim() ? 1 : 0;
  }

  const overlap = [...leftTerms].filter((term) => rightTerms.has(term)).length;

  return overlap / Math.max(1, Math.min(leftTerms.size, rightTerms.size));
}

function extractTerms(text: string): Set<string> {
  const terms =
    text.match(/[A-Za-z0-9_-]{3,}|[\u30a0-\u30ff]{2,}|[\u3400-\u9fff]{2,}/g) ??
    [];

  return new Set(terms.map((term) => term.toLowerCase()));
}

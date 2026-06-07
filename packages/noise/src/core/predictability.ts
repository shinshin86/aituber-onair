import type { ContextFingerprint } from './types.js';
import { clamp01 } from './random.js';

const CLEAN_CLOSING_PATTERN =
  /ありがとう|ありがとうございます|嬉しいです|楽しみにして|よろしくお願いします|また来て|ご不便をおかけして|楽しい時間|thank you|thanks|looking forward|see you next/i;
const STRUCTURE_PATTERN =
  /まず|次に|最後に|まとめると|結論|大切です|重要です|おすすめです|少しお待ちください|順番に答えて|引き続き明るく|first|next|finally|in summary|important|recommend/i;
const AGREEABLE_PATTERN =
  /その通り|いいですね|素晴らしい|とても良い|もちろん|確かに|証拠なので|申し訳ありません|すみません|you're right|great point|absolutely/i;
const CLEAN_ENDING_PATTERN =
  /(楽しみにしていてね|またお会いしましょう|良い一日を|よろしくお願いします|see you next time|have a great day)[。.!！]*$/i;

export function scorePredictability(input: {
  draft: string;
  context: ContextFingerprint;
}): number {
  const text = input.draft.trim();

  if (!text) {
    return 0;
  }

  let score = 0;

  if (CLEAN_CLOSING_PATTERN.test(text)) {
    score += 0.18;
  }

  if (STRUCTURE_PATTERN.test(text)) {
    score += 0.18;
  }

  if (AGREEABLE_PATTERN.test(text)) {
    score += 0.14;
  }

  if (countSentences(text) >= 5) {
    score += 0.12;
  }

  if (CLEAN_ENDING_PATTERN.test(text)) {
    score += 0.2;
  }

  if (hasLowSpecificity(text, input.context)) {
    score += 0.12;
  }

  if (hasUniformSentenceShape(text)) {
    score += 0.12;
  }

  return clamp01(score);
}

function countSentences(text: string): number {
  return text.split(/[。.!！？?]+/).filter((sentence) => sentence.trim())
    .length;
}

function hasLowSpecificity(text: string, context: ContextFingerprint): boolean {
  const hasNumber = /\d/.test(text);
  const hasTopicHint = context.topicHints.some((hint) => text.includes(hint));

  return text.length >= 40 && !hasNumber && !hasTopicHint;
}

function hasUniformSentenceShape(text: string): boolean {
  const lengths = text
    .split(/[。.!！？?]+/)
    .map((sentence) => sentence.trim().length)
    .filter((length) => length > 0);

  if (lengths.length < 4) {
    return false;
  }

  const average =
    lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  return lengths.every((length) => Math.abs(length - average) < average * 0.55);
}

import type { LiveComment } from '../types/comment';
import type { CommentCluster } from '../types/summary';
import { normalizeText } from '../utils/text';

export type CommentClusterLabel =
  | 'greeting'
  | 'first_time_viewer'
  | 'stream_topic_question'
  | 'praise'
  | 'question'
  | 'request'
  | 'unsafe_instruction'
  | 'url_or_link'
  | 'spam'
  | 'other';

export function classifyComment(text: string): CommentClusterLabel {
  const normalized = normalizeText(text);

  if (
    normalized.includes('前の命令を無視') ||
    normalized.includes('ignore previous') ||
    normalized.includes('system prompt') ||
    normalized.includes('システムプロンプト')
  ) {
    return 'unsafe_instruction';
  }

  if (
    /https?:\/\/\S+/i.test(text) ||
    /www\.[^\s]+/i.test(text) ||
    /\b[a-z0-9-]+\.(?:com|net|org|jp|io|dev|app)\b/i.test(text)
  ) {
    return 'url_or_link';
  }

  if (text.length > 1000 || /(.)\1{7,}/u.test(text)) {
    return 'spam';
  }

  if (
    ['こんにちは', 'こんばんは', 'おはよう', 'hello', 'hi'].some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return 'greeting';
  }

  if (
    ['初見', '初めて', 'first time', 'new here'].some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return 'first_time_viewer';
  }

  if (
    ['今日なにする', 'テーマ', '配信内容', 'what are you doing'].some(
      (pattern) => normalized.includes(pattern)
    )
  ) {
    return 'stream_topic_question';
  }

  if (
    ['かわいい', '好き', 'すごい', 'cute', 'nice', 'love'].some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return 'praise';
  }

  if (
    /[?？]/.test(text) ||
    ['なに', '何', 'どう', 'why', 'what', 'how'].some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return 'question';
  }

  if (
    ['して', 'やって', 'お願い', 'please', 'can you'].some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return 'request';
  }

  return 'other';
}

export function clusterComments(
  comments: LiveComment[],
  maxExamplesPerCluster = 3
): CommentCluster[] {
  const clusters = new Map<CommentClusterLabel, CommentCluster>();

  for (const comment of comments) {
    const label = classifyComment(comment.text);
    const existing = clusters.get(label);
    if (existing) {
      existing.count += 1;
      if (existing.examples.length < maxExamplesPerCluster) {
        existing.examples.push(comment.text);
      }
      continue;
    }

    clusters.set(label, {
      label,
      count: 1,
      examples: [comment.text],
    });
  }

  return [...clusters.values()];
}

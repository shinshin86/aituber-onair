import type { LiveComment } from '../../../src/index.js';

export type ParseCommentsLanguage = 'en' | 'ja';

export function parseComments(
  value: string,
  language: ParseCommentsLanguage = 'en',
  now = Date.now()
): LiveComment[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
      const authorName =
        match?.[1]?.trim() ||
        (language === 'ja' ? `視聴者-${index + 1}` : `viewer-${index + 1}`);
      const text = match?.[2]?.trim() || line;
      return {
        id: `example:${index}`,
        platform: 'web',
        text,
        timestamp: now + index,
        author: {
          id: authorName,
          name: authorName,
          displayName: authorName,
        },
      };
    });
}

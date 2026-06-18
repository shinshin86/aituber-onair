import type { LiveComment } from '../types/comment.js';

export type NormalizableWebComment = {
  id?: string;
  userId?: string;
  userName?: string;
  text: string;
  timestamp?: number;
};

export function normalizeWebComment(
  comment: NormalizableWebComment
): LiveComment {
  const authorId = comment.userId ?? comment.userName ?? 'guest';
  const authorName = comment.userName ?? 'Guest';

  return {
    id:
      comment.id ??
      `web:${authorId}:${comment.timestamp ?? ''}:${comment.text}`,
    platform: 'web',
    text: comment.text,
    timestamp: comment.timestamp ?? Date.now(),
    author: {
      id: authorId,
      name: authorName,
      displayName: authorName,
    },
  };
}

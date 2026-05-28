import type { LiveComment } from '../types/comment';

export type NormalizableTwitchComment = {
  id?: string;
  userName: string;
  userComment: string;
  publishedAt?: string;
};

export function normalizeTwitchComment(
  comment: NormalizableTwitchComment
): LiveComment {
  const publishedAt = comment.publishedAt ?? '';

  return {
    id:
      comment.id ??
      `twitch:${comment.userName}:${publishedAt}:${comment.userComment}`,
    platform: 'twitch',
    text: comment.userComment,
    timestamp: publishedAt ? new Date(publishedAt).getTime() : Date.now(),
    author: {
      id: comment.userName,
      name: comment.userName,
      displayName: comment.userName,
    },
  };
}

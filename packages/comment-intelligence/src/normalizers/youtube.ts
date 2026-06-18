import type { LiveComment } from '../types/comment.js';

export type NormalizableYouTubeComment = {
  id: string;
  userName: string;
  userIconUrl?: string;
  userComment: string;
  publishedAt: string;
};

export function normalizeYouTubeComment(
  comment: NormalizableYouTubeComment
): LiveComment {
  return {
    id: comment.id,
    platform: 'youtube',
    text: comment.userComment,
    timestamp: new Date(comment.publishedAt).getTime(),
    author: {
      id: comment.userName,
      name: comment.userName,
      displayName: comment.userName,
      avatarUrl: comment.userIconUrl,
    },
  };
}

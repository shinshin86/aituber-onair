export type CommentPlatform =
  | 'youtube'
  | 'twitch'
  | 'web'
  | 'discord'
  | 'unknown';

export type CommentAuthorRole =
  | 'owner'
  | 'moderator'
  | 'member'
  | 'subscriber'
  | 'guest';

export type CommentAuthor = {
  id: string;
  name: string;
  displayName?: string;
  avatarUrl?: string;
  roles?: CommentAuthorRole[];
};

export type LiveComment = {
  id: string;
  platform?: CommentPlatform;
  text: string;
  timestamp: number;
  author: CommentAuthor;
  metadata?: Record<string, unknown>;
};

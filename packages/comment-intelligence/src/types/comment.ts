export type CommentPlatform =
  | 'youtube'
  | 'twitch'
  | 'tiktok'
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
  handle?: string;
  nickname?: string;
  realName?: string;
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

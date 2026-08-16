export type TikTokAuthorIdentity = {
  /** Canonical user id, usually the handle without the leading @. */
  id: string;
  /** Visible handle with @. */
  handle: string;
  /** Nickname shown in chat. */
  nickname?: string;
  /** Real name or preferred full display name when known. */
  realName?: string;
  /** Avatar URL when available. */
  avatarUrl?: string;
};

export type NormalizableTikTokChatComment = {
  id?: string;
  handle: string;
  nickname?: string;
  realName?: string;
  avatarUrl?: string;
  text: string;
  publishedAt?: string | number;
  metadata?: Record<string, unknown>;
};

export type NormalizableTikTokGift = {
  id?: string;
  handle: string;
  nickname?: string;
  realName?: string;
  avatarUrl?: string;
  giftId?: string | number;
  giftName: string;
  repeatCount?: number;
  repeatEnd?: boolean;
  diamondCount?: number;
  text?: string;
  publishedAt?: string | number;
  metadata?: Record<string, unknown>;
};

export type NormalizableTikTokLiveEvent =
  | {
      kind: 'chat';
      comment: NormalizableTikTokChatComment;
    }
  | {
      kind: 'gift';
      gift: NormalizableTikTokGift;
    };

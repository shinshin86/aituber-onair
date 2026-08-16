import type { LiveComment } from '../types/comment.js';
import type {
  NormalizableTikTokChatComment,
  NormalizableTikTokGift,
  NormalizableTikTokLiveEvent,
  TikTokAuthorIdentity,
} from '../types/tiktok.js';

function resolveTikTokDisplayName(
  identity: Pick<TikTokAuthorIdentity, 'handle' | 'nickname' | 'realName'>
): {
  name: string;
  displayName: string;
} {
  const name = identity.nickname ?? identity.handle;
  const displayName = identity.realName ?? identity.nickname ?? identity.handle;

  return { name, displayName };
}

function normalizeTikTokTimestamp(publishedAt?: string | number): number {
  if (typeof publishedAt === 'number') {
    return publishedAt;
  }

  if (typeof publishedAt === 'string' && publishedAt.trim() !== '') {
    return new Date(publishedAt).getTime();
  }

  return Date.now();
}

function normalizeTikTokHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '');
}

function buildTikTokAuthor(
  identity: NormalizableTikTokChatComment | NormalizableTikTokGift
) {
  const normalizedHandle = normalizeTikTokHandle(identity.handle);
  const { name, displayName } = resolveTikTokDisplayName({
    handle: `@${normalizedHandle}`,
    nickname: identity.nickname,
    realName: identity.realName,
  });

  return {
    id: normalizedHandle,
    name,
    displayName,
    handle: `@${normalizedHandle}`,
    nickname: identity.nickname,
    realName: identity.realName,
    avatarUrl: identity.avatarUrl,
  };
}

export function normalizeTikTokChatComment(
  comment: NormalizableTikTokChatComment
): LiveComment {
  const author = buildTikTokAuthor(comment);

  return {
    id:
      comment.id ??
      `tiktok:${author.id}:${comment.publishedAt ?? ''}:${comment.text}`,
    platform: 'tiktok',
    text: comment.text,
    timestamp: normalizeTikTokTimestamp(comment.publishedAt),
    author,
    metadata: {
      ...comment.metadata,
      source: 'tiktok',
      eventKind: 'chat',
      handle: author.handle,
      nickname: author.nickname,
      realName: author.realName,
    },
  };
}

export function normalizeTikTokGift(gift: NormalizableTikTokGift): LiveComment {
  const author = buildTikTokAuthor(gift);
  const repeatCount = gift.repeatCount ?? 1;
  const giftLabel = `${gift.giftName}${repeatCount > 1 ? ` x${repeatCount}` : ''}`;

  return {
    id:
      gift.id ??
      `tiktok-gift:${author.id}:${gift.publishedAt ?? ''}:${gift.giftName}:${repeatCount}`,
    platform: 'tiktok',
    text: gift.text?.trim() || giftLabel,
    timestamp: normalizeTikTokTimestamp(gift.publishedAt),
    author,
    metadata: {
      ...gift.metadata,
      source: 'tiktok',
      eventKind: 'gift',
      gift: {
        id: gift.giftId,
        name: gift.giftName,
        repeatCount,
        repeatEnd: gift.repeatEnd,
        diamondCount: gift.diamondCount,
      },
      handle: author.handle,
      nickname: author.nickname,
      realName: author.realName,
    },
  };
}

export function normalizeTikTokLiveEvent(
  event: NormalizableTikTokLiveEvent
): LiveComment {
  return event.kind === 'chat'
    ? normalizeTikTokChatComment(event.comment)
    : normalizeTikTokGift(event.gift);
}

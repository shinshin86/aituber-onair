const DEFAULT_TIKTOK_RELAY_URL = 'http://127.0.0.1:8787/tiktok/events';

export interface TikTokChatMessage {
  userId?: string;
  uniqueId: string;
  nickname?: string;
  profilePictureUrl?: string;
  comment: string;
  timestamp: number;
}

export interface TikTokGiftMessage {
  userId?: string;
  uniqueId: string;
  nickname?: string;
  profilePictureUrl?: string;
  giftId: number | string;
  giftName: string;
  giftType?: number;
  repeatCount: number;
  repeatEnd: boolean;
  diamondCount?: number;
  description?: string;
  timestamp: number;
}

interface TikTokRelayEventEnvelope<T> {
  type: string;
  payload: T;
}

export interface TikTokServiceOptions {
  uniqueId: string;
  relayUrl?: string;
}

export function normalizeTikTokUniqueId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('tiktok.com/')) {
    try {
      const url = new URL(
        trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      );
      const pathMatch = url.pathname.match(/@([^/]+)/);
      if (pathMatch?.[1]) {
        return pathMatch[1].trim().replace(/^@+/, '');
      }
    } catch {
      // Fall through to manual parsing.
    }
  }

  return trimmed.replace(/^@+/, '').replace(/\/$/, '');
}

function normalizeTikTokTimestamp(value?: number | string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function toMessage<T>(event: MessageEvent<string>): T {
  return JSON.parse(event.data) as T;
}

function normalizeIncomingChat(
  payload: Record<string, unknown>,
): TikTokChatMessage {
  return {
    userId: payload.userId != null ? String(payload.userId) : undefined,
    uniqueId: String(payload.uniqueId ?? ''),
    nickname:
      typeof payload.nickname === 'string' ? payload.nickname : undefined,
    profilePictureUrl:
      typeof payload.profilePictureUrl === 'string'
        ? payload.profilePictureUrl
        : undefined,
    comment: typeof payload.comment === 'string' ? payload.comment : '',
    timestamp: normalizeTikTokTimestamp(
      payload.timestamp as number | string | undefined,
    ),
  };
}

function normalizeIncomingGift(
  payload: Record<string, unknown>,
): TikTokGiftMessage {
  return {
    userId: payload.userId != null ? String(payload.userId) : undefined,
    uniqueId: String(payload.uniqueId ?? ''),
    nickname:
      typeof payload.nickname === 'string' ? payload.nickname : undefined,
    profilePictureUrl:
      typeof payload.profilePictureUrl === 'string'
        ? payload.profilePictureUrl
        : undefined,
    giftId:
      typeof payload.giftId === 'number' || typeof payload.giftId === 'string'
        ? payload.giftId
        : payload.gift && typeof payload.gift === 'object'
          ? String(
              (payload.gift as Record<string, unknown>).gift_id ?? 'unknown',
            )
          : 'unknown',
    giftName:
      typeof payload.giftName === 'string'
        ? payload.giftName
        : typeof payload.describe === 'string'
          ? payload.describe
          : 'TikTok gift',
    giftType:
      typeof payload.giftType === 'number' ? payload.giftType : undefined,
    repeatCount:
      typeof payload.repeatCount === 'number' &&
      Number.isFinite(payload.repeatCount)
        ? payload.repeatCount
        : 1,
    repeatEnd: payload.repeatEnd === true,
    diamondCount:
      typeof payload.diamondCount === 'number'
        ? payload.diamondCount
        : undefined,
    description:
      typeof payload.describe === 'string' ? payload.describe : undefined,
    timestamp: normalizeTikTokTimestamp(
      payload.timestamp as number | string | undefined,
    ),
  };
}

export class TikTokLiveService {
  private eventSource: EventSource | null = null;
  private readonly options: TikTokServiceOptions;
  private readonly commentListeners = new Set<
    (comment: TikTokChatMessage) => void
  >();
  private readonly giftListeners = new Set<(gift: TikTokGiftMessage) => void>();
  private readonly errorListeners = new Set<(error: unknown) => void>();
  private readonly connectedListeners = new Set<(url: string) => void>();
  private readonly disconnectedListeners = new Set<(reason: string) => void>();

  constructor(options: TikTokServiceOptions) {
    this.options = options;
  }

  async startWatching(uniqueId: string): Promise<void> {
    const normalizedUniqueId = normalizeTikTokUniqueId(
      uniqueId || this.options.uniqueId,
    );

    if (!normalizedUniqueId) {
      throw new Error('TikTok uniqueId is required');
    }

    this.stopWatching();

    const relayUrl = new URL(this.options.relayUrl || DEFAULT_TIKTOK_RELAY_URL);
    relayUrl.searchParams.set('uniqueId', normalizedUniqueId);

    const eventSource = new EventSource(relayUrl.toString());
    this.eventSource = eventSource;

    eventSource.onopen = () => {
      this.connectedListeners.forEach((listener) =>
        listener(relayUrl.toString()),
      );
    };

    eventSource.addEventListener('comment', (event) => {
      const payload = toMessage<TikTokRelayEventEnvelope<TikTokChatMessage>>(
        event as MessageEvent<string>,
      );
      const comment = normalizeIncomingChat(
        payload.payload as unknown as Record<string, unknown>,
      );
      this.commentListeners.forEach((listener) => listener(comment));
    });

    eventSource.addEventListener('gift', (event) => {
      const payload = toMessage<TikTokRelayEventEnvelope<TikTokGiftMessage>>(
        event as MessageEvent<string>,
      );
      const gift = normalizeIncomingGift(
        payload.payload as unknown as Record<string, unknown>,
      );
      this.giftListeners.forEach((listener) => listener(gift));
    });

    eventSource.addEventListener('error', () => {
      const error = new Error('TikTok relay connection error.');
      this.errorListeners.forEach((listener) => listener(error));
    });
  }

  stopWatching(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.disconnectedListeners.forEach((listener) => listener('closed'));
    }
  }

  isWatching(): boolean {
    return this.eventSource !== null;
  }

  onComment(callback: (comment: TikTokChatMessage) => void): void {
    this.commentListeners.add(callback);
  }

  onGift(callback: (gift: TikTokGiftMessage) => void): void {
    this.giftListeners.add(callback);
  }

  onError(callback: (error: unknown) => void): void {
    this.errorListeners.add(callback);
  }

  onConnected(callback: (url: string) => void): void {
    this.connectedListeners.add(callback);
  }

  onDisconnected(callback: (reason: string) => void): void {
    this.disconnectedListeners.add(callback);
  }
}

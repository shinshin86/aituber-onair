/**
 * Subscribes to Twitch chat over EventSub WebSocket and delivers one queued
 * message per polling interval.
 */

export interface TwitchChatMessage {
  userName: string;
  userComment: string;
}

interface ConnectTwitchChatOptions {
  channelLogin: string;
  pollInterval: number;
  onComment: (message: TwitchChatMessage) => void;
  onTokenExpired?: () => void;
  token: string;
  clientId: string;
}

let ws: WebSocket | null = null;
let buffer: TwitchChatMessage[] = [];
let pollTimer: number | null = null;
let reconnectInProgress = false;
const processedMessageIds = new Set<string>();

export async function connectTwitchChat(
  options: ConnectTwitchChatOptions,
): Promise<WebSocket> {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws;
  }

  if (ws) {
    disconnectTwitchChat();
  }

  const {
    channelLogin,
    pollInterval,
    onComment,
    onTokenExpired,
    token,
    clientId,
  } = options;

  await cleanupExistingSubscriptions(token, clientId);

  const broadcasterResponse = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelLogin)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': clientId,
      },
    },
  );
  if (broadcasterResponse.status === 401) {
    onTokenExpired?.();
    throw new Error('Twitch token expired');
  }

  const broadcasterId = (await broadcasterResponse.json()).data?.[0]?.id;
  if (!broadcasterId) {
    throw new Error('Invalid Twitch channel login');
  }

  const validateResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${token}` },
  });
  if (validateResponse.status === 401) {
    onTokenExpired?.();
    throw new Error('Twitch token expired');
  }

  const { user_id: userId } = await validateResponse.json();
  if (!userId) {
    throw new Error('Twitch token owner id was not found');
  }

  ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
  attachHandlers();

  pollTimer = window.setInterval(() => {
    if (buffer.length > 0) {
      const message = buffer.shift()!;
      onComment(message);
    }
  }, pollInterval);

  return ws;

  async function cleanupExistingSubscriptions(
    accessToken: string,
    twitchClientId: string,
  ) {
    try {
      const response = await fetch(
        'https://api.twitch.tv/helix/eventsub/subscriptions',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Client-Id': twitchClientId,
          },
        },
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const subscriptions = data.data || [];

      for (const subscription of subscriptions) {
        if (
          subscription.type === 'channel.chat.message' &&
          subscription.transport?.method === 'websocket'
        ) {
          await fetch(
            `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscription.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Client-Id': twitchClientId,
              },
            },
          );
        }
      }
    } catch (error) {
      console.warn('Failed to clean up existing Twitch subscriptions:', error);
    }
  }

  function attachHandlers() {
    if (!ws) {
      return;
    }

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      buffer = [];

      if (!reconnectInProgress) {
        ws = null;
      }
    };

    ws.onerror = (error) => {
      console.error('Twitch WebSocket error:', error);
    };
  }

  async function subscribe(sessionId: string) {
    const response = await fetch(
      'https://api.twitch.tv/helix/eventsub/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Client-Id': clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'channel.chat.message',
          version: '1',
          condition: {
            broadcaster_user_id: broadcasterId,
            user_id: userId,
          },
          transport: {
            method: 'websocket',
            session_id: sessionId,
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        onTokenExpired?.();
        throw new Error('Twitch token expired');
      }

      const errorData = await response.json();
      throw new Error(
        `Twitch EventSub subscription failed: ${JSON.stringify(errorData)}`,
      );
    }
  }

  function reconnect(url: string) {
    reconnectInProgress = true;
    const previousWs = ws;
    ws = new WebSocket(url);
    attachHandlers();

    ws.onopen = () => {
      reconnectInProgress = false;
      if (previousWs && previousWs.readyState === WebSocket.OPEN) {
        previousWs.close();
      }
    };
  }

  async function handleWsMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      const type = message.metadata?.message_type;

      if (type === 'session_welcome') {
        await subscribe(message.payload.session.id);
        return;
      }

      if (type === 'session_reconnect') {
        reconnect(message.payload.session.reconnect_url);
        return;
      }

      if (type === 'session_keepalive' || type === 'revocation') {
        return;
      }

      if (
        type === 'notification' &&
        message.payload.subscription.type === 'channel.chat.message'
      ) {
        const messageId = message.payload.event.message_id;
        if (processedMessageIds.has(messageId)) {
          return;
        }

        processedMessageIds.add(messageId);
        buffer.push({
          userName: message.payload.event.chatter_user_name,
          userComment: message.payload.event.message.text,
        });
      }
    } catch (error) {
      console.error('Error handling Twitch WebSocket message:', error);
    }
  }
}

export function disconnectTwitchChat() {
  if (ws) {
    ws.close();
    ws = null;
  }

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  buffer = [];
  reconnectInProgress = false;
  processedMessageIds.clear();
}

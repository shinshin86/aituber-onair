// Relay TikTok Live → SSE para el viewer (react-live2d-app).
// v2: usa TikTokLiveConnection + WebcastEvent de tiktok-live-connector 2.x
// (la API legacy WebcastPushConnection quedó obsoleta).
//
// Endpoints:
//   GET /health                          → { ok: true }
//   GET /tiktok/events?uniqueId=<handle> → SSE: connected/comment/gift/disconnected/error
//
import http from 'node:http';
import { URL } from 'node:url';
import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from 'tiktok-live-connector';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const SIGN_API_KEY = process.env.EULER_API_KEY; // opcional, capa free funciona sin key en muchos casos

function toStringValue(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function normalizeChatPayload(data) {
  const user = data.user ?? {};
  return {
    userId: data.userId != null ? toStringValue(data.userId) : toStringValue(user.userId ?? '') || undefined,
    uniqueId: toStringValue(user.uniqueId ?? data.uniqueId),
    nickname: typeof user.nickname === 'string' ? user.nickname : undefined,
    profilePictureUrl:
      typeof user.profilePictureUrl === 'string' ? user.profilePictureUrl : undefined,
    comment: typeof data.comment === 'string' ? data.comment : '',
    isSubscriber: data.isSubscriber === true,
    isModerator: data.isModerator === true,
    msgId: data.msgId,
    timestamp: normalizeTimestamp(data.timestamp),
  };
}

function normalizeGiftPayload(data) {
  const user = data.user ?? {};
  // v2: giftDetails embebido; v1 lo exponía plano. enableExtendedGiftInfo lo rellena.
  const gift = data.giftDetails ?? data.gift ?? {};
  return {
    userId: data.userId != null ? toStringValue(data.userId) : toStringValue(user.userId ?? '') || undefined,
    uniqueId: toStringValue(user.uniqueId ?? data.uniqueId),
    nickname: typeof user.nickname === 'string' ? user.nickname : undefined,
    profilePictureUrl:
      typeof user.profilePictureUrl === 'string' ? user.profilePictureUrl : undefined,
    giftId: gift.gift_id ?? gift.giftId ?? data.giftId ?? 'unknown',
    giftName: gift.gift_name ?? gift.giftName ?? data.giftName ?? 'TikTok gift',
    giftType: typeof gift.gift_type === 'number' ? gift.gift_type : gift.giftType,
    repeatCount:
      typeof data.repeatCount === 'number' && Number.isFinite(data.repeatCount)
        ? data.repeatCount
        : 1,
    repeatEnd: data.repeatEnd === true,
    diamondCount: gift.diamond_count ?? gift.diamondCount ?? data.diamondCount,
    groupId: data.groupId,
    description: gift.describe ?? data.describe,
    timestamp: normalizeTimestamp(data.timestamp),
  };
}

function sendEvent(response, event, payload) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify({ type: event, payload })}\n\n`);
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(
    request.url || '/',
    `http://${request.headers.host || `${HOST}:${PORT}`}`,
  );

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestUrl.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname !== '/tiktok/events') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const uniqueId = requestUrl.searchParams.get('uniqueId')?.trim().replace(/^@+/, '');
  if (!uniqueId) {
    sendJson(response, 400, { error: 'uniqueId query parameter is required' });
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write(': connected\n\n');

  const connection = new TikTokLiveConnection(uniqueId, {
    ...(SIGN_API_KEY ? { signApiKey: SIGN_API_KEY } : {}),
    enableExtendedGiftInfo: true,
    processInitialData: true,
    fetchRoomInfoOnConnect: true,
  });

  let closed = false;
  // Dedupe de regalos por streak: un regalo acumulable (giftType===1) dispara
  // eventos repetidos con repeatCount creciente + uno final con repeatEnd:true.
  // Solo emitimos al frontend el evento FINAL de cada streak.
  const seenStreaks = new Set();

  const safeClose = (reason) => {
    if (closed) return;
    closed = true;
    try { connection.disconnect(); } catch {}
    try { sendEvent(response, 'disconnected', { reason }); } catch {}
    try { response.end(); } catch {}
  };

  request.on('close', () => safeClose('client_closed'));
  request.on('aborted', () => safeClose('client_aborted'));

  connection.on(WebcastEvent.CHAT, (data) => {
    sendEvent(response, 'comment', normalizeChatPayload(data));
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    const normalized = normalizeGiftPayload(data);
    // Streak en curso de regalo acumulable: esperar al repeatEnd final.
    if (normalized.giftType === 1 && !normalized.repeatEnd) return;
    // Dedupe por groupId (un streak completo comparte groupId).
    const dedupeKey = normalized.groupId
      ? `g:${normalized.groupId}`
      : `u:${normalized.uniqueId}:${normalized.giftId}:${normalized.timestamp}`;
    if (seenStreaks.has(dedupeKey)) return;
    seenStreaks.add(dedupeKey);
    sendEvent(response, 'gift', normalized);
  });

  connection.on(WebcastEvent.FOLLOW, (data) => {
    const user = data.user ?? {};
    sendEvent(response, 'follow', { uniqueId: user.uniqueId, nickname: user.nickname });
  });

  connection.on(WebcastEvent.SHARE, (data) => {
    const user = data.user ?? {};
    sendEvent(response, 'share', { uniqueId: user.uniqueId, nickname: user.nickname });
  });

  connection.on(WebcastEvent.LIKE, (data) => {
    sendEvent(response, 'like', {
      uniqueId: data.user?.uniqueId,
      likeCount: data.likeCount,
      totalLikeCount: data.totalLikeCount,
    });
  });

  connection.on(WebcastEvent.ROOM_USER, (data) => {
    sendEvent(response, 'viewers', { viewerCount: data.viewerCount });
  });

  connection.on(ControlEvent.ERROR, ({ info, exception }) => {
    sendEvent(response, 'error', {
      message: exception instanceof Error ? exception.message : String(info ?? exception ?? 'error'),
    });
  });

  connection.on(WebcastEvent.STREAM_END, () => safeClose('stream_end'));

  try {
    const state = await connection.connect();
    sendEvent(response, 'connected', {
      uniqueId,
      roomId: state?.roomId ?? null,
    });
  } catch (error) {
    sendEvent(response, 'error', {
      message: error instanceof Error ? error.message : String(error),
    });
    safeClose('connect_failed');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TikTok relay (v2) listening on http://${HOST}:${PORT}`);
  console.log(
    `SSE endpoint: http://${HOST}:${PORT}/tiktok/events?uniqueId=<handle>`,
  );
});

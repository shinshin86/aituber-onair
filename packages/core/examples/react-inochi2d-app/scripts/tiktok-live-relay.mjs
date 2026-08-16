import http from 'node:http';
import { URL } from 'node:url';
import { WebcastPushConnection } from 'tiktok-live-connector/legacy';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const DEFAULT_PROCESS_OPTIONS = {
  processInitialData: true,
  fetchRoomInfoOnConnect: true,
  enableExtendedGiftInfo: true,
};

function toStringValue(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeTimestamp(value) {
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

function normalizeChatPayload(data) {
  return {
    userId: data.userId != null ? toStringValue(data.userId) : undefined,
    uniqueId: toStringValue(data.uniqueId),
    nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
    profilePictureUrl:
      typeof data.profilePictureUrl === 'string'
        ? data.profilePictureUrl
        : undefined,
    comment: typeof data.comment === 'string' ? data.comment : '',
    timestamp: normalizeTimestamp(data.timestamp),
  };
}

function normalizeGiftPayload(data) {
  const gift = data.gift && typeof data.gift === 'object' ? data.gift : null;
  return {
    userId: data.userId != null ? toStringValue(data.userId) : undefined,
    uniqueId: toStringValue(data.uniqueId),
    nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
    profilePictureUrl:
      typeof data.profilePictureUrl === 'string'
        ? data.profilePictureUrl
        : undefined,
    giftId:
      typeof data.giftId === 'number' || typeof data.giftId === 'string'
        ? data.giftId
        : gift && typeof gift === 'object'
          ? gift.gift_id ?? 'unknown'
          : 'unknown',
    giftName:
      typeof data.giftName === 'string'
        ? data.giftName
        : typeof data.describe === 'string'
          ? data.describe
          : 'TikTok gift',
    giftType: typeof data.giftType === 'number' ? data.giftType : undefined,
    repeatCount:
      typeof data.repeatCount === 'number' && Number.isFinite(data.repeatCount)
        ? data.repeatCount
        : 1,
    repeatEnd: data.repeatEnd === true,
    diamondCount:
      typeof data.diamondCount === 'number' ? data.diamondCount : undefined,
    description: typeof data.describe === 'string' ? data.describe : undefined,
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

  const connection = new WebcastPushConnection(uniqueId, DEFAULT_PROCESS_OPTIONS);
  let closed = false;

  const safeClose = (reason) => {
    if (closed) {
      return;
    }
    closed = true;
    try {
      connection.disconnect();
    } catch {
      // Ignore disconnect errors on shutdown.
    }
    try {
      sendEvent(response, 'disconnected', { reason });
    } catch {
      // Ignore write errors after the client closes.
    }
    try {
      response.end();
    } catch {
      // Ignore.
    }
  };

  request.on('close', () => safeClose('client_closed'));
  request.on('aborted', () => safeClose('client_aborted'));

  connection.on('chat', (data) => {
    sendEvent(response, 'comment', normalizeChatPayload(data));
  });

  connection.on('gift', (data) => {
    sendEvent(response, 'gift', normalizeGiftPayload(data));
  });

  connection.on('error', (error) => {
    sendEvent(response, 'error', {
      message: error instanceof Error ? error.message : String(error),
    });
  });

  connection.on('streamEnd', () => {
    safeClose('stream_end');
  });

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
  console.log(`TikTok relay listening on http://${HOST}:${PORT}`);
  console.log(
    `SSE endpoint: http://${HOST}:${PORT}/tiktok/events?uniqueId=<handle>`,
  );
});

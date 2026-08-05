import { readFile } from 'node:fs/promises';
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from 'node:http';
import { extname, resolve, sep } from 'node:path';
import type { AgentApprovalRequest, AgentEvent } from '@aituber-onair/agent';
import type { StreamServerState, StreamSseEnvelope } from '../src/protocol.js';
import type {
  StreamControllerOperationResult,
  StreamOperationsController,
} from './controller.js';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENT_HISTORY = 300;

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export interface StreamOperationsServerOptions {
  readonly controller: StreamOperationsController;
  readonly publicDir: string;
}

type ReplayableEnvelope = Exclude<
  StreamSseEnvelope,
  { readonly kind: 'state' }
>;

interface StoredEnvelope {
  readonly id: number;
  readonly envelope: ReplayableEnvelope;
}

/** Serves the dashboard and one loopback-only Agent Session. */
export function createStreamOperationsServer(
  options: StreamOperationsServerOptions
): Server {
  const { controller, publicDir } = options;
  const sseClients = new Set<ServerResponse>();
  const eventHistory: StoredEnvelope[] = [];
  const pendingApprovals = new Map<string, AgentApprovalRequest>();
  let nextEventId = 1;
  let turnActive = false;

  const stateSnapshot = (): StreamServerState => ({
    backendSessionId: controller.backendSessionId,
    pendingApprovals: [...pendingApprovals.values()],
    resumed: controller.resumed,
    turnActive,
  });

  const broadcast = (envelope: ReplayableEnvelope): void => {
    const stored = { id: nextEventId, envelope };
    nextEventId += 1;
    eventHistory.push(stored);
    if (eventHistory.length > MAX_EVENT_HISTORY) eventHistory.shift();
    for (const client of sseClients) {
      writeSseEnvelope(client, stored.envelope, stored.id);
    }
  };

  const broadcastState = (): void => {
    const envelope: StreamSseEnvelope = {
      kind: 'state',
      state: stateSnapshot(),
    };
    for (const client of sseClients) writeSseEnvelope(client, envelope);
  };

  const recordAgentEvent = (operationId: string, event: AgentEvent): void => {
    if (event.type === 'approval.requested') {
      pendingApprovals.set(event.request.id, event.request);
    }
    if (event.type === 'approval.resolved') {
      pendingApprovals.delete(event.requestId);
    }
    broadcast({ kind: 'agent-event', operationId, event });
    if (
      event.type === 'approval.requested' ||
      event.type === 'approval.resolved'
    ) {
      broadcastState();
    }
  };

  const runOperation = (
    operationId: string,
    run: (
      onEvent: (event: AgentEvent) => void
    ) => Promise<StreamControllerOperationResult>
  ): void => {
    turnActive = true;
    broadcastState();
    void (async () => {
      try {
        const completed = await run((event) =>
          recordAgentEvent(operationId, event)
        );
        broadcast({ kind: 'operation-completed', operationId, ...completed });
      } catch (error) {
        broadcast({
          kind: 'turn-error',
          operationId,
          message: formatError(error),
        });
      } finally {
        pendingApprovals.clear();
        turnActive = false;
        broadcastState();
      }
    })();
  };

  return createServer((request, response) => {
    void routeRequest(request, response).catch((error) => {
      if (!response.headersSent) {
        const status = error instanceof HttpRequestError ? error.status : 500;
        sendJson(response, status, {
          error:
            status < 500 && error instanceof Error
              ? error.message
              : 'Internal server error.',
        });
        return;
      }
      response.end();
    });
  });

  async function routeRequest(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const route = `${request.method ?? 'GET'} ${url.pathname}`;

    if (request.method === 'POST') assertSameOriginMutation(request);

    if (route === 'GET /api/state') {
      sendJson(response, 200, stateSnapshot());
      return;
    }

    if (route === 'GET /api/events') {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      const lastEventId = readLastEventId(request);
      for (const stored of eventHistory) {
        if (stored.id > lastEventId) {
          writeSseEnvelope(response, stored.envelope, stored.id);
        }
      }
      writeSseEnvelope(response, {
        kind: 'state',
        state: stateSnapshot(),
      });
      sseClients.add(response);
      request.on('close', () => sseClients.delete(response));
      return;
    }

    if (route === 'POST /api/comments') {
      assertJsonContentType(request);
      const body = await readJsonBody(request);
      const operationId = readOperationId(body);
      const commentIds = readStringArray(body?.commentIds, 'commentIds');
      if (turnActive) {
        sendJson(response, 409, { error: 'A Turn is already running.' });
        return;
      }
      runOperation(operationId, (onEvent) =>
        controller.analyzeCommentIds(commentIds, onEvent)
      );
      sendJson(response, 202, { accepted: true, operationId });
      return;
    }

    if (route === 'POST /api/report') {
      assertJsonContentType(request);
      const body = await readJsonBody(request);
      const operationId = readOperationId(body);
      if (turnActive) {
        sendJson(response, 409, { error: 'A Turn is already running.' });
        return;
      }
      runOperation(operationId, (onEvent) =>
        controller.createPostStreamReport(onEvent)
      );
      sendJson(response, 202, { accepted: true, operationId });
      return;
    }

    if (route === 'POST /api/approvals') {
      assertJsonContentType(request);
      const body = await readJsonBody(request);
      const requestId =
        typeof body?.requestId === 'string' ? body.requestId : '';
      const decision = body?.decision;
      if (!requestId || (decision !== 'allow-once' && decision !== 'deny')) {
        sendJson(response, 400, {
          error: 'requestId and a decision of allow-once or deny are required.',
        });
        return;
      }
      try {
        await controller.resolveApproval(requestId, decision);
        sendJson(response, 200, { resolved: true });
      } catch (error) {
        sendJson(response, 404, { error: formatError(error) });
      }
      return;
    }

    if (route === 'POST /api/interrupt') {
      try {
        await controller.interrupt();
        sendJson(response, 200, { interrupted: true });
      } catch (error) {
        sendJson(response, 400, { error: formatError(error) });
      }
      return;
    }

    if (route === 'POST /api/reset') {
      assertJsonContentType(request);
      await readJsonBody(request);
      if (turnActive) await controller.interrupt();
      controller.reset();
      sendJson(response, 200, { reset: true });
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(url.pathname, response);
      return;
    }

    sendJson(response, 404, { error: 'Not found.' });
  }

  async function serveStatic(
    pathname: string,
    response: ServerResponse
  ): Promise<void> {
    let relative: string;
    try {
      relative =
        pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    } catch {
      throw new HttpRequestError(400, 'Request path is invalid.');
    }
    const publicRoot = resolve(publicDir);
    const filePath = resolve(publicRoot, relative);
    if (
      relative.includes('\0') ||
      (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`))
    ) {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }
    try {
      const content = await readFile(filePath);
      response.writeHead(200, {
        'content-type':
          CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
        'x-content-type-options': 'nosniff',
      });
      response.end(content);
    } catch {
      sendJson(response, 404, { error: 'Not found.' });
    }
  }
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown
): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(payload));
}

function writeSseEnvelope(
  response: ServerResponse,
  envelope: StreamSseEnvelope,
  id?: number
): void {
  if (id !== undefined) response.write(`id: ${id}\n`);
  response.write(`data: ${JSON.stringify(envelope)}\n\n`);
}

function readLastEventId(request: IncomingMessage): number {
  const header = request.headers['last-event-id'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !/^\d+$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function readOperationId(body: Record<string, unknown> | undefined): string {
  const operationId =
    typeof body?.operationId === 'string' ? body.operationId : '';
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(operationId)) {
    throw new HttpRequestError(400, 'operationId is invalid.');
  }
  return operationId;
}

function readStringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new HttpRequestError(400, `${label} must be an array of strings.`);
  }
  return value;
}

function assertSameOriginMutation(request: IncomingMessage): void {
  const origin = readSingleHeader(request, 'origin');
  const localPort = request.socket.localPort;
  if (origin && (!localPort || origin !== `http://127.0.0.1:${localPort}`)) {
    throw new HttpRequestError(403, 'Cross-origin requests are not allowed.');
  }
  const fetchSite = readSingleHeader(request, 'sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw new HttpRequestError(403, 'Cross-origin requests are not allowed.');
  }
}

function assertJsonContentType(request: IncomingMessage): void {
  const contentType = readSingleHeader(request, 'content-type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    throw new HttpRequestError(415, 'Content-Type must be application/json.');
  }
}

function readSingleHeader(
  request: IncomingMessage,
  name: string
): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function readJsonBody(
  request: IncomingMessage
): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      throw new HttpRequestError(413, 'Request body is too large.');
    }
    chunks.push(buffer);
  }
  if (total === 0) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpRequestError(400, 'Request body must be valid JSON.');
  }
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : undefined;
}

function formatError(error: unknown): string {
  const messages: string[] = [];
  let current = error;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  return messages.length > 0 ? messages.join('\nCaused by: ') : String(error);
}

class HttpRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

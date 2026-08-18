import { readFile } from 'node:fs/promises';
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from 'node:http';
import { extname, resolve, sep } from 'node:path';
import type { AgentEvent } from '@aituber-onair/agent';
import type { ResolvedStrategyOutcome } from '../src/data/types.js';
import type {
  ChannelStrategyServerState,
  ChannelStrategySseEnvelope,
} from '../src/protocol.js';
import type { ChannelStrategyController } from './controller.js';
import { StrategyStoreError } from './strategyStore.js';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENT_HISTORY = 200;

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export interface ChannelStrategyServerOptions {
  readonly controller: ChannelStrategyController;
  readonly publicDir: string;
  readonly mode: 'demo' | 'codex';
  readonly model: string;
  /** Interval between host-scheduled Turns. 0 disables autonomous running. */
  readonly autoRunIntervalMs?: number;
  /** Delay before the first host-scheduled Turn after start-up. */
  readonly autoRunStartDelayMs?: number;
}

type ReplayableEnvelope = Exclude<
  ChannelStrategySseEnvelope,
  { readonly kind: 'state' }
>;

interface StoredEnvelope {
  readonly id: number;
  readonly envelope: ReplayableEnvelope;
}

/** Serves a loopback-only dashboard and one private Agent Session. */
export function createChannelStrategyServer(
  options: ChannelStrategyServerOptions
): Server {
  const { controller, publicDir } = options;
  const autoRunIntervalMs = options.autoRunIntervalMs ?? 0;
  const sseClients = new Set<ServerResponse>();
  const eventHistory: StoredEnvelope[] = [];
  let nextEventId = 1;
  let turnActive = false;
  let nextRunAt: string | undefined;
  let autoRunTimer: ReturnType<typeof setTimeout> | undefined;
  let autoRunCount = 0;
  let manualRunCount = 0;
  let lastTurnDurationMs: number | undefined;

  const stateSnapshot = (): ChannelStrategyServerState => ({
    turnActive,
    mode: options.mode,
    model: options.model,
    threadTurnCount: controller.threadTurnCount,
    ...(lastTurnDurationMs === undefined ? {} : { lastTurnDurationMs }),
    schedule: {
      intervalMs: autoRunIntervalMs,
      ...(nextRunAt ? { nextRunAt } : {}),
    },
    dashboard: controller.dashboard,
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
    const envelope: ChannelStrategySseEnvelope = {
      kind: 'state',
      state: stateSnapshot(),
    };
    for (const client of sseClients) writeSseEnvelope(client, envelope);
  };

  const recordAgentEvent = (operationId: string, event: AgentEvent): void => {
    broadcast({ kind: 'agent-event', operationId, event });
  };

  const runStrategy = (operationId: string): void => {
    if (autoRunTimer) clearTimeout(autoRunTimer);
    autoRunTimer = undefined;
    nextRunAt = undefined;
    turnActive = true;
    const startedAt = Date.now();
    broadcastState();
    void (async () => {
      try {
        const result = await controller.runStrategy((event) =>
          recordAgentEvent(operationId, event)
        );
        broadcast({ kind: 'operation-completed', operationId, result });
      } catch (error) {
        broadcast({
          kind: 'turn-error',
          operationId,
          message: formatError(error),
        });
      } finally {
        lastTurnDurationMs = Date.now() - startedAt;
        turnActive = false;
        scheduleAutoRun(autoRunIntervalMs);
        broadcastState();
      }
    })();
  };

  /**
   * The Agent package has no scheduler; it runs one Turn when the host asks.
   * Repeating work is therefore a host loop around `session.run(...)`.
   */
  function scheduleAutoRun(delayMs: number): void {
    if (autoRunTimer) clearTimeout(autoRunTimer);
    autoRunTimer = undefined;
    nextRunAt = undefined;
    if (autoRunIntervalMs <= 0) return;
    nextRunAt = new Date(Date.now() + delayMs).toISOString();
    autoRunTimer = setTimeout(() => {
      autoRunTimer = undefined;
      if (turnActive) {
        scheduleAutoRun(autoRunIntervalMs);
        broadcastState();
        return;
      }
      autoRunCount += 1;
      runStrategy(`scheduled-${autoRunCount}`);
    }, delayMs);
    autoRunTimer.unref?.();
  }

  scheduleAutoRun(options.autoRunStartDelayMs ?? 1_000);

  const server = createServer((request, response) => {
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

  server.on('close', () => {
    if (autoRunTimer) clearTimeout(autoRunTimer);
    autoRunTimer = undefined;
  });

  return server;

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
      writeSseEnvelope(response, { kind: 'state', state: stateSnapshot() });
      sseClients.add(response);
      request.on('close', () => sseClients.delete(response));
      return;
    }

    if (route === 'POST /api/strategy') {
      assertJsonContentType(request);
      const body = await readJsonBody(request);
      manualRunCount += 1;
      const operationId = readOperationId(body) ?? `manual-${manualRunCount}`;
      if (turnActive) {
        sendJson(response, 409, { error: 'A Turn is already running.' });
        return;
      }
      runStrategy(operationId);
      sendJson(response, 202, { accepted: true, operationId });
      return;
    }

    if (route === 'POST /api/interrupt') {
      assertJsonContentType(request);
      await readJsonBody(request);
      if (!turnActive) {
        sendJson(response, 409, { error: 'No Turn is running.' });
        return;
      }
      await controller.interrupt();
      sendJson(response, 202, { accepted: true });
      return;
    }

    const proposalOutcomeMatch =
      request.method === 'POST'
        ? /^\/api\/proposals\/([^/]+)\/outcome$/.exec(url.pathname)
        : null;
    if (proposalOutcomeMatch) {
      assertJsonContentType(request);
      const body = await readJsonBody(request);
      const id = decodePathSegment(proposalOutcomeMatch[1]);
      const { result, finding } = readProposalOutcome(body);
      try {
        const proposal = await controller.recordProposalOutcome(
          id,
          result,
          finding
        );
        broadcastState();
        sendJson(response, 200, { proposal });
      } catch (error) {
        if (error instanceof StrategyStoreError) {
          throw new HttpRequestError(
            error.code === 'not-found' ? 404 : 400,
            error.message
          );
        }
        throw error;
      }
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
        'cache-control': 'no-store',
      });
      response.end(content);
    } catch (error) {
      if (isNotFoundError(error) && !relative.includes('.')) {
        await serveStatic('/', response);
        return;
      }
      if (isNotFoundError(error)) {
        sendJson(response, 404, { error: 'Not found.' });
        return;
      }
      throw error;
    }
  }
}

class HttpRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function assertSameOriginMutation(request: IncomingMessage): void {
  const origin = request.headers.origin;
  if (!origin) return;
  const host = request.headers.host;
  if (!host) throw new HttpRequestError(403, 'Missing Host header.');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpRequestError(403, 'Invalid Origin header.');
  }
  if (originHost !== host) {
    throw new HttpRequestError(403, 'Cross-origin mutation is not allowed.');
  }
}

function assertJsonContentType(request: IncomingMessage): void {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpRequestError(415, 'Content-Type must be application/json.');
  }
}

async function readJsonBody(
  request: IncomingMessage
): Promise<Record<string, unknown>> {
  let total = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      throw new HttpRequestError(413, 'Request body is too large.');
    }
    chunks.push(buffer);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Body is not an object.');
    }
    return value as Record<string, unknown>;
  } catch {
    throw new HttpRequestError(400, 'Request body must be valid JSON.');
  }
}

function readOperationId(body: Record<string, unknown>): string | undefined {
  const operationId = body.operationId;
  if (operationId === undefined) return undefined;
  if (typeof operationId !== 'string' || !operationId.trim()) {
    throw new HttpRequestError(400, 'operationId must be a non-empty string.');
  }
  return operationId;
}

function readProposalOutcome(body: Record<string, unknown>): {
  readonly result: ResolvedStrategyOutcome;
  readonly finding: string;
} {
  const { result, finding } = body;
  if (result !== 'supported' && result !== 'refuted' && result !== 'mixed') {
    throw new HttpRequestError(
      400,
      'result must be supported, refuted, or mixed.'
    );
  }
  if (typeof finding !== 'string' || !finding.trim()) {
    throw new HttpRequestError(400, 'finding must be a non-empty string.');
  }
  return { result, finding: finding.trim() };
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpRequestError(400, 'Proposal ID is invalid.');
  }
}

function readLastEventId(request: IncomingMessage): number {
  const value = Number(request.headers['last-event-id'] ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function writeSseEnvelope(
  response: ServerResponse,
  envelope: ChannelStrategySseEnvelope,
  id?: number
): void {
  if (id !== undefined) response.write(`id: ${id}\n`);
  response.write(`data: ${JSON.stringify(envelope)}\n\n`);
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown
): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
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

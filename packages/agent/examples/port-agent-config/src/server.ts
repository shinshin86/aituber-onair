/**
 * Minimal HTTP server that hosts every bot role on a single loopback port.
 *
 * This demonstrates the ported configuration end-to-end: one process, multiple
 * bot agents (secretary + stream-staff), each created via `createBots`, each
 * exposing a POST /api/bots/:id/run endpoint that runs an instruction through
 * that bot's default Session.
 */
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

import type { BotInstance } from './createBots.js';
import { createBots } from './createBots.js';
import { BOT_ROLES } from './botRoles.js';

const DEFAULT_PORT = 4618;

export async function main(): Promise<void> {
  const port = readPort(process.env.PORT);
  const workspaceDir = process.env.AGENT_WORKSPACE_DIR ?? process.cwd();
  const provider = (process.env.CHAT_PROVIDER ?? 'openai') as Parameters<typeof createBots>[0]['provider'];
  const model = process.env.CHAT_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  const container = await createBots({
    provider,
    ...(model ? { model } : {}),
    apiKey,
    workspaceDir,
    startDefaultSession: true,
  });

  const server = createServer((request, response) => {
    void routeRequest(container, request, response).catch((error) => {
      if (!response.headersSent) sendJson(response, 500, { error: 'Internal server error.' });
    });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`port-agent-config bots: http://127.0.0.1:${port}/`);
    console.log(`roles: ${BOT_ROLES.map((r) => r.id).join(', ')}`);
  });

  const shutdown = async (): Promise<void> => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await container.close();
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

async function routeRequest(
  container: { byId: Readonly<Record<string, BotInstance>> },
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? '/', `http://127.0.0.1`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && parts.length === 1 && parts[0] === 'api') {
    sendJson(response, 200, {
      roles: BOT_ROLES.map((r) => ({ id: r.id, purpose: r.session.purpose })),
    });
    return;
  }

  if (
    request.method === 'POST' &&
    parts.length === 3 &&
    parts[0] === 'api' &&
    parts[1] === 'bots' &&
    parts[2]
  ) {
    const instance = container.byId[parts[2]];
    if (!instance?.session) {
      sendJson(response, 404, { error: `No session for bot "${parts[2]}".` });
      return;
    }
    const body = await readJson(request);
    const instruction =
      typeof body?.instruction === 'string' ? body.instruction.trim() : '';
    if (!instruction) {
      sendJson(response, 400, { error: 'instruction is required.' });
      return;
    }
    const result = await instance.session.run({ instruction });
    sendJson(response, 200, { message: result.message });
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<
    string,
    unknown
  >;
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  return port;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

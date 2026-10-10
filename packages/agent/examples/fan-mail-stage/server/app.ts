import { readFile } from 'node:fs/promises';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { extname, resolve, sep } from 'node:path';
import type { MailController } from './controller.js';
import { object } from './validation.js';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
export function createMailServer(
  controller: MailController,
  publicDir: string
) {
  return createServer((request, response) => {
    void route(request, response).catch(() =>
      json(response, 500, { error: 'Local server error.' })
    );
  });

  async function route(request: IncomingMessage, response: ServerResponse) {
    const expectedHost = `127.0.0.1:${request.socket.localPort}`;
    if (
      request.headers.host !== expectedHost ||
      (request.headers.origin &&
        request.headers.origin !== `http://${expectedHost}`) ||
      (request.headers['sec-fetch-site'] &&
        !['same-origin', 'none'].includes(
          String(request.headers['sec-fetch-site'])
        ))
    )
      return json(response, 403, {
        error: 'Only same-origin loopback requests are accepted.',
      });
    const url = new URL(request.url ?? '/', `http://${expectedHost}`);
    if (request.method === 'GET' && url.pathname === '/api/stage')
      return json(response, 200, controller.stageState());
    if (request.method === 'GET' && url.pathname === '/api/operator')
      return json(response, 200, controller.operatorState());
    if (request.method === 'POST' && url.pathname === '/api/action') {
      if (request.headers['content-type']?.split(';')[0] !== 'application/json')
        return json(response, 415, { error: 'JSON is required.' });
      let body = '';
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 16 * 1024)
          return json(response, 413, { error: 'Request is too large.' });
      }
      try {
        const data = object(JSON.parse(body));
        if (typeof data.id !== 'string' || typeof data.action !== 'string')
          throw new Error('Invalid action.');
        await controller.action(data.id, data.action, data.draft);
        return json(response, 200, { accepted: true });
      } catch (error) {
        return json(response, 400, {
          error: error instanceof Error ? error.message : 'Invalid request.',
        });
      }
    }
    if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
      let path: string;
      try {
        path = decodeURIComponent(url.pathname);
      } catch {
        return json(response, 400, { error: 'Invalid path.' });
      }
      const relative = ['/', '/operator', '/stage'].includes(path)
        ? 'index.html'
        : path.slice(1);
      const root = resolve(publicDir);
      const file = resolve(root, relative);
      if (
        !file.startsWith(root + sep) ||
        relative.includes('\0') ||
        relative.split('/').some((part) => part.startsWith('.'))
      )
        return json(response, 404, { error: 'Not found.' });
      try {
        const content = await readFile(file);
        response.writeHead(200, {
          'content-type':
            contentTypes[extname(file)] ?? 'application/octet-stream',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
        });
        response.end(content);
        return;
      } catch {
        return json(response, 404, { error: 'Not found.' });
      }
    }
    return json(response, 404, { error: 'Not found.' });
  }
}

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

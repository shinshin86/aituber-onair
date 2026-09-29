/**
 * Serves the render harness and the mesh avatar folder on 127.0.0.1 and drives
 * a headless Chromium page that draws each 1080x1920 frame. Frames come back
 * as PNG screenshots of the `#stage` canvas.
 */
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { type Browser, chromium, type Page } from 'playwright';
import { resolveProjectRoot } from '../paths.js';
import type { RenderConfig } from '../types.js';

const SWIFTSHADER_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

export interface StageSession {
  /** Draw frame `frame` (sequential from 0) and return it as a PNG. */
  renderFrame(
    frame: number,
    mouth: number,
  ): Promise<{ png: Buffer; elapsedMs: number }>;
  close(): Promise<void>;
  launchMode: 'swiftshader' | 'default-gl';
  actions: number;
}

function contentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function sendFile(
  response: ServerResponse,
  filePath: string,
): Promise<void> {
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) {
      response.writeHead(404);
      response.end('File unavailable.');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Content-Length': metadata.size,
      'Cache-Control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(
      (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500,
    );
    response.end('File unavailable.');
  }
}

/** Resolve one URL beneath a read-only root without traversal or escapes. */
export function resolveLocalAssetPath(
  rootDirectory: string,
  routePrefix: string,
  requestPath: string,
): string | null {
  if (!requestPath.startsWith(routePrefix)) return null;
  let relative: string;
  try {
    relative = decodeURIComponent(requestPath.slice(routePrefix.length));
  } catch {
    return null;
  }
  const normalized = relative.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (
    normalized === '' ||
    path.isAbsolute(normalized) ||
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..',
    )
  ) {
    return null;
  }
  const root = path.resolve(rootDirectory);
  const candidate = path.resolve(root, ...segments);
  return candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
}

async function sendRootedFile(
  response: ServerResponse,
  rootDirectory: string,
  routePrefix: string,
  requestPath: string,
): Promise<void> {
  const candidate = resolveLocalAssetPath(
    rootDirectory,
    routePrefix,
    requestPath,
  );
  if (!candidate) {
    response.writeHead(403);
    response.end('Invalid local asset path.');
    return;
  }
  try {
    const [rootRealPath, candidateRealPath] = await Promise.all([
      realpath(rootDirectory),
      realpath(candidate),
    ]);
    if (!candidateRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
      response.writeHead(403);
      response.end('Local asset escapes its root.');
      return;
    }
    await sendFile(response, candidateRealPath);
  } catch (error) {
    response.writeHead(
      (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500,
    );
    response.end('Local asset unavailable.');
  }
}

async function startServer(
  config: RenderConfig,
): Promise<{ server: Server; origin: string }> {
  const harnessDirectory = path.join(resolveProjectRoot(), 'dist', 'harness');
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (request.method !== 'GET') {
      response.writeHead(405);
      response.end('Method not allowed.');
    } else if (url.pathname === '/' || url.pathname === '/harness/index.html') {
      void sendFile(response, path.join(harnessDirectory, 'index.html'));
    } else if (url.pathname.startsWith('/harness/')) {
      void sendRootedFile(
        response,
        harnessDirectory,
        '/harness/',
        url.pathname,
      );
    } else if (url.pathname.startsWith('/avatar/')) {
      void sendRootedFile(response, config.avatar, '/avatar/', url.pathname);
    } else {
      response.writeHead(404);
      response.end('Not found.');
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo | null;
  if (!address) {
    server.close();
    throw new Error('The render harness did not expose an address.');
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function openPage(
  origin: string,
  config: RenderConfig,
  launchMode: StageSession['launchMode'],
): Promise<{ browser: Browser; page: Page; actions: number }> {
  const browser = await chromium.launch({
    headless: true,
    args: launchMode === 'swiftshader' ? SWIFTSHADER_ARGS : [],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: config.width, height: config.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/harness/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { load?: unknown }).load === 'function',
    );
    const loaded = await page.evaluate(
      (value) =>
        (
          window as unknown as {
            load(v: typeof value): Promise<{ lines: number; actions: number }>;
          }
        ).load(value),
      config,
    );
    if (errors.length) throw new Error(errors.join('\n'));
    return { browser, page, actions: loaded.actions };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function openStage(config: RenderConfig): Promise<StageSession> {
  const avatarStat = await stat(config.avatar).catch(() => null);
  if (!avatarStat?.isDirectory()) {
    throw new Error(`Mesh avatar folder was not found: ${config.avatar}`);
  }
  const { server, origin } = await startServer(config);
  let opened: Awaited<ReturnType<typeof openPage>>;
  let launchMode: StageSession['launchMode'] = 'swiftshader';
  try {
    opened = await openPage(origin, config, launchMode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Executable doesn't exist|playwright install/i.test(message)) {
      await stopServer(server);
      throw error;
    }
    console.error(
      `SwiftShader harness failed; retrying default GL: ${message}`,
    );
    launchMode = 'default-gl';
    try {
      opened = await openPage(origin, config, launchMode);
    } catch (retryError) {
      await stopServer(server);
      throw retryError;
    }
  }
  const { browser, page, actions } = opened;
  const stage = page.locator('#stage');
  let nextFrame = 0;
  let closed = false;
  return {
    launchMode,
    actions,
    async renderFrame(frame, mouth) {
      if (frame !== nextFrame) {
        throw new Error(
          `Frames must be rendered sequentially (expected ${nextFrame}, got ${frame}).`,
        );
      }
      const startedAt = performance.now();
      await page.evaluate(
        (value) =>
          (
            window as unknown as {
              renderFrame(v: typeof value): void;
            }
          ).renderFrame(value),
        { frame, mouth },
      );
      const png = await stage.screenshot({ type: 'png' });
      nextFrame += 1;
      return { png, elapsedMs: performance.now() - startedAt };
    },
    async close() {
      if (closed) return;
      closed = true;
      await browser.close();
      await stopServer(server);
    },
  };
}

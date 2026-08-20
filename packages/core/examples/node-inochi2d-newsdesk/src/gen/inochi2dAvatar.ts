import { createReadStream } from 'node:fs';
import { access, realpath, stat } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { AddressInfo } from 'node:net';
import { type Image, loadImage } from '@napi-rs/canvas';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import { resolveProjectRoot } from '../paths.js';
import { DEFAULT_IDLE_ANIMATION, type RenderConfig } from '../types.js';

const REQUIRED_RUNTIME_FILES = [
  'inochi_bridge.js',
  'inochi2d.js',
  'inochi2d_bg.wasm',
  'secondary_motion.js',
] as const;
const SWIFTSHADER_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

export interface Inochi2DAvatarDiagnostics {
  runtime: string;
  canvasSize: { width: number; height: number };
  mouthParameterId: string;
  mouthParameterKind: 'vec2' | 'scalar';
  eyeParameterIds: string[];
  idleAnimation: string;
  idleAnimationActive: boolean;
  avatarFraming: { scale: number; x: number; y: number };
  virtualClock: {
    seed: number;
    timeMs: number;
    callbacksPerFrame: number;
    pendingCallbacks: number;
  };
  launchMode: 'swiftshader' | 'default-gl';
  captureMode: 'playwright-png-screenshot';
}

export interface Inochi2DFrameInput {
  frameNumber: number;
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

export interface Inochi2DAvatarFrame {
  image: Image;
  elapsedMs: number;
}

export interface Inochi2DFrameSource {
  width: number;
  height: number;
  diagnostics: Inochi2DAvatarDiagnostics;
  renderFrame(input: Inochi2DFrameInput): Promise<Inochi2DAvatarFrame>;
  close(): Promise<void>;
}

interface HarnessServer {
  server: Server;
  origin: string;
}

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  diagnostics: Inochi2DAvatarDiagnostics;
}

type BrowserLoadDiagnostics = Omit<
  Inochi2DAvatarDiagnostics,
  'launchMode' | 'captureMode'
>;

function contentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.wasm')) return 'application/wasm';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
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

/** Resolve a URL beneath one read-only root, rejecting every escape attempt. */
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

/** Backward-friendly model-route helper used by the path security tests. */
export function resolveModelAssetPath(
  modelRoot: string,
  requestPath: string,
): string | null {
  return resolveLocalAssetPath(modelRoot, '/model/', requestPath);
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

async function startHarnessServer(
  config: RenderConfig,
): Promise<HarnessServer> {
  const harnessDirectory = path.join(resolveProjectRoot(), 'dist', 'harness');
  const modelRoot = path.dirname(config.avatar);
  const motionRoot = config.avatarMotion
    ? path.dirname(config.avatarMotion)
    : null;
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (request.method !== 'GET') {
      response.writeHead(405);
      response.end('Method not allowed.');
      return;
    }

    if (url.pathname === '/' || url.pathname === '/harness/index.html') {
      void sendFile(response, path.join(harnessDirectory, 'index.html'));
    } else if (url.pathname === '/harness/main.js') {
      void sendFile(response, path.join(harnessDirectory, 'main.js'));
    } else if (url.pathname.startsWith('/runtime/')) {
      void sendRootedFile(
        response,
        config.inochi2dRuntime,
        '/runtime/',
        url.pathname,
      );
    } else if (url.pathname.startsWith('/model/')) {
      void sendRootedFile(response, modelRoot, '/model/', url.pathname);
    } else if (motionRoot && url.pathname.startsWith('/motion/')) {
      void sendRootedFile(response, motionRoot, '/motion/', url.pathname);
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
    throw new Error('The Inochi2D harness server did not expose an address.');
  }
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function launchSession(
  origin: string,
  config: RenderConfig,
  launchMode: Inochi2DAvatarDiagnostics['launchMode'],
): Promise<BrowserSession> {
  const browser = await chromium.launch({
    headless: true,
    args: launchMode === 'swiftshader' ? SWIFTSHADER_ARGS : [],
  });
  const context = await browser.newContext({
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/harness/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { load?: unknown }).load === 'function',
    );
    const loaded = await page.evaluate(
      async (options) => {
        const harnessWindow = window as unknown as {
          load(value: typeof options): Promise<BrowserLoadDiagnostics>;
        };
        return harnessWindow.load(options);
      },
      {
        bridgeUrl: '/runtime/inochi_bridge.js',
        wasmUrl: '/runtime/inochi2d_bg.wasm',
        modelUrl: `/model/${encodeURIComponent(path.basename(config.avatar))}`,
        motionUrl: config.avatarMotion
          ? `/motion/${encodeURIComponent(path.basename(config.avatarMotion))}`
          : undefined,
        width: config.width,
        height: config.height,
        blinkSeed: config.blinkSeed,
        avatarFraming: config.avatarFraming,
        idleAnimation: DEFAULT_IDLE_ANIMATION,
        motionIntensity: config.motion.intensity,
      },
    );
    return {
      browser,
      context,
      page,
      diagnostics: {
        ...(loaded as BrowserLoadDiagnostics),
        launchMode,
        captureMode: 'playwright-png-screenshot',
      },
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

function isMissingBrowser(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Executable doesn't exist|playwright install/i.test(message);
}

async function connectBrowser(
  origin: string,
  config: RenderConfig,
): Promise<BrowserSession> {
  try {
    return await launchSession(origin, config, 'swiftshader');
  } catch (error) {
    if (isMissingBrowser(error)) throw error;
    console.error(
      `SwiftShader Inochi2D harness failed; retrying default GL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return launchSession(origin, config, 'default-gl');
  }
}

async function requireLocalFile(
  filePath: string,
  label: string,
): Promise<void> {
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) throw new Error('not a file');
  } catch (error) {
    throw new Error(`${label} was not found at ${filePath}.`, { cause: error });
  }
}

async function requireRuntime(runtimeDirectory: string): Promise<void> {
  await Promise.all(
    REQUIRED_RUNTIME_FILES.map((fileName) =>
      requireLocalFile(
        path.join(runtimeDirectory, fileName),
        `Inochi2D runtime file ${fileName}`,
      ),
    ),
  );
  await access(runtimeDirectory);
}

/** Start one headless-Chromium Inochi2D frame source for a complete render. */
export async function createInochi2DAvatar(
  config: RenderConfig,
): Promise<Inochi2DFrameSource> {
  await requireRuntime(config.inochi2dRuntime);
  await requireLocalFile(config.avatar, 'Inochi2D model');
  if (!config.avatar.toLowerCase().endsWith('.inx')) {
    throw new Error('Inochi2D avatar must point to an .inx file.');
  }
  if (config.avatarMotion) {
    await requireLocalFile(config.avatarMotion, 'Inochi2D motion');
    if (!config.avatarMotion.toLowerCase().endsWith('.json')) {
      throw new Error('Inochi2D avatarMotion must point to a JSON file.');
    }
  }

  const harness = await startHarnessServer(config);
  let session: BrowserSession;
  try {
    session = await connectBrowser(harness.origin, config);
  } catch (error) {
    await stopServer(harness.server);
    throw error;
  }

  let nextFrame = 0;
  let closed = false;
  return {
    width: config.width,
    height: config.height,
    diagnostics: session.diagnostics,
    async renderFrame(input) {
      if (input.frameNumber !== nextFrame) {
        throw new Error(
          `Inochi2D frames must be sequential (expected ${nextFrame}, ` +
            `got ${input.frameNumber}).`,
        );
      }
      const startedAt = performance.now();
      const virtualFrame = await session.page.evaluate(async (options) => {
        const harnessWindow = window as unknown as {
          renderFrame(value: typeof options): Promise<{
            timeMs: number;
            callbacksPerFrame: number;
            pendingCallbacks: number;
          }>;
        };
        return harnessWindow.renderFrame(options);
      }, input);
      session.diagnostics.virtualClock = {
        seed: config.blinkSeed,
        ...virtualFrame,
      };
      const png = await session.page.screenshot({
        type: 'png',
        omitBackground: true,
      });
      const image = await loadImage(png);
      nextFrame += 1;
      return { image, elapsedMs: performance.now() - startedAt };
    },
    async close() {
      if (closed) return;
      closed = true;
      await session.browser.close();
      await stopServer(harness.server);
    },
  };
}

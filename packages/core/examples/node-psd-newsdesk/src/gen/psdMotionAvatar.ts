import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
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
import type { RenderConfig } from '../types.js';
import type { MotionModeDetection } from './avatarMode.js';

const SWIFTSHADER_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

export interface PsdMotionRigSummary {
  canvasWidth: number;
  canvasHeight: number;
  layerCount: number;
  anchorCount: number;
  strandCount: number;
  partsFound: string[];
  missingRequiredParts: string[];
  warnings: string[];
  preprocessed: { noisy: number; layers: number };
}

export interface PsdMotionAvatarDiagnostics {
  runtime: 'anime25drig-webgl';
  detection: MotionModeDetection & { summary: PsdMotionRigSummary | null };
  canvasSize: { width: number; height: number };
  eyeInput: 'internal-seeded-automation';
  motionIntensity: number;
  virtualClock: {
    seed: number;
    timeMs: number;
    callbacksPerFrame: number;
    pendingCallbacks: number;
  };
  launchMode: 'swiftshader' | 'default-gl';
  captureMode: 'playwright-element-png';
}

export interface PsdMotionFrameInput {
  frameNumber: number;
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

export interface PsdMotionAvatarFrame {
  image: Image;
  elapsedMs: number;
}

export interface PsdMotionFrameSource {
  width: number;
  height: number;
  diagnostics: PsdMotionAvatarDiagnostics;
  renderFrame(input: PsdMotionFrameInput): Promise<PsdMotionAvatarFrame>;
  close(): Promise<void>;
}

export interface PsdMotionCandidate {
  detection: MotionModeDetection & { summary: PsdMotionRigSummary | null };
  source: PsdMotionFrameSource | null;
}

interface HarnessServer {
  server: Server;
  origin: string;
}

interface HarnessLoadResult {
  detection: MotionModeDetection & { summary: PsdMotionRigSummary | null };
  canvasSize: { width: number; height: number } | null;
  virtualClock: PsdMotionAvatarDiagnostics['virtualClock'];
  eyeInput: PsdMotionAvatarDiagnostics['eyeInput'];
}

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  loaded: HarnessLoadResult;
  launchMode: PsdMotionAvatarDiagnostics['launchMode'];
}

function contentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (lower.endsWith('.psd')) return 'application/octet-stream';
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

async function startHarnessServer(
  config: RenderConfig,
): Promise<HarnessServer> {
  const harnessDirectory = path.join(resolveProjectRoot(), 'dist', 'harness');
  const avatarRoot = path.dirname(config.avatar);
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (request.method !== 'GET') {
      response.writeHead(405);
      response.end('Method not allowed.');
      return;
    }
    if (url.pathname === '/' || url.pathname === '/harness/index.html') {
      void sendFile(response, path.join(harnessDirectory, 'index.html'));
    } else if (url.pathname.startsWith('/harness/')) {
      void sendRootedFile(
        response,
        harnessDirectory,
        '/harness/',
        url.pathname,
      );
    } else if (url.pathname.startsWith('/avatar/')) {
      void sendRootedFile(response, avatarRoot, '/avatar/', url.pathname);
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
    throw new Error('The PSD motion harness did not expose an address.');
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
  launchMode: PsdMotionAvatarDiagnostics['launchMode'],
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
          load(value: typeof options): Promise<HarnessLoadResult>;
        };
        return harnessWindow.load(options);
      },
      {
        runtimeUrl: '/harness/motion-runtime.js',
        avatarUrl: `/avatar/${encodeURIComponent(path.basename(config.avatar))}`,
        blinkSeed: config.blinkSeed,
        motionIntensity: config.motion.intensity,
      },
    );
    if (loaded.canvasSize) {
      await page.setViewportSize(loaded.canvasSize);
    }
    return { browser, context, page, loaded, launchMode };
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
      `SwiftShader PSD motion harness failed; retrying default GL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return launchSession(origin, config, 'default-gl');
  }
}

async function requirePsd(filePath: string): Promise<void> {
  if (!filePath.toLowerCase().endsWith('.psd')) {
    throw new Error('PSD avatar must point to a .psd file.');
  }
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) throw new Error('not a file');
  } catch (error) {
    throw new Error(`PSD avatar file was not found: ${filePath}`, {
      cause: error,
    });
  }
}

/** Enforce the sequential frame-source contract used by video encoding. */
export function assertSequentialMotionFrame(
  expected: number,
  received: number,
): void {
  if (received !== expected) {
    throw new Error(
      `PSD motion frames must be sequential (expected ${expected}, got ${received}).`,
    );
  }
}

/** Detect motion eligibility and keep a browser source only when usable. */
export async function createPsdMotionCandidate(
  config: RenderConfig,
): Promise<PsdMotionCandidate> {
  await requirePsd(config.avatar);
  const harness = await startHarnessServer(config);
  let session: BrowserSession;
  try {
    session = await connectBrowser(harness.origin, config);
  } catch (error) {
    await stopServer(harness.server);
    throw error;
  }
  const { detection, canvasSize } = session.loaded;
  if (!detection.usable || !canvasSize) {
    await session.browser.close();
    await stopServer(harness.server);
    return { detection, source: null };
  }

  const diagnostics: PsdMotionAvatarDiagnostics = {
    runtime: 'anime25drig-webgl',
    detection,
    canvasSize,
    eyeInput: session.loaded.eyeInput,
    motionIntensity: config.motion.intensity,
    virtualClock: session.loaded.virtualClock,
    launchMode: session.launchMode,
    captureMode: 'playwright-element-png',
  };
  let nextFrame = 0;
  let closed = false;
  const source: PsdMotionFrameSource = {
    width: canvasSize.width,
    height: canvasSize.height,
    diagnostics,
    async renderFrame(input) {
      assertSequentialMotionFrame(nextFrame, input.frameNumber);
      const startedAt = performance.now();
      const virtualFrame = await session.page.evaluate((options) => {
        const harnessWindow = window as unknown as {
          renderFrame(value: typeof options): {
            timeMs: number;
            callbacksPerFrame: number;
            pendingCallbacks: number;
          };
        };
        return harnessWindow.renderFrame(options);
      }, input);
      diagnostics.virtualClock = {
        seed: config.blinkSeed,
        ...virtualFrame,
      };
      const png = await session.page.locator('#avatar').screenshot({
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
  return { detection, source };
}

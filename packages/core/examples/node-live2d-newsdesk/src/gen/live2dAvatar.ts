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
import type { RenderConfig } from '../types.js';

const CUBISM_DOWNLOAD_URL = 'https://www.live2d.com/en/sdk/download/web/';

export interface Live2DAvatarDiagnostics {
  coreVersion: string;
  modelSize: { width: number; height: number };
  mouthParameterId: string | null;
  eyeParameterIds: string[];
  idleMotionGroup: string | null;
  idleMotionActive: boolean;
  avatarFraming: {
    scale: number;
    x: number;
    y: number;
    renderedScale: number;
  };
  launchMode: 'swiftshader' | 'default-gl';
  captureMode: 'playwright-png-screenshot';
}

export interface Live2DFrameInput {
  frameNumber: number;
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

export interface Live2DAvatarFrame {
  image: Image;
  elapsedMs: number;
}

export interface Live2DFrameSource {
  width: number;
  height: number;
  diagnostics: Live2DAvatarDiagnostics;
  renderFrame(input: Live2DFrameInput): Promise<Live2DAvatarFrame>;
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
  diagnostics: Live2DAvatarDiagnostics;
}

type BrowserLoadDiagnostics = Omit<
  Live2DAvatarDiagnostics,
  'launchMode' | 'captureMode'
>;

const SWIFTSHADER_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

function contentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  return 'application/octet-stream';
}

async function sendFile(
  response: ServerResponse,
  filePath: string,
  type: string,
): Promise<void> {
  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) {
      response.writeHead(404);
      response.end('File unavailable.');
      return;
    }
    response.writeHead(200, {
      'Content-Type': type,
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

/** Resolve one URL beneath the model root, rejecting every escape attempt. */
export function resolveModelAssetPath(
  modelRoot: string,
  requestPath: string,
): string | null {
  if (!requestPath.startsWith('/model/')) return null;
  let relative: string;
  try {
    relative = decodeURIComponent(requestPath.slice('/model/'.length));
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
  const root = path.resolve(modelRoot);
  const candidate = path.resolve(root, ...segments);
  return candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
}

async function sendModelFile(
  response: ServerResponse,
  modelRoot: string,
  requestPath: string,
): Promise<void> {
  const candidate = resolveModelAssetPath(modelRoot, requestPath);
  if (!candidate) {
    response.writeHead(403);
    response.end('Invalid model asset path.');
    return;
  }
  try {
    const [rootRealPath, candidateRealPath] = await Promise.all([
      realpath(modelRoot),
      realpath(candidate),
    ]);
    if (!candidateRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
      response.writeHead(403);
      response.end('Model asset escapes its root.');
      return;
    }
    await sendFile(response, candidateRealPath, contentType(candidateRealPath));
  } catch (error) {
    response.writeHead(
      (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500,
    );
    response.end('Model asset unavailable.');
  }
}

async function startHarnessServer(
  avatarPath: string,
  cubismCorePath: string,
): Promise<HarnessServer> {
  const harnessDirectory = path.join(resolveProjectRoot(), 'dist', 'harness');
  const modelRoot = path.dirname(avatarPath);
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (request.method !== 'GET') {
      response.writeHead(405);
      response.end('Method not allowed.');
      return;
    }

    if (url.pathname === '/' || url.pathname === '/harness/index.html') {
      void sendFile(
        response,
        path.join(harnessDirectory, 'index.html'),
        'text/html; charset=utf-8',
      );
    } else if (url.pathname === '/harness/main.js') {
      void sendFile(
        response,
        path.join(harnessDirectory, 'main.js'),
        'text/javascript; charset=utf-8',
      );
    } else if (url.pathname === '/cubism/live2dcubismcore.min.js') {
      void sendFile(response, cubismCorePath, 'text/javascript; charset=utf-8');
    } else if (url.pathname.startsWith('/model/')) {
      void sendModelFile(response, modelRoot, url.pathname);
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
    throw new Error('The Live2D harness server did not expose an address.');
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
  launchMode: Live2DAvatarDiagnostics['launchMode'],
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
      async ({ width, height, modelFile, avatarFraming, idleMotionGroup }) => {
        const harnessWindow = window as unknown as {
          load(options: {
            modelUrl: string;
            cubismCoreUrl: string;
            width: number;
            height: number;
            avatarFraming: { scale: number; x: number; y: number };
            idleMotionGroup?: string;
          }): Promise<BrowserLoadDiagnostics>;
        };
        return harnessWindow.load({
          modelUrl: `/model/${encodeURIComponent(modelFile)}`,
          cubismCoreUrl: '/cubism/live2dcubismcore.min.js',
          width,
          height,
          avatarFraming,
          idleMotionGroup,
        });
      },
      {
        width: config.width,
        height: config.height,
        modelFile: path.basename(config.avatar),
        avatarFraming: config.avatarFraming,
        idleMotionGroup: config.avatarMotion.idle ?? undefined,
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
      `SwiftShader Live2D harness failed; retrying default GL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return launchSession(origin, config, 'default-gl');
  }
}

async function requireLocalFile(
  filePath: string,
  label: string,
  guidance: string,
): Promise<void> {
  try {
    await access(filePath);
  } catch (error) {
    throw new Error(`${label} was not found at ${filePath}. ${guidance}`, {
      cause: error,
    });
  }
}

/** Start one headless-Chromium Live2D frame source for a complete render. */
export async function createLive2DAvatar(
  config: RenderConfig,
): Promise<Live2DFrameSource> {
  await requireLocalFile(
    config.cubismCore,
    'Cubism Core',
    `Download Cubism SDK for Web from ${CUBISM_DOWNLOAD_URL} and set cubismCore to its live2dcubismcore.min.js file.`,
  );
  await requireLocalFile(
    config.avatar,
    'Live2D model',
    'Set avatar to a licensed Cubism 4 .model3.json file.',
  );
  if (!config.avatar.toLowerCase().endsWith('.model3.json')) {
    throw new Error('Live2D avatar must point to a .model3.json file.');
  }

  const harness = await startHarnessServer(config.avatar, config.cubismCore);
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
          `Live2D frames must be sequential (expected ${nextFrame}, ` +
            `got ${input.frameNumber}).`,
        );
      }
      const startedAt = performance.now();
      await session.page.evaluate(
        ({ time, deltaSeconds, mouth, eyesClosed }) => {
          const harnessWindow = window as unknown as {
            renderFrame(options: {
              time: number;
              deltaSeconds: number;
              mouth: number;
              eyesClosed: boolean;
            }): void;
          };
          harnessWindow.renderFrame({
            time,
            deltaSeconds,
            mouth,
            eyesClosed,
          });
        },
        input,
      );
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

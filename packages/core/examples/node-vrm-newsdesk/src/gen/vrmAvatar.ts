import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
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

export interface VrmAvatarDiagnostics {
  modelHeight: number;
  expressions: string[];
  mouthExpression: string | null;
  blinkExpression: string | null;
  animationLoaded: boolean;
  webglVersion: string;
  webglRenderer: string;
  cameraDistance: number;
  avatarFraming: {
    visibleHeightRatio: number;
    lookAtHeightRatio: number;
    portraitWidthAdjusted: boolean;
  };
  avatarLighting: {
    ambientIntensity: number;
    directionalIntensity: number;
  };
  launchMode: 'swiftshader' | 'default-gl';
  captureMode: 'playwright-png-screenshot';
}

export interface VrmFrameInput {
  frameNumber: number;
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

export interface VrmAvatarFrame {
  image: Image;
  elapsedMs: number;
}

export interface VrmFrameSource {
  width: number;
  height: number;
  diagnostics: VrmAvatarDiagnostics;
  renderFrame(input: VrmFrameInput): Promise<VrmAvatarFrame>;
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
  diagnostics: VrmAvatarDiagnostics;
}

interface BrowserLoadDiagnostics {
  modelHeight: number;
  expressions: string[];
  mouthExpression: string | null;
  blinkExpression: string | null;
  animationLoaded: boolean;
  webglVersion: string;
  webglRenderer: string;
  cameraDistance: number;
  avatarFraming: {
    visibleHeightRatio: number;
    lookAtHeightRatio: number;
    portraitWidthAdjusted: boolean;
  };
  avatarLighting: {
    ambientIntensity: number;
    directionalIntensity: number;
  };
}

const SWIFTSHADER_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

async function sendFile(
  response: ServerResponse,
  filePath: string,
  contentType: string,
): Promise<void> {
  try {
    const metadata = await stat(filePath);
    response.writeHead(200, {
      'Content-Type': contentType,
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

async function startHarnessServer(
  avatarPath: string,
  animationPath: string | undefined,
): Promise<HarnessServer> {
  const harnessDirectory = path.join(resolveProjectRoot(), 'dist', 'harness');
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
    } else if (url.pathname === '/model/vrm') {
      void sendFile(response, avatarPath, 'model/gltf-binary');
    } else if (url.pathname === '/model/vrma' && animationPath) {
      void sendFile(response, animationPath, 'model/gltf-binary');
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
    throw new Error('The VRM harness server did not expose an address.');
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
  launchMode: VrmAvatarDiagnostics['launchMode'],
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
      async ({
        width,
        height,
        hasAnimation,
        avatarFraming,
        avatarLighting,
      }) => {
        const harnessWindow = window as unknown as {
          load(options: {
            vrmUrl: string;
            vrmaUrl?: string;
            width: number;
            height: number;
            avatarFraming: {
              visibleHeightRatio: number;
              lookAtHeightRatio: number;
            };
            avatarLighting: {
              ambientIntensity: number;
              directionalIntensity: number;
            };
          }): Promise<BrowserLoadDiagnostics>;
        };
        return harnessWindow.load({
          vrmUrl: '/model/vrm',
          vrmaUrl: hasAnimation ? '/model/vrma' : undefined,
          width,
          height,
          avatarFraming,
          avatarLighting,
        });
      },
      {
        width: config.width,
        height: config.height,
        hasAnimation: Boolean(config.avatarAnimation),
        avatarFraming: config.avatarFraming,
        avatarLighting: config.avatarLighting,
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
      `SwiftShader VRM harness failed; retrying default GL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return launchSession(origin, config, 'default-gl');
  }
}

/** Start one headless-Chromium VRM frame source for a complete render. */
export async function createVrmAvatar(
  config: RenderConfig,
): Promise<VrmFrameSource> {
  await access(config.avatar);
  if (config.avatarAnimation) await access(config.avatarAnimation);
  const harness = await startHarnessServer(
    config.avatar,
    config.avatarAnimation,
  );
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
          `VRM frames must be sequential (expected ${nextFrame}, ` +
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

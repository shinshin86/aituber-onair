import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCodexAppServerBackend } from '@aituber-onair/agent/codex-app-server';
import { createChannelStrategyServer } from './app.js';
import { createChannelStrategyController } from './controller.js';
import { readStoredSession, writeStoredSession } from './sessionStore.js';
import { createStubCodexBackend } from './stubCodexBackend.js';
import {
  ensureChannelStrategyWorkspace,
  resolveChannelStrategyWorkspaceDir,
} from './workspace.js';

const exampleRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const SCRUBBED_ENVIRONMENT_KEYS = [
  'OPENAI_API_KEY',
  'YOUTUBE_API_KEY',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN',
  'TWITCH_CLIENT_SECRET',
  'TWITCH_ACCESS_TOKEN',
  'TWITCH_REFRESH_TOKEN',
] as const;

async function main(): Promise<void> {
  const mode = process.env.CHANNEL_STAFF_DEMO === '1' ? 'demo' : 'codex';
  const workspaceDir = resolveChannelStrategyWorkspaceDir(
    process.env.AGENT_WORKSPACE_DIR,
    exampleRoot
  );
  await ensureChannelStrategyWorkspace(workspaceDir);

  const codexPath = process.env.CODEX_PATH;
  if (codexPath && !isAbsolute(codexPath)) {
    throw new Error('CODEX_PATH must be an absolute path.');
  }
  const configuredModel = process.env.CODEX_MODEL;
  const backend =
    mode === 'demo'
      ? createStubCodexBackend({ defaultDelayMs: 600 })
      : createCodexAppServerBackend({
          ...(codexPath ? { codexPath } : { allowPathLookup: true as const }),
          workingDirectory: workspaceDir,
          sandbox: 'read-only',
          approvalPolicy: 'never',
          environment: createScrubbedEnvironment(),
          ...(configuredModel ? { model: configuredModel } : {}),
          onDiagnostic: (message) => console.error(`[codex] ${message}`),
        });

  const sessionFile = join(
    dirname(workspaceDir),
    'channel-strategy-session.json'
  );
  const storedSession = await readStoredSession(sessionFile);
  const controller = await createChannelStrategyController({
    backend,
    workspaceDir,
    ...(storedSession ? { storedSession } : {}),
    persistSession: (stored) => writeStoredSession(sessionFile, stored),
    maxThreadTurns: readPositiveInteger(
      process.env.CHANNEL_STAFF_THREAD_MAX_TURNS,
      20,
      'CHANNEL_STAFF_THREAD_MAX_TURNS'
    ),
  });
  const autoRunIntervalMs = readAutoRunIntervalMs(
    process.env.CHANNEL_STAFF_AUTO_RUN_MS
  );
  const model =
    mode === 'demo' ? 'fixture-codex' : (configuredModel ?? 'Codex default');
  const server = createChannelStrategyServer({
    controller,
    publicDir: join(exampleRoot, 'dist/client'),
    mode,
    model,
    autoRunIntervalMs,
  });
  const port = readPort(process.env.PORT);

  try {
    await new Promise<void>((resolveListening, reject) => {
      const onError = (error: Error) => reject(error);
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', onError);
        resolveListening();
      });
    });
  } catch (error) {
    await controller.close();
    throw error;
  }

  console.log(`channel-strategy-staff: http://127.0.0.1:${port}/`);
  console.log(`mode: ${mode}  model: ${model}  resumed: ${controller.resumed}`);
  console.log(`workspace: ${workspaceDir}`);
  console.log('sandbox: read-only  approval policy: never');
  console.log(
    autoRunIntervalMs > 0
      ? `host scheduler: every ${Math.round(autoRunIntervalMs / 1000)}s`
      : 'host scheduler: disabled (manual runs only)'
  );

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    const serverClosed = new Promise<void>((resolveClosed) => {
      server.close(() => resolveClosed());
      server.closeAllConnections?.();
    });
    try {
      await controller.close();
    } finally {
      await serverClosed;
    }
  };
  const handleSignal = (): void => {
    void shutdown().catch((error) => {
      console.error(formatError(error));
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
}

export function createScrubbedEnvironment(): Record<string, string> {
  return Object.fromEntries(SCRUBBED_ENVIRONMENT_KEYS.map((key) => [key, '']));
}

export function readAutoRunIntervalMs(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      'CHANNEL_STAFF_AUTO_RUN_MS must be 0 or a positive integer.'
    );
  }
  return parsed;
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? 4519);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  return port;
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

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});

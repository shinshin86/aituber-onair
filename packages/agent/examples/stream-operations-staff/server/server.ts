import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODEX_APP_SERVER_SCHEMA_VERSION,
  CODEX_APP_SERVER_SUPPORTED_VERSION,
  createCodexAppServerBackend,
} from '@aituber-onair/agent/codex-app-server';
import { createStreamOperationsServer } from './app.js';
import { createStreamOperationsController } from './controller.js';
import { readStoredSession, writeStoredSession } from './sessionStore.js';
import { ensureWorkspace } from './workspace.js';

const exampleRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

async function main(): Promise<void> {
  const workspaceDir = resolve(
    process.env.AGENT_WORKSPACE_DIR ?? join(exampleRoot, 'workspace')
  );
  await ensureWorkspace(workspaceDir);

  const sandbox =
    process.env.CODEX_SANDBOX === 'workspace-write'
      ? 'workspace-write'
      : 'read-only';
  const codexPath = process.env.CODEX_PATH;
  if (codexPath && !isAbsolute(codexPath)) {
    throw new Error('CODEX_PATH must be an absolute path.');
  }

  const backend = createCodexAppServerBackend({
    ...(codexPath ? { codexPath } : { allowPathLookup: true as const }),
    workingDirectory: workspaceDir,
    compatibility: {
      expectedVersion: CODEX_APP_SERVER_SUPPORTED_VERSION,
      schemaVersion: CODEX_APP_SERVER_SCHEMA_VERSION,
    },
    sandbox,
    approvalPolicy: 'on-request',
    onDiagnostic: (message) => console.error(`[codex] ${message}`),
  });

  const sessionFile = join(workspaceDir, '.agent-session.json');
  const stored = await readStoredSession(sessionFile);
  const controller = await createStreamOperationsController({
    backend,
    ...(stored ? { backendSessionId: stored.backendSessionId } : {}),
  });
  if (controller.backendSessionId) {
    await writeStoredSession(sessionFile, {
      backendSessionId: controller.backendSessionId,
    });
  }

  const server = createStreamOperationsServer({
    controller,
    publicDir: join(exampleRoot, 'dist/client'),
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

  console.log(`stream-operations-staff: http://127.0.0.1:${port}/`);
  console.log(`sandbox: ${sandbox}  resumed: ${controller.resumed}`);

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

function readPort(value: string | undefined): number {
  const port = Number(value ?? 4518);
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

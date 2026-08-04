import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAgent } from '@aituber-onair/agent';
import {
  CODEX_APP_SERVER_SCHEMA_VERSION,
  CODEX_APP_SERVER_SUPPORTED_VERSION,
  createCodexAppServerBackend,
} from '@aituber-onair/agent/codex-app-server';
import type {
  Agent,
  AgentSession,
  AgentSessionOptions,
} from '@aituber-onair/agent';
import { createWorkspaceServer } from './app.js';
import { readStoredSession, writeStoredSession } from './sessionStore.js';
import { ensureWorkspace } from './workspace.js';

const exampleRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const BRIEF = [
  'You are "Miko", calm and concise live-stream operations staff who',
  "maintains the streamer's operations",
  'workspace. Work only inside the provided workspace. Base every statement',
  'on files you actually read, keep answers short and practical, and ask the',
  'operator before anything questionable. Never read, edit, rename, or delete',
  '.agent-session.json; it is host-owned lifecycle state.',
].join(' ');

async function main(): Promise<void> {
  const workspaceDir = resolve(
    process.env.AGENT_WORKSPACE_DIR ?? join(exampleRoot, 'workspace')
  );
  await ensureWorkspace(workspaceDir, join(exampleRoot, 'workspace-template'));

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

  const agent = createAgent({
    id: 'codex-workspace-staff',
    brief: BRIEF,
    backend,
    // A human answers approvals from the browser, so allow up to 10 minutes.
    limits: { approvalTimeoutMs: 10 * 60_000 },
  });

  const sessionFile = join(workspaceDir, '.agent-session.json');
  const { session, resumed } = await startOrResume(agent, sessionFile);
  if (session.backendSessionId) {
    await writeStoredSession(sessionFile, {
      backendSessionId: session.backendSessionId,
    });
  }

  const server = createWorkspaceServer({
    session,
    publicDir: join(exampleRoot, 'public'),
    info: { workspaceDir, sandbox, resumed },
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
    await session.close();
    await agent.close();
    throw error;
  }

  console.log(`codex-workspace-server: http://127.0.0.1:${port}/`);
  console.log(`workspace: ${workspaceDir}`);
  console.log(`sandbox: ${sandbox}  resumed: ${resumed}`);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    const serverClosed = new Promise<void>((resolveClosed) => {
      server.close(() => resolveClosed());
      server.closeAllConnections?.();
    });
    try {
      await session.close();
      await agent.close();
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
  const port = Number(value ?? 4517);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  return port;
}

async function startOrResume(
  agent: Agent,
  sessionFile: string
): Promise<{ session: AgentSession; resumed: boolean }> {
  const sessionOptions: AgentSessionOptions = {
    purpose: 'Operate the stream workspace on operator instructions',
    audience: 'owner',
    inputTrust: 'trusted',
  };
  const stored = await readStoredSession(sessionFile);
  if (stored) {
    try {
      const session = await agent.resumeSession({
        ...sessionOptions,
        backendSessionId: stored.backendSessionId,
      });
      return { session, resumed: true };
    } catch (error) {
      console.warn(
        'Stored Codex thread could not be resumed; starting fresh.',
        error instanceof Error ? error.message : error
      );
    }
  }
  return { session: await agent.startSession(sessionOptions), resumed: false };
}

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});

function formatError(error: unknown): string {
  const messages: string[] = [];
  let current = error;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  if (messages.length > 0) return messages.join('\nCaused by: ');
  return String(error);
}

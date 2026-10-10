import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCursorAcpBackend } from '@aituber-onair/agent/cursor-acp';
import { createMockBackend } from './agent.js';
import { createMailServer } from './app.js';
import { MailController } from './controller.js';
import { InboxWatcher } from './inbox.js';

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const mode = process.env.MAIL_AGENT_BACKEND ?? 'mock';
  if (mode !== 'mock' && mode !== 'cursor-acp')
    throw new Error('MAIL_AGENT_BACKEND must be mock or cursor-acp.');
  const port = Number(process.env.PORT ?? 4520);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid PORT.');
  const agentPath = process.env.CURSOR_AGENT_PATH;
  if (agentPath && !isAbsolute(agentPath))
    throw new Error('CURSOR_AGENT_PATH must be absolute.');
  const workspace =
    mode === 'cursor-acp'
      ? await mkdtemp(join(tmpdir(), 'mail-stage-agent-'))
      : undefined;
  const backend = workspace
    ? createCursorAcpBackend({
        ...(agentPath ? { agentPath } : { allowPathLookup: true }),
        workingDirectory: workspace,
        mode: 'ask',
        requestTimeoutMs: 65_000,
        ...(process.env.CURSOR_MODEL
          ? { model: process.env.CURSOR_MODEL }
          : {}),
        environment: Object.fromEntries(
          Object.keys(process.env)
            .filter((key) => /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key))
            .map((key) => [key, ''])
        ),
      })
    : createMockBackend();
  const controller = new MailController(mode, backend, join(root, 'data'));
  const inbox = new InboxWatcher(
    resolve(process.env.MAIL_EVENT_INBOX_DIR ?? join(root, 'data/inbox')),
    controller
  );
  const server = createMailServer(controller, join(root, 'dist/client'));
  try {
    await controller.start();
    await inbox.start();
    await new Promise<void>((ready, fail) => {
      server.once('error', fail);
      server.listen(port, '127.0.0.1', ready);
    });
  } catch (error) {
    await inbox.close();
    await controller.close();
    if (workspace) await rm(workspace, { recursive: true, force: true });
    throw error;
  }
  console.log(`Fan Mail Stage (${mode}): http://127.0.0.1:${port}/operator`);
  console.log(`Stage: http://127.0.0.1:${port}/stage`);
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    server.close();
    server.closeAllConnections();
    await inbox.close();
    await controller.close();
    if (workspace) await rm(workspace, { recursive: true, force: true });
  };
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      void shutdown().catch(() => {
        process.exitCode = 1;
      });
    });
}

main().catch(() => {
  console.error(
    'Unable to start Fan Mail Stage. Check configuration, port, and local data.'
  );
  process.exitCode = 1;
});

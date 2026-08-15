import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatServiceBackend } from '@aituber-onair/agent/chat';
import { createChannelStrategyServer } from './app.js';
import {
  CHANNEL_TOOL_BUDGET,
  createChannelStrategyController,
} from './controller.js';
import { createDemoChatService } from './demoChatService.js';

const exampleRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const require = createRequire(import.meta.url);
const { ChatServiceFactory } = require('@aituber-onair/chat') as typeof import(
  '@aituber-onair/chat'
);

const DEFAULT_AUTO_RUN_INTERVAL_MS = 90_000;

async function main(): Promise<void> {
  const mode = process.env.CHANNEL_STAFF_DEMO === '1' ? 'demo' : 'openai';
  const configuredModel = process.env.OPENAI_MODEL;
  const defaultModel =
    ChatServiceFactory.getProviderCapabilities('openai')?.defaultModel ??
    'provider-default';
  const model =
    mode === 'demo' ? 'fixture-demo' : (configuredModel ?? defaultModel);
  const apiKey = process.env.OPENAI_API_KEY;
  if (mode === 'openai' && !apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required. Set CHANNEL_STAFF_DEMO=1 for the deterministic fixture demo.'
    );
  }

  const backend = createChatServiceBackend({
    provider: 'openai',
    maxToolRounds: CHANNEL_TOOL_BUDGET.maxToolRounds,
    createChatService: ({ tools }) => {
      if (mode === 'demo') return createDemoChatService(tools);
      return ChatServiceFactory.createChatService('openai', {
        apiKey: apiKey as string,
        tools,
        ...(configuredModel ? { model: configuredModel } : {}),
      });
    },
  });
  const controller = await createChannelStrategyController({ backend });
  const autoRunIntervalMs = readAutoRunIntervalMs(
    process.env.CHANNEL_STAFF_AUTO_RUN_MS
  );
  const server = createChannelStrategyServer({
    controller,
    publicDir: join(exampleRoot, 'dist/client'),
    mode,
    model,
    budget: CHANNEL_TOOL_BUDGET,
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
  console.log(`mode: ${mode}  model: ${model}`);
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

/** The Agent package has no scheduler, so the host owns this interval. */
function readAutoRunIntervalMs(value: string | undefined): number {
  if (value === undefined) return DEFAULT_AUTO_RUN_INTERVAL_MS;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      'CHANNEL_STAFF_AUTO_RUN_MS must be 0 or a positive integer.'
    );
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

import { ChatResponseLength } from '../../../constants';
import { AgentTextChatService, wrapAgentProviderError } from './shared';

/** Default model identifier passed to the Cursor SDK. */
export const DEFAULT_CURSOR_SDK_MODEL = 'default';

type CursorSDKModule = {
  Agent: {
    create(options: CursorAgentCreateOptions): Promise<CursorAgent>;
  };
};

type CursorAgentCreateOptions = {
  apiKey?: string;
  model: { id: string };
  tools: [];
  local: {
    cwd: string;
    settingSources: [];
  };
};

type CursorAgent = {
  send(
    prompt: string,
    options: {
      onDelta(event: CursorDeltaEvent): void;
    },
  ): Promise<CursorRun>;
  close?(): Promise<void> | void;
  [key: symbol]: unknown;
};

type CursorDeltaEvent = {
  update:
    | { type: 'text-delta'; text: unknown }
    | { type: string; [key: string]: unknown };
};

type CursorRun = {
  wait(): Promise<CursorRunResult>;
};

type CursorRunResult =
  | { status: 'finished'; result?: unknown }
  | {
      status: 'error';
      error?: { message?: unknown; code?: unknown };
    }
  | { status: 'cancelled' };

type CursorExecutionOutcome =
  | { ok: true; text: string }
  | { ok: false; error: unknown };

/** Loads the optional Cursor SDK at runtime. */
export type CursorSDKLoader = () => Promise<CursorSDKModule>;

/** Options for the text-only Cursor SDK chat provider. */
export type CursorSDKChatServiceOptions = {
  /** Optional explicit key. Cursor SDK authentication is used when omitted. */
  apiKey?: string;
  /** Cursor model identifier. Defaults to DEFAULT_CURSOR_SDK_MODEL. */
  model?: string;
  /** Soft response length instruction included in the generated prompt. */
  responseLength?: ChatResponseLength;
  /** Local agent working directory. Defaults to process.cwd(). */
  workingDirectory?: string;
};

/** Text-only ChatService backed by a local Cursor SDK agent. */
export class CursorSDKChatService extends AgentTextChatService {
  constructor(
    options: CursorSDKChatServiceOptions = {},
    loadSDK: CursorSDKLoader = loadCursorSDK,
  ) {
    const model = options.model ?? DEFAULT_CURSOR_SDK_MODEL;

    super({
      provider: 'cursor-sdk',
      model,
      defaultModel: DEFAULT_CURSOR_SDK_MODEL,
      responseLength: options.responseLength,
      getResponse: async (prompt, stream, onPartialResponse) => {
        try {
          return await runCursorPrompt(
            loadSDK,
            model,
            options.workingDirectory,
            options.apiKey,
            prompt,
            stream,
            onPartialResponse,
          );
        } catch (error) {
          throw redactSecret(
            wrapAgentProviderError('cursor-sdk', error),
            options.apiKey,
          );
        }
      },
    });
  }
}

async function runCursorPrompt(
  loadSDK: CursorSDKLoader,
  model: string,
  workingDirectory: string | undefined,
  apiKey: string | undefined,
  prompt: string,
  stream: boolean,
  onPartialResponse: (text: string) => void,
): Promise<string> {
  const { Agent } = await loadCursorSDKModule(loadSDK);
  const agent = await Agent.create({
    ...(apiKey !== undefined ? { apiKey } : {}),
    model: { id: model },
    tools: [],
    local: {
      cwd: workingDirectory ?? process.cwd(),
      settingSources: [],
    },
  });
  let outcome: CursorExecutionOutcome;

  try {
    outcome = {
      ok: true,
      text: await executeCursorRun(agent, prompt, stream, onPartialResponse),
    };
  } catch (error) {
    outcome = { ok: false, error };
  }

  try {
    await disposeCursorAgent(agent);
  } catch (error) {
    if (outcome.ok) {
      throw error;
    }
  }

  if (!outcome.ok) {
    throw outcome.error;
  }

  return outcome.text;
}

async function executeCursorRun(
  agent: CursorAgent,
  prompt: string,
  stream: boolean,
  onPartialResponse: (text: string) => void,
): Promise<string> {
  let deltaText = '';
  const run = await agent.send(prompt, {
    onDelta: ({ update }) => {
      if (
        update.type === 'text-delta' &&
        typeof update.text === 'string' &&
        update.text
      ) {
        deltaText += update.text;
        if (stream) {
          onPartialResponse(update.text);
        }
      }
    },
  });
  const result = await run.wait();

  if (result.status === 'finished') {
    const finalText =
      typeof result.result === 'string' && result.result
        ? result.result
        : deltaText;

    if (!finalText) {
      throw new Error('cursor-sdk provider received an empty response.');
    }

    if (stream && !deltaText) {
      onPartialResponse(finalText);
    }

    return finalText;
  }

  if (result.status === 'error') {
    throw new Error(formatCursorRunError(result.error));
  }

  throw new Error('cursor-sdk run was cancelled.');
}

async function disposeCursorAgent(agent: CursorAgent): Promise<void> {
  const asyncDisposeSymbol = (Symbol as unknown as { asyncDispose?: symbol })
    .asyncDispose;
  const asyncDispose = asyncDisposeSymbol
    ? agent[asyncDisposeSymbol]
    : undefined;

  if (typeof asyncDispose === 'function') {
    await asyncDispose.call(agent);
    return;
  }

  await agent.close?.();
}

function formatCursorRunError(
  error: { message?: unknown; code?: unknown } | undefined,
): string {
  const message =
    typeof error?.message === 'string'
      ? error.message
      : 'Cursor SDK run failed.';
  const code =
    typeof error?.code === 'string' || typeof error?.code === 'number'
      ? String(error.code)
      : undefined;

  return code ? `${message} (${code})` : message;
}

async function loadCursorSDKModule(
  loadSDK: CursorSDKLoader,
): Promise<CursorSDKModule> {
  try {
    return await loadSDK();
  } catch (error) {
    const message =
      'cursor-sdk provider requires @cursor/sdk. ' +
      'Install it in your Node.js 22.13+ project and authenticate with Cursor.auth.login() or CURSOR_API_KEY.';
    const wrappedError = new Error(message);
    (wrappedError as { cause?: unknown }).cause = error;
    throw wrappedError;
  }
}

function redactSecret(error: Error, secret: string | undefined): Error {
  if (!secret) {
    return error;
  }

  error.message = error.message.split(secret).join('[REDACTED]');
  if (error.stack) {
    error.stack = error.stack.split(secret).join('[REDACTED]');
  }
  return error;
}

async function loadCursorSDK(): Promise<CursorSDKModule> {
  return (await dynamicImport('@cursor/sdk')) as CursorSDKModule;
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

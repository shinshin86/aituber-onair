import { ChatResponseLength } from '../../../constants';
import { AgentTextChatService, wrapAgentProviderError } from './shared';

export const DEFAULT_CODEX_SDK_MODEL = 'codex-default';

type CodexSDKModule = {
  Codex: new (options?: Record<string, unknown>) => CodexClient;
};

type CodexClient = {
  startThread(options?: Record<string, unknown>): Promise<CodexThread>;
};

type CodexThread = {
  run(prompt: string): Promise<CodexTurn>;
};

type CodexTurn = {
  finalResponse?: unknown;
};

export type CodexSDKLoader = () => Promise<CodexSDKModule>;

export type CodexSDKChatServiceOptions = {
  apiKey?: never;
  model?: string;
  responseLength?: ChatResponseLength;
  workingDirectory?: string;
  skipGitRepoCheck?: boolean;
  config?: Record<string, unknown>;
};

export class CodexSDKChatService extends AgentTextChatService {
  constructor(
    options: CodexSDKChatServiceOptions = {},
    loadSDK: CodexSDKLoader = loadCodexSDK,
  ) {
    const model = options.model ?? DEFAULT_CODEX_SDK_MODEL;

    super({
      provider: 'codex-sdk',
      model,
      defaultModel: DEFAULT_CODEX_SDK_MODEL,
      responseLength: options.responseLength,
      getResponse: async (prompt, stream, onPartialResponse) => {
        try {
          const text = await runCodexPrompt(loadSDK, model, options, prompt);
          if (stream) {
            onPartialResponse(text);
          }
          return text;
        } catch (error) {
          throw wrapAgentProviderError('codex-sdk', error);
        }
      },
    });
  }
}

async function runCodexPrompt(
  loadSDK: CodexSDKLoader,
  model: string,
  options: CodexSDKChatServiceOptions,
  prompt: string,
): Promise<string> {
  const { Codex } = await loadSDK();
  const codex = new Codex({
    config: {
      ...options.config,
      ...(options.model ? { model } : {}),
    },
  });
  const thread = await codex.startThread({
    ...(options.workingDirectory
      ? { workingDirectory: options.workingDirectory }
      : {}),
    ...(options.skipGitRepoCheck !== undefined
      ? { skipGitRepoCheck: options.skipGitRepoCheck }
      : {}),
  });
  const turn = await thread.run(prompt);

  if (typeof turn.finalResponse !== 'string') {
    throw new Error('codex-sdk provider received an empty response.');
  }

  return turn.finalResponse;
}

async function loadCodexSDK(): Promise<CodexSDKModule> {
  try {
    return (await dynamicImport('@openai/codex-sdk')) as CodexSDKModule;
  } catch (error) {
    const message =
      'codex-sdk provider requires @openai/codex-sdk. ' +
      'Install it in your Node.js project and authenticate with Codex.';
    const wrappedError = new Error(message);
    (wrappedError as { cause?: unknown }).cause = error;
    throw wrappedError;
  }
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

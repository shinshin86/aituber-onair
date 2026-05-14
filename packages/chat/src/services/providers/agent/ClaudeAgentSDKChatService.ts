import { ChatResponseLength } from '../../../constants';
import { AgentTextChatService, wrapAgentProviderError } from './shared';

export const DEFAULT_CLAUDE_AGENT_SDK_MODEL = 'claude-default';

type ClaudeAgentSDKModule = {
  query: (params: {
    prompt: string;
    options?: Record<string, unknown>;
  }) => AsyncIterable<ClaudeAgentSDKMessage>;
};

type ClaudeAgentSDKMessage =
  | {
      type: 'result';
      is_error?: boolean;
      result?: unknown;
      errors?: unknown;
    }
  | {
      type: 'stream_event';
      event?: {
        type?: string;
        delta?: {
          type?: string;
          text?: unknown;
        };
      };
    }
  | Record<string, unknown>;

export type ClaudeAgentSDKLoader = () => Promise<ClaudeAgentSDKModule>;

export type ClaudeAgentSDKChatServiceOptions = {
  apiKey?: never;
  model?: string;
  responseLength?: ChatResponseLength;
  workingDirectory?: string;
  maxTurns?: number;
  pathToClaudeCodeExecutable?: string;
  env?: Record<string, string | undefined>;
};

export class ClaudeAgentSDKChatService extends AgentTextChatService {
  constructor(
    options: ClaudeAgentSDKChatServiceOptions = {},
    loadSDK: ClaudeAgentSDKLoader = loadClaudeAgentSDK,
  ) {
    const model = options.model ?? DEFAULT_CLAUDE_AGENT_SDK_MODEL;

    super({
      provider: 'claude-agent-sdk',
      model,
      defaultModel: DEFAULT_CLAUDE_AGENT_SDK_MODEL,
      responseLength: options.responseLength,
      getResponse: async (prompt, stream, onPartialResponse) => {
        try {
          return await runClaudeAgentPrompt(
            loadSDK,
            model,
            options,
            prompt,
            stream,
            onPartialResponse,
          );
        } catch (error) {
          throw wrapAgentProviderError('claude-agent-sdk', error);
        }
      },
    });
  }
}

async function runClaudeAgentPrompt(
  loadSDK: ClaudeAgentSDKLoader,
  model: string,
  options: ClaudeAgentSDKChatServiceOptions,
  prompt: string,
  stream: boolean,
  onPartialResponse: (text: string) => void,
): Promise<string> {
  const { query } = await loadSDK();
  let finalText = '';
  let streamedText = '';

  const queryOptions: Record<string, unknown> = {
    tools: [],
    permissionMode: 'dontAsk',
    settingSources: [],
    ...(options.model ? { model } : {}),
    ...(options.workingDirectory ? { cwd: options.workingDirectory } : {}),
    ...(options.maxTurns !== undefined ? { maxTurns: options.maxTurns } : {}),
    ...(options.pathToClaudeCodeExecutable
      ? { pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable }
      : {}),
    ...(options.env ? { env: options.env } : {}),
    ...(stream ? { includePartialMessages: true } : {}),
  };

  for await (const message of query({ prompt, options: queryOptions })) {
    const delta = extractTextDelta(message);
    if (stream && delta) {
      streamedText += delta;
      onPartialResponse(delta);
    }

    if (isResultMessage(message)) {
      if (message.is_error) {
        throw new Error(formatClaudeAgentResultError(message.errors));
      }

      if (typeof message.result === 'string') {
        finalText = message.result;
      }
    }
  }

  if (!finalText) {
    throw new Error('claude-agent-sdk provider received an empty response.');
  }

  if (stream && streamedText === '') {
    onPartialResponse(finalText);
  }

  return finalText;
}

function extractTextDelta(message: ClaudeAgentSDKMessage): string | undefined {
  if (!isStreamEventMessage(message)) {
    return undefined;
  }

  const delta = message.event?.delta;
  if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
    return delta.text;
  }

  return undefined;
}

function isStreamEventMessage(
  message: ClaudeAgentSDKMessage,
): message is Extract<ClaudeAgentSDKMessage, { type: 'stream_event' }> {
  return message.type === 'stream_event';
}

function isResultMessage(
  message: ClaudeAgentSDKMessage,
): message is Extract<ClaudeAgentSDKMessage, { type: 'result' }> {
  return message.type === 'result';
}

function formatClaudeAgentResultError(errors: unknown): string {
  if (Array.isArray(errors) && errors.length > 0) {
    return errors
      .map((error) => (typeof error === 'string' ? error : String(error)))
      .join('\n');
  }

  return 'claude-agent-sdk provider failed during execution.';
}

async function loadClaudeAgentSDK(): Promise<ClaudeAgentSDKModule> {
  try {
    return (await dynamicImport(
      '@anthropic-ai/claude-agent-sdk',
    )) as ClaudeAgentSDKModule;
  } catch (error) {
    const message =
      'claude-agent-sdk provider requires @anthropic-ai/claude-agent-sdk. ' +
      'Install it in your JavaScript runtime project and authenticate with Claude Agent SDK.';
    const wrappedError = new Error(message);
    (wrappedError as { cause?: unknown }).cause = error;
    throw wrappedError;
  }
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

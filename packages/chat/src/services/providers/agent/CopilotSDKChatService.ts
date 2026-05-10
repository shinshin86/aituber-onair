import { ChatResponseLength } from '../../../constants';
import { AgentTextChatService, wrapAgentProviderError } from './shared';

export const DEFAULT_COPILOT_SDK_MODEL = 'gpt-4.1';

type CopilotSDKModule = {
  CopilotClient: new () => CopilotClient;
};

type CopilotClient = {
  createSession(options?: Record<string, unknown>): Promise<CopilotSession>;
  stop?(): Promise<void> | void;
};

type CopilotSession = {
  sendAndWait(message: { prompt: string }): Promise<CopilotResponse>;
  on?(
    eventName: string,
    handler: (event: CopilotMessageDeltaEvent) => void,
  ): (() => void) | undefined;
};

type CopilotResponse = {
  data?: {
    content?: unknown;
  };
};

type CopilotMessageDeltaEvent = {
  data?: {
    deltaContent?: unknown;
  };
};

export type CopilotSDKLoader = () => Promise<CopilotSDKModule>;

export type CopilotSDKPermissionRequest = {
  kind: string;
  toolCallId?: string;
};

export type CopilotSDKPermissionRequestResult = {
  kind: string;
};

export type CopilotSDKPermissionHandler = (
  request: CopilotSDKPermissionRequest,
  invocation: { sessionId: string },
) =>
  | CopilotSDKPermissionRequestResult
  | Promise<CopilotSDKPermissionRequestResult>;

export type CopilotSDKChatServiceOptions = {
  apiKey?: never;
  model?: string;
  responseLength?: ChatResponseLength;
  onPermissionRequest?: CopilotSDKPermissionHandler;
};

export class CopilotSDKChatService extends AgentTextChatService {
  constructor(
    options: CopilotSDKChatServiceOptions = {},
    loadSDK: CopilotSDKLoader = loadCopilotSDK,
  ) {
    const model = options.model ?? DEFAULT_COPILOT_SDK_MODEL;

    super({
      provider: 'copilot-sdk',
      model,
      defaultModel: DEFAULT_COPILOT_SDK_MODEL,
      responseLength: options.responseLength,
      getResponse: async (prompt, stream, onPartialResponse) => {
        try {
          return await runCopilotPrompt(
            loadSDK,
            model,
            options,
            prompt,
            stream,
            onPartialResponse,
          );
        } catch (error) {
          throw wrapAgentProviderError('copilot-sdk', error);
        }
      },
    });
  }
}

async function runCopilotPrompt(
  loadSDK: CopilotSDKLoader,
  model: string,
  options: CopilotSDKChatServiceOptions,
  prompt: string,
  stream: boolean,
  onPartialResponse: (text: string) => void,
): Promise<string> {
  const { CopilotClient } = await loadSDK();
  const client = new CopilotClient();
  let unsubscribe: (() => void) | undefined = undefined;
  let streamedText = '';

  try {
    const session = await client.createSession({
      model,
      streaming: stream,
      onPermissionRequest:
        options.onPermissionRequest ?? denyCopilotPermissionRequest,
    });

    if (stream && session.on) {
      unsubscribe = session.on('assistant.message_delta', (event) => {
        const delta = event.data?.deltaContent;
        if (typeof delta === 'string' && delta) {
          streamedText += delta;
          onPartialResponse(delta);
        }
      });
    }

    const response = await session.sendAndWait({ prompt });
    const content = response.data?.content;

    if (typeof content !== 'string') {
      throw new Error('copilot-sdk provider received an empty response.');
    }

    if (stream && streamedText === '') {
      onPartialResponse(content);
    }

    return content;
  } finally {
    if (unsubscribe) {
      unsubscribe();
    }
    await client.stop?.();
  }
}

const denyCopilotPermissionRequest: CopilotSDKPermissionHandler = () => ({
  kind: 'denied-no-approval-rule-and-could-not-request-from-user',
});

async function loadCopilotSDK(): Promise<CopilotSDKModule> {
  try {
    return (await dynamicImport('@github/copilot-sdk')) as CopilotSDKModule;
  } catch (error) {
    const message =
      'copilot-sdk provider requires @github/copilot-sdk. ' +
      'Install it in your Node.js project and authenticate with GitHub Copilot.';
    const wrappedError = new Error(message);
    (wrappedError as { cause?: unknown }).cause = error;
    throw wrappedError;
  }
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

import {
  ChatServiceFactory,
  type Message,
  type ToolChatCompletion,
} from '@aituber-onair/core';

export type ApiProvider = 'openai' | 'claude' | 'gemini';

const API_KEY_ENV: Record<ApiProvider, string> = {
  openai: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

export const SUPPORTED_PROVIDERS = Object.freeze(
  Object.keys(API_KEY_ENV) as ApiProvider[],
);

interface ChatServiceLike {
  chatOnce(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion>;
}

export interface ChatServiceFactoryLike {
  createChatService(
    provider: ApiProvider,
    options: {
      apiKey: string;
      responseFormat?: { type: 'json_object' };
    },
  ): ChatServiceLike;
  getAvailableProviders?(): string[];
}

export interface RequestScriptOptions {
  provider: ApiProvider;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  factory?: ChatServiceFactoryLike;
}

/** Resolve the environment API key required by an API-based provider. */
export function resolveApiKey(
  provider: ApiProvider,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const variable = API_KEY_ENV[provider];
  const value = environment[variable];
  if (!value)
    throw new Error(`${variable} is required for provider "${provider}".`);
  return value;
}

/** Return Core's provider factory behind the small interface used by tests. */
export function loadChatServiceFactory(): ChatServiceFactoryLike {
  return ChatServiceFactory as unknown as ChatServiceFactoryLike;
}

/** Request a JSON newsdesk script through an API-key Core chat provider. */
export async function requestScript({
  provider,
  apiKey,
  systemPrompt,
  userPrompt,
  factory = loadChatServiceFactory(),
}: RequestScriptOptions): Promise<string> {
  const options: {
    apiKey: string;
    responseFormat?: { type: 'json_object' };
  } = { apiKey };
  if (provider === 'openai') {
    options.responseFormat = { type: 'json_object' };
  }
  const service = factory.createChatService(provider, options);
  const completion = await service.chatOnce(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    false,
    () => {},
    2_000,
  );
  const text = completion.blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  if (!text.trim()) throw new Error(`Provider "${provider}" returned no text.`);
  return text;
}

import { createRequire } from 'node:module';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createSecretaryAgent } from './agent';
import { toChatToolDefinitions, tools } from './tools';

type ChatProviderName =
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'openrouter'
  | 'openai-compatible'
  | 'zai'
  | 'xai'
  | 'kimi'
  | 'deepseek'
  | 'mistral';

type ChatServiceFactoryModule = {
  ChatServiceFactory: {
    createChatService(provider: ChatProviderName, options: unknown): unknown;
  };
};

const requireFromHere = createRequire(__filename);
const { ChatServiceFactory } = requireFromHere(
  '../../../dist/cjs/index.js',
) as ChatServiceFactoryModule;

async function main(): Promise<void> {
  const provider = (process.env.CHAT_PROVIDER ?? 'openai') as ChatProviderName;
  const apiKey = resolveApiKey(provider);

  if (!apiKey) {
    console.error(
      'Set an API key before running this example. For OpenAI, set OPENAI_API_KEY.',
    );
    process.exitCode = 1;
    return;
  }

  const chat = ChatServiceFactory.createChatService(provider, {
    apiKey,
    model: process.env.CHAT_MODEL,
    tools: toChatToolDefinitions(tools),
  });
  const agent = createSecretaryAgent({
    chat: chat as Parameters<typeof createSecretaryAgent>[0]['chat'],
    tools,
  });
  const readline = createInterface({ input, output });

  console.log('AITuber Secretary Agent Example');
  console.log('Type exit or quit to end the session.');

  while (true) {
    const userInput = await readline.question('\nUser: ');

    if (['exit', 'quit'].includes(userInput.trim().toLowerCase())) {
      break;
    }

    const response = await agent.respond(userInput);
    console.log(`Assistant: ${response}`);
  }

  readline.close();
}

function resolveApiKey(provider: ChatProviderName): string | undefined {
  const envByProvider: Partial<Record<ChatProviderName, string>> = {
    openai: 'OPENAI_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    zai: 'ZAI_API_KEY',
    xai: 'XAI_API_KEY',
    kimi: 'KIMI_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    'openai-compatible': 'OPENAI_COMPATIBLE_API_KEY',
  };
  const envName = envByProvider[provider];

  return envName ? process.env[envName] : undefined;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

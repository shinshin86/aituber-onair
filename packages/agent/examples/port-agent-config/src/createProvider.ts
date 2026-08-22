/**
 * Chat backend provider factory.
 *
 * This is the "model + tools wiring" half of the port. The old character-agent
 * example built its provider with `ChatServiceFactory.createChatService` and a
 * manual two-message chat loop. Here the SAME factory feeds the Agent runtime
 * through `createChatServiceBackend`, which turns a `ChatService` into an
 * `AgentBackend` (one service per Session, message-trust positions, tool-call
 * round-tripping, streaming deltas, and structured Agent events).
 *
 * Porting the model configuration is therefore a one-line change of envelope:
 *
 *   createChatService({ provider, apiKey, model, tools })   // chat package
 *      |
 *      v
 *   createChatServiceBackend({ provider, createChatService })  // agent package
 *      |
 *      v
 *   createAgent({ id, brief, backend, tools, policy })
 *
 * The provider name, model, and API key resolution stay identical.
 */
import { ChatServiceFactory } from '@aituber-onair/chat';
import { createChatServiceBackend } from '@aituber-onair/agent/chat';

import type { AgentBackend } from '@aituber-onair/agent';
import type { ChatProviderName } from '@aituber-onair/chat';

export interface ChatBackendOptions {
  /**
   * Provider identifier, e.g. `openai`, `gemini`, `claude`, `openai-compatible`.
   * Mirrors the `llm.provider` setting from the generated AITuber apps.
   */
  readonly provider: ChatProviderName;
  /** Optional model override. When omitted the provider default is used. */
  readonly model?: string;
  /** Optional API key. When omitted it is read from the provider env var. */
  readonly apiKey?: string;
  /** Optional endpoint for openai-compatible providers. */
  readonly baseUrl?: string;
}

/**
 * Reads an OpenAI-compatible API key from the well-known environment variables
 * the AITuber ecosystem already checks (used by `core`'s `getApiKeyForProvider`).
 */
function resolveApiKey(provider: ChatProviderName, explicit?: string): string {
  if (explicit) return explicit;
  const envMap: Record<string, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    zai: process.env.ZAI_API_KEY,
    xai: process.env.XAI_API_KEY,
    kimi: process.env.KIMI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    sakana: process.env.SAKANA_API_KEY,
    plamo: process.env.PLAMO_API_KEY,
    'openai-compatible': process.env.OPENAI_COMPATIBLE_API_KEY,
  };
  const value = envMap[provider];
  if (!value) {
    throw new Error(
      `No API key for provider "${provider}". Pass apiKey explicitly or set ` +
        'the matching environment variable.',
    );
  }
  return value;
}

/**
 * Builds an `AgentBackend` for a given provider. The returned backend creates
 * one `ChatService` per Session via the `createChatService` callback, so the
 * Agent runtime stays in charge of per-Session tool visibility and message
 * trust positioning while the chat service owns provider transport.
 */
export function createChatBackend(options: ChatBackendOptions): AgentBackend {
  const { provider, model, baseUrl } = options;
  const apiKey = resolveApiKey(provider, options.apiKey);

  return createChatServiceBackend({
    provider,
    capabilities: {
      text: true,
      streaming: true,
      tools: true,
      interruption: false,
      sessionResume: false,
      approvals: false,
      detailedEvents: true,
    },
    createChatService: ({ tools }) =>
      ChatServiceFactory.createChatService(provider, {
        apiKey,
        ...(model ? { model } : {}),
        ...(baseUrl ? { endpoint: baseUrl } : {}),
        tools,
      }),
  });
}

/** Chat providers of `@aituber-onair/chat` that this page can offer. */
export type Provider =
  | 'gemini-nano'
  | 'openai'
  | 'gemini'
  | 'claude'
  | 'xai'
  | 'zai'
  | 'kimi'
  | 'deepseek'
  | 'mistral'
  | 'plamo'
  | 'openrouter'
  | 'openai-compatible'
  | 'sakana';

/** Providers that take an API key entered on this page */
export type KeyedProvider = Exclude<
  Provider,
  'gemini-nano' | 'openai-compatible' | 'sakana'
>;

export interface ProviderInfo {
  id: Provider;
  label: string;
  /** How the provider is reached; decides which fields the settings show */
  auth: 'none' | 'apiKey' | 'endpoint';
  /** False for providers whose APIs cannot be called from a browser */
  browser: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini-nano',
    label: 'Gemini Nano（Chrome 内蔵・キー不要）',
    auth: 'none',
    browser: true,
  },
  { id: 'openai', label: 'OpenAI', auth: 'apiKey', browser: true },
  { id: 'gemini', label: 'Google Gemini', auth: 'apiKey', browser: true },
  { id: 'claude', label: 'Anthropic Claude', auth: 'apiKey', browser: true },
  { id: 'xai', label: 'xAI', auth: 'apiKey', browser: true },
  { id: 'zai', label: 'Z.ai', auth: 'apiKey', browser: true },
  { id: 'kimi', label: 'Kimi', auth: 'apiKey', browser: true },
  { id: 'deepseek', label: 'DeepSeek', auth: 'apiKey', browser: true },
  { id: 'mistral', label: 'Mistral', auth: 'apiKey', browser: true },
  { id: 'plamo', label: 'PLaMo', auth: 'apiKey', browser: true },
  { id: 'openrouter', label: 'OpenRouter', auth: 'apiKey', browser: true },
  {
    id: 'openai-compatible',
    label: 'OpenAI 互換サーバー（ローカル LLM など）',
    auth: 'endpoint',
    browser: true,
  },
  { id: 'sakana', label: 'Sakana AI', auth: 'apiKey', browser: false },
];

export function getProvider(id: Provider): ProviderInfo {
  return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}

export function isKeyedProvider(id: Provider): id is KeyedProvider {
  return getProvider(id).auth === 'apiKey' && getProvider(id).browser;
}

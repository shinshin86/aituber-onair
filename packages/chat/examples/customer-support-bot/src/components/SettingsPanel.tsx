import { useMemo, useState } from 'react';
import { ChatServiceFactory, type ChatProviderName } from '@aituber-onair/chat';

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra';
const DEFAULT_OPENAI_COMPATIBLE_ENDPOINT =
  'http://127.0.0.1:18080/v1/chat/completions';

// Keep this as a denylist so newly registered browser providers appear without
// an example-side update. Agent SDK providers require server-side runtimes, and
// Sakana AI currently blocks direct browser requests with CORS.
const BROWSER_INCOMPATIBLE_PROVIDERS = new Set([
  'codex-sdk',
  'claude-agent-sdk',
  'copilot-sdk',
  'sakana',
]);

const PROVIDER_LABELS: Partial<Record<ChatProviderName, string>> = {
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-Compatible',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  'gemini-nano': 'Gemini Nano (Browser AI)',
  claude: 'Claude',
  zai: 'Z.ai',
  xai: 'xAI',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  plamo: 'PLaMo',
};

const API_KEY_PLACEHOLDERS: Partial<Record<ChatProviderName, string>> = {
  openai: 'sk-…',
  'openai-compatible': 'Optional bearer token',
  openrouter: 'sk-or-…',
  gemini: 'AI…',
  claude: 'sk-ant-…',
  zai: 'API key',
  xai: 'xai-…',
  kimi: 'API key',
  deepseek: 'sk-…',
  mistral: 'API key',
  plamo: 'plamo-…',
};

export const AVAILABLE_BROWSER_PROVIDERS =
  ChatServiceFactory.getAvailableProviders().filter(
    (provider) => !BROWSER_INCOMPATIBLE_PROVIDERS.has(provider),
  ) as ChatProviderName[];

const getModels = (provider: ChatProviderName): string[] =>
  ChatServiceFactory.getSupportedModels(provider);

export const getDefaultModel = (provider: ChatProviderName): string =>
  ChatServiceFactory.getProviderCapabilities(provider)?.defaultModel ??
  getModels(provider)[0] ??
  '';

const normalizeModel = (
  provider: ChatProviderName,
  candidate: unknown,
): string => {
  const models = getModels(provider);
  const candidateModel = typeof candidate === 'string' ? candidate.trim() : '';

  // OpenAI-compatible endpoints expose their own model identifiers and the
  // package intentionally reports no fixed model list for this provider.
  if (models.length === 0) {
    return candidateModel || getDefaultModel(provider);
  }

  if (models.includes(candidateModel)) return candidateModel;
  return getDefaultModel(provider);
};

export const providerRequiresApiKey = (provider: ChatProviderName): boolean =>
  provider !== 'gemini-nano' && provider !== 'openai-compatible';

export const hasRequiredSettings = (settings: SupportSettings): boolean => {
  if (!settings.model.trim()) return false;
  if (settings.provider === 'openai-compatible') {
    return Boolean(settings.endpoint.trim());
  }
  return !providerRequiresApiKey(settings.provider) || Boolean(settings.apiKey);
};

const formatProviderLabel = (provider: ChatProviderName): string =>
  PROVIDER_LABELS[provider] ??
  provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export interface SupportSettings {
  provider: ChatProviderName;
  model: string;
  apiKey: string;
  endpoint: string;
  persona: string;
}

export const SETTINGS_STORAGE_KEY =
  'aituber-onair.chat.customer-support-bot.settings';

export const DEFAULT_PERSONA =
  'You are Onair-chan, a cheerful and concise support guide. Be warm, practical, and easy to understand.';

export const DEFAULT_SETTINGS: SupportSettings = {
  provider: 'openai',
  model: DEFAULT_OPENAI_MODEL,
  apiKey: '',
  endpoint: DEFAULT_OPENAI_COMPATIBLE_ENDPOINT,
  persona: DEFAULT_PERSONA,
};

export function loadSettings(): SupportSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored) as Partial<SupportSettings>;
    const provider =
      typeof parsed.provider === 'string' &&
      AVAILABLE_BROWSER_PROVIDERS.includes(parsed.provider as ChatProviderName)
        ? (parsed.provider as ChatProviderName)
        : DEFAULT_SETTINGS.provider;

    return {
      provider,
      model: normalizeModel(provider, parsed.model),
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      endpoint:
        typeof parsed.endpoint === 'string' && parsed.endpoint.trim()
          ? parsed.endpoint
          : DEFAULT_SETTINGS.endpoint,
      persona:
        typeof parsed.persona === 'string' && parsed.persona.trim()
          ? parsed.persona
          : DEFAULT_PERSONA,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsPanelProps {
  settings: SupportSettings;
  onSave: (settings: SupportSettings) => void;
  onCancel: () => void;
}

export default function SettingsPanel({
  settings,
  onSave,
  onCancel,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const modelOptions = useMemo(
    () => getModels(draft.provider),
    [draft.provider],
  );
  const requiresApiKey = providerRequiresApiKey(draft.provider);

  const handleProviderChange = (provider: ChatProviderName) => {
    setDraft((current) => ({
      ...current,
      provider,
      model: getDefaultModel(provider),
    }));
  };

  return (
    <div className="settings-panel">
      <div className="settings-heading">
        <div>
          <span>Configuration</span>
          <h2>Support bot settings</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close settings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <label className="settings-field">
        <span>Provider</span>
        <select
          value={draft.provider}
          onChange={(event) =>
            handleProviderChange(event.target.value as ChatProviderName)
          }
        >
          {AVAILABLE_BROWSER_PROVIDERS.map((provider) => (
            <option value={provider} key={provider}>
              {formatProviderLabel(provider)}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-field" htmlFor="support-model">
        <span>Model</span>
        {modelOptions.length > 0 ? (
          <select
            id="support-model"
            value={draft.model}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                model: event.target.value,
              }))
            }
          >
            {modelOptions.map((model) => (
              <option value={model} key={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="support-model"
            type="text"
            value={draft.model}
            placeholder="Model identifier"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                model: event.target.value,
              }))
            }
          />
        )}
        <small>
          {modelOptions.length > 0
            ? 'Loaded from the provider registry.'
            : 'Enter the model exposed by your compatible server.'}
        </small>
      </label>

      {draft.provider === 'openai-compatible' && (
        <label className="settings-field">
          <span>Chat completions endpoint</span>
          <input
            type="url"
            value={draft.endpoint}
            placeholder="http://127.0.0.1:18080/v1/chat/completions"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                endpoint: event.target.value,
              }))
            }
          />
          <small>Use the full URL for your OpenAI-compatible endpoint.</small>
        </label>
      )}

      {draft.provider === 'gemini-nano' ? (
        <div className="settings-provider-note">
          Gemini Nano runs through Chrome's built-in Prompt API and does not
          require an API key.
        </div>
      ) : (
        <label className="settings-field">
          <span>API key{requiresApiKey ? '' : ' (optional)'}</span>
          <input
            type="password"
            value={draft.apiKey}
            placeholder={API_KEY_PLACEHOLDERS[draft.provider] ?? 'API key'}
            autoComplete="off"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                apiKey: event.target.value,
              }))
            }
          />
          <small>
            Stored only in this browser's localStorage for the demo.
          </small>
        </label>
      )}

      <label className="settings-field settings-field--persona">
        <span>Persona</span>
        <textarea
          value={draft.persona}
          rows={5}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              persona: event.target.value,
            }))
          }
        />
        <small>This text is appended to the support system prompt.</small>
      </label>

      <div className="settings-actions">
        <button type="button" className="settings-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="settings-save"
          disabled={!hasRequiredSettings(draft)}
          onClick={() =>
            onSave({
              ...draft,
              model: draft.model.trim(),
              apiKey: draft.apiKey.trim(),
              endpoint: draft.endpoint.trim(),
              persona: draft.persona.trim() || DEFAULT_PERSONA,
            })
          }
        >
          Save settings
        </button>
      </div>
    </div>
  );
}

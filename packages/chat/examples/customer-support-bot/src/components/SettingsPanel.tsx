import { useMemo, useState } from 'react';
import { ChatServiceFactory, type ChatProviderName } from '@aituber-onair/chat';
import {
  getInitialLanguage,
  isLanguage,
  type Language,
  SETTINGS_STORAGE_KEY,
  translations,
} from '../i18n';

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
  openrouter: 'sk-or-…',
  gemini: 'AI…',
  claude: 'sk-ant-…',
  xai: 'xai-…',
  deepseek: 'sk-…',
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

const formatProviderLabel = (
  provider: ChatProviderName,
  language: Language,
): string => {
  if (provider === 'gemini-nano' && language === 'ja') {
    return 'Gemini Nano（ブラウザAI）';
  }

  return (
    PROVIDER_LABELS[provider] ??
    provider
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
};

export interface SupportSettings {
  provider: ChatProviderName;
  model: string;
  apiKey: string;
  endpoint: string;
  persona: string;
  language: Language;
}

export const DEFAULT_PERSONA =
  'You are Onair-chan, a cheerful and concise support guide. Be warm, practical, and easy to understand.';

export const DEFAULT_SETTINGS: SupportSettings = {
  provider: 'openai',
  model: DEFAULT_OPENAI_MODEL,
  apiKey: '',
  endpoint: DEFAULT_OPENAI_COMPATIBLE_ENDPOINT,
  persona: DEFAULT_PERSONA,
  language: getInitialLanguage(),
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
    const model =
      typeof parsed.model === 'string'
        ? normalizeModel(provider, parsed.model)
        : provider === DEFAULT_SETTINGS.provider
          ? DEFAULT_SETTINGS.model
          : getDefaultModel(provider);

    return {
      provider,
      model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      endpoint:
        typeof parsed.endpoint === 'string' && parsed.endpoint.trim()
          ? parsed.endpoint
          : DEFAULT_SETTINGS.endpoint,
      persona:
        typeof parsed.persona === 'string' && parsed.persona.trim()
          ? parsed.persona
          : DEFAULT_PERSONA,
      language: isLanguage(parsed.language)
        ? parsed.language
        : getInitialLanguage(),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsPanelProps {
  settings: SupportSettings;
  language: Language;
  onSave: (settings: SupportSettings) => void;
  onCancel: () => void;
}

export default function SettingsPanel({
  settings,
  language,
  onSave,
  onCancel,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const modelOptions = useMemo(
    () => getModels(draft.provider),
    [draft.provider],
  );
  const requiresApiKey = providerRequiresApiKey(draft.provider);
  const t = translations[language];

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
          <span>{t.settings.configuration}</span>
          <h2>{t.settings.title}</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label={t.settings.close}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <label className="settings-field">
        <span>{t.settings.provider}</span>
        <select
          value={draft.provider}
          onChange={(event) =>
            handleProviderChange(event.target.value as ChatProviderName)
          }
        >
          {AVAILABLE_BROWSER_PROVIDERS.map((provider) => (
            <option value={provider} key={provider}>
              {formatProviderLabel(provider, language)}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-field" htmlFor="support-model">
        <span>{t.settings.model}</span>
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
            placeholder={t.settings.modelPlaceholder}
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
            ? t.settings.modelsLoaded
            : t.settings.modelHelp}
        </small>
      </label>

      {draft.provider === 'openai-compatible' && (
        <label className="settings-field">
          <span>{t.settings.endpoint}</span>
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
          <small>{t.settings.endpointHelp}</small>
        </label>
      )}

      {draft.provider === 'gemini-nano' ? (
        <div className="settings-provider-note">
          {t.settings.geminiNanoHelp}
        </div>
      ) : (
        <label className="settings-field">
          <span>
            {t.settings.apiKey}
            {requiresApiKey ? '' : ` (${t.settings.optional})`}
          </span>
          <input
            type="password"
            value={draft.apiKey}
            placeholder={
              API_KEY_PLACEHOLDERS[draft.provider] ??
              (draft.provider === 'openai-compatible'
                ? t.settings.optionalBearerToken
                : t.settings.apiKeyPlaceholder)
            }
            autoComplete="off"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                apiKey: event.target.value,
              }))
            }
          />
          <small>{t.settings.storageHelp}</small>
        </label>
      )}

      <label className="settings-field settings-field--persona">
        <span>{t.settings.persona}</span>
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
        <small>{t.settings.personaHelp}</small>
      </label>

      <div className="settings-actions">
        <button type="button" className="settings-cancel" onClick={onCancel}>
          {t.settings.cancel}
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
          {t.settings.save}
        </button>
      </div>
    </div>
  );
}

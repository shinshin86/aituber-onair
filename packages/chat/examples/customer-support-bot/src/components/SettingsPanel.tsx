import { useMemo, useState } from 'react';
import {
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_6_OPUS,
  MODEL_CLAUDE_4_6_SONNET,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_5_SONNET,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_FLASH_PREVIEW,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMMA_4_31B_IT,
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GPT_5_5,
  MODEL_GPT_5_6,
  MODEL_GPT_5_6_LUNA,
  MODEL_GPT_5_6_SOL,
  MODEL_GPT_5_6_TERRA,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5_NANO,
} from '@aituber-onair/chat';

export type BrowserProvider = 'openai' | 'claude' | 'gemini';

interface ModelOption {
  id: string;
  label: string;
}

interface ProviderOption {
  label: string;
  keyPlaceholder: string;
  defaultModel: string;
  models: ModelOption[];
}

export interface SupportSettings {
  provider: BrowserProvider;
  model: string;
  apiKey: string;
  persona: string;
}

export const SETTINGS_STORAGE_KEY =
  'aituber-onair.chat.customer-support-bot.settings';

export const DEFAULT_PERSONA =
  'You are Onair-chan, a cheerful and concise support guide. Be warm, practical, and easy to understand.';

export const PROVIDERS: Record<BrowserProvider, ProviderOption> = {
  openai: {
    label: 'OpenAI',
    keyPlaceholder: 'sk-…',
    defaultModel: MODEL_GPT_5_6_TERRA,
    models: [
      { id: MODEL_GPT_5_6, label: 'GPT-5.6 (Sol alias)' },
      { id: MODEL_GPT_5_6_SOL, label: 'GPT-5.6 Sol' },
      { id: MODEL_GPT_5_6_TERRA, label: 'GPT-5.6 Terra' },
      { id: MODEL_GPT_5_6_LUNA, label: 'GPT-5.6 Luna' },
      { id: MODEL_GPT_5_5, label: 'GPT-5.5' },
      { id: MODEL_GPT_5_4_PRO, label: 'GPT-5.4 Pro' },
      { id: MODEL_GPT_5_4, label: 'GPT-5.4' },
      { id: MODEL_GPT_5_4_MINI, label: 'GPT-5.4 Mini' },
      { id: MODEL_GPT_5_4_NANO, label: 'GPT-5.4 Nano' },
      { id: MODEL_GPT_5_1, label: 'GPT-5.1' },
      { id: MODEL_GPT_5, label: 'GPT-5' },
      { id: MODEL_GPT_5_MINI, label: 'GPT-5 Mini' },
      { id: MODEL_GPT_5_NANO, label: 'GPT-5 Nano' },
      { id: MODEL_GPT_4_1, label: 'GPT-4.1' },
      { id: MODEL_GPT_4_1_MINI, label: 'GPT-4.1 Mini' },
      { id: MODEL_GPT_4_1_NANO, label: 'GPT-4.1 Nano' },
      { id: MODEL_GPT_4O, label: 'GPT-4o' },
      { id: MODEL_GPT_4O_MINI, label: 'GPT-4o Mini' },
    ],
  },
  claude: {
    label: 'Claude',
    keyPlaceholder: 'sk-ant-…',
    defaultModel: MODEL_CLAUDE_4_5_HAIKU,
    models: [
      { id: MODEL_CLAUDE_5_SONNET, label: 'Claude Sonnet 5' },
      { id: MODEL_CLAUDE_4_8_OPUS, label: 'Claude Opus 4.8' },
      { id: MODEL_CLAUDE_4_7_OPUS, label: 'Claude Opus 4.7' },
      { id: MODEL_CLAUDE_4_6_OPUS, label: 'Claude Opus 4.6' },
      { id: MODEL_CLAUDE_4_6_SONNET, label: 'Claude Sonnet 4.6' },
      { id: MODEL_CLAUDE_4_5_OPUS, label: 'Claude Opus 4.5' },
      { id: MODEL_CLAUDE_4_5_SONNET, label: 'Claude Sonnet 4.5' },
      { id: MODEL_CLAUDE_4_5_HAIKU, label: 'Claude Haiku 4.5' },
      { id: MODEL_CLAUDE_3_HAIKU, label: 'Claude 3 Haiku' },
    ],
  },
  gemini: {
    label: 'Gemini',
    keyPlaceholder: 'AI…',
    defaultModel: MODEL_GEMINI_3_1_FLASH_LITE,
    models: [
      { id: MODEL_GEMINI_3_5_FLASH, label: 'Gemini 3.5 Flash' },
      {
        id: MODEL_GEMINI_3_1_FLASH_LITE,
        label: 'Gemini 3.1 Flash-Lite',
      },
      {
        id: MODEL_GEMINI_3_1_PRO_PREVIEW,
        label: 'Gemini 3.1 Pro Preview',
      },
      { id: MODEL_GEMINI_3_FLASH_PREVIEW, label: 'Gemini 3 Flash Preview' },
      { id: MODEL_GEMINI_2_5_PRO, label: 'Gemini 2.5 Pro' },
      { id: MODEL_GEMINI_2_5_FLASH, label: 'Gemini 2.5 Flash' },
      {
        id: MODEL_GEMINI_2_5_FLASH_LITE,
        label: 'Gemini 2.5 Flash Lite',
      },
      { id: MODEL_GEMMA_4_31B_IT, label: 'Gemma 4 31B IT' },
      { id: MODEL_GEMMA_4_26B_A4B_IT, label: 'Gemma 4 26B A4B IT' },
    ],
  },
};

export const DEFAULT_SETTINGS: SupportSettings = {
  provider: 'openai',
  model: MODEL_GPT_5_6_TERRA,
  apiKey: '',
  persona: DEFAULT_PERSONA,
};

export function loadSettings(): SupportSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored) as Partial<SupportSettings>;
    const provider =
      parsed.provider && parsed.provider in PROVIDERS
        ? parsed.provider
        : DEFAULT_SETTINGS.provider;
    const providerConfig = PROVIDERS[provider];
    const model = providerConfig.models.some(({ id }) => id === parsed.model)
      ? (parsed.model as string)
      : providerConfig.defaultModel;

    return {
      provider,
      model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
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
  const providerConfig = PROVIDERS[draft.provider];
  const modelOptions = useMemo(
    () => providerConfig.models,
    [providerConfig.models],
  );

  const handleProviderChange = (provider: BrowserProvider) => {
    setDraft((current) => ({
      ...current,
      provider,
      model: PROVIDERS[provider].defaultModel,
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
            handleProviderChange(event.target.value as BrowserProvider)
          }
        >
          {(Object.keys(PROVIDERS) as BrowserProvider[]).map((provider) => (
            <option value={provider} key={provider}>
              {PROVIDERS[provider].label}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-field">
        <span>Model</span>
        <select
          value={draft.model}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              model: event.target.value,
            }))
          }
        >
          {modelOptions.map((model) => (
            <option value={model.id} key={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>

      <label className="settings-field">
        <span>API key</span>
        <input
          type="password"
          value={draft.apiKey}
          placeholder={providerConfig.keyPlaceholder}
          autoComplete="off"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              apiKey: event.target.value,
            }))
          }
        />
        <small>Stored only in this browser's localStorage for the demo.</small>
      </label>

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
          onClick={() =>
            onSave({
              ...draft,
              apiKey: draft.apiKey.trim(),
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

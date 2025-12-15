import { Provider } from '../App';
import {
  type ChatResponseLength,
  type GPT5PresetKey,
  isGPT5Model,
  // OpenAI models
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O3_MINI,
  MODEL_O1_MINI,
  MODEL_O1,
  MODEL_GPT_4_5_PREVIEW,
  // Claude models
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_3_5_HAIKU,
  MODEL_CLAUDE_3_5_SONNET,
  MODEL_CLAUDE_3_7_SONNET,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_5_HAIKU,
  // Gemini models
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  // OpenRouter models
  MODEL_GPT_OSS_20B_FREE,
} from '@aituber-onair/chat';

interface ProviderSelectorProps {
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  responseLength: ChatResponseLength;
  onResponseLengthChange: (length: ChatResponseLength) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  gpt5Preset?: GPT5PresetKey;
  onGpt5PresetChange?: (preset: GPT5PresetKey | undefined) => void;
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  onReasoningEffortChange?: (
    effort: 'none' | 'minimal' | 'low' | 'medium' | 'high',
  ) => void;
  verbosity?: 'low' | 'medium' | 'high';
  onVerbosityChange?: (verbosity: 'low' | 'medium' | 'high') => void;
  gpt5EndpointPreference?: 'chat' | 'responses' | 'auto';
  onGpt5EndpointPreferenceChange?: (
    preference: 'chat' | 'responses' | 'auto',
  ) => void;
  enableReasoningSummary?: boolean;
  onEnableReasoningSummaryChange?: (enabled: boolean) => void;
  disabled: boolean;
}

const providerInfo = {
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    color: '#10a37f',
  },
  claude: {
    name: 'Claude',
    placeholder: 'sk-ant-...',
    color: '#d97757',
  },
  gemini: {
    name: 'Gemini',
    placeholder: 'AI...',
    color: '#4285f4',
  },
  openrouter: {
    name: 'OpenRouter',
    placeholder: 'sk-or-...',
    color: '#8b5cf6',
  },
};

export const allModels = [
  // OpenAI models
  {
    id: MODEL_GPT_5_NANO,
    name: 'GPT-5 Nano',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_MINI,
    name: 'GPT-5 Mini',
    provider: 'openai',
    default: false,
  },
  { id: MODEL_GPT_5, name: 'GPT-5', provider: 'openai', default: false },
  {
    id: MODEL_GPT_5_1,
    name: 'GPT-5.1',
    provider: 'openai',
    default: true,
  },
  { id: MODEL_GPT_4_1, name: 'GPT-4.1', provider: 'openai', default: false },
  {
    id: MODEL_GPT_4_1_MINI,
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_4_1_NANO,
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_4O_MINI,
    name: 'GPT-4o Mini',
    provider: 'openai',
    default: false,
  },
  { id: MODEL_GPT_4O, name: 'GPT-4o', provider: 'openai', default: false },
  { id: MODEL_O3_MINI, name: 'O3 Mini', provider: 'openai', default: false },
  { id: MODEL_O1_MINI, name: 'O1 Mini', provider: 'openai', default: false },
  { id: MODEL_O1, name: 'O1', provider: 'openai', default: false },
  {
    id: MODEL_GPT_4_5_PREVIEW,
    name: 'GPT-4.5 Preview',
    provider: 'openai',
    default: false,
  },

  // Claude models
  {
    id: MODEL_CLAUDE_3_HAIKU,
    name: 'Claude 3 Haiku',
    provider: 'claude',
    default: true,
  },
  {
    id: MODEL_CLAUDE_3_5_HAIKU,
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_3_5_SONNET,
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_3_7_SONNET,
    name: 'Claude 3.7 Sonnet',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_SONNET,
    name: 'Claude 4 Sonnet',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_OPUS,
    name: 'Claude 4 Opus',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_5_SONNET,
    name: 'Claude 4.5 Sonnet',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_5_HAIKU,
    name: 'Claude 4.5 Haiku',
    provider: 'claude',
    default: false,
  },

  // Gemini models
  {
    id: MODEL_GEMINI_2_5_PRO,
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_2_5_FLASH,
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_2_5_FLASH_LITE,
    name: 'Gemini 2.5 Flash Lite',
    provider: 'gemini',
    default: true,
  },
  {
    id: MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
    name: 'Gemini 2.5 Flash Lite Preview',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_2_0_FLASH,
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_2_0_FLASH_LITE,
    name: 'Gemini 2.0 Flash Lite',
    provider: 'gemini',
    default: false,
  },

  // OpenRouter models
  {
    id: MODEL_GPT_OSS_20B_FREE,
    name: 'GPT OSS 20B (Free)',
    provider: 'openrouter',
    default: true,
  },
];

export const getProviderForModel = (modelId: string): Provider => {
  const model = allModels.find((m) => m.id === modelId);
  return (model?.provider as Provider) || 'openai';
};

export const getDefaultModelForProvider = (provider: Provider): string => {
  const defaultModel = allModels.find(
    (m) => m.provider === provider && m.default,
  );
  const fallbackModel = allModels.find((m) => m.provider === provider);
  return defaultModel?.id || fallbackModel?.id || MODEL_GPT_4O_MINI;
};

export default function ProviderSelector({
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  responseLength,
  onResponseLengthChange,
  selectedModel,
  onModelChange,
  gpt5Preset,
  onGpt5PresetChange,
  reasoning_effort,
  onReasoningEffortChange,
  verbosity,
  onVerbosityChange,
  gpt5EndpointPreference,
  onGpt5EndpointPreferenceChange,
  enableReasoningSummary,
  onEnableReasoningSummaryChange,
  disabled,
}: ProviderSelectorProps) {
  const info = providerInfo[provider];
  const isGPT5 = provider === 'openai' && isGPT5Model(selectedModel);
  const isGPT51 = provider === 'openai' && selectedModel === MODEL_GPT_5_1;
  const effectiveReasoningEffort = (() => {
    if (isGPT51) {
      if (!reasoning_effort || reasoning_effort === 'minimal') {
        return 'none';
      }
      return reasoning_effort;
    }
    if (reasoning_effort === 'none' || !reasoning_effort) {
      return 'medium';
    }
    return reasoning_effort;
  })();

  return (
    <div className="provider-selector">
      <div className="provider-tabs">
        {Object.entries(providerInfo).map(([key, value]) => (
          <button
            type="button"
            key={key}
            className={`provider-tab ${provider === key ? 'active' : ''}`}
            onClick={() => onProviderChange(key as Provider)}
            disabled={disabled}
            style={{
              borderColor: provider === key ? value.color : 'transparent',
              color: provider === key ? value.color : undefined,
            }}
          >
            {value.name}
          </button>
        ))}
      </div>

      <div className="provider-config">
        <div className="config-group">
          <label htmlFor="api-key">API Key</label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={info.placeholder}
            disabled={disabled}
            className="api-key-input"
          />
        </div>

        <div className="config-group">
          <label htmlFor="response-length">Response Length</label>
          <select
            id="response-length"
            value={responseLength}
            onChange={(e) =>
              onResponseLengthChange(e.target.value as ChatResponseLength)
            }
            disabled={disabled}
            className="response-length-select"
          >
            <option value="veryShort">Very Short (~40 tokens)</option>
            <option value="short">Short (~100 tokens)</option>
            <option value="medium">Medium (~200 tokens)</option>
            <option value="long">Long (~300 tokens)</option>
            <option value="veryLong">Very Long (~1000 tokens)</option>
            <option value="deep">Deep (~5000 tokens)</option>
          </select>
        </div>

        <div className="config-group">
          <label htmlFor="model-select">Model</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={disabled}
            className="model-select"
          >
            {allModels
              .filter((model) => model.provider === provider)
              .map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
          </select>
        </div>

        {/* GPT-5 specific settings */}
        {isGPT5 && (
          <>
            <div className="config-group">
              <label htmlFor="gpt5-endpoint">GPT-5 API Endpoint</label>
              <select
                id="gpt5-endpoint"
                value={gpt5EndpointPreference || 'chat'}
                onChange={(e) =>
                  onGpt5EndpointPreferenceChange?.(
                    e.target.value as 'chat' | 'responses' | 'auto',
                  )
                }
                disabled={disabled}
                className="gpt5-endpoint-select"
              >
                <option value="chat">Chat Completions (Standard API)</option>
                <option value="responses">
                  Responses API (Advanced with reasoning visibility)
                </option>
                <option value="auto">Auto (Based on Settings)</option>
              </select>
            </div>

            {gpt5EndpointPreference === 'responses' && (
              <div className="config-group">
                <label htmlFor="reasoning-summary">
                  <input
                    id="reasoning-summary"
                    type="checkbox"
                    checked={enableReasoningSummary || false}
                    onChange={(e) =>
                      onEnableReasoningSummaryChange?.(e.target.checked)
                    }
                    disabled={disabled}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Enable Reasoning Summary (Requires Org Verification)
                </label>
              </div>
            )}

            <div className="config-group">
              <label htmlFor="gpt5-preset">GPT-5 Preset (Optional)</label>
              <select
                id="gpt5-preset"
                value={gpt5Preset || ''}
                onChange={(e) =>
                  onGpt5PresetChange?.(
                    e.target.value
                      ? (e.target.value as GPT5PresetKey)
                      : undefined,
                  )
                }
                disabled={disabled}
                className="gpt5-preset-select"
              >
                <option value="">Custom Settings</option>
                <option value="casual">Casual (fast, minimal reasoning)</option>
                <option value="balanced">Balanced (medium reasoning)</option>
                <option value="expert">Expert (deep reasoning)</option>
              </select>
            </div>

            {!gpt5Preset && (
              <>
                <div className="config-group">
                  <label htmlFor="reasoning-effort">Reasoning Effort</label>
                  <select
                    id="reasoning-effort"
                    value={effectiveReasoningEffort}
                    onChange={(e) =>
                      onReasoningEffortChange?.(
                        e.target.value as
                          | 'none'
                          | 'minimal'
                          | 'low'
                          | 'medium'
                          | 'high',
                      )
                    }
                    disabled={disabled}
                    className="reasoning-effort-select"
                  >
                    {isGPT51 ? (
                      <option value="none">None (fastest)</option>
                    ) : (
                      <option value="minimal">Minimal (GPT-4 like)</option>
                    )}
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="config-group">
                  <label htmlFor="verbosity">Verbosity</label>
                  <select
                    id="verbosity"
                    value={verbosity || 'medium'}
                    onChange={(e) =>
                      onVerbosityChange?.(
                        e.target.value as 'low' | 'medium' | 'high',
                      )
                    }
                    disabled={disabled}
                    className="verbosity-select"
                  >
                    <option value="low">Low (concise)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (detailed)</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .provider-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .provider-tabs {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .provider-tab {
          padding: 0.5rem 1.5rem;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .provider-tab:hover:not(:disabled) {
          background: #f5f5f5;
        }

        .provider-tab.active {
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .provider-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .provider-config {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
          justify-content: center;
        }

        .config-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: left;
        }

        .config-group label {
          font-size: 0.85rem;
          color: #666;
          font-weight: 600;
        }

        .api-key-input {
          padding: 0.5rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95rem;
          width: 300px;
          font-family: monospace;
        }

        .api-key-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .api-key-input:disabled {
          background: #f5f5f5;
        }

        .response-length-select {
          padding: 0.5rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
        }

        .response-length-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .response-length-select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .model-select {
          padding: 0.5rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
          min-width: 180px;
        }

        .model-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .model-select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .gpt5-preset-select,
        .gpt5-endpoint-select,
        .reasoning-effort-select,
        .verbosity-select {
          padding: 0.5rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
          min-width: 180px;
        }

        .gpt5-preset-select:focus,
        .gpt5-endpoint-select:focus,
        .reasoning-effort-select:focus,
        .verbosity-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .gpt5-preset-select:disabled,
        .gpt5-endpoint-select:disabled,
        .reasoning-effort-select:disabled,
        .verbosity-select:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .provider-config {
            flex-direction: column;
            align-items: stretch;
          }

          .api-key-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

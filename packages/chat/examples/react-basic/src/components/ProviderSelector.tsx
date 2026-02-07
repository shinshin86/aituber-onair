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
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_OPUS,
  // Gemini models
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
  MODEL_GEMINI_2_0_FLASH,
  MODEL_GEMINI_2_0_FLASH_LITE,
  // OpenRouter models
  MODEL_GPT_OSS_20B_FREE,
  MODEL_MOONSHOTAI_KIMI_K2_5,
  MODEL_OPENAI_GPT_5_1_CHAT,
  MODEL_OPENAI_GPT_5_1_CODEX,
  MODEL_OPENAI_GPT_5_MINI,
  MODEL_OPENAI_GPT_5_NANO,
  MODEL_OPENAI_GPT_4O,
  MODEL_OPENAI_GPT_4_1_MINI,
  MODEL_OPENAI_GPT_4_1_NANO,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4,
  MODEL_ANTHROPIC_CLAUDE_SONNET_4,
  MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
  MODEL_ANTHROPIC_CLAUDE_3_5_SONNET,
  MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
  MODEL_GOOGLE_GEMINI_2_5_PRO,
  MODEL_GOOGLE_GEMINI_2_5_FLASH,
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
  MODEL_ZAI_GLM_4_7_FLASH,
  MODEL_ZAI_GLM_4_5_AIR,
  MODEL_ZAI_GLM_4_5_AIR_FREE,
  // Z.ai models
  MODEL_GLM_4_7,
  MODEL_GLM_4_7_FLASHX,
  MODEL_GLM_4_7_FLASH,
  MODEL_GLM_4_6,
  MODEL_GLM_4_6V,
  MODEL_GLM_4_6V_FLASHX,
  MODEL_GLM_4_6V_FLASH,
  ZAI_VISION_SUPPORTED_MODELS,
  // Kimi models
  MODEL_KIMI_K2_5,
  KIMI_VISION_SUPPORTED_MODELS,
  VISION_SUPPORTED_MODELS,
  GEMINI_VISION_SUPPORTED_MODELS,
  CLAUDE_VISION_SUPPORTED_MODELS,
  OPENROUTER_VISION_SUPPORTED_MODELS,
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
  openrouterReasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  onOpenrouterReasoningEffortChange?: (
    effort: 'none' | 'minimal' | 'low' | 'medium' | 'high',
  ) => void;
  openrouterIncludeReasoning?: boolean;
  onOpenrouterIncludeReasoningChange?: (enabled: boolean) => void;
  openrouterReasoningMaxTokens?: string;
  onOpenrouterReasoningMaxTokensChange?: (value: string) => void;
  openrouterAppName?: string;
  onOpenrouterAppNameChange?: (value: string) => void;
  openrouterAppUrl?: string;
  onOpenrouterAppUrlChange?: (value: string) => void;
  zaiThinkingType?: 'enabled' | 'disabled';
  onZaiThinkingTypeChange?: (value: 'enabled' | 'disabled') => void;
  zaiClearThinking?: boolean;
  onZaiClearThinkingChange?: (enabled: boolean) => void;
  zaiResponseFormatType?: 'text' | 'json_object' | 'json_schema';
  onZaiResponseFormatTypeChange?: (
    value: 'text' | 'json_object' | 'json_schema',
  ) => void;
  zaiResponseSchema?: string;
  onZaiResponseSchemaChange?: (value: string) => void;
  kimiThinkingType?: 'enabled' | 'disabled';
  onKimiThinkingTypeChange?: (value: 'enabled' | 'disabled') => void;
  kimiBaseUrl?: string;
  onKimiBaseUrlChange?: (value: string) => void;
  disabled: boolean;
}

const providerInfo = {
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
  },
  claude: {
    name: 'Claude',
    placeholder: 'sk-ant-...',
  },
  gemini: {
    name: 'Gemini',
    placeholder: 'AI...',
  },
  openrouter: {
    name: 'OpenRouter',
    placeholder: 'sk-or-...',
  },
  zai: {
    name: 'Z.ai',
    placeholder: 'xxx...',
  },
  kimi: {
    name: 'Kimi',
    placeholder: 'xxx...',
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
  {
    id: MODEL_GPT_5,
    name: 'GPT-5',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_1,
    name: 'GPT-5.1',
    provider: 'openai',
    default: true,
  },
  {
    id: MODEL_GPT_4_1,
    name: 'GPT-4.1',
    provider: 'openai',
    default: false,
  },
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
  {
    id: MODEL_GPT_4O,
    name: 'GPT-4o',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_O3_MINI,
    name: 'O3 Mini',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_O1_MINI,
    name: 'O1 Mini',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_O1,
    name: 'O1',
    provider: 'openai',
    default: false,
  },
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
    id: MODEL_CLAUDE_4_5_OPUS,
    name: 'Claude 4.5 Opus',
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
  {
    id: MODEL_CLAUDE_4_6_OPUS,
    name: 'Claude Opus 4.6',
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
  {
    id: MODEL_OPENAI_GPT_5_1_CHAT,
    name: 'GPT-5.1 Chat (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_5_1_CODEX,
    name: 'GPT-5.1 Codex (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_5_MINI,
    name: 'GPT-5 Mini (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_5_NANO,
    name: 'GPT-5 Nano (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_4O,
    name: 'GPT-4o (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_4_1_MINI,
    name: 'GPT-4.1 Mini (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_4_1_NANO,
    name: 'GPT-4.1 Nano (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ANTHROPIC_CLAUDE_OPUS_4,
    name: 'Claude 4 Opus (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ANTHROPIC_CLAUDE_SONNET_4,
    name: 'Claude 4 Sonnet (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
    name: 'Claude 3.7 Sonnet (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ANTHROPIC_CLAUDE_3_5_SONNET,
    name: 'Claude 3.5 Sonnet (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
    name: 'Claude 4.5 Haiku (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_GOOGLE_GEMINI_2_5_PRO,
    name: 'Gemini 2.5 Pro (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_GOOGLE_GEMINI_2_5_FLASH,
    name: 'Gemini 2.5 Flash (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
    name: 'Gemini 2.5 Flash Lite Preview (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ZAI_GLM_4_7_FLASH,
    name: 'GLM-4.7 Flash (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ZAI_GLM_4_5_AIR,
    name: 'GLM-4.5 Air (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ZAI_GLM_4_5_AIR_FREE,
    name: 'GLM-4.5 Air (Free, OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_MOONSHOTAI_KIMI_K2_5,
    name: 'Kimi K2.5 (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },

  // Z.ai models
  {
    id: MODEL_GLM_4_7,
    name: 'GLM-4.7',
    provider: 'zai',
    default: true,
  },
  {
    id: MODEL_GLM_4_7_FLASHX,
    name: 'GLM-4.7 FlashX',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_4_7_FLASH,
    name: 'GLM-4.7 Flash',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_4_6,
    name: 'GLM-4.6',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_4_6V,
    name: 'GLM-4.6V',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_4_6V_FLASHX,
    name: 'GLM-4.6V FlashX',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_4_6V_FLASH,
    name: 'GLM-4.6V Flash',
    provider: 'zai',
    default: false,
  },

  // Kimi models
  {
    id: MODEL_KIMI_K2_5,
    name: 'Kimi K2.5',
    provider: 'kimi',
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

export const isVisionSupported = (
  provider: Provider,
  modelId: string,
): boolean => {
  switch (provider) {
    case 'openai':
      return VISION_SUPPORTED_MODELS.includes(modelId);
    case 'gemini':
      return GEMINI_VISION_SUPPORTED_MODELS.includes(modelId);
    case 'claude':
      return CLAUDE_VISION_SUPPORTED_MODELS.includes(modelId);
    case 'openrouter':
      return OPENROUTER_VISION_SUPPORTED_MODELS.includes(modelId);
    case 'zai':
      return ZAI_VISION_SUPPORTED_MODELS.includes(modelId);
    case 'kimi':
      return KIMI_VISION_SUPPORTED_MODELS.includes(modelId);
    default:
      return false;
  }
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
  openrouterReasoningEffort,
  onOpenrouterReasoningEffortChange,
  openrouterIncludeReasoning,
  onOpenrouterIncludeReasoningChange,
  openrouterReasoningMaxTokens,
  onOpenrouterReasoningMaxTokensChange,
  openrouterAppName,
  onOpenrouterAppNameChange,
  openrouterAppUrl,
  onOpenrouterAppUrlChange,
  zaiThinkingType,
  onZaiThinkingTypeChange,
  zaiClearThinking,
  onZaiClearThinkingChange,
  zaiResponseFormatType,
  onZaiResponseFormatTypeChange,
  zaiResponseSchema,
  onZaiResponseSchemaChange,
  kimiThinkingType,
  onKimiThinkingTypeChange,
  kimiBaseUrl,
  onKimiBaseUrlChange,
  disabled,
}: ProviderSelectorProps) {
  const info = providerInfo[provider];
  const isGPT5 = provider === 'openai' && isGPT5Model(selectedModel);
  const isGPT51 = provider === 'openai' && selectedModel === MODEL_GPT_5_1;
  const modelsForProvider = allModels.filter(
    (model) => model.provider === provider,
  );
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
      <div className="selector-title">Provider & Model</div>
      <div className="selector-grid">
        <div className="selector-column">
          <div className="column-title">Providers</div>
          <div className="provider-list">
            {Object.entries(providerInfo).map(([key, value]) => (
              <button
                type="button"
                key={key}
                className={`provider-item ${provider === key ? 'active' : ''}`}
                onClick={() => onProviderChange(key as Provider)}
                disabled={disabled}
                aria-pressed={provider === key}
              >
                <span className="provider-name">{value.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="selector-column">
          <div className="column-title">Models</div>
          <div className="model-list">
            {modelsForProvider.map((model) => (
              <button
                type="button"
                key={model.id}
                className={`model-item ${
                  selectedModel === model.id ? 'active' : ''
                }`}
                onClick={() => onModelChange(model.id)}
                disabled={disabled}
                aria-pressed={selectedModel === model.id}
              >
                <div className="model-name">{model.name}</div>
                <div className="model-meta">
                  {model.default ? 'Default' : ' '}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <details className="settings-panel" open>
        <summary>
          Model settings
          <span className="summary-action" aria-hidden="true" />
        </summary>
        <div className="settings-grid">
          <div className="config-group">
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={info.placeholder}
              disabled={disabled}
              className="text-input"
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
              className="select-input"
            >
              <option value="veryShort">Very Short (~40 tokens)</option>
              <option value="short">Short (~100 tokens)</option>
              <option value="medium">Medium (~200 tokens)</option>
              <option value="long">Long (~300 tokens)</option>
              <option value="veryLong">Very Long (~1000 tokens)</option>
              <option value="deep">Deep (~5000 tokens)</option>
            </select>
          </div>

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
                  className="select-input"
                >
                  <option value="chat">Chat Completions (Standard API)</option>
                  <option value="responses">
                    Responses API (Advanced with reasoning visibility)
                  </option>
                  <option value="auto">Auto (Based on Settings)</option>
                </select>
              </div>

              <div className="config-group">
                <label htmlFor="reasoning-summary" className="checkbox-label">
                  <input
                    id="reasoning-summary"
                    type="checkbox"
                    checked={enableReasoningSummary || false}
                    onChange={(e) =>
                      onEnableReasoningSummaryChange?.(e.target.checked)
                    }
                    disabled={
                      disabled || gpt5EndpointPreference !== 'responses'
                    }
                  />
                  Enable Reasoning Summary
                </label>
                <span className="helper-text">
                  Available with GPT-5 Responses API
                </span>
              </div>

              <div className="config-group">
                <label htmlFor="gpt5-preset">GPT-5 Preset</label>
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
                  className="select-input"
                >
                  <option value="">Custom Settings</option>
                  <option value="casual">
                    Casual (fast, minimal reasoning)
                  </option>
                  <option value="balanced">Balanced (medium reasoning)</option>
                  <option value="expert">Expert (deep reasoning)</option>
                </select>
              </div>

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
                  disabled={disabled || Boolean(gpt5Preset)}
                  className="select-input"
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
                  disabled={disabled || Boolean(gpt5Preset)}
                  className="select-input"
                >
                  <option value="low">Low (concise)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (detailed)</option>
                </select>
              </div>
            </>
          )}

          {provider === 'openrouter' && (
            <>
              <div className="config-group">
                <label htmlFor="openrouter-reasoning-effort">
                  Reasoning Effort
                </label>
                <select
                  id="openrouter-reasoning-effort"
                  value={openrouterReasoningEffort || 'none'}
                  onChange={(e) =>
                    onOpenrouterReasoningEffortChange?.(
                      e.target.value as
                        | 'none'
                        | 'minimal'
                        | 'low'
                        | 'medium'
                        | 'high',
                    )
                  }
                  disabled={disabled}
                  className="select-input"
                >
                  <option value="none">None</option>
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="config-group">
                <label
                  htmlFor="openrouter-include-reasoning"
                  className="checkbox-label"
                >
                  <input
                    id="openrouter-include-reasoning"
                    type="checkbox"
                    checked={openrouterIncludeReasoning || false}
                    onChange={(e) =>
                      onOpenrouterIncludeReasoningChange?.(e.target.checked)
                    }
                    disabled={disabled}
                  />
                  Include Reasoning
                </label>
                <span className="helper-text">
                  Excluding reasoning avoids empty responses
                </span>
              </div>

              <div className="config-group">
                <label htmlFor="openrouter-reasoning-max-tokens">
                  Reasoning Max Tokens
                </label>
                <input
                  id="openrouter-reasoning-max-tokens"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={openrouterReasoningMaxTokens || ''}
                  onChange={(e) =>
                    onOpenrouterReasoningMaxTokensChange?.(e.target.value)
                  }
                  disabled={disabled}
                  className="text-input"
                  placeholder="Auto"
                />
              </div>

              <div className="config-group">
                <label htmlFor="openrouter-app-name">App Name</label>
                <input
                  id="openrouter-app-name"
                  type="text"
                  value={openrouterAppName || ''}
                  onChange={(e) => onOpenrouterAppNameChange?.(e.target.value)}
                  disabled={disabled}
                  className="text-input"
                  placeholder="Optional"
                />
              </div>

              <div className="config-group">
                <label htmlFor="openrouter-app-url">App URL</label>
                <input
                  id="openrouter-app-url"
                  type="url"
                  value={openrouterAppUrl || ''}
                  onChange={(e) => onOpenrouterAppUrlChange?.(e.target.value)}
                  disabled={disabled}
                  className="text-input"
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}

          {provider === 'zai' && (
            <>
              <div className="config-group">
                <label htmlFor="zai-thinking-type">Thinking</label>
                <select
                  id="zai-thinking-type"
                  value={zaiThinkingType || 'disabled'}
                  onChange={(e) =>
                    onZaiThinkingTypeChange?.(
                      e.target.value as 'enabled' | 'disabled',
                    )
                  }
                  disabled={disabled}
                  className="select-input"
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </select>
              </div>

              <div className="config-group">
                <label htmlFor="zai-clear-thinking" className="checkbox-label">
                  <input
                    id="zai-clear-thinking"
                    type="checkbox"
                    checked={zaiClearThinking || false}
                    onChange={(e) =>
                      onZaiClearThinkingChange?.(e.target.checked)
                    }
                    disabled={disabled || zaiThinkingType !== 'enabled'}
                  />
                  Clear Thinking
                </label>
                <span className="helper-text">
                  Removes extra thinking output from responses
                </span>
              </div>

              <div className="config-group">
                <label htmlFor="zai-response-format">Response Format</label>
                <select
                  id="zai-response-format"
                  value={zaiResponseFormatType || 'text'}
                  onChange={(e) =>
                    onZaiResponseFormatTypeChange?.(
                      e.target.value as 'text' | 'json_object' | 'json_schema',
                    )
                  }
                  disabled={disabled}
                  className="select-input"
                >
                  <option value="text">Text</option>
                  <option value="json_object">JSON Object</option>
                  <option value="json_schema">JSON Schema</option>
                </select>
              </div>

              {zaiResponseFormatType === 'json_schema' && (
                <div className="config-group config-full">
                  <label htmlFor="zai-response-schema">JSON Schema</label>
                  <textarea
                    id="zai-response-schema"
                    value={zaiResponseSchema || ''}
                    onChange={(e) =>
                      onZaiResponseSchemaChange?.(e.target.value)
                    }
                    disabled={disabled}
                    className="text-area"
                    rows={5}
                    placeholder='{"type":"object","properties":{}}'
                  />
                </div>
              )}
            </>
          )}

          {provider === 'kimi' && (
            <>
              <div className="config-group">
                <label htmlFor="kimi-thinking-type">Thinking</label>
                <select
                  id="kimi-thinking-type"
                  value={kimiThinkingType || 'enabled'}
                  onChange={(e) =>
                    onKimiThinkingTypeChange?.(
                      e.target.value as 'enabled' | 'disabled',
                    )
                  }
                  disabled={disabled}
                  className="select-input"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div className="config-group config-full">
                <label htmlFor="kimi-base-url">Base URL</label>
                <input
                  id="kimi-base-url"
                  type="url"
                  value={kimiBaseUrl || ''}
                  onChange={(e) => onKimiBaseUrlChange?.(e.target.value)}
                  disabled={disabled}
                  className="text-input"
                  placeholder="https://api.moonshot.ai/v1"
                />
                <span className="helper-text">
                  Default: https://api.moonshot.ai/v1 (self-hosted:
                  http://localhost:8000/v1)
                </span>
              </div>
            </>
          )}
        </div>
      </details>

      <style>{`
        .provider-selector {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .selector-title {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
        }

        .selector-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .selector-column {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .column-title {
          font-size: 0.85rem;
          color: var(--muted);
        }

        .provider-list,
        .model-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 320px;
          overflow: auto;
          padding-right: 0.25rem;
        }

        .provider-list::-webkit-scrollbar,
        .model-list::-webkit-scrollbar {
          width: 6px;
        }

        .provider-list::-webkit-scrollbar-thumb,
        .model-list::-webkit-scrollbar-thumb {
          background: #bdbdbd;
          border-radius: 999px;
        }

        .provider-item,
        .model-item {
          text-align: left;
          border-radius: 14px;
          border: 1px solid var(--border);
          padding: 0.75rem 0.9rem;
          background: var(--panel);
          transition: border-color 0.2s ease, background-color 0.2s ease,
            transform 0.2s ease;
        }

        .provider-item:hover:not(:disabled),
        .model-item:hover:not(:disabled) {
          background: #f1f1f1;
          transform: translateY(-1px);
        }

        .provider-item.active,
        .model-item.active {
          border-color: #0f0f0f;
          background: #0f0f0f;
          color: white;
        }

        .provider-item:disabled,
        .model-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .model-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .model-name {
          font-weight: 600;
        }

        .model-meta {
          font-size: 0.75rem;
          color: var(--muted);
        }

        .provider-item.active .model-meta,
        .model-item.active .model-meta {
          color: rgba(255, 255, 255, 0.7);
        }

        .settings-panel {
          border-top: 1px solid var(--border);
          padding-top: 1rem;
        }

        .settings-panel summary {
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          list-style: none;
        }

        .settings-panel summary::-webkit-details-marker {
          display: none;
        }

        .summary-meta {
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 500;
        }

        .summary-action {
          color: var(--muted);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.2rem 0.6rem;
          background: #fafafa;
        }

        .settings-panel[open] .summary-action::after {
          content: 'Close';
        }

        .settings-panel:not([open]) .summary-action::after {
          content: 'Open';
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .config-full {
          grid-column: 1 / -1;
        }

        .config-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          text-align: left;
        }

        .config-group label {
          font-size: 0.8rem;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .text-input,
        .select-input {
          padding: 0.6rem 0.8rem;
          border: 1px solid var(--input-border);
          border-radius: 10px;
          font-size: 0.9rem;
          background: var(--input-bg);
          color: var(--text);
        }

        .text-area {
          padding: 0.6rem 0.8rem;
          border: 1px solid var(--input-border);
          border-radius: 10px;
          font-size: 0.85rem;
          font-family: 'JetBrains Mono', monospace;
          background: var(--input-bg);
          color: var(--text);
          resize: vertical;
        }

        .text-input:focus,
        .select-input:focus,
        .text-area:focus {
          border-color: var(--input-focus);
          background: #fff;
        }

        .text-input:disabled,
        .select-input:disabled,
        .text-area:disabled {
          background: #f1f1f1;
          color: #9a9a9a;
          cursor: not-allowed;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text);
        }

        .checkbox-label input {
          width: 16px;
          height: 16px;
        }

        .helper-text {
          font-size: 0.75rem;
          color: var(--muted);
        }

        @media (max-width: 900px) {
          .selector-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

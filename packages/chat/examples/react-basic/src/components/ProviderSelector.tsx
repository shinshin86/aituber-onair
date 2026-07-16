import { useCallback, useEffect, useMemo, useState } from 'react';
import { Provider } from '../App';
import {
  ChatServiceFactory,
  type ChatResponseLength,
  type GPT5PresetKey,
  type VisionSupportLevel,
  allowsReasoningLow,
  allowsReasoningMax,
  allowsReasoningMinimal,
  allowsReasoningNone,
  allowsReasoningXHigh,
  getDefaultReasoningEffortForGPT5Model,
  getDefaultXaiReasoningEffort,
  isGPT5Model,
  isXaiReasoningEffortModel,
  isXaiReasoningEffortNoneModel,
  isResponsesOnlyGPT5Model,
  isOpenRouterFreeModel,
  refreshOpenRouterFreeModels,
  // OpenAI models
  MODEL_GPT_5_NANO,
  MODEL_GPT_5_MINI,
  MODEL_GPT_5,
  MODEL_GPT_5_1,
  MODEL_GPT_5_4,
  MODEL_GPT_5_5,
  MODEL_GPT_5_6,
  MODEL_GPT_5_6_SOL,
  MODEL_GPT_5_6_TERRA,
  MODEL_GPT_5_6_LUNA,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GPT_4_1,
  MODEL_GPT_4_1_MINI,
  MODEL_GPT_4_1_NANO,
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O3_MINI,
  MODEL_O1_MINI,
  MODEL_O1,
  // Claude models
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_5_SONNET,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_5_OPUS,
  MODEL_CLAUDE_4_6_SONNET,
  MODEL_CLAUDE_4_6_OPUS,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_5_SONNET,
  MODEL_CLAUDE_3_HAIKU,
  // Gemini models
  MODEL_GEMMA_4_31B_IT,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_1_PRO_PREVIEW,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GEMINI_3_PRO_PREVIEW,
  MODEL_GEMINI_3_FLASH_PREVIEW,
  MODEL_GEMINI_2_5_PRO,
  MODEL_GEMINI_2_5_FLASH,
  MODEL_GEMINI_2_5_FLASH_LITE,
  MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
  // OpenRouter models
  MODEL_GPT_OSS_20B_FREE,
  MODEL_MOONSHOTAI_KIMI_K2_5,
  MODEL_MOONSHOTAI_KIMI_LATEST,
  MODEL_OPENROUTER_AUTO,
  MODEL_OPENROUTER_FUSION,
  MODEL_OPENAI_GPT_LATEST,
  MODEL_OPENAI_GPT_MINI_LATEST,
  MODEL_OPENAI_GPT_5_5_PRO,
  MODEL_OPENAI_GPT_5_5,
  MODEL_OPENAI_GPT_5_1_CHAT,
  MODEL_OPENAI_GPT_5_1_CODEX,
  MODEL_OPENAI_GPT_5_MINI,
  MODEL_OPENAI_GPT_5_NANO,
  MODEL_OPENAI_GPT_4O,
  MODEL_OPENAI_GPT_4_1_MINI,
  MODEL_OPENAI_GPT_4_1_NANO,
  MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST,
  MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4,
  MODEL_ANTHROPIC_CLAUDE_SONNET_4,
  MODEL_ANTHROPIC_CLAUDE_3_7_SONNET,
  MODEL_ANTHROPIC_CLAUDE_3_5_SONNET,
  MODEL_ANTHROPIC_CLAUDE_4_5_HAIKU,
  MODEL_GOOGLE_GEMINI_PRO_LATEST,
  MODEL_GOOGLE_GEMINI_FLASH_LATEST,
  MODEL_GOOGLE_GEMINI_2_5_PRO,
  MODEL_GOOGLE_GEMINI_2_5_FLASH,
  MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025,
  MODEL_ZAI_GLM_5_2,
  MODEL_ZAI_GLM_4_7_FLASH,
  MODEL_ZAI_GLM_4_5_AIR,
  MODEL_ZAI_GLM_4_5_AIR_FREE,
  MODEL_MOONSHOTAI_KIMI_K2_7_CODE,
  // Z.ai models
  MODEL_GLM_5_2,
  MODEL_GLM_5_1,
  MODEL_GLM_5,
  MODEL_GLM_5_TURBO,
  MODEL_GLM_5V_TURBO,
  MODEL_GLM_4_7,
  MODEL_GLM_4_7_FLASHX,
  MODEL_GLM_4_7_FLASH,
  MODEL_GLM_4_6,
  MODEL_GLM_4_6V,
  MODEL_GLM_4_6V_FLASHX,
  MODEL_GLM_4_6V_FLASH,
  // xAI models
  MODEL_GROK_4_5,
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_GROK_4_20_NON_REASONING,
  MODEL_GROK_4_1_FAST_REASONING,
  MODEL_GROK_4_1_FAST_NON_REASONING,
  // Kimi models
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_7_CODE,
  MODEL_KIMI_K2_7_CODE_HIGHSPEED,
  MODEL_KIMI_K2_5,
  // DeepSeek models
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_PRO,
  // Mistral models
  MODEL_MINISTRAL_3B_2512,
  MODEL_MINISTRAL_8B_2512,
  MODEL_MINISTRAL_14B_2512,
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_MEDIUM_3_5,
  MODEL_MISTRAL_LARGE_LATEST,
  MODEL_MISTRAL_LARGE_2512,
  MODEL_MISTRAL_SMALL_2603,
  MODEL_MISTRAL_MEDIUM_2508,
  // Sakana models
  MODEL_FUGU,
  MODEL_FUGU_ULTRA,
  MODEL_FUGU_ULTRA_20260615,
  // PLaMo models
  MODEL_PLAMO_3_0_PRIME,
  MODEL_PLAMO_2_2_PRIME,
  // Gemini Nano models
  MODEL_GEMINI_NANO,
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
  reasoning_effort?:
    | 'none'
    | 'minimal'
    | 'low'
    | 'medium'
    | 'high'
    | 'xhigh'
    | 'max';
  onReasoningEffortChange?: (
    effort: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max',
  ) => void;
  verbosity?: 'low' | 'medium' | 'high';
  onVerbosityChange?: (verbosity: 'low' | 'medium' | 'high') => void;
  gpt5EndpointPreference?: 'chat' | 'responses' | 'auto';
  onGpt5EndpointPreferenceChange?: (
    preference: 'chat' | 'responses' | 'auto',
  ) => void;
  openaiCompatibleEndpoint?: string;
  onOpenaiCompatibleEndpointChange?: (endpoint: string) => void;
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
  geminiNanoStatus?: string;
  geminiNanoStatusText?: string;
  geminiNanoDownloadProgress?: number | null;
  geminiNanoIsPreparing?: boolean;
  onGeminiNanoPrepare?: () => void;
  disabled: boolean;
}

type ProviderModel = {
  id: string;
  name: string;
  provider: Provider;
  default: boolean;
  dynamic?: boolean;
};

type DynamicOpenRouterFreeModel = ProviderModel & {
  provider: 'openrouter';
  default: false;
  dynamic: true;
};

type ProviderInfo = {
  name: string;
  placeholder: string;
  disabled?: boolean;
  disabledReason?: string;
};

const EXAMPLE_STORAGE_ROOT_KEY = 'AITuberOnAirChat_example_react-basic';
const LEGACY_DYNAMIC_OPENROUTER_FREE_MODELS_STORAGE_KEY =
  'aituber-onair.openrouter.dynamicFreeModels';

type DynamicOpenRouterFreeModelsStorage = {
  fetchedAt: number | null;
  models: string[];
  maxCandidates: number | null;
};

const parseDynamicOpenRouterFreeModelsStorage = (
  parsed: unknown,
): DynamicOpenRouterFreeModelsStorage => {
  if (Array.isArray(parsed)) {
    return {
      fetchedAt: null,
      models: dedupeFreeModelIds(
        parsed.filter((value): value is string => typeof value === 'string'),
      ),
      maxCandidates: null,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { fetchedAt: null, models: [], maxCandidates: null };
  }

  const parsedObject = parsed as {
    fetchedAt?: unknown;
    models?: unknown;
    maxCandidates?: unknown;
  };

  const fetchedAt =
    typeof parsedObject.fetchedAt === 'number' ? parsedObject.fetchedAt : null;
  const models = Array.isArray(parsedObject.models)
    ? dedupeFreeModelIds(
        parsedObject.models.filter(
          (value): value is string => typeof value === 'string',
        ),
      )
    : [];
  const maxCandidates =
    typeof parsedObject.maxCandidates === 'number' &&
    Number.isFinite(parsedObject.maxCandidates) &&
    parsedObject.maxCandidates >= 1
      ? Math.floor(parsedObject.maxCandidates)
      : null;

  return { fetchedAt, models, maxCandidates };
};

const dedupeFreeModelIds = (modelIds: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const modelId of modelIds) {
    const trimmed = modelId.trim();
    if (!isOpenRouterFreeModel(trimmed) || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    deduped.push(trimmed);
  }

  return deduped;
};

const toDynamicOpenRouterModel = (id: string): DynamicOpenRouterFreeModel => ({
  id,
  name: `${id} (Free, dynamic)`,
  provider: 'openrouter',
  default: false,
  dynamic: true,
});

const loadDynamicOpenRouterFreeModels = (): {
  fetchedAt: number | null;
  models: string[];
  maxCandidates: number | null;
} => {
  if (typeof localStorage === 'undefined') {
    return { fetchedAt: null, models: [], maxCandidates: null };
  }

  const rootStored = localStorage.getItem(EXAMPLE_STORAGE_ROOT_KEY);
  if (rootStored) {
    try {
      const rootParsed = JSON.parse(rootStored) as unknown;
      if (rootParsed && typeof rootParsed === 'object') {
        const rootObject = rootParsed as {
          openrouter?: { dynamicFreeModels?: unknown };
        };
        if (rootObject.openrouter?.dynamicFreeModels !== undefined) {
          return parseDynamicOpenRouterFreeModelsStorage(
            rootObject.openrouter.dynamicFreeModels,
          );
        }
      }
    } catch {
      // Ignore parse error and fallback to legacy key.
    }
  }

  const legacyStored = localStorage.getItem(
    LEGACY_DYNAMIC_OPENROUTER_FREE_MODELS_STORAGE_KEY,
  );
  if (!legacyStored) {
    return { fetchedAt: null, models: [], maxCandidates: null };
  }

  try {
    return parseDynamicOpenRouterFreeModelsStorage(JSON.parse(legacyStored));
  } catch {
    return { fetchedAt: null, models: [], maxCandidates: null };
  }
};

const saveDynamicOpenRouterFreeModels = (
  fetchedAt: number | null,
  modelIds: string[],
  maxCandidates: number | null,
): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  let rootObject: {
    openrouter?: { dynamicFreeModels?: DynamicOpenRouterFreeModelsStorage };
  } = {};

  const rootStored = localStorage.getItem(EXAMPLE_STORAGE_ROOT_KEY);
  if (rootStored) {
    try {
      const parsed = JSON.parse(rootStored) as unknown;
      if (parsed && typeof parsed === 'object') {
        rootObject = parsed as {
          openrouter?: {
            dynamicFreeModels?: DynamicOpenRouterFreeModelsStorage;
          };
        };
      }
    } catch {
      // Keep default empty object.
    }
  }

  rootObject.openrouter = {
    ...(rootObject.openrouter || {}),
    dynamicFreeModels: {
      fetchedAt,
      models: modelIds,
      maxCandidates,
    },
  };

  localStorage.setItem(EXAMPLE_STORAGE_ROOT_KEY, JSON.stringify(rootObject));
};

const providerInfo: Record<Provider, ProviderInfo> = {
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
  },
  'openai-compatible': {
    name: 'OpenAI-Compatible',
    placeholder: 'xxx...',
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
  xai: {
    name: 'xAI',
    placeholder: 'xai-...',
  },
  kimi: {
    name: 'Kimi',
    placeholder: 'xxx...',
  },
  deepseek: {
    name: 'DeepSeek',
    placeholder: 'sk-...',
  },
  mistral: {
    name: 'Mistral',
    placeholder: 'xxx...',
  },
  sakana: {
    name: 'Sakana AI',
    placeholder: 'xxx...',
    disabled: true,
    disabledReason:
      'Disabled: browser CORS unsupported. Use Node.js or a backend proxy.',
  },
  plamo: {
    name: 'PLaMo',
    placeholder: 'plamo-...',
  },
  'gemini-nano': {
    name: 'Gemini Nano (Browser AI)',
    placeholder: '',
  },
};

export const allModels: ProviderModel[] = [
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
    id: MODEL_GPT_5_4,
    name: 'GPT-5.4',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_5,
    name: 'GPT-5.5',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_6,
    name: 'GPT-5.6 (Sol alias)',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_6_SOL,
    name: 'GPT-5.6 Sol',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_6_TERRA,
    name: 'GPT-5.6 Terra',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_6_LUNA,
    name: 'GPT-5.6 Luna',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_4_MINI,
    name: 'GPT-5.4 Mini',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_4_NANO,
    name: 'GPT-5.4 Nano',
    provider: 'openai',
    default: false,
  },
  {
    id: MODEL_GPT_5_4_PRO,
    name: 'GPT-5.4 Pro',
    provider: 'openai',
    default: false,
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

  // Claude models
  {
    id: MODEL_CLAUDE_5_SONNET,
    name: 'Claude Sonnet 5',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_8_OPUS,
    name: 'Claude Opus 4.8',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_7_OPUS,
    name: 'Claude Opus 4.7',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_6_OPUS,
    name: 'Claude Opus 4.6',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_6_SONNET,
    name: 'Claude Sonnet 4.6',
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
    default: true,
  },
  {
    id: MODEL_CLAUDE_4_OPUS,
    name: 'Claude 4 Opus (Deprecated)',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_4_SONNET,
    name: 'Claude 4 Sonnet (Deprecated)',
    provider: 'claude',
    default: false,
  },
  {
    id: MODEL_CLAUDE_3_HAIKU,
    name: 'Claude 3 Haiku (Deprecated)',
    provider: 'claude',
    default: false,
  },

  // Gemini models
  {
    id: MODEL_GEMINI_3_5_FLASH,
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_3_1_FLASH_LITE,
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'gemini',
    default: true,
  },
  {
    id: MODEL_GEMINI_3_1_PRO_PREVIEW,
    name: 'Gemini 3.1 Pro Preview',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
    name: 'Gemini 3.1 Flash-Lite Preview (Deprecated)',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_3_PRO_PREVIEW,
    name: 'Gemini 3 Pro Preview (Deprecated)',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMINI_3_FLASH_PREVIEW,
    name: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    default: false,
  },
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
    default: false,
  },
  {
    id: MODEL_GEMINI_2_5_FLASH_LITE_PREVIEW_06_17,
    name: 'Gemini 2.5 Flash Lite Preview (Deprecated)',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMMA_4_31B_IT,
    name: 'Gemma 4 31B IT',
    provider: 'gemini',
    default: false,
  },
  {
    id: MODEL_GEMMA_4_26B_A4B_IT,
    name: 'Gemma 4 26B A4B IT',
    provider: 'gemini',
    default: false,
  },

  // OpenRouter models
  {
    id: MODEL_OPENROUTER_AUTO,
    name: 'Auto Router (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENROUTER_FUSION,
    name: 'Fusion (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_GPT_OSS_20B_FREE,
    name: 'GPT OSS 20B (Free)',
    provider: 'openrouter',
    default: true,
  },
  {
    id: MODEL_OPENAI_GPT_LATEST,
    name: 'GPT Latest (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_MINI_LATEST,
    name: 'GPT Mini Latest (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_5_5_PRO,
    name: 'GPT-5.5 Pro (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_OPENAI_GPT_5_5,
    name: 'GPT-5.5 (OpenRouter)',
    provider: 'openrouter',
    default: false,
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
    id: MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST,
    name: 'Claude Sonnet Latest (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST,
    name: 'Claude Haiku Latest (OpenRouter)',
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
    id: MODEL_GOOGLE_GEMINI_PRO_LATEST,
    name: 'Gemini Pro Latest (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_GOOGLE_GEMINI_FLASH_LATEST,
    name: 'Gemini Flash Latest (OpenRouter)',
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
    id: MODEL_ZAI_GLM_5_2,
    name: 'GLM-5.2 (OpenRouter)',
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
    id: MODEL_MOONSHOTAI_KIMI_LATEST,
    name: 'Kimi Latest (OpenRouter)',
    provider: 'openrouter',
    default: false,
  },
  {
    id: MODEL_MOONSHOTAI_KIMI_K2_7_CODE,
    name: 'Kimi K2.7 Code (OpenRouter)',
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
    id: MODEL_GLM_5_2,
    name: 'GLM-5.2',
    provider: 'zai',
    default: true,
  },
  {
    id: MODEL_GLM_5_1,
    name: 'GLM-5.1',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_5,
    name: 'GLM-5',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_5_TURBO,
    name: 'GLM-5-Turbo',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_5V_TURBO,
    name: 'GLM-5V-Turbo',
    provider: 'zai',
    default: false,
  },
  {
    id: MODEL_GLM_4_7,
    name: 'GLM-4.7',
    provider: 'zai',
    default: false,
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

  // xAI models
  {
    id: MODEL_GROK_4_5,
    name: 'Grok 4.5',
    provider: 'xai',
    default: false,
  },
  {
    id: MODEL_GROK_4_3,
    name: 'Grok 4.3',
    provider: 'xai',
    default: false,
  },
  {
    id: MODEL_GROK_4_20_REASONING,
    name: 'Grok 4.20 Reasoning',
    provider: 'xai',
    default: false,
  },
  {
    id: MODEL_GROK_4_20_NON_REASONING,
    name: 'Grok 4.20',
    provider: 'xai',
    default: false,
  },
  {
    id: MODEL_GROK_4_1_FAST_REASONING,
    name: 'Grok 4-1 Fast Reasoning',
    provider: 'xai',
    default: false,
  },
  {
    id: MODEL_GROK_4_1_FAST_NON_REASONING,
    name: 'Grok 4-1 Fast',
    provider: 'xai',
    default: true,
  },

  // Kimi models
  {
    id: MODEL_KIMI_K2_7_CODE,
    name: 'Kimi K2.7 Code',
    provider: 'kimi',
    default: false,
  },
  {
    id: MODEL_KIMI_K2_7_CODE_HIGHSPEED,
    name: 'Kimi K2.7 Code HighSpeed',
    provider: 'kimi',
    default: false,
  },
  {
    id: MODEL_KIMI_K2_6,
    name: 'Kimi K2.6',
    provider: 'kimi',
    default: true,
  },
  {
    id: MODEL_KIMI_K2_5,
    name: 'Kimi K2.5',
    provider: 'kimi',
    default: false,
  },

  // DeepSeek models
  {
    id: MODEL_DEEPSEEK_V4_FLASH,
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    default: true,
  },
  {
    id: MODEL_DEEPSEEK_V4_PRO,
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    default: false,
  },

  // Mistral models
  {
    id: MODEL_MISTRAL_SMALL_LATEST,
    name: 'Mistral Small Latest',
    provider: 'mistral',
    default: true,
  },
  {
    id: MODEL_MINISTRAL_3B_2512,
    name: 'Ministral 3 3B',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MINISTRAL_8B_2512,
    name: 'Ministral 3 8B',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MINISTRAL_14B_2512,
    name: 'Ministral 3 14B',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MISTRAL_MEDIUM_3_5,
    name: 'Mistral Medium 3.5',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MISTRAL_LARGE_LATEST,
    name: 'Mistral Large Latest',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MISTRAL_LARGE_2512,
    name: 'Mistral Large 3',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MISTRAL_SMALL_2603,
    name: 'Mistral Small 4',
    provider: 'mistral',
    default: false,
  },
  {
    id: MODEL_MISTRAL_MEDIUM_2508,
    name: 'Mistral Medium 3.1',
    provider: 'mistral',
    default: false,
  },

  // Sakana models (kept for source-level parity; provider is disabled in browser UI)
  {
    id: MODEL_FUGU,
    name: 'Fugu',
    provider: 'sakana',
    default: true,
  },
  {
    id: MODEL_FUGU_ULTRA,
    name: 'Fugu Ultra',
    provider: 'sakana',
    default: false,
  },
  {
    id: MODEL_FUGU_ULTRA_20260615,
    name: 'Fugu Ultra 20260615',
    provider: 'sakana',
    default: false,
  },

  // PLaMo models
  {
    id: MODEL_PLAMO_3_0_PRIME,
    name: 'PLaMo 3.0 Prime',
    provider: 'plamo',
    default: true,
  },
  {
    id: MODEL_PLAMO_2_2_PRIME,
    name: 'PLaMo 2.2 Prime',
    provider: 'plamo',
    default: false,
  },

  // Gemini Nano models (browser built-in AI)
  {
    id: MODEL_GEMINI_NANO,
    name: 'Gemini Nano (Browser)',
    provider: 'gemini-nano',
    default: true,
  },
];

export const getProviderForModel = (
  modelId: string,
  fallback: Provider = 'openai',
): Provider => {
  const model = allModels.find((m) => m.id === modelId);
  return (model?.provider as Provider) || fallback;
};

export const getDefaultModelForProvider = (provider: Provider): string => {
  if (provider === 'openai-compatible') {
    return '';
  }

  const defaultModel = allModels.find(
    (m) => m.provider === provider && m.default,
  );
  const fallbackModel = allModels.find((m) => m.provider === provider);
  return defaultModel?.id || fallbackModel?.id || MODEL_GPT_4O_MINI;
};

export const getVisionSupportLevel = (
  provider: Provider,
  modelId: string,
): VisionSupportLevel =>
  ChatServiceFactory.getVisionSupportLevelForModel(provider, modelId);

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
  openaiCompatibleEndpoint,
  onOpenaiCompatibleEndpointChange,
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
  geminiNanoStatus,
  geminiNanoStatusText,
  geminiNanoDownloadProgress,
  geminiNanoIsPreparing,
  onGeminiNanoPrepare,
  disabled,
}: ProviderSelectorProps) {
  const [dynamicOpenRouterFreeModels, setDynamicOpenRouterFreeModels] =
    useState<DynamicOpenRouterFreeModel[]>([]);
  const [isFetchingOpenRouterFreeModels, setIsFetchingOpenRouterFreeModels] =
    useState(false);
  const [openRouterFreeModelsError, setOpenRouterFreeModelsError] = useState<
    string | null
  >(null);
  const [openRouterFreeModelsFetchedAt, setOpenRouterFreeModelsFetchedAt] =
    useState<number | null>(null);
  const [openRouterFreeMaxCandidates, setOpenRouterFreeMaxCandidates] =
    useState('1');

  const info = providerInfo[provider];
  const isGPT5 = provider === 'openai' && isGPT5Model(selectedModel);
  const isResponsesOnlyModel =
    provider === 'openai' && isResponsesOnlyGPT5Model(selectedModel);
  const allowsNone =
    provider === 'openai' && allowsReasoningNone(selectedModel);
  const allowsMinimal =
    provider === 'openai' && allowsReasoningMinimal(selectedModel);
  const allowsLow = provider === 'openai' && allowsReasoningLow(selectedModel);
  const allowsXHigh =
    provider === 'openai' && allowsReasoningXHigh(selectedModel);
  const allowsMax = provider === 'openai' && allowsReasoningMax(selectedModel);
  const isXaiReasoningModel =
    provider === 'xai' && isXaiReasoningEffortModel(selectedModel);
  const isXaiReasoningNoneModelSelected =
    provider === 'xai' && isXaiReasoningEffortNoneModel(selectedModel);
  const xaiReasoningEffort =
    reasoning_effort === 'low' ||
    reasoning_effort === 'medium' ||
    reasoning_effort === 'high'
      ? reasoning_effort
      : (getDefaultXaiReasoningEffort(selectedModel) ?? 'none');
  const baseModelsForProvider = useMemo(
    () => allModels.filter((model) => model.provider === provider),
    [provider],
  );
  const modelsForProvider = useMemo(() => {
    if (provider !== 'openrouter') {
      return baseModelsForProvider;
    }

    const existingIds = new Set(baseModelsForProvider.map((model) => model.id));
    const dynamicModels = dynamicOpenRouterFreeModels.filter(
      (model) => !existingIds.has(model.id),
    );
    return [...baseModelsForProvider, ...dynamicModels];
  }, [provider, baseModelsForProvider, dynamicOpenRouterFreeModels]);
  const isOpenRouterFreeModelsFetchDisabled =
    disabled || isFetchingOpenRouterFreeModels || apiKey.trim() === '';

  useEffect(() => {
    const stored = loadDynamicOpenRouterFreeModels();
    if (stored.models.length > 0) {
      setDynamicOpenRouterFreeModels(
        stored.models.map((id) => toDynamicOpenRouterModel(id)),
      );
    }
    if (stored.fetchedAt) {
      setOpenRouterFreeModelsFetchedAt(stored.fetchedAt);
    }
    if (stored.maxCandidates) {
      setOpenRouterFreeMaxCandidates(String(stored.maxCandidates));
    }
  }, []);

  const handleFetchOpenRouterFreeModels = useCallback(async () => {
    const openRouterApiKey = apiKey.trim();
    if (!openRouterApiKey) {
      setOpenRouterFreeModelsError('OpenRouter API key is required.');
      return;
    }

    const maxCandidatesInput = openRouterFreeMaxCandidates.trim();
    const parsedMaxCandidates = Number(maxCandidatesInput);
    if (
      maxCandidatesInput &&
      (!Number.isFinite(parsedMaxCandidates) || parsedMaxCandidates < 1)
    ) {
      setOpenRouterFreeModelsError('Max candidates must be 1 or higher.');
      return;
    }
    const maxCandidates = maxCandidatesInput
      ? Math.floor(parsedMaxCandidates)
      : undefined;

    setIsFetchingOpenRouterFreeModels(true);
    setOpenRouterFreeModelsError(null);

    try {
      const result = await refreshOpenRouterFreeModels({
        apiKey: openRouterApiKey,
        appName: openrouterAppName?.trim() || undefined,
        appUrl: openrouterAppUrl?.trim() || undefined,
        maxCandidates,
      });

      const mergedModelIds = dedupeFreeModelIds([
        ...dynamicOpenRouterFreeModels.map((model) => model.id),
        ...result.working,
      ]);

      setDynamicOpenRouterFreeModels(
        mergedModelIds.map((id) => toDynamicOpenRouterModel(id)),
      );
      setOpenRouterFreeModelsFetchedAt(result.fetchedAt);
      saveDynamicOpenRouterFreeModels(
        result.fetchedAt,
        mergedModelIds,
        maxCandidates ?? null,
      );

      if (result.working.length === 0) {
        setOpenRouterFreeModelsError(
          `No working free models found. Failed probes: ` +
            `${result.failed.length}.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch free models.';
      setOpenRouterFreeModelsError(message);
    } finally {
      setIsFetchingOpenRouterFreeModels(false);
    }
  }, [
    apiKey,
    dynamicOpenRouterFreeModels,
    openRouterFreeMaxCandidates,
    openrouterAppName,
    openrouterAppUrl,
  ]);

  const effectiveReasoningEffort = (() => {
    if (!isGPT5) {
      if (!reasoning_effort || reasoning_effort === 'none') {
        return 'medium';
      }
      return reasoning_effort;
    }

    if (!reasoning_effort) {
      return getDefaultReasoningEffortForGPT5Model(selectedModel);
    }
    // Round unsupported values to the nearest supported level, matching the
    // normalization performed by the chat package.
    if (
      (reasoning_effort === 'none' && !allowsNone) ||
      (reasoning_effort === 'minimal' && !allowsMinimal)
    ) {
      if (reasoning_effort === 'minimal' && allowsNone) {
        return 'none';
      }
      if (reasoning_effort === 'none' && allowsMinimal) {
        return 'minimal';
      }
      return allowsLow ? 'low' : 'medium';
    }
    if (reasoning_effort === 'low' && !allowsLow) {
      return 'medium';
    }
    if (reasoning_effort === 'xhigh' && !allowsXHigh) {
      return 'high';
    }
    if (reasoning_effort === 'max' && !allowsMax) {
      return allowsXHigh ? 'xhigh' : 'high';
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
                disabled={disabled || Boolean(value.disabled)}
                aria-pressed={provider === key}
                aria-disabled={value.disabled || undefined}
                title={value.disabledReason}
              >
                <span className="provider-name">{value.name}</span>
                {value.disabledReason && (
                  <span className="provider-meta">{value.disabledReason}</span>
                )}
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
                  {model.default ? 'Default' : model.dynamic ? 'Dynamic' : ' '}
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
          {provider === 'gemini-nano' ? (
            <div className="config-group">
              <span className="helper-text">
                No API key required — uses Chrome&apos;s built-in AI.
              </span>
            </div>
          ) : (
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
              {provider === 'openai-compatible' && (
                <span className="helper-text">
                  Optional. If empty, Authorization header is omitted.
                </span>
              )}
            </div>
          )}

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

          {provider === 'gemini-nano' && (
            <>
              <div className="config-group config-full">
                <div className="gemini-nano-status" aria-live="polite">
                  {geminiNanoStatus === 'checking' && (
                    <span className="gemini-nano-status__text">
                      Checking Built-in AI availability...
                    </span>
                  )}
                  {geminiNanoStatus === 'available' && (
                    <span className="gemini-nano-status__text gemini-nano-status__text--ready">
                      <span
                        className="gemini-nano-ready-indicator"
                        aria-hidden="true"
                      />
                      Gemini Nano is ready
                    </span>
                  )}
                  {geminiNanoStatus === 'downloadable' && (
                    <div className="gemini-nano-prepare">
                      <span className="gemini-nano-status__text">
                        {geminiNanoStatusText}
                      </span>
                      <button
                        type="button"
                        className="gemini-nano-prepare__button"
                        onClick={onGeminiNanoPrepare}
                        disabled={geminiNanoIsPreparing}
                      >
                        Prepare Model
                      </button>
                    </div>
                  )}
                  {geminiNanoStatus === 'downloading' && (
                    <div className="gemini-nano-prepare">
                      <span className="gemini-nano-status__text">
                        {geminiNanoStatusText}
                      </span>
                      {geminiNanoIsPreparing && (
                        <button
                          type="button"
                          className="gemini-nano-prepare__button"
                          disabled
                        >
                          Preparing...
                        </button>
                      )}
                      {geminiNanoDownloadProgress != null && (
                        <div
                          className="gemini-nano-progress"
                          role="progressbar"
                          tabIndex={0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={geminiNanoDownloadProgress}
                          aria-label="Model download progress"
                        >
                          <div
                            className="gemini-nano-progress__bar"
                            style={{
                              width: `${geminiNanoDownloadProgress}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {(geminiNanoStatus === 'unavailable' ||
                    geminiNanoStatus === 'error') && (
                    <span className="gemini-nano-status__text gemini-nano-status__text--error">
                      {geminiNanoStatusText}
                    </span>
                  )}
                </div>
              </div>
              <div className="config-group config-full">
                <details className="gemini-nano-setup">
                  <summary className="gemini-nano-setup__summary">
                    Setup Guide
                  </summary>
                  <div className="gemini-nano-setup__body">
                    <p>
                      <strong>Chrome 138+</strong> is required. Enable the
                      following flags to use Built-in AI:
                    </p>
                    <ol className="gemini-nano-steps">
                      <li>
                        Open <code>chrome://flags</code> in the address bar
                      </li>
                      <li>
                        Set <code>#optimization-guide-on-device-model</code> to
                        &quot;Enabled&quot;
                      </li>
                      <li>
                        Set <code>#prompt-api-for-gemini-nano</code> to
                        &quot;Enabled&quot;
                      </li>
                      <li>Restart Chrome</li>
                    </ol>
                    <p className="gemini-nano-note">
                      After enabling the flags, press &quot;Prepare Model&quot;
                      above to start the model download. The initial download
                      may take a few minutes.
                    </p>
                  </div>
                </details>
              </div>
            </>
          )}

          {provider === 'openai-compatible' && (
            <>
              <div className="config-group config-full">
                <label htmlFor="openai-compatible-endpoint">Endpoint URL</label>
                <input
                  id="openai-compatible-endpoint"
                  type="url"
                  value={openaiCompatibleEndpoint || ''}
                  onChange={(e) =>
                    onOpenaiCompatibleEndpointChange?.(e.target.value)
                  }
                  disabled={disabled}
                  className="text-input"
                  placeholder="http://127.0.0.1:18080/v1/chat/completions"
                />
                <span className="helper-text">
                  Full URL for your OpenAI-compatible `/v1/chat/completions`
                  endpoint.
                </span>
              </div>

              <div className="config-group config-full">
                <label htmlFor="openai-compatible-model">Model ID</label>
                <input
                  id="openai-compatible-model"
                  type="text"
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  disabled={disabled}
                  className="text-input"
                  placeholder="your-local-model"
                />
                <span className="helper-text">
                  Set the exact model ID exposed by your local/self-hosted
                  server.
                </span>
              </div>
            </>
          )}

          {isGPT5 && (
            <>
              <div className="config-group">
                <label htmlFor="gpt5-endpoint">GPT-5 API Endpoint</label>
                <select
                  id="gpt5-endpoint"
                  value={
                    isResponsesOnlyModel
                      ? 'responses'
                      : gpt5EndpointPreference || 'chat'
                  }
                  onChange={(e) =>
                    onGpt5EndpointPreferenceChange?.(
                      e.target.value as 'chat' | 'responses' | 'auto',
                    )
                  }
                  disabled={disabled || isResponsesOnlyModel}
                  className="select-input"
                >
                  <option value="chat">Chat Completions (Standard API)</option>
                  <option value="responses">
                    Responses API (Advanced with reasoning visibility)
                  </option>
                  <option value="auto">Auto (Based on Settings)</option>
                </select>
                {isResponsesOnlyModel && (
                  <span className="helper-text">
                    GPT-5.4 Pro is Responses API only.
                  </span>
                )}
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
                      disabled ||
                      (isResponsesOnlyModel
                        ? false
                        : gpt5EndpointPreference !== 'responses')
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
                    Casual (fastest, lowest reasoning for the model)
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
                        | 'high'
                        | 'xhigh'
                        | 'max',
                    )
                  }
                  disabled={disabled || Boolean(gpt5Preset)}
                  className="select-input"
                >
                  {allowsNone ? (
                    <option value="none">None (fastest)</option>
                  ) : allowsMinimal ? (
                    <option value="minimal">Minimal (GPT-4 like)</option>
                  ) : null}
                  {allowsLow && <option value="low">Low</option>}
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  {allowsXHigh && <option value="xhigh">XHigh</option>}
                  {allowsMax && <option value="max">Max</option>}
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

          {provider === 'xai' && (
            <div className="config-group">
              <label htmlFor="xai-reasoning-effort">xAI Reasoning Effort</label>
              <select
                id="xai-reasoning-effort"
                value={xaiReasoningEffort}
                onChange={(e) =>
                  onReasoningEffortChange?.(
                    e.target.value as 'none' | 'low' | 'medium' | 'high',
                  )
                }
                disabled={disabled || !isXaiReasoningModel}
                className="select-input"
              >
                {isXaiReasoningNoneModelSelected && (
                  <option value="none">None (fastest)</option>
                )}
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {!isXaiReasoningModel && (
                <span className="helper-text">
                  Available only for Grok 4.5 and Grok 4.3; omitted for other
                  xAI models.
                </span>
              )}
            </div>
          )}

          {provider === 'openrouter' && (
            <>
              <div className="config-group config-full">
                <label htmlFor="openrouter-fetch-free-models">
                  Dynamic Free Models
                </label>
                <div className="action-row">
                  <label
                    htmlFor="openrouter-free-max-candidates"
                    className="inline-label"
                  >
                    Max candidates
                  </label>
                  <input
                    id="openrouter-free-max-candidates"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={openRouterFreeMaxCandidates}
                    onChange={(e) =>
                      setOpenRouterFreeMaxCandidates(e.target.value)
                    }
                    disabled={disabled || isFetchingOpenRouterFreeModels}
                    className="small-input"
                  />
                  <span className="helper-text">
                    Default: 1 (set higher if needed)
                  </span>
                </div>
                <div className="action-row">
                  <button
                    id="openrouter-fetch-free-models"
                    type="button"
                    onClick={handleFetchOpenRouterFreeModels}
                    disabled={isOpenRouterFreeModelsFetchDisabled}
                    className="action-button"
                  >
                    {isFetchingOpenRouterFreeModels
                      ? 'Fetching...'
                      : 'Fetch free models'}
                  </button>
                  {openRouterFreeModelsFetchedAt && (
                    <span className="helper-text">
                      Last fetched:{' '}
                      {new Date(openRouterFreeModelsFetchedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {openRouterFreeModelsError && (
                  <div className="inline-error">
                    {openRouterFreeModelsError}
                  </div>
                )}
                {apiKey.trim() === '' && (
                  <span className="helper-text">
                    Set OpenRouter API key to fetch dynamic free models.
                  </span>
                )}
              </div>

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

        .provider-item:disabled .provider-meta {
          opacity: 1;
        }

        .model-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .model-name {
          font-weight: 600;
        }

        .provider-meta {
          display: block;
          margin-top: 0.35rem;
          font-size: 0.72rem;
          line-height: 1.35;
          color: var(--muted);
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

        .action-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem 0.75rem;
        }

        .inline-label {
          font-size: 0.78rem;
          color: var(--muted);
          font-weight: 600;
        }

        .small-input {
          width: 84px;
          padding: 0.45rem 0.55rem;
          border: 1px solid var(--input-border);
          border-radius: 10px;
          font-size: 0.85rem;
          background: var(--input-bg);
          color: var(--text);
        }

        .small-input:focus {
          border-color: var(--input-focus);
          background: #fff;
        }

        .small-input:disabled {
          background: #f1f1f1;
          color: #9a9a9a;
          cursor: not-allowed;
        }

        .action-button {
          border-radius: 10px;
          border: 1px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text);
          padding: 0.55rem 0.8rem;
          font-size: 0.85rem;
          font-weight: 600;
          line-height: 1;
        }

        .action-button:hover:not(:disabled) {
          background: #fff;
          border-color: var(--input-focus);
          transform: translateY(-1px);
        }

        .action-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
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

        .inline-error {
          border: 1px solid #f1c4c4;
          border-radius: 10px;
          background: #fff1f1;
          color: #8d1c1c;
          font-size: 0.78rem;
          padding: 0.5rem 0.65rem;
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

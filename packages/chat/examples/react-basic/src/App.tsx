import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChatServiceFactory,
  ChatService,
  allowsReasoningLow,
  allowsReasoningMax,
  allowsReasoningMinimal,
  allowsReasoningNone,
  allowsReasoningXHigh,
  getDefaultGeminiReasoningEffort,
  getDefaultReasoningEffortForGPT5Model,
  isGPT5Model,
  isGeminiReasoningEffortModel,
  isKimiReasoningEffortModel,
  isXaiReasoningEffortModel,
  normalizeGeminiReasoningEffort,
  normalizeXaiReasoningEffort,
  type Message,
  type MessageWithVision,
  type ChatResponseLength,
  type GPT5PresetKey,
  type GeminiReasoningEffort,
  type ChatCompletionAssistantMessage,
} from '@aituber-onair/chat';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ProviderSelector, {
  getProviderForModel,
  getDefaultModelForProvider,
  getVisionSupportLevel,
} from './components/ProviderSelector';
import { useGeminiNanoStatus } from './hooks/useGeminiNanoStatus';
import MessageList from './components/MessageList';

export type Provider =
  | 'openai'
  | 'openai-compatible'
  | 'claude'
  | 'gemini'
  | 'gemini-nano'
  | 'openrouter'
  | 'zai'
  | 'xai'
  | 'kimi'
  | 'deepseek'
  | 'mistral'
  | 'sakana'
  | 'plamo';

interface ChatMessage extends Omit<Message, 'timestamp' | 'content'> {
  id: string;
  timestamp: Date;
  content: Message['content'] | MessageWithVision['content'];
  isStreaming?: boolean;
  assistantMessage?: ChatCompletionAssistantMessage;
}

type ReasoningEffortLevel =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';
type XaiReasoningEffortLevel = 'none' | 'low' | 'medium' | 'high';

const KIMI_OFFICIAL_BASE_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_OPENAI_COMPAT_ENDPOINT =
  'http://127.0.0.1:18080/v1/chat/completions';

const normalizeReasoningEffortForModel = (
  modelId?: string,
  effort?: ReasoningEffortLevel,
): ReasoningEffortLevel => {
  if (!modelId || !isGPT5Model(modelId)) {
    if (!effort || effort === 'none') {
      return 'medium';
    }
    return effort;
  }

  if (!effort) {
    return getDefaultReasoningEffortForGPT5Model(modelId);
  }

  // Round unsupported values to the nearest supported level, matching the
  // normalization performed by the chat package.
  if (
    (effort === 'none' && !allowsReasoningNone(modelId)) ||
    (effort === 'minimal' && !allowsReasoningMinimal(modelId))
  ) {
    if (effort === 'minimal' && allowsReasoningNone(modelId)) {
      return 'none';
    }
    if (effort === 'none' && allowsReasoningMinimal(modelId)) {
      return 'minimal';
    }
    return allowsReasoningLow(modelId) ? 'low' : 'medium';
  }

  if (effort === 'low' && !allowsReasoningLow(modelId)) {
    return 'medium';
  }

  if (effort === 'xhigh' && !allowsReasoningXHigh(modelId)) {
    return 'high';
  }

  if (effort === 'max' && !allowsReasoningMax(modelId)) {
    return allowsReasoningXHigh(modelId) ? 'xhigh' : 'high';
  }

  return effort;
};

function App() {
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseLength, setResponseLength] =
    useState<ChatResponseLength>('medium');
  const [selectedModel, setSelectedModel] = useState(() =>
    getDefaultModelForProvider('openai'),
  );
  const [gpt5Preset, setGpt5Preset] = useState<GPT5PresetKey | undefined>();
  const [reasoning_effort, setReasoningEffort] =
    useState<ReasoningEffortLevel>('none');
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>(
    'medium',
  );
  const [gpt5EndpointPreference, setGpt5EndpointPreference] = useState<
    'chat' | 'responses' | 'auto'
  >('chat');
  const [openaiCompatibleEndpoint, setOpenaiCompatibleEndpoint] = useState(
    DEFAULT_OPENAI_COMPAT_ENDPOINT,
  );
  const [enableReasoningSummary, setEnableReasoningSummary] = useState(false);
  const [openrouterReasoningEffort, setOpenrouterReasoningEffort] = useState<
    'none' | 'minimal' | 'low' | 'medium' | 'high'
  >('none');
  const [openrouterIncludeReasoning, setOpenrouterIncludeReasoning] =
    useState(false);
  const [openrouterReasoningMaxTokens, setOpenrouterReasoningMaxTokens] =
    useState('');
  const [openrouterAppName, setOpenrouterAppName] = useState('');
  const [openrouterAppUrl, setOpenrouterAppUrl] = useState('');
  const [zaiThinkingType, setZaiThinkingType] = useState<
    'enabled' | 'disabled'
  >('disabled');
  const [zaiClearThinking, setZaiClearThinking] = useState(false);
  const [zaiResponseFormatType, setZaiResponseFormatType] = useState<
    'text' | 'json_object' | 'json_schema'
  >('text');
  const [zaiResponseSchema, setZaiResponseSchema] = useState('');
  const [kimiThinkingType, setKimiThinkingType] = useState<
    'enabled' | 'disabled'
  >('enabled');
  const [kimiBaseUrl, setKimiBaseUrl] = useState(KIMI_OFFICIAL_BASE_URL);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const geminiNano = useGeminiNanoStatus(provider === 'gemini-nano');

  const normalizedReasoningEffort = normalizeReasoningEffortForModel(
    selectedModel,
    reasoning_effort,
  );
  const requestedGeminiReasoningEffort: GeminiReasoningEffort | undefined =
    reasoning_effort === 'minimal' ||
    reasoning_effort === 'low' ||
    reasoning_effort === 'medium' ||
    reasoning_effort === 'high'
      ? reasoning_effort
      : undefined;
  const geminiReasoningEffort = normalizeGeminiReasoningEffort(
    selectedModel,
    requestedGeminiReasoningEffort,
  );
  const xaiReasoningEffort: XaiReasoningEffortLevel =
    normalizeXaiReasoningEffort(
      selectedModel,
      reasoning_effort === 'low' ||
        reasoning_effort === 'medium' ||
        reasoning_effort === 'high'
        ? reasoning_effort
        : 'none',
    ) ?? 'none';
  const visionSupportLevel = getVisionSupportLevel(provider, selectedModel);
  const effectiveApiKey =
    provider === 'openai-compatible' ? apiKey.trim() : apiKey;

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally want to scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat service when provider, API key, or model changes
  useEffect(() => {
    const shouldInitialize =
      provider === 'gemini-nano'
        ? true
        : provider === 'openai-compatible'
          ? Boolean(selectedModel.trim()) &&
            Boolean(openaiCompatibleEndpoint.trim())
          : Boolean(apiKey);

    if (shouldInitialize) {
      try {
        const options: any = {
          apiKey: effectiveApiKey,
          responseLength,
          model: selectedModel,
        };

        // Add GPT-5 specific options for OpenAI provider
        if (provider === 'openai') {
          if (gpt5Preset) {
            options.gpt5Preset = gpt5Preset;
          } else {
            options.reasoning_effort = normalizedReasoningEffort;
            options.verbosity = verbosity;
          }
          options.gpt5EndpointPreference = gpt5EndpointPreference;
          options.enableReasoningSummary = enableReasoningSummary;
        }

        if (provider === 'openai-compatible') {
          const endpoint = openaiCompatibleEndpoint.trim();
          if (!endpoint) {
            throw new Error('OpenAI-compatible endpoint is required.');
          }
          options.endpoint = endpoint;
        }

        if (
          provider === 'gemini' &&
          isGeminiReasoningEffortModel(selectedModel)
        ) {
          options.reasoning_effort = geminiReasoningEffort;
        }

        if (provider === 'openrouter') {
          options.reasoning_effort = openrouterReasoningEffort;
          options.includeReasoning = openrouterIncludeReasoning;
          const maxTokens =
            openrouterReasoningMaxTokens.trim() === ''
              ? undefined
              : Number(openrouterReasoningMaxTokens);
          if (!Number.isNaN(maxTokens)) {
            options.reasoningMaxTokens = maxTokens;
          }
          if (openrouterAppName.trim()) {
            options.appName = openrouterAppName.trim();
          }
          if (openrouterAppUrl.trim()) {
            options.appUrl = openrouterAppUrl.trim();
          }
        }

        if (provider === 'xai' && isXaiReasoningEffortModel(selectedModel)) {
          options.reasoning_effort = xaiReasoningEffort;
        }

        if (provider === 'zai') {
          options.thinking = {
            type: zaiThinkingType,
            clear_thinking: zaiClearThinking,
          };

          if (zaiResponseFormatType !== 'text') {
            if (zaiResponseFormatType === 'json_schema') {
              if (!zaiResponseSchema.trim()) {
                throw new Error(
                  'Z.ai response schema is required for json_schema format.',
                );
              }
              try {
                options.responseFormat = {
                  type: 'json_schema',
                  json_schema: JSON.parse(zaiResponseSchema),
                };
              } catch (parseError) {
                throw new Error(
                  'Invalid JSON schema for Z.ai response format.',
                );
              }
            } else {
              options.responseFormat = { type: 'json_object' };
            }
          }
        }

        if (provider === 'kimi') {
          if (isKimiReasoningEffortModel(selectedModel)) {
            options.reasoning_effort = 'max';
          } else {
            options.thinking = { type: kimiThinkingType };
          }
          if (kimiBaseUrl.trim()) {
            options.baseUrl = kimiBaseUrl.trim();
          }
        }

        const service = ChatServiceFactory.createChatService(provider, options);
        setChatService(service);
        setError(null);
      } catch (err) {
        setError(`Failed to initialize ${provider}: ${err}`);
        setChatService(null);
      }
    } else {
      setChatService(null);
      setError(null);
    }
  }, [
    provider,
    apiKey,
    effectiveApiKey,
    responseLength,
    selectedModel,
    gpt5Preset,
    normalizedReasoningEffort,
    geminiReasoningEffort,
    xaiReasoningEffort,
    verbosity,
    gpt5EndpointPreference,
    openaiCompatibleEndpoint,
    enableReasoningSummary,
    openrouterReasoningEffort,
    openrouterIncludeReasoning,
    openrouterReasoningMaxTokens,
    openrouterAppName,
    openrouterAppUrl,
    zaiThinkingType,
    zaiClearThinking,
    zaiResponseFormatType,
    zaiResponseSchema,
    kimiThinkingType,
    kimiBaseUrl,
  ]);

  const sendMessage = useCallback(
    async (content: string, imageData?: string) => {
      if (!chatService || !content.trim()) return;

      const userContent: Message['content'] | MessageWithVision['content'] =
        imageData
          ? [
              { type: 'text', text: content },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: 'auto',
                },
              },
            ]
          : content;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };

      // Handle vision content separately for API calls
      const apiMessage: Message | MessageWithVision = imageData
        ? {
            role: 'user',
            content: [
              { type: 'text', text: content },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: 'auto',
                },
              },
            ],
          }
        : {
            role: 'user',
            content: content,
          };

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const chatMessages: (Message | MessageWithVision)[] = messages
          .filter(
            (m) => m.role !== 'assistant' || m.content || m.assistantMessage,
          )
          .map((message) =>
            message.assistantMessage
              ? message.assistantMessage
              : { role: message.role, content: message.content },
          );

        chatMessages.push(apiMessage);

        // Handle vision or regular chat
        const processChat = imageData
          ? chatService.processVisionChat.bind(chatService)
          : chatService.processChat.bind(chatService);

        await processChat(
          chatMessages as any,
          (partial) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: msg.content + partial }
                  : msg,
              ),
            );
          },
          async (complete, completion) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? {
                      ...msg,
                      content: complete,
                      isStreaming: false,
                      assistantMessage: completion?.assistant_message,
                    }
                  : msg,
              ),
            );
          },
        );
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessage.id),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [chatService, messages],
  );

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-eyebrow">@aituber-onair/chat</span>
          <h1 className="brand-title">AITuber OnAir Chat</h1>
          <p className="brand-subtitle">
            Sample UI for provider + model selection
          </p>
        </div>
      </header>

      <main className="app-main">
        <div className="config-section">
          <ProviderSelector
            provider={provider}
            onProviderChange={(newProvider) => {
              setProvider(newProvider);
              // プロバイダー変更時にそのプロバイダーのデフォルトモデルを自動選択
              const defaultModel =
                newProvider === 'openai-compatible'
                  ? ''
                  : getDefaultModelForProvider(newProvider);
              setSelectedModel(defaultModel);
              // Reset GPT-5 settings when changing provider
              setGpt5Preset(undefined);
              if (newProvider === 'openai') {
                setReasoningEffort(
                  isGPT5Model(defaultModel)
                    ? getDefaultReasoningEffortForGPT5Model(defaultModel)
                    : 'medium',
                );
              } else if (newProvider === 'gemini') {
                setReasoningEffort(
                  getDefaultGeminiReasoningEffort(defaultModel) ?? 'minimal',
                );
              } else if (
                newProvider === 'xai' &&
                isXaiReasoningEffortModel(defaultModel)
              ) {
                setReasoningEffort('none');
              } else {
                setReasoningEffort('medium');
              }
              setVerbosity('medium');
            }}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            responseLength={responseLength}
            onResponseLengthChange={setResponseLength}
            selectedModel={selectedModel}
            onModelChange={(modelId) => {
              const newProvider = getProviderForModel(modelId, provider);
              if (newProvider !== provider) {
                setProvider(newProvider);
              }
              setSelectedModel(modelId);
              if (newProvider === 'openai' && !gpt5Preset) {
                setReasoningEffort(
                  isGPT5Model(modelId)
                    ? getDefaultReasoningEffortForGPT5Model(modelId)
                    : 'medium',
                );
              } else if (newProvider === 'gemini') {
                const requestedEffort =
                  reasoning_effort === 'minimal' ||
                  reasoning_effort === 'low' ||
                  reasoning_effort === 'medium' ||
                  reasoning_effort === 'high'
                    ? reasoning_effort
                    : undefined;
                setReasoningEffort(
                  normalizeGeminiReasoningEffort(modelId, requestedEffort) ??
                    'minimal',
                );
              } else if (
                newProvider === 'xai' &&
                isXaiReasoningEffortModel(modelId)
              ) {
                setReasoningEffort('none');
              }
            }}
            gpt5Preset={gpt5Preset}
            onGpt5PresetChange={setGpt5Preset}
            reasoning_effort={
              provider === 'xai'
                ? xaiReasoningEffort
                : provider === 'gemini'
                  ? (geminiReasoningEffort ?? 'minimal')
                  : normalizedReasoningEffort
            }
            onReasoningEffortChange={setReasoningEffort}
            verbosity={verbosity}
            onVerbosityChange={setVerbosity}
            gpt5EndpointPreference={gpt5EndpointPreference}
            onGpt5EndpointPreferenceChange={setGpt5EndpointPreference}
            openaiCompatibleEndpoint={openaiCompatibleEndpoint}
            onOpenaiCompatibleEndpointChange={setOpenaiCompatibleEndpoint}
            enableReasoningSummary={enableReasoningSummary}
            onEnableReasoningSummaryChange={setEnableReasoningSummary}
            openrouterReasoningEffort={openrouterReasoningEffort}
            onOpenrouterReasoningEffortChange={setOpenrouterReasoningEffort}
            openrouterIncludeReasoning={openrouterIncludeReasoning}
            onOpenrouterIncludeReasoningChange={setOpenrouterIncludeReasoning}
            openrouterReasoningMaxTokens={openrouterReasoningMaxTokens}
            onOpenrouterReasoningMaxTokensChange={
              setOpenrouterReasoningMaxTokens
            }
            openrouterAppName={openrouterAppName}
            onOpenrouterAppNameChange={setOpenrouterAppName}
            openrouterAppUrl={openrouterAppUrl}
            onOpenrouterAppUrlChange={setOpenrouterAppUrl}
            zaiThinkingType={zaiThinkingType}
            onZaiThinkingTypeChange={setZaiThinkingType}
            zaiClearThinking={zaiClearThinking}
            onZaiClearThinkingChange={setZaiClearThinking}
            zaiResponseFormatType={zaiResponseFormatType}
            onZaiResponseFormatTypeChange={setZaiResponseFormatType}
            zaiResponseSchema={zaiResponseSchema}
            onZaiResponseSchemaChange={setZaiResponseSchema}
            kimiThinkingType={kimiThinkingType}
            onKimiThinkingTypeChange={setKimiThinkingType}
            kimiBaseUrl={kimiBaseUrl}
            onKimiBaseUrlChange={setKimiBaseUrl}
            geminiNanoStatus={geminiNano.status}
            geminiNanoStatusText={geminiNano.statusText}
            geminiNanoDownloadProgress={geminiNano.downloadProgress}
            geminiNanoIsPreparing={geminiNano.isPreparing}
            onGeminiNanoPrepare={geminiNano.prepareModel}
            disabled={isLoading}
          />
        </div>

        <div className="chat-section">
          <MessageList messages={messages} messagesEndRef={messagesEndRef} />

          {error && <div className="error-message">Error: {error}</div>}

          <ChatInterface
            onSendMessage={sendMessage}
            disabled={!chatService || isLoading}
            isLoading={isLoading}
            onClearChat={clearChat}
            visionSupportLevel={visionSupportLevel}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Powered by @aituber-onair/chat |
          <a
            href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;

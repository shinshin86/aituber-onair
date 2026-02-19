import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChatServiceFactory,
  ChatService,
  MODEL_GPT_5_1,
  isGPT5Model,
  type Message,
  type MessageWithVision,
  type ChatResponseLength,
  type GPT5PresetKey,
} from '@aituber-onair/chat';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ProviderSelector, {
  getProviderForModel,
  getDefaultModelForProvider,
  isVisionSupported,
} from './components/ProviderSelector';
import MessageList from './components/MessageList';

export type Provider =
  | 'openai'
  | 'openai-compatible'
  | 'claude'
  | 'gemini'
  | 'openrouter'
  | 'zai'
  | 'kimi';

interface ChatMessage extends Omit<Message, 'timestamp' | 'content'> {
  id: string;
  timestamp: Date;
  content: Message['content'] | MessageWithVision['content'];
  isStreaming?: boolean;
}

type ReasoningEffortLevel = 'none' | 'minimal' | 'low' | 'medium' | 'high';

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

  if (modelId === MODEL_GPT_5_1) {
    if (!effort) {
      return 'none';
    }
    if (effort === 'minimal') {
      return 'none';
    }
    return effort;
  }

  if (!effort || effort === 'none') {
    return 'medium';
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

  const normalizedReasoningEffort = normalizeReasoningEffortForModel(
    selectedModel,
    reasoning_effort,
  );
  const supportsVision = isVisionSupported(provider, selectedModel);
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
      provider === 'openai-compatible'
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
          options.thinking = { type: kimiThinkingType };
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
          .filter((m) => m.role !== 'assistant' || m.content)
          .map(({ role, content }) => ({ role, content }));

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
          async (complete) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: complete, isStreaming: false }
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
          <div className="brand-title">AITuber OnAir Chat</div>
          <div className="brand-subtitle">
            Sample UI for provider + model selection
          </div>
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
                  defaultModel === MODEL_GPT_5_1 ? 'none' : 'medium',
                );
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
                  modelId === MODEL_GPT_5_1 ? 'none' : 'medium',
                );
              }
            }}
            gpt5Preset={gpt5Preset}
            onGpt5PresetChange={setGpt5Preset}
            reasoning_effort={normalizedReasoningEffort}
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
            supportsVision={supportsVision}
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

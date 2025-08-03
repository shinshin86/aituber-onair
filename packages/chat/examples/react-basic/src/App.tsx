import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChatServiceFactory,
  ChatService,
  type Message,
  type MessageWithVision,
  type ChatResponseLength,
} from '@aituber-onair/chat';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ProviderSelector, {
  getProviderForModel,
  getDefaultModelForProvider,
} from './components/ProviderSelector';
import MessageList from './components/MessageList';

export type Provider = 'openai' | 'claude' | 'gemini';

interface ChatMessage extends Omit<Message, 'timestamp'> {
  id: string;
  timestamp: Date;
  isStreaming?: boolean;
}

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
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally want to scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat service when provider, API key, or model changes
  useEffect(() => {
    if (apiKey) {
      try {
        const service = ChatServiceFactory.createChatService(provider, {
          apiKey,
          responseLength,
          model: selectedModel,
        });
        setChatService(service);
        setError(null);
      } catch (err) {
        setError(`Failed to initialize ${provider}: ${err}`);
        setChatService(null);
      }
    } else {
      setChatService(null);
    }
  }, [provider, apiKey, responseLength, selectedModel]);

  const sendMessage = useCallback(
    async (content: string, imageData?: string) => {
      if (!chatService || !content.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content,
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
        <h1>AITuber OnAir Chat Example</h1>
        <p>Interactive chat with OpenAI, Claude, and Gemini</p>
      </header>

      <main className="app-main">
        <div className="config-section">
          <ProviderSelector
            provider={provider}
            onProviderChange={(newProvider) => {
              setProvider(newProvider);
              // プロバイダー変更時にそのプロバイダーのデフォルトモデルを自動選択
              const defaultModel = getDefaultModelForProvider(newProvider);
              setSelectedModel(defaultModel);
            }}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            responseLength={responseLength}
            onResponseLengthChange={setResponseLength}
            selectedModel={selectedModel}
            onModelChange={(modelId) => {
              const newProvider = getProviderForModel(modelId);
              if (newProvider !== provider) {
                setProvider(newProvider);
              }
              setSelectedModel(modelId);
            }}
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
            provider={provider}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Powered by @aituber-onair/chat |
          <a
            href="https://github.com/aituber/aituber-onair"
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

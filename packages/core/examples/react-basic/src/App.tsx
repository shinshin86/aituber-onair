import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  AITuberOnAirCoreOptions,
  GPT5_PRESETS,
  GPT5PresetKey,
  isGPT5Model,
  CHAT_RESPONSE_LENGTH,
  ChatResponseLength,
} from '@aituber-onair/core';

// Constants imports
import {
  openaiModels,
  DEFAULT_CHAT_PROVIDER,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
} from './constants/openai';
import { geminiModels } from './constants/gemini';
import { claudeModels } from './constants/claude';
import {
  type VoiceEngineType,
  VOICE_ENGINE_CONFIGS,
  DEFAULT_VOICE_ENGINE,
} from './constants/voiceEngines';
import { randomIntTool, randomIntHandler } from './constants/tools';
import { mcpServers } from './constants/mcp';

// Default icons
import defaultUserIcon from './assets/icons/default-user.svg';
import defaultAvatarIcon from './assets/icons/default-avatar.svg';

// when use MCP, uncomment the following line
// import { createMcpToolHandler } from './mcpClient';

type BaseMessage = { id: string; role: 'user' | 'assistant' };
type TextMessage = BaseMessage & { kind: 'text'; content: string };
type ImageMessage = BaseMessage & { kind: 'image'; dataUrl: string };
type Message = TextMessage | ImageMessage;

// UI Messages
const DO_NOT_SET_API_KEY_MESSAGE = 'API Keyを入力してください。';
const CORE_SETTINGS_APPLIED_MESSAGE = 'AITuberOnAirCoreの設定を反映しました！';
const DO_NOT_SETTINGS_MESSAGE = 'まずは「設定」を行ってください。';
const CORE_NOT_INITIALIZED_MESSAGE = 'AITuberOnAirCoreが初期化されていません。';

const App: React.FC = () => {
  const idCounter = useRef(0);
  const nextId = () => (++idCounter.current).toString();

  const [showSettings, setShowSettings] = useState(false);

  // initialized flag (true if configured)
  const [isConfigured, setIsConfigured] = useState(false);

  // Settings modal tab state
  const [activeTab, setActiveTab] = useState<'llm' | 'voice' | 'avatar'>('llm');

  // configuration form states
  const [apiKey, setApiKey] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>(
    DEFAULT_SYSTEM_PROMPT,
  );
  const [chatProvider, setChatProvider] = useState<string>(
    DEFAULT_CHAT_PROVIDER,
  );
  const [model, setModel] = useState<string>(DEFAULT_MODEL);

  // DeepWiki MCP enable flag
  const [enableDeepWikiMcp, setEnableDeepWikiMcp] = useState<boolean>(false);

  // GPT-5 and response settings
  const [responseLength, setResponseLength] = useState<ChatResponseLength>(
    CHAT_RESPONSE_LENGTH.MEDIUM,
  );
  const [gpt5Preset, setGpt5Preset] = useState<GPT5PresetKey | 'custom'>(
    'balanced',
  );
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>(
    'medium',
  );
  const [reasoning_effort, setReasoningEffort] = useState<
    'minimal' | 'low' | 'medium' | 'high'
  >('medium');
  const [gpt5EndpointPreference, setGpt5EndpointPreference] = useState<
    'chat' | 'responses'
  >('chat');

  // chat messages state
  const [messages, setMessages] = useState<Message[]>([]);
  // reference to the latest messages
  const messagesRef = useRef<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [partialTextBuffer, setPartialTextBuffer] = useState('');

  // image attachment state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  // Voice settings state
  const [selectedVoiceEngine, setSelectedVoiceEngine] = useState<VoiceEngineType>(DEFAULT_VOICE_ENGINE);
  const [voiceApiKeys, setVoiceApiKeys] = useState<Record<string, string>>({});

  // Voice playback state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Avatar settings state
  const [avatarImageUrl, setAvatarImageUrl] = useState<string>(defaultAvatarIcon);

  // AITuberOnAirCore instance reference
  const aituberRef = useRef<AITuberOnAirCore | null>(null);

  /**
   * when chat provider changes, reset the model to the first one
   */
  useEffect(() => {
    switch (chatProvider) {
      case 'openai':
        setModel(openaiModels[0]);
        break;
      case 'gemini':
        setModel(geminiModels[0]);
        break;
      case 'claude':
        setModel(claudeModels[0]);
        break;
      default:
        setModel(openaiModels[0]);
        break;
    }
  }, [chatProvider]);

  /**
   * when GPT-5 preset changes, update verbosity and reasoning_effort
   */
  useEffect(() => {
    if (gpt5Preset !== 'custom' && gpt5Preset in GPT5_PRESETS) {
      const preset = GPT5_PRESETS[gpt5Preset];
      setVerbosity(preset.verbosity);
      setReasoningEffort(preset.reasoning_effort);
    }
  }, [gpt5Preset]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * convert messages to API format
   */
  const convertMessagesToApiFormat = (msgs: Message[]) => {
    const apiMessages: any[] = [];
    let currentImageUrl: string | null = null;

    for (const msg of msgs) {
      if (msg.role === 'user') {
        if (msg.kind === 'image') {
          // Store image URL for combining with next text message
          currentImageUrl = msg.dataUrl;
        } else if (msg.kind === 'text') {
          if (currentImageUrl) {
            // Combine image and text into a single message with VisionBlock format
            apiMessages.push({
              role: 'user',
              content: [
                { type: 'text', text: msg.content },
                {
                  type: 'image_url',
                  image_url: {
                    url: currentImageUrl,
                    detail: 'low',
                  },
                },
              ],
            });
            currentImageUrl = null;
          } else {
            // Text only message
            apiMessages.push({
              role: 'user',
              content: msg.content,
            });
          }
        }
      } else {
        // Assistant messages are always text
        if (msg.kind === 'text') {
          apiMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // If there's a dangling image without text, add it with default prompt
    if (currentImageUrl) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'この画像について説明してください。' },
          {
            type: 'image_url',
            image_url: {
              url: currentImageUrl,
              detail: 'low',
            },
          },
        ],
      });
    }

    return apiMessages;
  };

  /**
   * initialize AITuberOnAirCore
   */
  const initializeAITuber = () => {
    if (!apiKey.trim()) {
      alert(DO_NOT_SET_API_KEY_MESSAGE);
      return;
    }

    // if existing instance exists, remove listeners
    if (aituberRef.current) {
      aituberRef.current.removeAllListeners();
    }

    // prepare provider options for GPT-5 models
    const providerOptions: Record<string, any> = {};
    if (chatProvider === 'openai' && model && isGPT5Model(model)) {
      // Add GPT-5 specific options
      if (gpt5Preset !== 'custom') {
        providerOptions.gpt5Preset = gpt5Preset;
      } else {
        // Use custom settings
        providerOptions.verbosity = verbosity;
        providerOptions.reasoning_effort = reasoning_effort;
      }
      providerOptions.gpt5EndpointPreference = gpt5EndpointPreference;
    }

    // prepare voice options if enabled
    const createVoiceOptions = () => {
      if (selectedVoiceEngine === 'none') {
        return undefined;
      }

      const config = VOICE_ENGINE_CONFIGS[selectedVoiceEngine];
      const options: any = {
        engineType: selectedVoiceEngine,
        speaker: config.speaker,
        onComplete: () => {
          console.log('Voice playback completed');
          setIsSpeaking(false);
        },
      };

      // Add API key if needed
      if (config.needsApiKey) {
        const apiKey = voiceApiKeys[selectedVoiceEngine];
        if (apiKey) {
          if (selectedVoiceEngine === 'minimax') {
            const [key, groupId] = apiKey.split(':');
            if (groupId) {
              options.apiKey = key;
              options.groupId = groupId;
            }
          } else {
            options.apiKey = apiKey.trim();
          }
        }
      }

      // Add API URL if specified
      if (config.apiUrl) {
        switch (selectedVoiceEngine) {
          case 'voicevox':
            options.voicevoxApiUrl = config.apiUrl;
            break;
          case 'voicepeak':
            options.voicepeakApiUrl = config.apiUrl;
            break;
          case 'aivisSpeech':
            options.aivisSpeechApiUrl = config.apiUrl;
            break;
        }
      }

      // Add engine-specific options
      switch (selectedVoiceEngine) {
        case 'aivisCloud':
          Object.assign(options, {
            aivisCloudModelUuid: config.speaker,
            aivisCloudSpeakingRate: config.defaultParams?.speakingRate,
            aivisCloudEmotionalIntensity: config.defaultParams?.emotionalIntensity,
            aivisCloudPitch: config.defaultParams?.pitch,
            aivisCloudVolume: config.defaultParams?.volume,
            aivisCloudOutputFormat: config.defaultParams?.outputFormat,
            aivisCloudUseSSML: true,
          });
          break;
        case 'minimax':
          if (config.defaultParams?.endpoint) {
            options.endpoint = config.defaultParams.endpoint;
          }
          break;
      }

      return options;
    };

    const voiceOptions = createVoiceOptions();

    // create options
    const aituberOptions: AITuberOnAirCoreOptions = {
      chatProvider,
      apiKey: apiKey.trim(),
      model,
      chatOptions: {
        systemPrompt: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
        responseLength,
      },
      providerOptions,
      tools: [{ definition: randomIntTool, handler: randomIntHandler }],
      mcpServers: enableDeepWikiMcp ? mcpServers : [],
      voiceOptions,
      debug: true,
    };

    // create new instance
    const newAITuber = new AITuberOnAirCore(aituberOptions);

    // register event listeners
    setupEventListeners(newAITuber);

    // store the instance
    aituberRef.current = newAITuber;

    // if there is existing chat history, set it
    if (messagesRef.current.length > 0) {
      newAITuber.setChatHistory(
        convertMessagesToApiFormat(messagesRef.current),
      );
    }

    // set the configured flag to true
    setIsConfigured(true);

    console.log('AITuberOnAirCore initialized with options:', aituberOptions);
    alert(CORE_SETTINGS_APPLIED_MESSAGE);
  };

  /**
   * register event listeners
   */
  const setupEventListeners = (instance: AITuberOnAirCore) => {
    instance.on(AITuberOnAirCoreEvent.PROCESSING_START, (data: any) => {
      console.log('Processing started:', data);
    });

    instance.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      console.log('Processing completed');

      // if processing is completed, get the latest chat history
      if (aituberRef.current) {
        const updatedHistory = aituberRef.current.getChatHistory();
        console.log('Updated chat history:', updatedHistory);
      }
    });

    instance.on(
      AITuberOnAirCoreEvent.ASSISTANT_PARTIAL,
      (partialText: string) => {
        console.log('Assistant partial:', partialText);
        updateAssistantPartial(partialText);
      },
    );

    instance.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data: any) => {
      const { message } = data;
      console.log('Assistant response completed:', message.content);
      removeAssistantPartial();

      addMessageToUI({
        id: nextId(),
        role: 'assistant',
        kind: 'text',
        content: message.content,
      });
    });

    instance.on(AITuberOnAirCoreEvent.ERROR, (error: any) => {
      console.error('An error occurred:', error);
      alert(`An error occurred:: ${error}`);
    });

    instance.on(AITuberOnAirCoreEvent.TOOL_USE, (data: any) => {
      console.log('Tool use:', data);
    });

    instance.on(AITuberOnAirCoreEvent.TOOL_RESULT, (data: any) => {
      console.log('Tool result:', data);
    });

    instance.on(AITuberOnAirCoreEvent.SPEECH_START, (data: any) => {
      console.log('Speech started:', data);
      setIsSpeaking(true);
    });

    instance.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    });
  };

  /**
   * send message
   */
  const handleSendMessage = async () => {
    // if not configured, return
    if (!isConfigured) {
      alert(DO_NOT_SETTINGS_MESSAGE);
      return;
    }
    if (!aituberRef.current) {
      alert(CORE_NOT_INITIALIZED_MESSAGE);
      return;
    }

    // get user input and image data URL
    const userMessage = userInput.trim();
    const attachedImageUrl = imageDataUrl;

    if (!userMessage && !attachedImageUrl) return;

    const drafts: Message[] = [];
    if (attachedImageUrl)
      drafts.push({
        id: nextId(),
        role: 'user',
        kind: 'image',
        dataUrl: attachedImageUrl,
      });
    if (userMessage)
      drafts.push({
        id: nextId(),
        role: 'user',
        kind: 'text',
        content: userMessage,
      });

    setMessages((prev) => {
      const newMessages = [...prev, ...drafts];
      aituberRef.current!.setChatHistory(
        convertMessagesToApiFormat(newMessages),
      );
      return newMessages;
    });

    setUserInput('');
    setPartialTextBuffer('');
    setImageDataUrl(null);

    // if image is attached, call vision API
    // if only text, call normal chat API
    if (attachedImageUrl) {
      // send image to AITuberOnAirCore (Vision API)
      console.log('Calling processVisionChat with image...');
      await aituberRef.current.processVisionChat(attachedImageUrl, userMessage);
    } else {
      // send text to AITuberOnAirCore
      console.log('Calling processChat with text...');
      await aituberRef.current.processChat(userMessage);
    }
  };

  /**
   * clear chat history
   */
  const clearChatHistory = () => {
    if (aituberRef.current) {
      aituberRef.current.setChatHistory([]);
      setMessages([]);
      messagesRef.current = [];
      console.log('Chat history cleared');
    }
  };

  /**
   * add message to UI
   */
  const addMessageToUI = (msg: Message) =>
    setMessages((prev) => [...prev, msg]);

  const updateAssistantPartial = (partialText: string) => {
    setPartialTextBuffer((prev) => prev + partialText);
  };

  const removeAssistantPartial = () => {
    setPartialTextBuffer('');
  };

  /**
   * file input onChange: convert selected image to DataURL and store it in state
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageDataUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setImageDataUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * avatar image upload onChange: convert selected image to DataURL and store it in state
   */
  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setAvatarImageUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * apply settings
   */
  const handleApplySettings = () => {
    initializeAITuber();
    setShowSettings(false);
  };

  const handleCancelSettings = () => {
    setShowSettings(false);
  };

  return (
    <>
      <header>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1>Simple AI Chat</h1>
          <div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                backgroundColor: '#2e997d',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                marginRight: '8px',
              }}
            >
              設定
            </button>
            <button
              onClick={clearChatHistory}
              style={{
                backgroundColor: '#e01e5a',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
              }}
            >
              履歴クリア
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div id="chat-container" className="section">
          <h2>チャット</h2>
          <div>
            選択中のモデル：{chatProvider} / {model}
          </div>
          {selectedVoiceEngine !== 'none' && (
            <div style={{ color: '#2e997d' }}>
              音声合成: 有効 ({VOICE_ENGINE_CONFIGS[selectedVoiceEngine].name})
            </div>
          )}
          {isSpeaking && (
            <div style={{ color: '#1e90ff', fontWeight: 'bold' }}>
              🔊 音声再生中...
            </div>
          )}
          {!apiKey && (
            <div style={{ color: '#e01e5a' }}>
              API Keyが設定されていません。
            </div>
          )}

          {/* チャットメッセージの表示 */}
          <div id="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <img
                  src={msg.role === 'user' ? defaultUserIcon : avatarImageUrl}
                  alt={`${msg.role} avatar`}
                  className="message-avatar"
                />
                <div className="message-content">
                  {msg.kind === 'text' && <div>{msg.content}</div>}
                  {msg.kind === 'image' && (
                    <img
                      src={msg.dataUrl}
                      alt="Attached"
                      style={{
                        maxWidth: '200px',
                        display: 'block',
                        marginTop: '8px',
                        borderRadius: '8px',
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            {/* assistant's partial response */}
            {partialTextBuffer && (
              <div className="message assistant assistant-partial">
                <img
                  src={avatarImageUrl}
                  alt="assistant avatar"
                  className="message-avatar"
                />
                <div className="message-content">
                  {partialTextBuffer}
                </div>
              </div>
            )}
          </div>

          <div className="input-area" style={{ marginTop: '1rem' }}>
            <input
              type="text"
              id="user-input"
              placeholder={
                isConfigured ? 'メッセージを入力...' : '設定を完了してください'
              }
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={!isConfigured}
            />

            {/* 画像添付 */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={!isConfigured}
              style={{ width: '180px' }}
            />

            {/* 送信ボタン */}
            <button
              id="send-btn"
              onClick={handleSendMessage}
              disabled={!isConfigured}
            >
              送信
            </button>
          </div>
          {imageDataUrl && <img src={imageDataUrl} alt="preview" />}
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              height: '80vh',
              maxHeight: '90vh',
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2 style={{ marginBottom: '16px' }}>設定</h2>
            
            {/* Tab Headers */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid #ddd',
                marginBottom: '20px',
              }}
            >
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: activeTab === 'llm' ? '#2e997d' : 'transparent',
                  color: activeTab === 'llm' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom: activeTab === 'llm' ? '3px solid #2e997d' : 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === 'llm' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveTab('llm')}
              >
                LLM設定
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: activeTab === 'voice' ? '#2e997d' : 'transparent',
                  color: activeTab === 'voice' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom: activeTab === 'voice' ? '3px solid #2e997d' : 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === 'voice' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveTab('voice')}
              >
                音声設定
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: activeTab === 'avatar' ? '#2e997d' : 'transparent',
                  color: activeTab === 'avatar' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom: activeTab === 'avatar' ? '3px solid #2e997d' : 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === 'avatar' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => setActiveTab('avatar')}
              >
                アバター設定
              </button>
            </div>

            {/* Tab Content */}
            <div
              style={{ 
                flex: '1 1 auto',
                overflowY: 'auto', 
                paddingRight: '8px',
                minHeight: '0'
              }}
            >
              {activeTab === 'llm' ? (
                <div>
                  {/* LLM Settings */}
                  <label htmlFor="apiKey">API Key:</label>
                  <input
                    type="password"
                    id="apiKey"
                    placeholder="..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />

                  <label htmlFor="systemPrompt">System Prompt:</label>
                  <textarea
                    id="systemPrompt"
                    placeholder="あなたはフレンドリーなAITuberです..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />

                  <label htmlFor="chatProvider">Chat Provider:</label>
                  <select
                    id="chatProvider"
                    value={chatProvider}
                    onChange={(e) => setChatProvider(e.target.value)}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="claude">Claude</option>
                  </select>

                  <label htmlFor="model">Model:</label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                {chatProvider === 'openai' &&
                  openaiModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                {chatProvider === 'gemini' &&
                  geminiModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                {chatProvider === 'claude' &&
                  claudeModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </select>

              <label htmlFor="responseLength">Response Length:</label>
              <select
                id="responseLength"
                value={responseLength}
                onChange={(e) =>
                  setResponseLength(e.target.value as ChatResponseLength)
                }
              >
                <option value={CHAT_RESPONSE_LENGTH.VERY_SHORT}>
                  Very Short (40 tokens)
                </option>
                <option value={CHAT_RESPONSE_LENGTH.SHORT}>
                  Short (100 tokens)
                </option>
                <option value={CHAT_RESPONSE_LENGTH.MEDIUM}>
                  Medium (200 tokens)
                </option>
                <option value={CHAT_RESPONSE_LENGTH.LONG}>
                  Long (300 tokens)
                </option>
                <option value={CHAT_RESPONSE_LENGTH.VERY_LONG}>
                  Very Long (1000 tokens)
                </option>
                <option value={CHAT_RESPONSE_LENGTH.DEEP}>
                  Deep (5000 tokens)
                </option>
              </select>

              {/* GPT-5 specific settings */}
              {chatProvider === 'openai' && model && isGPT5Model(model) && (
                <div style={{ marginTop: '16px' }}>
                  <hr />
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <h3 style={{ marginTop: 0 }}>GPT-5 Settings</h3>

                    <label htmlFor="gpt5Preset">Preset:</label>
                    <select
                      id="gpt5Preset"
                      value={gpt5Preset}
                      onChange={(e) =>
                        setGpt5Preset(
                          e.target.value as GPT5PresetKey | 'custom',
                        )
                      }
                    >
                      <option value="casual">
                        Casual - Fast responses for quick questions
                      </option>
                      <option value="balanced">
                        Balanced - For business tasks and problem solving
                      </option>
                      <option value="expert">
                        Expert - Deep reasoning for complex analysis
                      </option>
                      <option value="custom">
                        Custom - Configure manually
                      </option>
                    </select>

                    {gpt5Preset === 'custom' && (
                      <>
                        <label htmlFor="verbosity">Verbosity:</label>
                        <select
                          id="verbosity"
                          value={verbosity}
                          onChange={(e) =>
                            setVerbosity(
                              e.target.value as 'low' | 'medium' | 'high',
                            )
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>

                        <label htmlFor="reasoning_effort">
                          Reasoning Effort:
                        </label>
                        <select
                          id="reasoning_effort"
                          value={reasoning_effort}
                          onChange={(e) =>
                            setReasoningEffort(
                              e.target.value as
                                | 'minimal'
                                | 'low'
                                | 'medium'
                                | 'high',
                            )
                          }
                        >
                          <option value="minimal">Minimal</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </>
                    )}

                    <label htmlFor="gpt5EndpointPreference">
                      Endpoint Preference:
                    </label>
                    <select
                      id="gpt5EndpointPreference"
                      value={gpt5EndpointPreference}
                      onChange={(e) =>
                        setGpt5EndpointPreference(
                          e.target.value as 'chat' | 'responses',
                        )
                      }
                    >
                      <option value="chat">Chat Completions API</option>
                      <option value="responses">Responses API</option>
                    </select>
                  </div>
                  <hr />
                </div>
              )}

                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor="enableDeepWikiMcp">
                      DeepWiki MCPを有効にする:
                    </label>
                    <input
                      type="checkbox"
                      id="enableDeepWikiMcp"
                      checked={enableDeepWikiMcp}
                      onChange={(e) => setEnableDeepWikiMcp(e.target.checked)}
                      style={{ marginLeft: '8px' }}
                    />
                  </div>
                </div>
              ) : activeTab === 'voice' ? (
                <div>
                  {/* Voice Settings */}
                  <h3 style={{ marginTop: '0', marginBottom: '16px' }}>音声設定</h3>

                  <label htmlFor="voiceEngine" style={{ marginTop: '16px', display: 'block' }}>
                    音声エンジン:
                  </label>
                  <select
                    id="voiceEngine"
                    value={selectedVoiceEngine}
                    onChange={(e) => setSelectedVoiceEngine(e.target.value as VoiceEngineType)}
                    style={{ width: '100%', marginBottom: '12px' }}
                  >
                    {Object.entries(VOICE_ENGINE_CONFIGS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name}
                      </option>
                    ))}
                  </select>

                  {selectedVoiceEngine !== 'none' && VOICE_ENGINE_CONFIGS[selectedVoiceEngine].needsApiKey && (
                    <>
                      <label htmlFor="voiceApiKey" style={{ marginTop: '16px', display: 'block' }}>
                        {VOICE_ENGINE_CONFIGS[selectedVoiceEngine].name} API Key:
                      </label>
                      <input
                        type="password"
                        id="voiceApiKey"
                        placeholder={VOICE_ENGINE_CONFIGS[selectedVoiceEngine].placeholder}
                        value={voiceApiKeys[selectedVoiceEngine] || ''}
                        onChange={(e) => setVoiceApiKeys(prev => ({
                          ...prev,
                          [selectedVoiceEngine]: e.target.value
                        }))}
                        style={{ width: '100%', marginBottom: '8px' }}
                      />
                    </>
                  )}

                  {selectedVoiceEngine !== 'none' && VOICE_ENGINE_CONFIGS[selectedVoiceEngine].apiUrl && (
                    <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '12px' }}>
                      <strong>API URL:</strong> {VOICE_ENGINE_CONFIGS[selectedVoiceEngine].apiUrl}
                    </div>
                  )}

                  {selectedVoiceEngine !== 'none' && (
                    <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '12px' }}>
                      ※ 音声パラメータは最適な値に固定されています
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Avatar Settings */}
                  <h3 style={{ marginTop: '0', marginBottom: '16px' }}>アバター設定</h3>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <img
                      src={avatarImageUrl}
                      alt="Avatar preview"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #e0e0e0',
                        display: 'block',
                        marginBottom: '12px'
                      }}
                    />
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      現在のアバター画像
                    </div>
                  </div>

                  <label htmlFor="avatarUpload" style={{ marginTop: '16px', display: 'block' }}>
                    アバター画像をアップロード:
                  </label>
                  <input
                    type="file"
                    id="avatarUpload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ marginBottom: '8px', width: '100%' }}
                  />
                  <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '16px' }}>
                    ※ 画像は自動的に円形にクロップされます
                  </div>
                  
                  <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginTop: '16px' }}>
                    <div style={{ fontSize: '0.9em', color: '#495057' }}>
                      <strong>ヒント：</strong>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>正方形に近い画像がベストです</li>
                        <li>推奨サイズ：200px × 200px 以上</li>
                        <li>対応形式：JPG、PNG、WebP</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '16px',
                textAlign: 'right',
                borderTop: '1px solid #ccc',
                paddingTop: '16px',
                flexShrink: 0,
              }}
            >
              <button
                style={{ marginRight: '8px', backgroundColor: '#666' }}
                onClick={handleCancelSettings}
              >
                キャンセル
              </button>
              <button
                onClick={handleApplySettings}
                style={{ backgroundColor: '#2e997d' }}
              >
                設定を反映
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;

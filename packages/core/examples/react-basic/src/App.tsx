import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  AITuberOnAirCoreOptions,
  GPT5_PRESETS,
  GPT5PresetKey,
  isGPT5Model,
  MODEL_GPT_5_1,
  VISION_SUPPORTED_MODELS,
  GEMINI_VISION_SUPPORTED_MODELS,
  CLAUDE_VISION_SUPPORTED_MODELS,
  ZAI_VISION_SUPPORTED_MODELS,
  CHAT_RESPONSE_LENGTH,
  ChatResponseLength,
  type MinimaxModel,
  type MinimaxAudioFormat,
  type VoiceVoxQueryParameterOverrides,
  type AivisSpeechQueryParameterOverrides,
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
import { zaiModels } from './constants/zai';
import {
  type VoiceEngineType,
  VOICE_ENGINE_CONFIGS,
  DEFAULT_VOICE_ENGINE,
} from './constants/voiceEngines';
import { randomIntTool, randomIntHandler } from './constants/tools';
import { mcpServers } from './constants/mcp';

// Speaker constants
import { OPENAI_TTS_SPEAKERS } from './constants/speakers/openaiTts';
import { VOICEPEAK_SPEAKERS } from './constants/speakers/voicepeak';
import { AIVIS_CLOUD_MODELS } from './constants/speakers/aivisCloud';

// Default icons
import defaultUserIcon from './assets/icons/default-user.svg';
import defaultAvatarIcon from './assets/icons/default-avatar.svg';
import { AIVIS_SPEECH_API_ENDPOINT } from './constants/speakers/aivisSpeech';
import { VOICEVOX_API_ENDPOINT } from './constants/speakers/voicevox';

// Avatar image generation utilities
import {
  generateAvatarImage,
  createAvatarPrompt,
  revokeObjectUrl,
} from './utils/geminiImageGeneration';

// when use MCP, uncomment the following line
// import { createMcpToolHandler } from './mcpClient';

// MiniMax model options with descriptions
const MINIMAX_MODELS: Record<MinimaxModel, string> = {
  'speech-2.6-hd':
    'Latest flagship HD model with ultra-high fidelity and natural prosody.',
  'speech-2.6-turbo':
    'Latest Turbo model optimized for low latency and real-time responses.',
  'speech-2.5-hd-preview':
    'The brand new HD model. Ultimate Similarity, Ultra-High Quality',
  'speech-2.5-turbo-preview':
    'The brand new Turbo model. Ultimate Value, 40 Languages',
  'speech-02-hd':
    'Superior rhythm and stability, with outstanding performance in replication similarity and sound quality.',
  'speech-02-turbo':
    'Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance.',
  'speech-01-hd': 'Rich Voices, Expressive Emotions, Authentic Languages',
  'speech-01-turbo': 'Excellent performance and low latency',
};

type ReasoningEffortLevel = 'none' | 'minimal' | 'low' | 'medium' | 'high';

// MiniMax Voice IDs with descriptions
const MINIMAX_VOICES: Record<string, string> = {
  'male-qn-qingse': 'Male - Qingse (Default)',
  Wise_Woman: 'Wise Woman',
  Friendly_Person: 'Friendly Person',
  Inspirational_girl: 'Inspirational Girl',
  Deep_Voice_Man: 'Deep Voice Man',
  Calm_Woman: 'Calm Woman',
  Casual_Guy: 'Casual Guy',
  Lively_Girl: 'Lively Girl',
  Patient_Man: 'Patient Man',
  Young_Knight: 'Young Knight',
  Determined_Man: 'Determined Man',
  Lovely_Girl: 'Lovely Girl',
  Decent_Boy: 'Decent Boy',
  Imposing_Manner: 'Imposing Manner',
  Elegant_Man: 'Elegant Man',
  Abbess: 'Abbess',
  Sweet_Girl_2: 'Sweet Girl 2',
  Exuberant_Girl: 'Exuberant Girl',
};

type BaseMessage = { id: string; role: 'user' | 'assistant' };
type TextMessage = BaseMessage & { kind: 'text'; content: string };
type ImageMessage = BaseMessage & { kind: 'image'; dataUrl: string };
type Message = TextMessage | ImageMessage;

type AivisCloudBooleanOption = 'default' | 'true' | 'false';
type AivisCloudOutputFormatOption =
  | 'default'
  | 'wav'
  | 'flac'
  | 'mp3'
  | 'aac'
  | 'opus';
type AivisCloudOutputSamplingRateOption =
  | 'default'
  | '8000'
  | '11025'
  | '12000'
  | '16000'
  | '22050'
  | '24000'
  | '44100'
  | '48000';
type AivisCloudOutputChannelOption = 'default' | 'mono' | 'stereo';
type VoicePeakEmotionOption =
  | 'neutral'
  | 'happy'
  | 'fun'
  | 'angry'
  | 'sad'
  | 'surprised';

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
    'casual',
  );
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>(
    'medium',
  );
  const [reasoning_effort, setReasoningEffort] = useState<ReasoningEffortLevel>(
    'medium',
  );
  const [gpt5EndpointPreference, setGpt5EndpointPreference] = useState<
    'chat' | 'responses'
  >('chat');

  const normalizeReasoningEffortForModel = (
    targetModel: string | undefined,
    effort?: ReasoningEffortLevel,
  ): ReasoningEffortLevel => {
  if (targetModel === MODEL_GPT_5_1) {
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

  // chat messages state
  const [messages, setMessages] = useState<Message[]>([]);
  // reference to the latest messages
  const messagesRef = useRef<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [partialTextBuffer, setPartialTextBuffer] = useState('');

  // image attachment state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const supportsVision = (() => {
    if (!model) {
      return false;
    }
    switch (chatProvider) {
      case 'openai':
        return VISION_SUPPORTED_MODELS.includes(model);
      case 'gemini':
        return GEMINI_VISION_SUPPORTED_MODELS.includes(model);
      case 'claude':
        return CLAUDE_VISION_SUPPORTED_MODELS.includes(model);
      case 'zai':
        return ZAI_VISION_SUPPORTED_MODELS.includes(model);
      default:
        return false;
    }
  })();

  // Voice settings state
  const [selectedVoiceEngine, setSelectedVoiceEngine] =
    useState<VoiceEngineType>(DEFAULT_VOICE_ENGINE);
  const [voiceApiKeys, setVoiceApiKeys] = useState<Record<string, string>>({});
  const [minimaxGroupId, setMinimaxGroupId] = useState<string>('');
  const [minimaxModel, setMinimaxModel] = useState<MinimaxModel>(
    'speech-2.6-hd',
  );
  const [minimaxLanguageBoost, setMinimaxLanguageBoost] =
    useState<string>('Japanese');
  const [minimaxSpeed, setMinimaxSpeed] = useState<string>('');
  const [minimaxVolume, setMinimaxVolume] = useState<string>('');
  const [minimaxPitch, setMinimaxPitch] = useState<string>('');
  const [minimaxSampleRate, setMinimaxSampleRate] = useState<string>('32000');
  const [minimaxBitrate, setMinimaxBitrate] = useState<string>('128000');
  const [minimaxAudioFormat, setMinimaxAudioFormat] =
    useState<MinimaxAudioFormat>('mp3');
  const [minimaxAudioChannel, setMinimaxAudioChannel] = useState<'1' | '2'>(
    '1',
  );
  const [voicevoxSpeedScale, setVoicevoxSpeedScale] = useState<string>('');
  const [voicevoxPitchScale, setVoicevoxPitchScale] = useState<string>('');
  const [voicevoxIntonationScale, setVoicevoxIntonationScale] =
    useState<string>('');
  const [voicevoxVolumeScale, setVoicevoxVolumeScale] = useState<string>('');
  const [voicevoxPrePhonemeLength, setVoicevoxPrePhonemeLength] =
    useState<string>('');
  const [voicevoxPostPhonemeLength, setVoicevoxPostPhonemeLength] =
    useState<string>('');
  const [voicevoxPauseLength, setVoicevoxPauseLength] = useState<string>('');
  const [voicevoxPauseLengthScale, setVoicevoxPauseLengthScale] =
    useState<string>('');
  const [voicevoxOutputSamplingRate, setVoicevoxOutputSamplingRate] =
    useState<string>('default');
  const [voicevoxOutputStereo, setVoicevoxOutputStereo] = useState<
    'default' | 'mono' | 'stereo'
  >('default');
  const [voicevoxEnableKatakanaEnglish, setVoicevoxEnableKatakanaEnglish] =
    useState<'default' | 'true' | 'false'>('default');
  const [
    voicevoxEnableInterrogativeUpspeak,
    setVoicevoxEnableInterrogativeUpspeak,
  ] = useState<'default' | 'true' | 'false'>('default');
  const [voicevoxCoreVersion, setVoicevoxCoreVersion] = useState<string>('');
  const [voicepeakEmotion, setVoicepeakEmotion] =
    useState<VoicePeakEmotionOption>('neutral');
  const [voicepeakSpeed, setVoicepeakSpeed] = useState<string>('');
  const [voicepeakPitch, setVoicepeakPitch] = useState<string>('');
  const [openaiSpeed, setOpenaiSpeed] = useState<string>('');
  const [aivisCloudModelUuid, setAivisCloudModelUuid] = useState<string>('');
  const [aivisCloudSpeakerUuid, setAivisCloudSpeakerUuid] =
    useState<string>('');
  const [aivisCloudStyleId, setAivisCloudStyleId] = useState<string>('');
  const [aivisCloudStyleName, setAivisCloudStyleName] = useState<string>('');
  const [aivisCloudUseSsml, setAivisCloudUseSsml] =
    useState<AivisCloudBooleanOption>('default');
  const [aivisCloudLanguage, setAivisCloudLanguage] = useState<string>('ja');
  const [aivisCloudSpeakingRate, setAivisCloudSpeakingRate] =
    useState<string>('');
  const [aivisCloudEmotionalIntensity, setAivisCloudEmotionalIntensity] =
    useState<string>('');
  const [aivisCloudTempoDynamics, setAivisCloudTempoDynamics] =
    useState<string>('');
  const [aivisCloudPitch, setAivisCloudPitch] = useState<string>('');
  const [aivisCloudVolume, setAivisCloudVolume] = useState<string>('');
  const [aivisCloudLeadingSilence, setAivisCloudLeadingSilence] =
    useState<string>('');
  const [aivisCloudTrailingSilence, setAivisCloudTrailingSilence] =
    useState<string>('');
  const [aivisCloudLineBreakSilence, setAivisCloudLineBreakSilence] =
    useState<string>('');
  const [aivisCloudOutputFormat, setAivisCloudOutputFormat] =
    useState<AivisCloudOutputFormatOption>('default');
  const [aivisCloudOutputBitrate, setAivisCloudOutputBitrate] =
    useState<string>('');
  const [aivisCloudOutputSamplingRate, setAivisCloudOutputSamplingRate] =
    useState<AivisCloudOutputSamplingRateOption>('default');
  const [aivisCloudOutputChannels, setAivisCloudOutputChannels] =
    useState<AivisCloudOutputChannelOption>('default');
  const [aivisCloudUserDictionaryUuid, setAivisCloudUserDictionaryUuid] =
    useState<string>('');
  const [aivisCloudEnableBillingLogs, setAivisCloudEnableBillingLogs] =
    useState<AivisCloudBooleanOption>('default');
  const [aivisSpeedScale, setAivisSpeedScale] = useState<string>('');
  const [aivisPitchScale, setAivisPitchScale] = useState<string>('');
  const [aivisIntonationScale, setAivisIntonationScale] = useState<string>('');
  const [aivisTempoDynamicsScale, setAivisTempoDynamicsScale] =
    useState<string>('');
  const [aivisVolumeScale, setAivisVolumeScale] = useState<string>('');
  const [aivisPrePhonemeLength, setAivisPrePhonemeLength] =
    useState<string>('');
  const [aivisPostPhonemeLength, setAivisPostPhonemeLength] =
    useState<string>('');
  const [aivisPauseLength, setAivisPauseLength] = useState<string>('');
  const [aivisPauseLengthScale, setAivisPauseLengthScale] =
    useState<string>('');
  const [aivisOutputSamplingRate, setAivisOutputSamplingRate] =
    useState<string>('default');
  const [aivisOutputStereo, setAivisOutputStereo] = useState<
    'default' | 'mono' | 'stereo'
  >('default');
  const [selectedSpeakers, setSelectedSpeakers] = useState<
    Record<string, string | number>
  >({
    openai: 'alloy',
    voicevox: '',
    aivisSpeech: '',
    aivisCloud: 'a59cb814-0083-4369-8542-f51a29e72af7',
    voicepeak: 'f1',
    nijivoice: '',
    minimax: 'male-qn-qingse',
  });
  const [availableSpeakers, setAvailableSpeakers] = useState<
    Record<string, any[]>
  >({});

  // Voice playback state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Avatar settings state
  const [avatarImageUrl, setAvatarImageUrl] =
    useState<string>(defaultAvatarIcon);
  const [enableAvatarGeneration, setEnableAvatarGeneration] =
    useState<boolean>(false);
  const [geminiImageApiKey, setGeminiImageApiKey] = useState<string>('');
  const [generatedAvatarImage, setGeneratedAvatarImage] = useState<
    string | null
  >(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState<boolean>(false);

  // AITuberOnAirCore instance reference
  const aituberRef = useRef<AITuberOnAirCore | null>(null);

  /**
   * Fetch speakers for dynamic voice engines
   */
  const fetchSpeakers = async (engine: VoiceEngineType) => {
    try {
      switch (engine) {
        case 'voicevox': {
          const response = await fetch(`${VOICEVOX_API_ENDPOINT}/speakers`);
          if (response.ok) {
            const speakers = await response.json();
            setAvailableSpeakers((prev) => ({ ...prev, voicevox: speakers }));
            // Auto-select first speaker if none selected
            if (!selectedSpeakers.voicevox && speakers.length > 0) {
              const firstSpeaker = speakers[0];
              const speakerId =
                firstSpeaker.styles?.[0]?.id || firstSpeaker.speaker_uuid;
              setSelectedSpeakers((prev) => ({ ...prev, voicevox: speakerId }));
            }
          }
          break;
        }
        case 'aivisSpeech': {
          const response = await fetch(`${AIVIS_SPEECH_API_ENDPOINT}/speakers`);
          if (response.ok) {
            const speakers = await response.json();
            setAvailableSpeakers((prev) => ({
              ...prev,
              aivisSpeech: speakers,
            }));
            // Auto-select first speaker if none selected
            if (!selectedSpeakers.aivisSpeech && speakers.length > 0) {
              const firstStyle = speakers[0]?.styles?.[0];
              if (firstStyle) {
                setSelectedSpeakers((prev) => ({
                  ...prev,
                  aivisSpeech: firstStyle.id,
                }));
              }
            }
          }
          break;
        }
        case 'nijivoice': {
          const apiKey = voiceApiKeys.nijivoice;
          if (apiKey) {
            const response = await fetch(
              'https://api.nijivoice.com/api/platform/v1/voice-actors',
              {
                headers: {
                  'x-api-key': apiKey,
                },
              },
            );
            if (response.ok) {
              const data = await response.json();
              setAvailableSpeakers((prev) => ({
                ...prev,
                nijivoice: data.voiceActors || [],
              }));
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch speakers for ${engine}:`, error);
    }
  };

  /**
   * when voice engine changes, fetch speakers if needed
   */
  useEffect(() => {
    if (selectedVoiceEngine !== 'none') {
      if (
        ['voicevox', 'aivisSpeech', 'nijivoice'].includes(selectedVoiceEngine)
      ) {
        fetchSpeakers(selectedVoiceEngine);
      }
    }

    if (selectedVoiceEngine === 'voicevox') {
      setVoicevoxSpeedScale('');
      setVoicevoxPitchScale('');
      setVoicevoxIntonationScale('');
      setVoicevoxVolumeScale('');
      setVoicevoxPrePhonemeLength('');
      setVoicevoxPostPhonemeLength('');
      setVoicevoxPauseLength('');
      setVoicevoxPauseLengthScale('');
      setVoicevoxOutputSamplingRate('default');
      setVoicevoxOutputStereo('default');
      setVoicevoxEnableKatakanaEnglish('default');
      setVoicevoxEnableInterrogativeUpspeak('default');
      setVoicevoxCoreVersion('');
    }

    setVoicepeakEmotion('neutral');
    setVoicepeakSpeed('');
    setVoicepeakPitch('');

    if (selectedVoiceEngine === 'openai') {
      setOpenaiSpeed('');
    }

    if (selectedVoiceEngine === 'aivisCloud') {
      setAivisCloudModelUuid('');
      setAivisCloudSpeakerUuid('');
      setAivisCloudStyleId('');
      setAivisCloudStyleName('');
      setAivisCloudUseSsml('default');
      setAivisCloudLanguage('ja');
      setAivisCloudSpeakingRate('');
      setAivisCloudEmotionalIntensity('');
      setAivisCloudTempoDynamics('');
      setAivisCloudPitch('');
      setAivisCloudVolume('');
      setAivisCloudLeadingSilence('');
      setAivisCloudTrailingSilence('');
      setAivisCloudLineBreakSilence('');
      setAivisCloudOutputFormat('default');
      setAivisCloudOutputBitrate('');
      setAivisCloudOutputSamplingRate('default');
      setAivisCloudOutputChannels('default');
      setAivisCloudUserDictionaryUuid('');
      setAivisCloudEnableBillingLogs('default');
    }

    if (selectedVoiceEngine === 'aivisSpeech') {
      setAivisSpeedScale('');
      setAivisPitchScale('');
      setAivisIntonationScale('');
      setAivisTempoDynamicsScale('');
      setAivisVolumeScale('');
      setAivisPrePhonemeLength('');
      setAivisPostPhonemeLength('');
      setAivisPauseLength('');
      setAivisPauseLengthScale('');
      setAivisOutputSamplingRate('default');
      setAivisOutputStereo('default');
    }
  }, [selectedVoiceEngine, voiceApiKeys]);

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
      case 'zai':
        setModel(zaiModels[0]);
        break;
      default:
        setModel(openaiModels[0]);
        break;
    }
  }, [chatProvider]);

  useEffect(() => {
    if (chatProvider === 'zai' && enableDeepWikiMcp) {
      setEnableDeepWikiMcp(false);
    }
  }, [chatProvider, enableDeepWikiMcp]);

  useEffect(() => {
    if (!supportsVision && imageDataUrl) {
      setImageDataUrl(null);
    }
  }, [supportsVision, imageDataUrl]);

  useEffect(() => {
    if (chatProvider !== 'openai') {
      return;
    }
    if (!model || !isGPT5Model(model)) {
      if (reasoning_effort === 'none') {
        setReasoningEffort('medium');
      }
      return;
    }
    const normalized = normalizeReasoningEffortForModel(model, reasoning_effort);
    if (normalized !== reasoning_effort) {
      setReasoningEffort(normalized);
    }
  }, [chatProvider, model, reasoning_effort]);

  /**
   * when GPT-5 preset changes, update verbosity and reasoning_effort
   */
  useEffect(() => {
    if (gpt5Preset !== 'custom' && gpt5Preset in GPT5_PRESETS) {
      const preset = GPT5_PRESETS[gpt5Preset];
      setVerbosity(preset.verbosity);
      setReasoningEffort(
        normalizeReasoningEffortForModel(model, preset.reasoning_effort),
      );
    }
  }, [gpt5Preset, model]);

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
        providerOptions.reasoning_effort = normalizedReasoningEffort;
      }
      providerOptions.gpt5EndpointPreference = gpt5EndpointPreference;
    }

    // prepare voice options if enabled
    const createVoiceOptions = () => {
      if (selectedVoiceEngine === 'none') {
        return undefined;
      }

      const config = VOICE_ENGINE_CONFIGS[selectedVoiceEngine];
      const selectedSpeaker = selectedSpeakers[selectedVoiceEngine];
      const options: any = {
        engineType: selectedVoiceEngine,
        speaker: selectedSpeaker,
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
            options.apiKey = apiKey.trim();
            if (minimaxGroupId) {
              options.groupId = minimaxGroupId.trim();
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
        case 'openai': {
          const parsedSpeed = Number.parseFloat(openaiSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.openAiSpeed = parsedSpeed;
          }
          break;
        }
        case 'aivisCloud': {
          const trimmedModelUuid = aivisCloudModelUuid.trim();
          if (trimmedModelUuid) {
            options.aivisCloudModelUuid = trimmedModelUuid;
          } else if (selectedSpeaker) {
            options.aivisCloudModelUuid = String(selectedSpeaker);
          }

          if (aivisCloudSpeakerUuid.trim()) {
            options.aivisCloudSpeakerUuid = aivisCloudSpeakerUuid.trim();
          }

          const parsedStyleId = Number.parseInt(aivisCloudStyleId, 10);
          if (!Number.isNaN(parsedStyleId)) {
            options.aivisCloudStyleId = parsedStyleId;
          } else if (aivisCloudStyleName.trim()) {
            options.aivisCloudStyleName = aivisCloudStyleName.trim();
          }

          if (aivisCloudUseSsml !== 'default') {
            options.aivisCloudUseSSML = aivisCloudUseSsml === 'true';
          }

          if (aivisCloudLanguage.trim()) {
            options.aivisCloudLanguage = aivisCloudLanguage.trim();
          }

          const parsedSpeakingRate = Number.parseFloat(aivisCloudSpeakingRate);
          if (!Number.isNaN(parsedSpeakingRate)) {
            options.aivisCloudSpeakingRate = parsedSpeakingRate;
          }

          const parsedEmotionalIntensity = Number.parseFloat(
            aivisCloudEmotionalIntensity,
          );
          if (!Number.isNaN(parsedEmotionalIntensity)) {
            options.aivisCloudEmotionalIntensity = parsedEmotionalIntensity;
          }

          const parsedTempoDynamics = Number.parseFloat(
            aivisCloudTempoDynamics,
          );
          if (!Number.isNaN(parsedTempoDynamics)) {
            options.aivisCloudTempoDynamics = parsedTempoDynamics;
          }

          const parsedPitch = Number.parseFloat(aivisCloudPitch);
          if (!Number.isNaN(parsedPitch)) {
            options.aivisCloudPitch = parsedPitch;
          }

          const parsedVolume = Number.parseFloat(aivisCloudVolume);
          if (!Number.isNaN(parsedVolume)) {
            options.aivisCloudVolume = parsedVolume;
          }

          const parsedLeadingSilence = Number.parseFloat(
            aivisCloudLeadingSilence,
          );
          if (!Number.isNaN(parsedLeadingSilence)) {
            options.aivisCloudLeadingSilence = parsedLeadingSilence;
          }

          const parsedTrailingSilence = Number.parseFloat(
            aivisCloudTrailingSilence,
          );
          if (!Number.isNaN(parsedTrailingSilence)) {
            options.aivisCloudTrailingSilence = parsedTrailingSilence;
          }

          const parsedLineBreakSilence = Number.parseFloat(
            aivisCloudLineBreakSilence,
          );
          if (!Number.isNaN(parsedLineBreakSilence)) {
            options.aivisCloudLineBreakSilence = parsedLineBreakSilence;
          }

          if (aivisCloudOutputFormat !== 'default') {
            options.aivisCloudOutputFormat = aivisCloudOutputFormat as Exclude<
              AivisCloudOutputFormatOption,
              'default'
            >;
          }

          if (aivisCloudOutputBitrate.trim()) {
            const parsedBitrate = Number.parseInt(aivisCloudOutputBitrate, 10);
            if (!Number.isNaN(parsedBitrate)) {
              options.aivisCloudOutputBitrate = parsedBitrate;
            }
          }

          if (aivisCloudOutputSamplingRate !== 'default') {
            options.aivisCloudOutputSamplingRate = Number(
              aivisCloudOutputSamplingRate,
            ) as 8000 | 11025 | 12000 | 16000 | 22050 | 24000 | 44100 | 48000;
          }

          if (aivisCloudOutputChannels !== 'default') {
            options.aivisCloudOutputChannels = aivisCloudOutputChannels as
              | 'mono'
              | 'stereo';
          }

          if (aivisCloudUserDictionaryUuid.trim()) {
            options.aivisCloudUserDictionaryUuid =
              aivisCloudUserDictionaryUuid.trim();
          }

          if (aivisCloudEnableBillingLogs !== 'default') {
            options.aivisCloudEnableBillingLogs =
              aivisCloudEnableBillingLogs === 'true';
          }
          break;
        }
        case 'voicepeak': {
          options.voicepeakEmotion = voicepeakEmotion;

          const parsedSpeed = Number.parseInt(voicepeakSpeed, 10);
          if (!Number.isNaN(parsedSpeed)) {
            options.voicepeakSpeed = parsedSpeed;
          }

          const parsedPitch = Number.parseInt(voicepeakPitch, 10);
          if (!Number.isNaN(parsedPitch)) {
            options.voicepeakPitch = parsedPitch;
          }
          break;
        }
        case 'voicevox': {
          const voicevoxOverrides: VoiceVoxQueryParameterOverrides = {};

          const parsedSpeedScale = Number.parseFloat(voicevoxSpeedScale);
          if (!Number.isNaN(parsedSpeedScale)) {
            options.voicevoxSpeedScale = parsedSpeedScale;
            voicevoxOverrides.speedScale = parsedSpeedScale;
          }

          const parsedPitchScale = Number.parseFloat(voicevoxPitchScale);
          if (!Number.isNaN(parsedPitchScale)) {
            options.voicevoxPitchScale = parsedPitchScale;
            voicevoxOverrides.pitchScale = parsedPitchScale;
          }

          const parsedIntonationScale = Number.parseFloat(
            voicevoxIntonationScale,
          );
          if (!Number.isNaN(parsedIntonationScale)) {
            options.voicevoxIntonationScale = parsedIntonationScale;
            voicevoxOverrides.intonationScale = parsedIntonationScale;
          }

          const parsedVolumeScale = Number.parseFloat(voicevoxVolumeScale);
          if (!Number.isNaN(parsedVolumeScale)) {
            options.voicevoxVolumeScale = parsedVolumeScale;
            voicevoxOverrides.volumeScale = parsedVolumeScale;
          }

          const parsedPrePhonemeLength = Number.parseFloat(
            voicevoxPrePhonemeLength,
          );
          if (!Number.isNaN(parsedPrePhonemeLength)) {
            options.voicevoxPrePhonemeLength = parsedPrePhonemeLength;
            voicevoxOverrides.prePhonemeLength = parsedPrePhonemeLength;
          }

          const parsedPostPhonemeLength = Number.parseFloat(
            voicevoxPostPhonemeLength,
          );
          if (!Number.isNaN(parsedPostPhonemeLength)) {
            options.voicevoxPostPhonemeLength = parsedPostPhonemeLength;
            voicevoxOverrides.postPhonemeLength = parsedPostPhonemeLength;
          }

          const parsedPauseLength = Number.parseFloat(voicevoxPauseLength);
          if (!Number.isNaN(parsedPauseLength)) {
            options.voicevoxPauseLength = parsedPauseLength;
            voicevoxOverrides.pauseLength = parsedPauseLength;
          }

          const parsedPauseLengthScale = Number.parseFloat(
            voicevoxPauseLengthScale,
          );
          if (!Number.isNaN(parsedPauseLengthScale)) {
            options.voicevoxPauseLengthScale = parsedPauseLengthScale;
            voicevoxOverrides.pauseLengthScale = parsedPauseLengthScale;
          }

          if (voicevoxOutputSamplingRate !== 'default') {
            const parsedSamplingRate = Number.parseInt(
              voicevoxOutputSamplingRate,
              10,
            );
            if (!Number.isNaN(parsedSamplingRate)) {
              options.voicevoxOutputSamplingRate = parsedSamplingRate;
              voicevoxOverrides.outputSamplingRate = parsedSamplingRate;
            }
          }

          if (voicevoxOutputStereo !== 'default') {
            const stereo = voicevoxOutputStereo === 'stereo';
            options.voicevoxOutputStereo = stereo;
            voicevoxOverrides.outputStereo = stereo;
          }

          if (voicevoxEnableKatakanaEnglish !== 'default') {
            options.voicevoxEnableKatakanaEnglish =
              voicevoxEnableKatakanaEnglish === 'true';
          }

          if (voicevoxEnableInterrogativeUpspeak !== 'default') {
            options.voicevoxEnableInterrogativeUpspeak =
              voicevoxEnableInterrogativeUpspeak === 'true';
          }

          if (voicevoxCoreVersion.trim()) {
            options.voicevoxCoreVersion = voicevoxCoreVersion.trim();
          }

          if (Object.keys(voicevoxOverrides).length > 0) {
            options.voicevoxQueryParameters = voicevoxOverrides;
          }

          break;
        }
        case 'aivisSpeech': {
          const aivisOverrides: AivisSpeechQueryParameterOverrides = {};

          const parsedSpeedScale = Number.parseFloat(aivisSpeedScale);
          if (!Number.isNaN(parsedSpeedScale)) {
            options.aivisSpeechSpeedScale = parsedSpeedScale;
            aivisOverrides.speedScale = parsedSpeedScale;
          }

          const parsedPitchScale = Number.parseFloat(aivisPitchScale);
          if (!Number.isNaN(parsedPitchScale)) {
            options.aivisSpeechPitchScale = parsedPitchScale;
            aivisOverrides.pitchScale = parsedPitchScale;
          }

          const parsedIntonationScale = Number.parseFloat(aivisIntonationScale);
          if (!Number.isNaN(parsedIntonationScale)) {
            options.aivisSpeechIntonationScale = parsedIntonationScale;
            aivisOverrides.intonationScale = parsedIntonationScale;
          }

          const parsedTempoDynamicsScale = Number.parseFloat(
            aivisTempoDynamicsScale,
          );
          if (!Number.isNaN(parsedTempoDynamicsScale)) {
            options.aivisSpeechTempoDynamicsScale = parsedTempoDynamicsScale;
            aivisOverrides.tempoDynamicsScale = parsedTempoDynamicsScale;
          }

          const parsedVolumeScale = Number.parseFloat(aivisVolumeScale);
          if (!Number.isNaN(parsedVolumeScale)) {
            options.aivisSpeechVolumeScale = parsedVolumeScale;
            aivisOverrides.volumeScale = parsedVolumeScale;
          }

          const parsedPrePhonemeLength = Number.parseFloat(
            aivisPrePhonemeLength,
          );
          if (!Number.isNaN(parsedPrePhonemeLength)) {
            options.aivisSpeechPrePhonemeLength = parsedPrePhonemeLength;
            aivisOverrides.prePhonemeLength = parsedPrePhonemeLength;
          }

          const parsedPostPhonemeLength = Number.parseFloat(
            aivisPostPhonemeLength,
          );
          if (!Number.isNaN(parsedPostPhonemeLength)) {
            options.aivisSpeechPostPhonemeLength = parsedPostPhonemeLength;
            aivisOverrides.postPhonemeLength = parsedPostPhonemeLength;
          }

          const parsedPauseLength = Number.parseFloat(aivisPauseLength);
          if (!Number.isNaN(parsedPauseLength)) {
            options.aivisSpeechPauseLength = parsedPauseLength;
            aivisOverrides.pauseLength = parsedPauseLength;
          }

          const parsedPauseLengthScale = Number.parseFloat(
            aivisPauseLengthScale,
          );
          if (!Number.isNaN(parsedPauseLengthScale)) {
            options.aivisSpeechPauseLengthScale = parsedPauseLengthScale;
            aivisOverrides.pauseLengthScale = parsedPauseLengthScale;
          }

          if (aivisOutputSamplingRate !== 'default') {
            const parsedSamplingRate = Number.parseInt(
              aivisOutputSamplingRate,
              10,
            );
            if (!Number.isNaN(parsedSamplingRate)) {
              options.aivisSpeechOutputSamplingRate = parsedSamplingRate;
              aivisOverrides.outputSamplingRate = parsedSamplingRate;
            }
          }

          if (aivisOutputStereo !== 'default') {
            const stereo = aivisOutputStereo === 'stereo';
            options.aivisSpeechOutputStereo = stereo;
            aivisOverrides.outputStereo = stereo;
          }

          if (Object.keys(aivisOverrides).length > 0) {
            options.aivisSpeechQueryParameters = aivisOverrides;
          }

          break;
        }
        case 'minimax':
          if (config.defaultParams?.endpoint) {
            options.endpoint = config.defaultParams.endpoint;
          }
          options.minimaxModel = minimaxModel;

          if (minimaxLanguageBoost.trim()) {
            options.minimaxLanguageBoost = minimaxLanguageBoost.trim();
          }

          const voiceSettings: {
            speed?: number;
            vol?: number;
            pitch?: number;
          } = {};

          const parsedSpeed = Number.parseFloat(minimaxSpeed);
          if (!Number.isNaN(parsedSpeed)) {
            options.minimaxSpeed = parsedSpeed;
            voiceSettings.speed = parsedSpeed;
          }

          const parsedVolume = Number.parseFloat(minimaxVolume);
          if (!Number.isNaN(parsedVolume)) {
            options.minimaxVolume = parsedVolume;
            voiceSettings.vol = parsedVolume;
          }

          const parsedPitch = Number.parseFloat(minimaxPitch);
          if (!Number.isNaN(parsedPitch)) {
            options.minimaxPitch = parsedPitch;
            voiceSettings.pitch = parsedPitch;
          }

          if (Object.keys(voiceSettings).length > 0) {
            options.minimaxVoiceSettings = voiceSettings;
          }

          const audioSettings: {
            sampleRate?: number;
            bitrate?: number;
            format?: MinimaxAudioFormat;
            channel?: 1 | 2;
          } = {};

          const parsedSampleRate = Number.parseInt(minimaxSampleRate, 10);
          if (!Number.isNaN(parsedSampleRate)) {
            options.minimaxSampleRate = parsedSampleRate;
            audioSettings.sampleRate = parsedSampleRate;
          }

          const parsedBitrate = Number.parseInt(minimaxBitrate, 10);
          if (!Number.isNaN(parsedBitrate)) {
            options.minimaxBitrate = parsedBitrate;
            audioSettings.bitrate = parsedBitrate;
          }

          if (minimaxAudioFormat) {
            options.minimaxAudioFormat = minimaxAudioFormat;
            audioSettings.format = minimaxAudioFormat;
          }

          const parsedChannel = Number.parseInt(minimaxAudioChannel, 10);
          if (
            !Number.isNaN(parsedChannel) &&
            (parsedChannel === 1 || parsedChannel === 2)
          ) {
            options.minimaxAudioChannel = parsedChannel as 1 | 2;
            audioSettings.channel = parsedChannel as 1 | 2;
          }

          if (Object.keys(audioSettings).length > 0) {
            options.minimaxAudioSettings = audioSettings;
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
      speechChunking: {
        enabled: true,
        minWords: 40,
        locale: 'all',
      },
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

    instance.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, async (data: any) => {
      const { message } = data;
      console.log('Assistant response completed:', message.content);
      removeAssistantPartial();

      addMessageToUI({
        id: nextId(),
        role: 'assistant',
        kind: 'text',
        content: message.content,
      });

      // Generate avatar image if enabled
      if (enableAvatarGeneration && geminiImageApiKey.trim()) {
        try {
          setIsGeneratingAvatar(true);
          const prompt = createAvatarPrompt(message.content);
          const imageUrl = await generateAvatarImage({
            apiKey: geminiImageApiKey,
            prompt,
            baseImageUrl: avatarImageUrl, // Pass the current avatar image as the base
          });

          // Clean up previous generated image
          if (generatedAvatarImage) {
            revokeObjectUrl(generatedAvatarImage);
          }

          setGeneratedAvatarImage(imageUrl);
          setAvatarImageUrl(imageUrl); // Automatically update the avatar image
          console.log('Avatar image generated and updated successfully');
        } catch (error) {
          console.error('Failed to generate avatar image:', error);
        } finally {
          setIsGeneratingAvatar(false);
        }
      }
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

    const canUseVision = Boolean(attachedImageUrl && supportsVision);
    if (attachedImageUrl && !supportsVision) {
      alert('選択中のモデルは画像入力に対応していません。');
      setImageDataUrl(null);
      if (!userMessage) {
        return;
      }
    }

    const drafts: Message[] = [];
    if (canUseVision)
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
    if (canUseVision) {
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

  const isOpenAIGPT5ModelSelected =
    chatProvider === 'openai' && model && isGPT5Model(model);
  const isOpenAIGPT51Selected =
    chatProvider === 'openai' && model === MODEL_GPT_5_1;

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
          {enableAvatarGeneration && geminiImageApiKey && (
            <div style={{ color: '#28a745' }}>
              AI画像生成: 有効 (Gemini-2.5-Flash-Image)
            </div>
          )}
          {isSpeaking && (
            <div style={{ color: '#1e90ff', fontWeight: 'bold' }}>
              🔊 音声再生中...
            </div>
          )}
          {isGeneratingAvatar && (
            <div style={{ color: '#28a745', fontWeight: 'bold' }}>
              🎨 アバター画像を生成中...
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
                <div className="message-content">{partialTextBuffer}</div>
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
              disabled={!isConfigured || !supportsVision}
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
                  backgroundColor:
                    activeTab === 'llm' ? '#2e997d' : 'transparent',
                  color: activeTab === 'llm' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom:
                    activeTab === 'llm' ? '3px solid #2e997d' : 'none',
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
                  backgroundColor:
                    activeTab === 'voice' ? '#2e997d' : 'transparent',
                  color: activeTab === 'voice' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom:
                    activeTab === 'voice' ? '3px solid #2e997d' : 'none',
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
                  backgroundColor:
                    activeTab === 'avatar' ? '#2e997d' : 'transparent',
                  color: activeTab === 'avatar' ? '#fff' : '#333',
                  border: 'none',
                  borderBottom:
                    activeTab === 'avatar' ? '3px solid #2e997d' : 'none',
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
                minHeight: '0',
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
                    <option value="zai">Z.ai</option>
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
                    {chatProvider === 'zai' &&
                      zaiModels.map((m) => (
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
                  {isOpenAIGPT5ModelSelected && (
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
                                  e.target.value as ReasoningEffortLevel,
                                )
                              }
                            >
                              {isOpenAIGPT51Selected ? (
                                <option value="none">None</option>
                              ) : (
                                <option value="minimal">Minimal</option>
                              )}
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
                      disabled={chatProvider === 'zai'}
                      style={{ marginLeft: '8px' }}
                    />
                    {chatProvider === 'zai' && (
                      <div style={{ color: '#e01e5a', marginTop: '4px' }}>
                        Z.aiはMCP非対応のため使用できません。
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'voice' ? (
                <div>
                  {/* Voice Settings */}
                  <h3 style={{ marginTop: '0', marginBottom: '16px' }}>
                    音声設定
                  </h3>

                  <label
                    htmlFor="voiceEngine"
                    style={{ marginTop: '16px', display: 'block' }}
                  >
                    音声エンジン:
                  </label>
                  <select
                    id="voiceEngine"
                    value={selectedVoiceEngine}
                    onChange={(e) =>
                      setSelectedVoiceEngine(e.target.value as VoiceEngineType)
                    }
                    style={{ width: '100%', marginBottom: '12px' }}
                  >
                    {Object.entries(VOICE_ENGINE_CONFIGS).map(
                      ([key, config]) => (
                        <option key={key} value={key}>
                          {config.name}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedVoiceEngine !== 'none' &&
                    VOICE_ENGINE_CONFIGS[selectedVoiceEngine].needsApiKey && (
                      <>
                        <label
                          htmlFor="voiceApiKey"
                          style={{ marginTop: '16px', display: 'block' }}
                        >
                          {selectedVoiceEngine === 'minimax'
                            ? 'MiniMax API Key:'
                            : `${VOICE_ENGINE_CONFIGS[selectedVoiceEngine].name} API Key:`}
                        </label>
                        <input
                          type="password"
                          id="voiceApiKey"
                          placeholder={
                            selectedVoiceEngine === 'minimax'
                              ? 'xxx...'
                              : VOICE_ENGINE_CONFIGS[selectedVoiceEngine]
                                  .placeholder
                          }
                          value={voiceApiKeys[selectedVoiceEngine] || ''}
                          onChange={(e) =>
                            setVoiceApiKeys((prev) => ({
                              ...prev,
                              [selectedVoiceEngine]: e.target.value,
                            }))
                          }
                          style={{ width: '100%', marginBottom: '8px' }}
                        />

                        {selectedVoiceEngine === 'minimax' && (
                          <>
                            <label
                              htmlFor="minimaxGroupId"
                              style={{ marginTop: '8px', display: 'block' }}
                            >
                              MiniMax Group ID:
                            </label>
                            <input
                              type="password"
                              id="minimaxGroupId"
                              placeholder="1234567890"
                              value={minimaxGroupId}
                              onChange={(e) =>
                                setMinimaxGroupId(e.target.value)
                              }
                              style={{ width: '100%', marginBottom: '8px' }}
                            />

                            <label
                              htmlFor="minimaxModel"
                              style={{ marginTop: '8px', display: 'block' }}
                            >
                              MiniMax Model:
                            </label>
                            <select
                              id="minimaxModel"
                              value={minimaxModel}
                              onChange={(e) =>
                                setMinimaxModel(e.target.value as MinimaxModel)
                              }
                              style={{ width: '100%', marginBottom: '8px' }}
                            >
                              {Object.entries(MINIMAX_MODELS).map(([model]) => (
                                <option key={model} value={model}>
                                  {model}
                                </option>
                              ))}
                            </select>
                            <div
                              style={{
                                fontSize: '0.85em',
                                color: '#666',
                                marginBottom: '8px',
                              }}
                            >
                              {MINIMAX_MODELS[minimaxModel]}
                            </div>

                            <div
                              style={{
                                marginTop: '12px',
                                padding: '12px',
                                backgroundColor: '#f8f9ff',
                                borderRadius: '8px',
                                border: '1px solid #dbe4ff',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  color: '#3b5bdb',
                                }}
                              >
                                MiniMax 音声パラメータ
                              </div>

                              <label
                                htmlFor="minimaxLanguageBoost"
                                style={{
                                  marginTop: '4px',
                                  display: 'block',
                                }}
                              >
                                Language Boost:
                              </label>
                              <input
                                type="text"
                                id="minimaxLanguageBoost"
                                placeholder="例: Japanese（未入力で既定のまま）"
                                value={minimaxLanguageBoost}
                                onChange={(e) =>
                                  setMinimaxLanguageBoost(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <label
                                htmlFor="minimaxSpeed"
                                style={{ marginTop: '4px', display: 'block' }}
                              >
                                スピード (1.0 = 標準):
                              </label>
                              <input
                                type="number"
                                id="minimaxSpeed"
                                step="0.05"
                                min="0.1"
                                max="3.0"
                                placeholder="未指定でスタイルに応じた自動値"
                                value={minimaxSpeed}
                                onChange={(e) =>
                                  setMinimaxSpeed(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <label
                                htmlFor="minimaxVolume"
                                style={{ marginTop: '4px', display: 'block' }}
                              >
                                ボリューム (1.0 = 標準):
                              </label>
                              <input
                                type="number"
                                id="minimaxVolume"
                                step="0.05"
                                min="0.1"
                                max="3.0"
                                placeholder="未指定で1.0"
                                value={minimaxVolume}
                                onChange={(e) =>
                                  setMinimaxVolume(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <label
                                htmlFor="minimaxPitch"
                                style={{ marginTop: '4px', display: 'block' }}
                              >
                                ピッチ (半音単位):
                              </label>
                              <input
                                type="number"
                                id="minimaxPitch"
                                step="1"
                                min="-12"
                                max="12"
                                placeholder="未指定で0"
                                value={minimaxPitch}
                                onChange={(e) =>
                                  setMinimaxPitch(e.target.value)
                                }
                                style={{ width: '100%', marginBottom: '8px' }}
                              />

                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: '8px',
                                }}
                              >
                                <div>
                                  <label
                                    htmlFor="minimaxSampleRate"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    サンプルレート:
                                  </label>
                                  <select
                                    id="minimaxSampleRate"
                                    value={minimaxSampleRate}
                                    onChange={(e) =>
                                      setMinimaxSampleRate(e.target.value)
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="8000">8,000 Hz</option>
                                    <option value="16000">16,000 Hz</option>
                                    <option value="22050">22,050 Hz</option>
                                    <option value="24000">24,000 Hz</option>
                                    <option value="32000">32,000 Hz</option>
                                    <option value="44100">44,100 Hz</option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor="minimaxBitrate"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    ビットレート (bps):
                                  </label>
                                  <select
                                    id="minimaxBitrate"
                                    value={minimaxBitrate}
                                    onChange={(e) =>
                                      setMinimaxBitrate(e.target.value)
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="32000">32,000</option>
                                    <option value="64000">64,000</option>
                                    <option value="128000">128,000</option>
                                    <option value="256000">256,000</option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor="minimaxAudioFormat"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    オーディオ形式:
                                  </label>
                                  <select
                                    id="minimaxAudioFormat"
                                    value={minimaxAudioFormat}
                                    onChange={(e) =>
                                      setMinimaxAudioFormat(
                                        e.target.value as MinimaxAudioFormat,
                                      )
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="mp3">MP3</option>
                                    <option value="wav">WAV</option>
                                    <option value="aac">AAC</option>
                                    <option value="pcm">PCM</option>
                                    <option value="flac">FLAC</option>
                                    <option value="ogg">OGG</option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    htmlFor="minimaxAudioChannel"
                                    style={{
                                      marginTop: '4px',
                                      display: 'block',
                                    }}
                                  >
                                    チャンネル:
                                  </label>
                                  <select
                                    id="minimaxAudioChannel"
                                    value={minimaxAudioChannel}
                                    onChange={(e) =>
                                      setMinimaxAudioChannel(
                                        e.target.value === '2' ? '2' : '1',
                                      )
                                    }
                                    style={{
                                      width: '100%',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <option value="1">モノラル (1ch)</option>
                                    <option value="2">ステレオ (2ch)</option>
                                  </select>
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: '0.8em',
                                  color: '#5c677d',
                                }}
                              >
                                値を空欄にすると MiniMax
                                の既定値（または感情に応じた自動調整）
                                が利用されます。
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}

                  {selectedVoiceEngine === 'openai' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#e6f6ff',
                        borderRadius: '8px',
                        border: '1px solid #b5e3f5',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#0b7285',
                        }}
                      >
                        OpenAI TTS パラメータ
                      </div>

                      <label
                        htmlFor="openaiSpeed"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed (0.25 - 4.0):
                      </label>
                      <input
                        id="openaiSpeed"
                        type="number"
                        min="0.25"
                        max="4"
                        step="0.05"
                        value={openaiSpeed}
                        onChange={(e) => setOpenaiSpeed(e.target.value)}
                        placeholder="例: 1.25（未入力で既定値1.0）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#0b7285' }}>
                        速度以外は `gpt-4o-mini-tts` の instructions
                        で自然言語指定するか、 生成後に加工してください。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'voicevox' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        VOICEVOX パラメータ
                      </div>

                      <label
                        htmlFor="voicevoxSpeedScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        スピード倍率:
                      </label>
                      <input
                        id="voicevoxSpeedScale"
                        type="number"
                        step="0.05"
                        value={voicevoxSpeedScale}
                        onChange={(e) => setVoicevoxSpeedScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicevoxPitchScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        ピッチ倍率:
                      </label>
                      <input
                        id="voicevoxPitchScale"
                        type="number"
                        step="0.05"
                        value={voicevoxPitchScale}
                        onChange={(e) => setVoicevoxPitchScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicevoxIntonationScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        抑揚倍率:
                      </label>
                      <input
                        id="voicevoxIntonationScale"
                        type="number"
                        step="0.05"
                        value={voicevoxIntonationScale}
                        onChange={(e) =>
                          setVoicevoxIntonationScale(e.target.value)
                        }
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicevoxVolumeScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        音量倍率:
                      </label>
                      <input
                        id="voicevoxVolumeScale"
                        type="number"
                        step="0.05"
                        value={voicevoxVolumeScale}
                        onChange={(e) => setVoicevoxVolumeScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxPrePhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            前無音 (秒):
                          </label>
                          <input
                            id="voicevoxPrePhonemeLength"
                            type="number"
                            step="0.01"
                            value={voicevoxPrePhonemeLength}
                            onChange={(e) =>
                              setVoicevoxPrePhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxPostPhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            後無音 (秒):
                          </label>
                          <input
                            id="voicevoxPostPhonemeLength"
                            type="number"
                            step="0.01"
                            value={voicevoxPostPhonemeLength}
                            onChange={(e) =>
                              setVoicevoxPostPhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxPauseLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ長 (秒):
                          </label>
                          <input
                            id="voicevoxPauseLength"
                            type="number"
                            step="0.05"
                            value={voicevoxPauseLength}
                            onChange={(e) =>
                              setVoicevoxPauseLength(e.target.value)
                            }
                            placeholder="未指定で自動"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxPauseLengthScale"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ倍率:
                          </label>
                          <input
                            id="voicevoxPauseLengthScale"
                            type="number"
                            step="0.05"
                            value={voicevoxPauseLengthScale}
                            onChange={(e) =>
                              setVoicevoxPauseLengthScale(e.target.value)
                            }
                            placeholder="未指定で1.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxOutputSamplingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            サンプリングレート:
                          </label>
                          <select
                            id="voicevoxOutputSamplingRate"
                            value={voicevoxOutputSamplingRate}
                            onChange={(e) =>
                              setVoicevoxOutputSamplingRate(e.target.value)
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="8000">8,000 Hz</option>
                            <option value="11025">11,025 Hz</option>
                            <option value="16000">16,000 Hz</option>
                            <option value="22050">22,050 Hz</option>
                            <option value="24000">24,000 Hz</option>
                            <option value="44100">44,100 Hz</option>
                            <option value="48000">48,000 Hz</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxOutputStereo"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            出力チャンネル:
                          </label>
                          <select
                            id="voicevoxOutputStereo"
                            value={voicevoxOutputStereo}
                            onChange={(e) =>
                              setVoicevoxOutputStereo(
                                e.target.value as 'default' | 'mono' | 'stereo',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="mono">モノラル (false)</option>
                            <option value="stereo">ステレオ (true)</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="voicevoxEnableKatakanaEnglish"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            カタカナ英語化:
                          </label>
                          <select
                            id="voicevoxEnableKatakanaEnglish"
                            value={voicevoxEnableKatakanaEnglish}
                            onChange={(e) =>
                              setVoicevoxEnableKatakanaEnglish(
                                e.target.value as 'default' | 'true' | 'false',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値 (true)</option>
                            <option value="true">有効</option>
                            <option value="false">無効</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="voicevoxEnableInterrogativeUpspeak"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            疑問文語尾調整:
                          </label>
                          <select
                            id="voicevoxEnableInterrogativeUpspeak"
                            value={voicevoxEnableInterrogativeUpspeak}
                            onChange={(e) =>
                              setVoicevoxEnableInterrogativeUpspeak(
                                e.target.value as 'default' | 'true' | 'false',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値 (true)</option>
                            <option value="true">有効</option>
                            <option value="false">無効</option>
                          </select>
                        </div>
                      </div>

                      <label
                        htmlFor="voicevoxCoreVersion"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Core Version:
                      </label>
                      <input
                        id="voicevoxCoreVersion"
                        type="text"
                        value={voicevoxCoreVersion}
                        onChange={(e) => setVoicevoxCoreVersion(e.target.value)}
                        placeholder="例: 0.15.0（任意）"
                        style={{ width: '100%', marginBottom: '4px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#5c677d' }}>
                        空欄の項目はVOICEVOX API側の既定値が利用されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'voicepeak' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        VOICEPEAK パラメータ
                      </div>

                      <label
                        htmlFor="voicepeakEmotion"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Emotion Override:
                      </label>
                      <select
                        id="voicepeakEmotion"
                        value={voicepeakEmotion}
                        onChange={(e) =>
                          setVoicepeakEmotion(
                            e.target.value as VoicePeakEmotionOption,
                          )
                        }
                        style={{ width: '100%', marginBottom: '8px' }}
                      >
                        <option value="neutral">neutral</option>
                        <option value="happy">happy</option>
                        <option value="fun">fun</option>
                        <option value="angry">angry</option>
                        <option value="sad">sad</option>
                        <option value="surprised">surprised</option>
                      </select>

                      <label
                        htmlFor="voicepeakSpeed"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed (50-200):
                      </label>
                      <input
                        id="voicepeakSpeed"
                        type="number"
                        min={50}
                        max={200}
                        step={1}
                        value={voicepeakSpeed}
                        onChange={(e) => setVoicepeakSpeed(e.target.value)}
                        placeholder="整数のみ（未入力で既定値）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="voicepeakPitch"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Pitch (-300〜300):
                      </label>
                      <input
                        id="voicepeakPitch"
                        type="number"
                        min={-300}
                        max={300}
                        step={1}
                        value={voicepeakPitch}
                        onChange={(e) => setVoicepeakPitch(e.target.value)}
                        placeholder="整数のみ（未入力で既定値）"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div style={{ fontSize: '0.8em', color: '#364fc7' }}>
                        Emotion で選んだ感情がそのまま vpeakserver
                        へ送信されます （初期値は neutral）。Speed と Pitch
                        を空欄にすると vpeakserver
                        のデフォルト値が利用されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'aivisCloud' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        Aivis Cloud パラメータ
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudModelUuid"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Model UUID (override):
                          </label>
                          <input
                            id="aivisCloudModelUuid"
                            type="text"
                            value={aivisCloudModelUuid}
                            onChange={(e) =>
                              setAivisCloudModelUuid(e.target.value)
                            }
                            placeholder="空欄なら選択中のモデルを使用"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudSpeakerUuid"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Speaker UUID:
                          </label>
                          <input
                            id="aivisCloudSpeakerUuid"
                            type="text"
                            value={aivisCloudSpeakerUuid}
                            onChange={(e) =>
                              setAivisCloudSpeakerUuid(e.target.value)
                            }
                            placeholder="複数話者モデルで指定 (任意)"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudStyleId"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Style ID (0-31):
                          </label>
                          <input
                            id="aivisCloudStyleId"
                            type="number"
                            min="0"
                            max="31"
                            step="1"
                            value={aivisCloudStyleId}
                            onChange={(e) =>
                              setAivisCloudStyleId(e.target.value)
                            }
                            placeholder="スタイルIDを使用する場合"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudStyleName"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Style Name:
                          </label>
                          <input
                            id="aivisCloudStyleName"
                            type="text"
                            value={aivisCloudStyleName}
                            onChange={(e) =>
                              setAivisCloudStyleName(e.target.value)
                            }
                            placeholder="スタイル名を直接指定 (IDと併用不可)"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudUseSsml"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Use SSML:
                          </label>
                          <select
                            id="aivisCloudUseSsml"
                            value={aivisCloudUseSsml}
                            onChange={(e) =>
                              setAivisCloudUseSsml(
                                e.target.value as AivisCloudBooleanOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（true）</option>
                            <option value="true">有効</option>
                            <option value="false">無効</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudLanguage"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Language:
                          </label>
                          <input
                            id="aivisCloudLanguage"
                            type="text"
                            value={aivisCloudLanguage}
                            onChange={(e) =>
                              setAivisCloudLanguage(e.target.value)
                            }
                            placeholder="例: ja （現状日本語のみ）"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudSpeakingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Speaking Rate:
                          </label>
                          <input
                            id="aivisCloudSpeakingRate"
                            type="number"
                            min="0.5"
                            max="2"
                            step="0.05"
                            value={aivisCloudSpeakingRate}
                            onChange={(e) =>
                              setAivisCloudSpeakingRate(e.target.value)
                            }
                            placeholder="例: 1.05"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudEmotionalIntensity"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Emotional Intensity:
                          </label>
                          <input
                            id="aivisCloudEmotionalIntensity"
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={aivisCloudEmotionalIntensity}
                            onChange={(e) =>
                              setAivisCloudEmotionalIntensity(e.target.value)
                            }
                            placeholder="例: 1.2"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudTempoDynamics"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Tempo Dynamics:
                          </label>
                          <input
                            id="aivisCloudTempoDynamics"
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={aivisCloudTempoDynamics}
                            onChange={(e) =>
                              setAivisCloudTempoDynamics(e.target.value)
                            }
                            placeholder="話速の緩急"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudPitch"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Pitch:
                          </label>
                          <input
                            id="aivisCloudPitch"
                            type="number"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={aivisCloudPitch}
                            onChange={(e) => setAivisCloudPitch(e.target.value)}
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudVolume"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Volume:
                          </label>
                          <input
                            id="aivisCloudVolume"
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={aivisCloudVolume}
                            onChange={(e) =>
                              setAivisCloudVolume(e.target.value)
                            }
                            placeholder="例: 1.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudLeadingSilence"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Leading Silence (sec):
                          </label>
                          <input
                            id="aivisCloudLeadingSilence"
                            type="number"
                            min="0"
                            max="60"
                            step="0.05"
                            value={aivisCloudLeadingSilence}
                            onChange={(e) =>
                              setAivisCloudLeadingSilence(e.target.value)
                            }
                            placeholder="0.0〜60.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudTrailingSilence"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Trailing Silence (sec):
                          </label>
                          <input
                            id="aivisCloudTrailingSilence"
                            type="number"
                            min="0"
                            max="60"
                            step="0.05"
                            value={aivisCloudTrailingSilence}
                            onChange={(e) =>
                              setAivisCloudTrailingSilence(e.target.value)
                            }
                            placeholder="0.0〜60.0"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudLineBreakSilence"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Line Break Silence (sec):
                          </label>
                          <input
                            id="aivisCloudLineBreakSilence"
                            type="number"
                            min="0"
                            max="60"
                            step="0.05"
                            value={aivisCloudLineBreakSilence}
                            onChange={(e) =>
                              setAivisCloudLineBreakSilence(e.target.value)
                            }
                            placeholder="改行毎の無音"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudOutputFormat"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Format:
                          </label>
                          <select
                            id="aivisCloudOutputFormat"
                            value={aivisCloudOutputFormat}
                            onChange={(e) =>
                              setAivisCloudOutputFormat(
                                e.target.value as AivisCloudOutputFormatOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（mp3）</option>
                            <option value="wav">wav</option>
                            <option value="flac">flac</option>
                            <option value="mp3">mp3</option>
                            <option value="aac">aac</option>
                            <option value="opus">opus</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudOutputBitrate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Bitrate (kbps):
                          </label>
                          <input
                            id="aivisCloudOutputBitrate"
                            type="number"
                            min="8"
                            max="320"
                            step="8"
                            value={aivisCloudOutputBitrate}
                            onChange={(e) =>
                              setAivisCloudOutputBitrate(e.target.value)
                            }
                            placeholder="例: 192（mp3/aac/opusのみ）"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudOutputSamplingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Sampling Rate:
                          </label>
                          <select
                            id="aivisCloudOutputSamplingRate"
                            value={aivisCloudOutputSamplingRate}
                            onChange={(e) =>
                              setAivisCloudOutputSamplingRate(
                                e.target
                                  .value as AivisCloudOutputSamplingRateOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値</option>
                            <option value="8000">8,000 Hz</option>
                            <option value="11025">11,025 Hz</option>
                            <option value="12000">12,000 Hz</option>
                            <option value="16000">16,000 Hz</option>
                            <option value="22050">22,050 Hz</option>
                            <option value="24000">24,000 Hz</option>
                            <option value="44100">44,100 Hz</option>
                            <option value="48000">48,000 Hz</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudOutputChannels"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Output Channels:
                          </label>
                          <select
                            id="aivisCloudOutputChannels"
                            value={aivisCloudOutputChannels}
                            onChange={(e) =>
                              setAivisCloudOutputChannels(
                                e.target.value as AivisCloudOutputChannelOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（mono）</option>
                            <option value="mono">モノラル</option>
                            <option value="stereo">ステレオ</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisCloudUserDictionaryUuid"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            User Dictionary UUID:
                          </label>
                          <input
                            id="aivisCloudUserDictionaryUuid"
                            type="text"
                            value={aivisCloudUserDictionaryUuid}
                            onChange={(e) =>
                              setAivisCloudUserDictionaryUuid(e.target.value)
                            }
                            placeholder="適用するユーザー辞書がある場合"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisCloudEnableBillingLogs"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            Billing Logs:
                          </label>
                          <select
                            id="aivisCloudEnableBillingLogs"
                            value={aivisCloudEnableBillingLogs}
                            onChange={(e) =>
                              setAivisCloudEnableBillingLogs(
                                e.target.value as AivisCloudBooleanOption,
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">API既定値（false）</option>
                            <option value="true">ログを出力する</option>
                            <option value="false">ログを出力しない</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8em', color: '#5c677d' }}>
                        スタイル ID
                        とスタイル名はどちらか片方のみ指定してください。 SSML
                        を有効にすると改行や &lt;break&gt;
                        タグに応じて音声が分割されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine === 'aivisSpeech' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#f4f5ff',
                        borderRadius: '8px',
                        border: '1px solid #dbe4ff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          color: '#364fc7',
                        }}
                      >
                        AivisSpeech パラメータ
                      </div>

                      <label
                        htmlFor="aivisSpeedScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Speed Scale:
                      </label>
                      <input
                        id="aivisSpeedScale"
                        type="number"
                        step="0.05"
                        value={aivisSpeedScale}
                        onChange={(e) => setAivisSpeedScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisPitchScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        ピッチ倍率:
                      </label>
                      <input
                        id="aivisPitchScale"
                        type="number"
                        step="0.05"
                        value={aivisPitchScale}
                        onChange={(e) => setAivisPitchScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisIntonationScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Intonation Scale (0.0 ~ 2.0):
                      </label>
                      <input
                        id="aivisIntonationScale"
                        type="number"
                        step="0.05"
                        value={aivisIntonationScale}
                        onChange={(e) =>
                          setAivisIntonationScale(e.target.value)
                        }
                        placeholder="感情の強さ"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisTempoDynamicsScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        Tempo Dynamics Scale:
                      </label>
                      <input
                        id="aivisTempoDynamicsScale"
                        type="number"
                        step="0.05"
                        value={aivisTempoDynamicsScale}
                        onChange={(e) =>
                          setAivisTempoDynamicsScale(e.target.value)
                        }
                        placeholder="話速の緩急"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <label
                        htmlFor="aivisVolumeScale"
                        style={{ display: 'block', marginBottom: '6px' }}
                      >
                        音量倍率:
                      </label>
                      <input
                        id="aivisVolumeScale"
                        type="number"
                        step="0.05"
                        value={aivisVolumeScale}
                        onChange={(e) => setAivisVolumeScale(e.target.value)}
                        placeholder="未指定でAPI既定値"
                        style={{ width: '100%', marginBottom: '8px' }}
                      />

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisPrePhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            前無音 (秒):
                          </label>
                          <input
                            id="aivisPrePhonemeLength"
                            type="number"
                            step="0.01"
                            value={aivisPrePhonemeLength}
                            onChange={(e) =>
                              setAivisPrePhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.15"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisPostPhonemeLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            後無音 (秒):
                          </label>
                          <input
                            id="aivisPostPhonemeLength"
                            type="number"
                            step="0.01"
                            value={aivisPostPhonemeLength}
                            onChange={(e) =>
                              setAivisPostPhonemeLength(e.target.value)
                            }
                            placeholder="例: 0.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisPauseLength"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ長 (秒):
                          </label>
                          <input
                            id="aivisPauseLength"
                            type="number"
                            step="0.05"
                            value={aivisPauseLength}
                            onChange={(e) =>
                              setAivisPauseLength(e.target.value)
                            }
                            placeholder="例: 0.4"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="aivisPauseLengthScale"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            ポーズ倍率:
                          </label>
                          <input
                            id="aivisPauseLengthScale"
                            type="number"
                            step="0.05"
                            value={aivisPauseLengthScale}
                            onChange={(e) =>
                              setAivisPauseLengthScale(e.target.value)
                            }
                            placeholder="例: 1.1"
                            style={{ width: '100%', marginBottom: '8px' }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <label
                            htmlFor="aivisOutputSamplingRate"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            サンプリングレート:
                          </label>
                          <select
                            id="aivisOutputSamplingRate"
                            value={aivisOutputSamplingRate}
                            onChange={(e) =>
                              setAivisOutputSamplingRate(e.target.value)
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="8000">8,000 Hz</option>
                            <option value="11025">11,025 Hz</option>
                            <option value="16000">16,000 Hz</option>
                            <option value="22050">22,050 Hz</option>
                            <option value="24000">24,000 Hz</option>
                            <option value="44100">44,100 Hz</option>
                            <option value="48000">48,000 Hz</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="aivisOutputStereo"
                            style={{ display: 'block', marginBottom: '6px' }}
                          >
                            出力チャンネル:
                          </label>
                          <select
                            id="aivisOutputStereo"
                            value={aivisOutputStereo}
                            onChange={(e) =>
                              setAivisOutputStereo(
                                e.target.value as 'default' | 'mono' | 'stereo',
                              )
                            }
                            style={{ width: '100%', marginBottom: '8px' }}
                          >
                            <option value="default">既定値を使用</option>
                            <option value="mono">モノラル (false)</option>
                            <option value="stereo">ステレオ (true)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8em', color: '#5c677d' }}>
                        tempoDynamicsScale はテンポの緩急、Intonation Scale
                        は感情表現の強さを制御します。空欄の場合は既定値が利用されます。
                      </div>
                    </div>
                  )}

                  {selectedVoiceEngine !== 'none' &&
                    VOICE_ENGINE_CONFIGS[selectedVoiceEngine].apiUrl && (
                      <div
                        style={{
                          fontSize: '0.9em',
                          color: '#666',
                          marginBottom: '12px',
                        }}
                      >
                        <strong>API URL:</strong>{' '}
                        {VOICE_ENGINE_CONFIGS[selectedVoiceEngine].apiUrl}
                      </div>
                    )}

                  {/* Speaker Selection */}
                  {selectedVoiceEngine !== 'none' && (
                    <>
                      <label
                        htmlFor="voiceSpeaker"
                        style={{ marginTop: '16px', display: 'block' }}
                      >
                        音声:
                      </label>
                      <select
                        id="voiceSpeaker"
                        value={String(
                          selectedSpeakers[selectedVoiceEngine] || '',
                        )}
                        onChange={(e) => {
                          const value =
                            selectedVoiceEngine === 'voicevox' ||
                            selectedVoiceEngine === 'aivisSpeech'
                              ? Number(e.target.value)
                              : e.target.value;
                          setSelectedSpeakers((prev) => ({
                            ...prev,
                            [selectedVoiceEngine]: value,
                          }));
                        }}
                        style={{ width: '100%', marginBottom: '12px' }}
                      >
                        {/* OpenAI TTS */}
                        {selectedVoiceEngine === 'openai' &&
                          OPENAI_TTS_SPEAKERS.map((speaker) => (
                            <option key={speaker.id} value={speaker.id}>
                              {speaker.name}{' '}
                              {speaker.description &&
                                `- ${speaker.description}`}
                            </option>
                          ))}

                        {/* VOICEVOX */}
                        {selectedVoiceEngine === 'voicevox' &&
                        availableSpeakers.voicevox
                          ? availableSpeakers.voicevox.flatMap(
                              (speaker: any) =>
                                speaker.styles?.map((style: any) => (
                                  <option
                                    key={`${speaker.speaker_uuid}-${style.id}`}
                                    value={style.id}
                                  >
                                    {speaker.name} - {style.name}
                                  </option>
                                )) || [],
                            )
                          : selectedVoiceEngine === 'voicevox' && (
                              <option value="">
                                ローカルサーバーから取得中...
                              </option>
                            )}

                        {/* Aivis Speech */}
                        {selectedVoiceEngine === 'aivisSpeech' &&
                        availableSpeakers.aivisSpeech
                          ? availableSpeakers.aivisSpeech.flatMap(
                              (speaker: any) =>
                                speaker.styles?.map((style: any) => (
                                  <option
                                    key={`${speaker.speaker_uuid}-${style.id}`}
                                    value={style.id}
                                  >
                                    {speaker.name} - {style.name}
                                  </option>
                                )) || [],
                            )
                          : selectedVoiceEngine === 'aivisSpeech' && (
                              <option value="">
                                ローカルサーバーから取得中...
                              </option>
                            )}

                        {/* Aivis Cloud */}
                        {selectedVoiceEngine === 'aivisCloud' &&
                          AIVIS_CLOUD_MODELS.map((model) => (
                            <option
                              key={model.aivm_model_uuid}
                              value={model.aivm_model_uuid}
                            >
                              {model.name}
                            </option>
                          ))}

                        {/* VoicePeak */}
                        {selectedVoiceEngine === 'voicepeak' &&
                          VOICEPEAK_SPEAKERS.map((speaker) => (
                            <option key={speaker.id} value={speaker.id}>
                              {speaker.name}
                            </option>
                          ))}

                        {/* NijiVoice */}
                        {selectedVoiceEngine === 'nijivoice' &&
                        availableSpeakers.nijivoice
                          ? availableSpeakers.nijivoice.map((actor: any) => (
                              <option key={actor.id} value={actor.id}>
                                {actor.name}
                              </option>
                            ))
                          : selectedVoiceEngine === 'nijivoice' && (
                              <option value="">
                                API Keyを入力後、自動取得されます
                              </option>
                            )}

                        {/* MiniMax */}
                        {selectedVoiceEngine === 'minimax' &&
                          Object.entries(MINIMAX_VOICES).map(
                            ([voiceId, description]) => (
                              <option key={voiceId} value={voiceId}>
                                {description}
                              </option>
                            ),
                          )}
                      </select>
                    </>
                  )}

                  {selectedVoiceEngine !== 'none' && (
                    <div
                      style={{
                        fontSize: '0.9em',
                        color: '#666',
                        marginBottom: '12px',
                      }}
                    >
                      {selectedVoiceEngine === 'minimax'
                        ? 'MiniMaxでは速度・音質のパラメータを調整できます'
                        : selectedVoiceEngine === 'voicevox'
                          ? 'VOICEVOXでは話速や抑揚・無音長などを細かく調整できます'
                          : selectedVoiceEngine === 'openai'
                            ? 'OpenAI TTSでは speed（0.25〜4.0）のみ数値指定が可能です'
                            : selectedVoiceEngine === 'aivisCloud'
                              ? 'Aivis CloudではモデルUUIDや各種出力パラメータを任意に指定できます'
                              : selectedVoiceEngine === 'aivisSpeech'
                                ? 'AivisSpeechでは抑揚やテンポ緩急など独自パラメータを設定できます'
                                : '※ 音声パラメータは最適な値に固定されています'}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Avatar Settings */}
                  <h3 style={{ marginTop: '0', marginBottom: '16px' }}>
                    アバター設定
                  </h3>

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
                        marginBottom: '12px',
                      }}
                    />
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      現在のアバター画像
                    </div>
                  </div>

                  <label
                    htmlFor="avatarUpload"
                    style={{ marginTop: '16px', display: 'block' }}
                  >
                    アバター画像をアップロード:
                  </label>
                  <input
                    type="file"
                    id="avatarUpload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ marginBottom: '8px', width: '100%' }}
                  />
                  <div
                    style={{
                      fontSize: '0.9em',
                      color: '#666',
                      marginBottom: '16px',
                    }}
                  >
                    ※ 画像は自動的に円形にクロップされます
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      marginTop: '16px',
                    }}
                  >
                    <div style={{ fontSize: '0.9em', color: '#495057' }}>
                      <strong>ヒント：</strong>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>正方形に近い画像がベストです</li>
                        <li>推奨サイズ：200px × 200px 以上</li>
                        <li>対応形式：JPG、PNG、WebP</li>
                      </ul>
                    </div>
                  </div>

                  {/* Avatar Image Generation Settings */}
                  <div
                    style={{
                      marginTop: '24px',
                      padding: '16px',
                      backgroundColor: '#fff3cd',
                      borderRadius: '8px',
                      border: '1px solid #ffeaa7',
                    }}
                  >
                    <h4
                      style={{
                        marginTop: '0',
                        marginBottom: '12px',
                        color: '#856404',
                      }}
                    >
                      AI画像生成機能
                    </h4>

                    <div style={{ marginBottom: '16px' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={enableAvatarGeneration}
                          onChange={(e) =>
                            setEnableAvatarGeneration(e.target.checked)
                          }
                          style={{ marginRight: '8px' }}
                        />
                        アシスタントの返答に基づいてアバター画像を自動生成する
                      </label>
                    </div>

                    {enableAvatarGeneration && (
                      <div>
                        <label
                          htmlFor="geminiImageApiKey"
                          style={{ display: 'block', marginBottom: '8px' }}
                        >
                          Gemini API Key（画像生成用）:
                        </label>
                        <input
                          type="password"
                          id="geminiImageApiKey"
                          placeholder="Gemini API Key for image generation..."
                          value={geminiImageApiKey}
                          onChange={(e) => setGeminiImageApiKey(e.target.value)}
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <div
                          style={{
                            fontSize: '0.85em',
                            color: '#6c757d',
                            marginBottom: '12px',
                          }}
                        >
                          ※ この機能にはGemini-2.5-Flash-Image-Preview
                          APIが使用されます
                        </div>

                        {generatedAvatarImage && (
                          <div>
                            <div
                              style={{
                                fontSize: '0.9em',
                                marginBottom: '8px',
                                fontWeight: 'bold',
                              }}
                            >
                              最後に生成された画像:
                            </div>
                            <img
                              src={generatedAvatarImage}
                              alt="Generated avatar"
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #28a745',
                                display: 'block',
                                marginBottom: '8px',
                              }}
                            />
                            <button
                              onClick={() => {
                                setAvatarImageUrl(generatedAvatarImage);
                                alert(
                                  '生成された画像をアバターに設定しました！',
                                );
                              }}
                              style={{
                                backgroundColor: '#28a745',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85em',
                              }}
                            >
                              この画像をアバターに設定
                            </button>
                          </div>
                        )}

                        {isGeneratingAvatar && (
                          <div
                            style={{
                              color: '#28a745',
                              fontWeight: 'bold',
                              marginTop: '8px',
                            }}
                          >
                            🎨 アバター画像を生成中...
                          </div>
                        )}
                      </div>
                    )}
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

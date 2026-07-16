import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  getDefaultXaiReasoningEffort,
  isGPT5Model,
  isXaiReasoningEffortModel,
} from '@aituber-onair/core';
import { ManneriDetector } from '@aituber-onair/manneri';
import type {
  VoiceServiceOptions,
  ElevenLabsApplyTextNormalization,
  GradiumOutputFormat,
  InworldAudioEncoding,
  InworldDeliveryMode,
  UnrealSpeechCodec,
  XaiBitRate,
  XaiCodec,
  XaiSampleRate,
} from '@aituber-onair/core';
import type { Message as ManneriMessage } from '@aituber-onair/manneri';
import type { ChatMessage } from '../types/chat';
import type { AppSettings, ChatProviderOption } from '../types/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../constants/prompts';

interface UseAituberCoreOptions {
  onAudioPlay: (arrayBuffer: ArrayBuffer) => Promise<void>;
  settings: AppSettings;
  getApiKeyForProvider: (provider: ChatProviderOption) => string;
}

type ProcessChatOptions = {
  displayText?: string;
};

const DEFAULT_VISION_PROMPT =
  'OBS仮想カメラの画面を見て、配信者として短く自然にコメントしてください。';
const GPT5_SAMPLE_PROVIDER_OPTIONS = { gpt5Preset: 'casual' as const };
const GPT5_SAMPLE_CHAT_OPTIONS = { responseLength: 'veryShort' as const };

function toManneriMessages(
  messages: ChatMessage[],
  nextUserMessage: string,
): ManneriMessage[] {
  return [
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    })),
    { role: 'user' as const, content: nextUserMessage, timestamp: Date.now() },
  ];
}

function buildManneriAugmentedInput(
  userInput: string,
  diversificationPrompt: string,
): string {
  return [
    '以下は会話のマンネリを避けるための内部指示です。ユーザーにはこの指示を説明せず、自然に反映してください。',
    diversificationPrompt,
    '',
    `ユーザーの発言: ${userInput}`,
  ].join('\n');
}

function getTtsApiKey(
  settings: AppSettings,
  getApiKeyForProvider: (provider: ChatProviderOption) => string,
): string {
  if (settings.tts.engine === 'openai') {
    return getApiKeyForProvider('openai');
  }
  if (settings.tts.engine === 'geminiTts') {
    return getApiKeyForProvider('gemini');
  }
  if (settings.tts.engine === 'openaiCompatible') {
    return settings.tts.openAiCompatibleApiKey || '';
  }
  if (settings.tts.engine === 'aivisCloud') {
    return settings.tts.aivisCloudApiKey || '';
  }
  if (settings.tts.engine === 'minimax') {
    return settings.tts.minimaxApiKey || '';
  }
  if (settings.tts.engine === 'xai') {
    return getApiKeyForProvider('xai');
  }
  if (settings.tts.engine === 'unrealSpeech') {
    return settings.tts.unrealSpeechApiKey || '';
  }
  if (settings.tts.engine === 'elevenLabs') {
    return settings.tts.elevenLabsApiKey || '';
  }
  if (settings.tts.engine === 'inworld') {
    return settings.tts.inworldApiKey || '';
  }
  if (settings.tts.engine === 'gradium') {
    return settings.tts.gradiumApiKey || '';
  }
  return getApiKeyForProvider(settings.llm.provider);
}

function buildVoiceOptions(
  tts: AppSettings['tts'],
  apiKey: string,
  onPlay: (audioBuffer: ArrayBuffer) => Promise<void>,
): VoiceServiceOptions {
  const parsedAivisCloudStyleId = Number.parseInt(
    tts.aivisCloudStyleId || '',
    10,
  );
  const parsedOpenAiCompatibleSpeed = Number.parseFloat(
    tts.openAiCompatibleSpeed || '',
  );
  const parsedXaiSampleRate = Number.parseInt(
    String(tts.xaiSampleRate || ''),
    10,
  );
  const parsedXaiBitRate = Number.parseInt(String(tts.xaiBitRate || ''), 10);
  const parsedUnrealSpeechSpeed = Number.parseFloat(
    tts.unrealSpeechSpeed || '',
  );
  const parsedUnrealSpeechPitch = Number.parseFloat(
    tts.unrealSpeechPitch || '',
  );
  const parsedUnrealSpeechTemperature = Number.parseFloat(
    tts.unrealSpeechTemperature || '',
  );
  const parsedElevenLabsStability = Number.parseFloat(
    tts.elevenLabsStability || '',
  );
  const parsedElevenLabsSimilarityBoost = Number.parseFloat(
    tts.elevenLabsSimilarityBoost || '',
  );
  const parsedElevenLabsStyle = Number.parseFloat(tts.elevenLabsStyle || '');
  const parsedElevenLabsSpeed = Number.parseFloat(tts.elevenLabsSpeed || '');
  const parsedElevenLabsSeed = Number.parseInt(tts.elevenLabsSeed || '', 10);
  const parsedInworldSampleRateHertz = Number.parseInt(
    tts.inworldSampleRateHertz || '',
    10,
  );
  const parsedInworldBitRate = Number.parseInt(tts.inworldBitRate || '', 10);
  const parsedInworldSpeakingRate = Number.parseFloat(
    tts.inworldSpeakingRate || '',
  );
  const parsedInworldTemperature = Number.parseFloat(
    tts.inworldTemperature || '',
  );
  const parsedGradiumTemperature = Number.parseFloat(
    tts.gradiumTemperature || '',
  );
  const parsedGradiumVoiceSimilarity = Number.parseFloat(
    tts.gradiumVoiceSimilarity || '',
  );
  const parsedGradiumPaddingBonus = Number.parseFloat(
    tts.gradiumPaddingBonus || '',
  );
  const parsedPiperPlusSpeed = Number.parseFloat(tts.piperPlusSpeed || '');
  const parsedPiperPlusNoiseScale = Number.parseFloat(
    tts.piperPlusNoiseScale || '',
  );
  const parsedWebSpeechRate = Number.parseFloat(tts.webSpeechRate || '');
  const parsedWebSpeechPitch = Number.parseFloat(tts.webSpeechPitch || '');
  const parsedWebSpeechVolume = Number.parseFloat(tts.webSpeechVolume || '');
  const trimmedSpeaker = tts.speaker.trim();

  return {
    engineType: tts.engine,
    speaker:
      tts.engine === 'openaiCompatible' && !trimmedSpeaker
        ? undefined
        : tts.speaker,
    apiKey,
    openAiCompatibleApiUrl: tts.openAiCompatibleApiUrl,
    openAiCompatibleModel: tts.openAiCompatibleModel,
    openAiCompatibleSpeed: Number.isNaN(parsedOpenAiCompatibleSpeed)
      ? undefined
      : parsedOpenAiCompatibleSpeed,
    geminiTtsModel: tts.geminiTtsModel,
    geminiTtsLanguageCode: tts.geminiTtsLanguageCode?.trim() || undefined,
    geminiTtsPrompt: tts.geminiTtsPrompt?.trim() || undefined,
    voicevoxApiUrl: tts.voicevoxApiUrl,
    voicepeakApiUrl: tts.voicepeakApiUrl,
    aivisSpeechApiUrl: tts.aivisSpeechApiUrl,
    groupId: tts.minimaxGroupId,
    endpoint: tts.engine === 'minimax' ? 'global' : undefined,
    aivisCloudModelUuid: tts.aivisCloudModelUuid,
    aivisCloudSpeakerUuid: tts.aivisCloudSpeakerUuid,
    aivisCloudStyleId: Number.isNaN(parsedAivisCloudStyleId)
      ? undefined
      : parsedAivisCloudStyleId,
    xaiLanguage: tts.xaiLanguage?.trim() || undefined,
    xaiCodec: tts.xaiCodec as XaiCodec | undefined,
    xaiSampleRate: Number.isNaN(parsedXaiSampleRate)
      ? undefined
      : (parsedXaiSampleRate as XaiSampleRate),
    xaiBitRate:
      tts.xaiCodec === 'mp3' && !Number.isNaN(parsedXaiBitRate)
        ? (parsedXaiBitRate as XaiBitRate)
        : undefined,
    unrealSpeechApiUrl: tts.unrealSpeechApiUrl?.trim() || undefined,
    unrealSpeechBitrate: tts.unrealSpeechBitrate?.trim() || undefined,
    unrealSpeechSpeed: Number.isNaN(parsedUnrealSpeechSpeed)
      ? undefined
      : parsedUnrealSpeechSpeed,
    unrealSpeechPitch: Number.isNaN(parsedUnrealSpeechPitch)
      ? undefined
      : parsedUnrealSpeechPitch,
    unrealSpeechCodec:
      (tts.unrealSpeechCodec as UnrealSpeechCodec | undefined) || undefined,
    unrealSpeechTemperature: Number.isNaN(parsedUnrealSpeechTemperature)
      ? undefined
      : parsedUnrealSpeechTemperature,
    elevenLabsApiUrl: tts.elevenLabsApiUrl?.trim() || undefined,
    elevenLabsModel: tts.elevenLabsModel?.trim() || undefined,
    elevenLabsOutputFormat: tts.elevenLabsOutputFormat?.trim() || undefined,
    elevenLabsLanguageCode: tts.elevenLabsLanguageCode?.trim() || undefined,
    elevenLabsStability: Number.isNaN(parsedElevenLabsStability)
      ? undefined
      : parsedElevenLabsStability,
    elevenLabsSimilarityBoost: Number.isNaN(parsedElevenLabsSimilarityBoost)
      ? undefined
      : parsedElevenLabsSimilarityBoost,
    elevenLabsStyle: Number.isNaN(parsedElevenLabsStyle)
      ? undefined
      : parsedElevenLabsStyle,
    elevenLabsUseSpeakerBoost:
      tts.elevenLabsUseSpeakerBoost &&
      tts.elevenLabsUseSpeakerBoost !== 'default'
        ? tts.elevenLabsUseSpeakerBoost === 'true'
        : undefined,
    elevenLabsSpeed: Number.isNaN(parsedElevenLabsSpeed)
      ? undefined
      : parsedElevenLabsSpeed,
    elevenLabsSeed: Number.isNaN(parsedElevenLabsSeed)
      ? undefined
      : parsedElevenLabsSeed,
    elevenLabsApplyTextNormalization:
      tts.elevenLabsApplyTextNormalization &&
      tts.elevenLabsApplyTextNormalization !== 'default'
        ? (tts.elevenLabsApplyTextNormalization as ElevenLabsApplyTextNormalization)
        : undefined,
    inworldApiUrl: tts.inworldApiUrl?.trim() || undefined,
    inworldModel: tts.inworldModel?.trim() || undefined,
    inworldAudioEncoding:
      (tts.inworldAudioEncoding as InworldAudioEncoding | undefined) ||
      undefined,
    inworldSampleRateHertz: Number.isNaN(parsedInworldSampleRateHertz)
      ? undefined
      : parsedInworldSampleRateHertz,
    inworldBitRate: Number.isNaN(parsedInworldBitRate)
      ? undefined
      : parsedInworldBitRate,
    inworldSpeakingRate: Number.isNaN(parsedInworldSpeakingRate)
      ? undefined
      : parsedInworldSpeakingRate,
    inworldLanguage: tts.inworldLanguage?.trim() || undefined,
    inworldDeliveryMode:
      tts.inworldDeliveryMode && tts.inworldDeliveryMode !== 'default'
        ? (tts.inworldDeliveryMode as InworldDeliveryMode)
        : undefined,
    inworldTemperature: Number.isNaN(parsedInworldTemperature)
      ? undefined
      : parsedInworldTemperature,
    gradiumApiUrl: tts.gradiumApiUrl?.trim() || undefined,
    gradiumOutputFormat:
      (tts.gradiumOutputFormat as GradiumOutputFormat | undefined) || undefined,
    gradiumTemperature: Number.isNaN(parsedGradiumTemperature)
      ? undefined
      : parsedGradiumTemperature,
    gradiumVoiceSimilarity: Number.isNaN(parsedGradiumVoiceSimilarity)
      ? undefined
      : parsedGradiumVoiceSimilarity,
    gradiumPaddingBonus: Number.isNaN(parsedGradiumPaddingBonus)
      ? undefined
      : parsedGradiumPaddingBonus,
    gradiumRewriteRules: tts.gradiumRewriteRules?.trim() || undefined,
    piperPlusBasePath: tts.piperPlusBasePath?.trim() || undefined,
    piperPlusModelConfigFile: tts.piperPlusModelConfigFile?.trim() || undefined,
    piperPlusModelFile: tts.piperPlusModelFile?.trim() || undefined,
    piperPlusVoiceFile: tts.piperPlusVoiceFile?.trim() || undefined,
    piperPlusSpeed: Number.isNaN(parsedPiperPlusSpeed)
      ? undefined
      : parsedPiperPlusSpeed,
    piperPlusNoiseScale: Number.isNaN(parsedPiperPlusNoiseScale)
      ? undefined
      : parsedPiperPlusNoiseScale,
    webSpeechRate: Number.isNaN(parsedWebSpeechRate)
      ? undefined
      : parsedWebSpeechRate,
    webSpeechPitch: Number.isNaN(parsedWebSpeechPitch)
      ? undefined
      : parsedWebSpeechPitch,
    webSpeechVolume: Number.isNaN(parsedWebSpeechVolume)
      ? undefined
      : parsedWebSpeechVolume,
    webSpeechLanguage: tts.webSpeechLanguage?.trim() || undefined,
    onPlay,
  } as VoiceServiceOptions;
}

export function useAituberCore({
  onAudioPlay,
  settings,
  getApiKeyForProvider,
}: UseAituberCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const chatHistoryRef = useRef<
    ReturnType<AITuberOnAirCore['getChatHistory']>
  >([]);
  const manneriDetectorRef = useRef<ManneriDetector | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const messageIdSequenceRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialResponse, setPartialResponse] = useState('');

  // Keep the latest onAudioPlay callback in a ref
  const onAudioPlayRef = useRef(onAudioPlay);
  onAudioPlayRef.current = onAudioPlay;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!settings.manneri.enabled) {
      manneriDetectorRef.current = null;
      return;
    }

    manneriDetectorRef.current = new ManneriDetector({
      similarityThreshold: settings.manneri.similarityThreshold,
      lookbackWindow: settings.manneri.lookbackWindow,
      interventionCooldown: settings.manneri.interventionCooldownMs,
      minMessageLength: settings.manneri.minMessageLength,
      language: 'ja',
    });
  }, [
    settings.manneri.enabled,
    settings.manneri.similarityThreshold,
    settings.manneri.lookbackWindow,
    settings.manneri.interventionCooldownMs,
    settings.manneri.minMessageLength,
  ]);

  const llmApiKey = getApiKeyForProvider(settings.llm.provider);
  const ttsApiKey = getTtsApiKey(settings, getApiKeyForProvider);
  const isOpenAICompatibleProvider =
    settings.llm.provider === 'openai-compatible';
  const isApiKeyOptionalProvider =
    isOpenAICompatibleProvider || settings.llm.provider === 'gemini-nano';
  const openAICompatibleEndpoint = settings.llm.endpoint?.trim() || '';
  const resolvedModel =
    settings.llm.provider === 'openai-compatible'
      ? settings.llm.model.trim() || 'local-model'
      : settings.llm.model;
  const isOpenAIGPT5Model =
    settings.llm.provider === 'openai' && isGPT5Model(resolvedModel);
  const xaiProviderOptions =
    settings.llm.provider === 'xai' &&
    isXaiReasoningEffortModel(resolvedModel)
      ? {
          reasoning_effort:
            settings.llm.xaiReasoningEffort ||
            getDefaultXaiReasoningEffort(resolvedModel) ||
            'none',
        }
      : undefined;
  const providerOptions = isOpenAICompatibleProvider
    ? { endpoint: openAICompatibleEndpoint }
    : isOpenAIGPT5Model
      ? GPT5_SAMPLE_PROVIDER_OPTIONS
      : xaiProviderOptions;
  const createMessageId = useCallback(() => {
    messageIdSequenceRef.current += 1;
    return `${Date.now()}-${messageIdSequenceRef.current}`;
  }, []);

  // Effect 1: Recreate core when LLM settings change
  useEffect(() => {
    if (!isApiKeyOptionalProvider && !llmApiKey) {
      coreRef.current?.offAll();
      coreRef.current = null;
      console.error(
        `API key is not set for provider: ${settings.llm.provider}`,
      );
      return;
    }

    if (isOpenAICompatibleProvider && !openAICompatibleEndpoint) {
      coreRef.current?.offAll();
      coreRef.current = null;
      console.error('Endpoint URL is required for openai-compatible provider');
      return;
    }

    const core = new AITuberOnAirCore({
      apiKey: llmApiKey.trim(),
      chatProvider: settings.llm.provider,
      model: resolvedModel,
      providerOptions,
      chatOptions: {
        systemPrompt:
          settings.llm.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
        ...(isOpenAIGPT5Model ? GPT5_SAMPLE_CHAT_OPTIONS : {}),
      },
      voiceOptions: buildVoiceOptions(
        settings.tts,
        ttsApiKey,
        async (audioBuffer: ArrayBuffer) => {
          await onAudioPlayRef.current(audioBuffer);
        },
      ),
      debug: false,
    } as ConstructorParameters<typeof AITuberOnAirCore>[0]);

    if (chatHistoryRef.current.length > 0) {
      core.setChatHistory(chatHistoryRef.current);
    }

    // Subscribe to core events
    core.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setIsProcessing(true);
      setPartialResponse('');
    });

    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      setIsProcessing(false);
      setPartialResponse('');
    });

    core.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (data: unknown) => {
      const text =
        typeof data === 'string'
          ? data
          : ((data as { message?: string; rawText?: string })?.message ??
            (data as { rawText?: string })?.rawText ??
            String(data));
      setPartialResponse(text);
    });

    core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data: unknown) => {
      let content: string;
      if (typeof data === 'string') {
        content = data;
      } else {
        const d = data as {
          message?: { content?: string } | string;
          rawText?: string;
        };
        const msg = d?.message;
        content =
          (typeof msg === 'string' ? msg : msg?.content) ??
          d?.rawText ??
          String(data);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content,
          timestamp: Date.now(),
        },
      ]);
      setPartialResponse('');
    });

    core.on(AITuberOnAirCoreEvent.ERROR, (error: unknown) => {
      console.error('AITuberOnAirCore error:', error);
      setIsProcessing(false);
    });

    coreRef.current = core;

    return () => {
      chatHistoryRef.current = core.getChatHistory();
      core.offAll();
      if (coreRef.current === core) {
        coreRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.llm.provider,
    settings.llm.model,
    settings.llm.systemPrompt,
    settings.llm.endpoint,
    settings.llm.xaiReasoningEffort,
    llmApiKey,
    isApiKeyOptionalProvider,
    createMessageId,
  ]);

  // Effect 2: Update voice service when TTS settings change (no core recreation)
  useEffect(() => {
    if (!coreRef.current) return;
    coreRef.current.updateVoiceService(
      buildVoiceOptions(
        settings.tts,
        ttsApiKey,
        async (audioBuffer: ArrayBuffer) => {
          await onAudioPlayRef.current(audioBuffer);
        },
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.tts.engine,
    settings.tts.speaker,
    settings.tts.openAiCompatibleApiUrl,
    settings.tts.openAiCompatibleModel,
    settings.tts.openAiCompatibleSpeed,
    settings.tts.voicevoxApiUrl,
    settings.tts.voicepeakApiUrl,
    settings.tts.aivisSpeechApiUrl,
    settings.tts.aivisCloudModelUuid,
    settings.tts.aivisCloudSpeakerUuid,
    settings.tts.aivisCloudStyleId,
    settings.tts.minimaxGroupId,
    settings.tts.xaiLanguage,
    settings.tts.xaiCodec,
    settings.tts.xaiSampleRate,
    settings.tts.xaiBitRate,
    settings.tts.webSpeechRate,
    settings.tts.webSpeechPitch,
    settings.tts.webSpeechVolume,
    settings.tts.webSpeechLanguage,
    ttsApiKey,
  ]);

  const processChat = useCallback(
    async (text: string, options?: ProcessChatOptions) => {
      if (!coreRef.current || !text.trim()) return;

      let coreInput = text.trim();
      const displayText = (options?.displayText ?? text).trim();
      const manneriDetector = manneriDetectorRef.current;

      if (manneriDetector) {
        try {
          const manneriMessages = toManneriMessages(
            messagesRef.current,
            coreInput,
          );
          if (manneriDetector.shouldIntervene(manneriMessages)) {
            const prompt =
              manneriDetector.generateDiversificationPrompt(manneriMessages);
            coreInput = buildManneriAugmentedInput(coreInput, prompt.content);
          }
        } catch (err) {
          console.warn('Manneri detection failed:', err);
        }
      }

      // Append the user message to the chat log
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'user',
          content: displayText,
          timestamp: Date.now(),
        },
      ]);

      try {
        await coreRef.current.processChat(coreInput);
      } catch (err) {
        console.error('processChat error:', err);
        setIsProcessing(false);
      }
    },
    [createMessageId],
  );

  const processVisionChat = useCallback(
    async (imageDataUrl: string, prompt = DEFAULT_VISION_PROMPT) => {
      if (!coreRef.current || !imageDataUrl) return;

      const trimmedPrompt = prompt.trim() || DEFAULT_VISION_PROMPT;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'user',
          content: '画面を見てコメント',
          timestamp: Date.now(),
        },
      ]);

      try {
        await coreRef.current.processVisionChat(imageDataUrl, trimmedPrompt);
      } catch (err) {
        console.error('processVisionChat error:', err);
        setIsProcessing(false);
      }
    },
    [createMessageId],
  );

  return {
    messages,
    isProcessing,
    partialResponse,
    processChat,
    processVisionChat,
  };
}

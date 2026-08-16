import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  getDefaultXaiReasoningEffort,
  isGPT5Model,
  isXaiReasoningEffortModel,
} from '@aituber-onair/core';
import { ManneriDetector } from '@aituber-onair/manneri';
import {
  KizunaManager,
  LocalStorageProvider,
  createDefaultKizunaConfig,
  type BondSnapshot,
  type IStorageProvider,
  type InteractionKind,
} from '@aituber-onair/kizuna';
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
import {
  buildBondAwareSystemPrompt,
  formatBondStage,
  getBondContextDisplayName,
  type BondIdentity,
  type BondToast,
} from '../lib/kizunaBond';
import {
  attemptPngTuberKizunaStorageClear,
  PNGTUBER_KIZUNA_STORAGE_KEY,
  tryCreateKizunaStorageProvider,
} from '../lib/kizunaStorage';
import {
  createSerialTaskQueue,
  type SerialTaskQueue,
} from '../lib/serialTaskQueue';

interface ScreenplayLike {
  emotion?: string;
  text?: string;
}

interface UseAituberCoreOptions {
  onAudioPlay: (arrayBuffer: ArrayBuffer) => Promise<void>;
  onSpeechStart?: (screenplay: ScreenplayLike) => void;
  onSpeechEnd?: () => void;
  settings: AppSettings;
  getApiKeyForProvider: (provider: ChatProviderOption) => string;
}

type ProcessChatOptions = {
  displayText?: string;
  bondIdentity?: BondIdentity;
  bondMessage?: string;
  bondAlreadyRecorded?: boolean;
};

const DEFAULT_VISION_PROMPT =
  'OBS仮想カメラの画面を見て、配信者として短く自然にコメントしてください。';
const GPT5_SAMPLE_PROVIDER_OPTIONS = { gpt5Preset: 'casual' as const };
const GPT5_SAMPLE_CHAT_OPTIONS = { responseLength: 'veryShort' as const };
const MAX_BOND_TOASTS = 4;
const BOND_TOAST_DURATION_MS = 4_500;
const VISIBLE_BOND_CHANGE = 0.0005;

interface PngTuberKizunaManagerSetup {
  manager: KizunaManager;
  storageProvider: IStorageProvider | null;
}

function createPngTuberKizunaManager(
  enablePersistence = true,
): PngTuberKizunaManagerSetup {
  const config = createDefaultKizunaConfig();
  config.basePoints = {
    ...config.basePoints,
    message: 20,
    reaction: 5,
  };
  const storageProvider = enablePersistence
    ? tryCreateKizunaStorageProvider(
        () => new LocalStorageProvider(),
        (error) => {
          console.warn(
            'Kizuna persistence is unavailable; continuing with in-memory storage.',
            error,
          );
        },
      )
    : undefined;
  return {
    manager: new KizunaManager(
      config,
      storageProvider,
      PNGTUBER_KIZUNA_STORAGE_KEY,
    ),
    storageProvider: storageProvider ?? null,
  };
}

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

function extractScreenplay(data: unknown): ScreenplayLike | null {
  if (!data || typeof data !== 'object') return null;
  const source = (data as { screenplay?: unknown }).screenplay ?? data;
  if (!source || typeof source !== 'object') return null;
  const screenplay = source as { emotion?: unknown; text?: unknown };
  const emotion =
    typeof screenplay.emotion === 'string' ? screenplay.emotion : undefined;
  const text =
    typeof screenplay.text === 'string' ? screenplay.text : undefined;
  return emotion || text ? { emotion, text } : null;
}

export function useAituberCore({
  onAudioPlay,
  onSpeechStart,
  onSpeechEnd,
  settings,
  getApiKeyForProvider,
}: UseAituberCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const kizunaRef = useRef<KizunaManager | null>(null);
  const kizunaStorageProviderRef = useRef<IStorageProvider | null>(null);
  if (!kizunaRef.current) {
    const setup = createPngTuberKizunaManager();
    kizunaRef.current = setup.manager;
    kizunaStorageProviderRef.current = setup.storageProvider;
  }
  const coreRequestQueueRef = useRef<SerialTaskQueue | null>(null);
  if (!coreRequestQueueRef.current) {
    coreRequestQueueRef.current = createSerialTaskQueue();
  }
  const enqueueCoreRequest = coreRequestQueueRef.current;
  const activeBondIdentityRef = useRef<BondIdentity | null>(null);
  const bondQueueRef = useRef<Promise<void>>(Promise.resolve());
  const bondToastSequenceRef = useRef(0);
  const bondToastTimersRef = useRef(new Map<number, number>());
  const bondToastByUserRef = useRef(new Map<string, number>());
  const chatHistoryRef = useRef<ReturnType<AITuberOnAirCore['getChatHistory']>>(
    [],
  );
  const manneriDetectorRef = useRef<ManneriDetector | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const messageIdSequenceRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialResponse, setPartialResponse] = useState('');
  const [bondToasts, setBondToasts] = useState<BondToast[]>([]);

  useEffect(() => {
    const manager = kizunaRef.current;
    if (!manager) return;
    void manager.initialize().catch((error) => {
      console.error('Failed to initialize Kizuna data:', error);
    });
  }, []);

  const dismissBondToast = useCallback((id: number) => {
    const timer = bondToastTimersRef.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    bondToastTimersRef.current.delete(id);
    for (const [userId, toastId] of bondToastByUserRef.current) {
      if (toastId === id) bondToastByUserRef.current.delete(userId);
    }
    setBondToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearBondToasts = useCallback(() => {
    for (const timer of bondToastTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    bondToastTimersRef.current.clear();
    bondToastByUserRef.current.clear();
    setBondToasts([]);
  }, []);

  const resetKizunaData = useCallback((): Promise<void> => {
    const reset = bondQueueRef.current.then(async () => {
      activeBondIdentityRef.current = null;
      kizunaRef.current?.destroy();

      const storageClearResult =
        await attemptPngTuberKizunaStorageClear(
          kizunaStorageProviderRef.current,
        );
      if (!storageClearResult.storageCleared) {
        console.error(
          'Failed to clear persisted Kizuna data:',
          storageClearResult.error,
        );
      }

      const setup = createPngTuberKizunaManager(
        storageClearResult.storageCleared,
      );
      kizunaRef.current = setup.manager;
      kizunaStorageProviderRef.current = storageClearResult.storageCleared
        ? setup.storageProvider
        : storageClearResult.storageProvider;
      try {
        await setup.manager.initialize();
      } catch (error) {
        console.error('Failed to initialize reset Kizuna data:', error);
      }
      clearBondToasts();

      if (!storageClearResult.storageCleared) {
        throw storageClearResult.error;
      }
    });
    bondQueueRef.current = reset.then(
      () => undefined,
      () => undefined,
    );
    return reset;
  }, [clearBondToasts]);

  const recordBondInteraction = useCallback(
    async (
      identity: BondIdentity,
      kind: InteractionKind,
      message: string,
      emotion?: string,
      timestamp = Date.now(),
    ): Promise<BondSnapshot | null> => {
      if (!settings.kizuna.enabled || !kizunaRef.current) return null;
      const manager = kizunaRef.current;
      await manager.initialize();
      const previousSnapshot = manager.getBondSnapshot(identity.userId);
      const previousIntimacy = manager.toRelationshipCapital(identity.userId);
      const result = await manager.processInteraction({
        userId: identity.userId,
        kind,
        message,
        emotion,
        isOwner: identity.isOwner,
        timestamp,
        metadata: {
          displayName: getBondContextDisplayName(identity.source),
          source: identity.source,
        },
      });
      const nextSnapshot = manager.getBondSnapshot(identity.userId);
      if (!nextSnapshot) return null;

      const nextIntimacy = manager.toRelationshipCapital(identity.userId);
      if (Math.abs(nextIntimacy - previousIntimacy) > VISIBLE_BOND_CHANGE) {
        bondToastSequenceRef.current += 1;
        const id = bondToastSequenceRef.current;
        const toast: BondToast = {
          id,
          userId: identity.userId,
          displayName: identity.displayName,
          pointsAdded: result.pointsAdded,
          previousIntimacy,
          nextIntimacy,
          previousStage: previousSnapshot
            ? formatBondStage(previousSnapshot.stage)
            : '未接触',
          nextStage: formatBondStage(nextSnapshot.stage),
          leveledUp: result.leveledUp,
          ...(result.newLevel !== undefined && {
            newLevel: result.newLevel,
          }),
        };
        const previousToastId = bondToastByUserRef.current.get(identity.userId);
        if (previousToastId !== undefined) {
          const previousTimer = bondToastTimersRef.current.get(previousToastId);
          if (previousTimer !== undefined) window.clearTimeout(previousTimer);
          bondToastTimersRef.current.delete(previousToastId);
        }
        bondToastByUserRef.current.set(identity.userId, id);
        setBondToasts((current) =>
          [
            ...current.filter(({ id: toastId }) =>
              previousToastId === undefined
                ? true
                : toastId !== previousToastId,
            ),
            toast,
          ].slice(-MAX_BOND_TOASTS),
        );
        const timer = window.setTimeout(
          () => dismissBondToast(id),
          BOND_TOAST_DURATION_MS,
        );
        bondToastTimersRef.current.set(id, timer);
      }
      return nextSnapshot;
    },
    [dismissBondToast, settings.kizuna.enabled],
  );

  const queueBondInteraction = useCallback(
    (
      identity: BondIdentity,
      kind: InteractionKind,
      message: string,
      emotion?: string,
      timestamp?: number,
    ): Promise<BondSnapshot | null> => {
      const result = bondQueueRef.current.then(() =>
        recordBondInteraction(identity, kind, message, emotion, timestamp),
      );
      bondQueueRef.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    [recordBondInteraction],
  );

  const recordBondMessage = useCallback(
    (
      identity: BondIdentity,
      message: string,
      timestamp = Date.now(),
    ): Promise<BondSnapshot | null> =>
      queueBondInteraction(identity, 'message', message, undefined, timestamp),
    [queueBondInteraction],
  );

  // Keep the latest onAudioPlay callback in a ref
  const onAudioPlayRef = useRef(onAudioPlay);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  useEffect(() => {
    onAudioPlayRef.current = onAudioPlay;
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
  }, [onAudioPlay, onSpeechEnd, onSpeechStart]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (settings.kizuna.enabled) return;
    activeBondIdentityRef.current = null;
    clearBondToasts();
  }, [clearBondToasts, settings.kizuna.enabled]);

  useEffect(
    () => () => {
      kizunaRef.current?.destroy();
      for (const timer of bondToastTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      bondToastTimersRef.current.clear();
      bondToastByUserRef.current.clear();
    },
    [],
  );

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
    settings.llm.provider === 'xai' && isXaiReasoningEffortModel(resolvedModel)
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
        systemPrompt: settings.llm.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
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
      let responseEmotion: string | undefined;
      if (typeof data === 'string') {
        content = data;
      } else {
        const d = data as {
          message?: { content?: string } | string;
          rawText?: string;
          screenplay?: { emotion?: string; text?: string };
        };
        const msg = d?.message;
        const cleanText = d?.screenplay?.text?.trim();
        content =
          cleanText ||
          ((typeof msg === 'string' ? msg : msg?.content) ??
            d?.rawText ??
            String(data));
        responseEmotion = d?.screenplay?.emotion;
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

      const bondIdentity = activeBondIdentityRef.current;
      activeBondIdentityRef.current = null;
      if (bondIdentity && responseEmotion) {
        void queueBondInteraction(
          bondIdentity,
          'reaction',
          content,
          responseEmotion,
        ).catch((error) => {
          console.error('Failed to record Kizuna response emotion:', error);
        });
      }
    });

    core.on(AITuberOnAirCoreEvent.SPEECH_START, (data: unknown) => {
      const screenplay = extractScreenplay(data);
      if (screenplay) onSpeechStartRef.current?.(screenplay);
    });

    core.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
      onSpeechEndRef.current?.();
    });

    core.on(AITuberOnAirCoreEvent.ERROR, (error: unknown) => {
      console.error('AITuberOnAirCore error:', error);
      activeBondIdentityRef.current = null;
      setIsProcessing(false);
      onSpeechEndRef.current?.();
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
    settings.kizuna.enabled,
    llmApiKey,
    isApiKeyOptionalProvider,
    createMessageId,
    queueBondInteraction,
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
    (text: string, options?: ProcessChatOptions) =>
      enqueueCoreRequest(async () => {
        const core = coreRef.current;
        if (!core || !text.trim()) return;

        let coreInput = text.trim();
        const displayText = (options?.displayText ?? text).trim();
        const bondIdentity = options?.bondIdentity;
        const shouldTrackBond = settings.kizuna.enabled && Boolean(bondIdentity);
        const manneriDetector = manneriDetectorRef.current;

        if (shouldTrackBond && bondIdentity && kizunaRef.current) {
          try {
            if (options?.bondAlreadyRecorded) {
              await bondQueueRef.current;
            } else {
              await recordBondMessage(
                bondIdentity,
                options?.bondMessage ?? displayText,
              );
            }
            const bondContext = kizunaRef.current.getBondContext(
              bondIdentity.userId,
              { language: 'ja' },
            );
            core.updateChatOptions({
              systemPrompt: buildBondAwareSystemPrompt(
                settings.llm.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
                bondContext,
              ),
            });
          } catch (error) {
            console.error('Failed to update Kizuna bond context:', error);
            core.updateChatOptions({
              systemPrompt:
                settings.llm.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
            });
          }
        } else {
          core.updateChatOptions({
            systemPrompt:
              settings.llm.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
          });
        }

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

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: 'user',
            content: displayText,
            timestamp: Date.now(),
          },
        ]);

        activeBondIdentityRef.current =
          shouldTrackBond && bondIdentity ? bondIdentity : null;
        try {
          await core.processChat(coreInput);
        } catch (err) {
          console.error('processChat error:', err);
          setIsProcessing(false);
        } finally {
          activeBondIdentityRef.current = null;
        }
      }),
    [
      createMessageId,
      enqueueCoreRequest,
      recordBondMessage,
      settings.kizuna.enabled,
      settings.llm.systemPrompt,
    ],
  );

  const processVisionChat = useCallback(
    (imageDataUrl: string, prompt = DEFAULT_VISION_PROMPT) =>
      enqueueCoreRequest(async () => {
        const core = coreRef.current;
        if (!core || !imageDataUrl) return;

        const trimmedPrompt = prompt.trim() || DEFAULT_VISION_PROMPT;
        activeBondIdentityRef.current = null;
        core.updateChatOptions({
          systemPrompt: settings.llm.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
        });
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
          await core.processVisionChat(imageDataUrl, trimmedPrompt);
        } catch (err) {
          console.error('processVisionChat error:', err);
          setIsProcessing(false);
        } finally {
          activeBondIdentityRef.current = null;
        }
      }),
    [createMessageId, enqueueCoreRequest, settings.llm.systemPrompt],
  );

  return {
    messages,
    isProcessing,
    partialResponse,
    processChat,
    processVisionChat,
    bondToasts,
    dismissBondToast,
    recordBondMessage,
    resetKizunaData,
  };
}

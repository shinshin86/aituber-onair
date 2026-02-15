import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
} from '@aituber-onair/core';
import type { VoiceServiceOptions } from '@aituber-onair/core';
import type { ChatMessage } from '../types/chat';
import type { AppSettings, ChatProviderOption } from '../types/settings';

interface UseAituberCoreOptions {
  onAudioPlay: (arrayBuffer: ArrayBuffer) => Promise<void>;
  settings: AppSettings;
  getApiKeyForProvider: (provider: ChatProviderOption) => string;
}

function getTtsApiKey(
  settings: AppSettings,
  getApiKeyForProvider: (provider: ChatProviderOption) => string,
): string {
  if (settings.tts.engine === 'openai') {
    return getApiKeyForProvider('openai');
  }
  if (settings.tts.engine === 'aivisCloud') {
    return settings.tts.aivisCloudApiKey || '';
  }
  if (settings.tts.engine === 'minimax') {
    return settings.tts.minimaxApiKey || '';
  }
  return getApiKeyForProvider(settings.llm.provider);
}

function buildVoiceOptions(
  tts: AppSettings['tts'],
  apiKey: string,
  onPlay: (audioBuffer: ArrayBuffer) => Promise<void>,
): VoiceServiceOptions {
  const parsedAivisCloudStyleId = Number.parseInt(tts.aivisCloudStyleId || '', 10);

  return {
    engineType: tts.engine,
    speaker: tts.speaker,
    apiKey,
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
    onPlay,
  };
}

export function useAituberCore({
  onAudioPlay,
  settings,
  getApiKeyForProvider,
}: UseAituberCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const messageIdSequenceRef = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialResponse, setPartialResponse] = useState('');

  // Keep the latest onAudioPlay callback in a ref
  const onAudioPlayRef = useRef(onAudioPlay);
  onAudioPlayRef.current = onAudioPlay;

  const llmApiKey = getApiKeyForProvider(settings.llm.provider);
  const ttsApiKey = getTtsApiKey(settings, getApiKeyForProvider);
  const createMessageId = useCallback(() => {
    messageIdSequenceRef.current += 1;
    return `${Date.now()}-${messageIdSequenceRef.current}`;
  }, []);

  // Effect 1: Recreate core when LLM settings change
  useEffect(() => {
    if (!llmApiKey) {
      coreRef.current?.offAll();
      coreRef.current = null;
      console.error(`API key is not set for provider: ${settings.llm.provider}`);
      return;
    }

    const core = new AITuberOnAirCore({
      apiKey: llmApiKey,
      chatProvider: settings.llm.provider,
      model: settings.llm.model,
      chatOptions: {
        systemPrompt:
          'あなたはフレンドリーなAITuberです。親しみやすい口調で応答してください。',
      },
      voiceOptions: buildVoiceOptions(
        settings.tts,
        ttsApiKey,
        async (audioBuffer: ArrayBuffer) => {
          await onAudioPlayRef.current(audioBuffer);
        },
      ),
      debug: false,
    });

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
          : (data as { message?: string; rawText?: string })?.message ??
            (data as { rawText?: string })?.rawText ??
            String(data);
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
        { id: createMessageId(), role: 'assistant', content, timestamp: Date.now() },
      ]);
      setPartialResponse('');
    });

    core.on(AITuberOnAirCoreEvent.ERROR, (error: unknown) => {
      console.error('AITuberOnAirCore error:', error);
      setIsProcessing(false);
    });

    coreRef.current = core;

    return () => {
      core.offAll();
      coreRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.llm.provider, settings.llm.model, llmApiKey, ttsApiKey, createMessageId]);

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
    settings.tts.voicevoxApiUrl,
    settings.tts.voicepeakApiUrl,
    settings.tts.aivisSpeechApiUrl,
    settings.tts.aivisCloudModelUuid,
    settings.tts.aivisCloudSpeakerUuid,
    settings.tts.aivisCloudStyleId,
    settings.tts.minimaxGroupId,
    ttsApiKey,
  ]);

  const processChat = useCallback(async (text: string) => {
    if (!coreRef.current || !text.trim()) return;

    // Append the user message to the chat log
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: 'user', content: text.trim(), timestamp: Date.now() },
    ]);

    try {
      await coreRef.current.processChat(text.trim());
    } catch (err) {
      console.error('processChat error:', err);
      setIsProcessing(false);
    }
  }, [createMessageId]);

  return {
    messages,
    isProcessing,
    partialResponse,
    processChat,
  };
}

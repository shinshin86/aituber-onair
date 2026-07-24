import { useCallback, useEffect, useRef, useState } from 'react';
import { AITuberOnAirCore, AITuberOnAirCoreEvent } from '@aituber-onair/core';
import {
  createPuruPuruReactionFromScreenplay,
  type PuruPuruReaction,
} from '../lib/purupuruReactions';

const CLIENT_SYSTEM_PROMPT = [
  'You are the AITuber OnAir character support assistant.',
  'Start every reply with one of [happy], [sad], [angry], [surprised],',
  '[relaxed], or [neutral]. Keep replies concise and practical.',
].join(' ');

export interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  state?: 'streaming' | 'error';
}

interface ScreenplayLike {
  emotion?: string;
  text?: string;
}

interface UseCharacterSupportCoreOptions {
  enabled: boolean;
  onAudioPlay: (audioBuffer: ArrayBuffer) => Promise<void>;
}

const cleanEmotionTag = (text: string): string =>
  text.replace(/^\s*\[[a-z]+\]\s*/i, '');

const getScreenplay = (value: unknown): ScreenplayLike | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as {
    screenplay?: unknown;
    emotion?: unknown;
    text?: unknown;
  };
  const candidate =
    source.screenplay && typeof source.screenplay === 'object'
      ? (source.screenplay as { emotion?: unknown; text?: unknown })
      : source;
  const emotion =
    typeof candidate.emotion === 'string' ? candidate.emotion : undefined;
  const text = typeof candidate.text === 'string' ? candidate.text : undefined;
  return emotion || text ? { emotion, text } : null;
};

const getAssistantText = (value: unknown): string => {
  if (typeof value === 'string') return cleanEmotionTag(value);
  if (!value || typeof value !== 'object') return String(value ?? '');

  const source = value as {
    screenplay?: { text?: unknown };
    message?: string | { content?: unknown };
    rawText?: unknown;
  };
  if (typeof source.screenplay?.text === 'string') {
    return source.screenplay.text;
  }
  if (typeof source.message === 'string') {
    return cleanEmotionTag(source.message);
  }
  if (
    source.message &&
    typeof source.message === 'object' &&
    typeof source.message.content === 'string'
  ) {
    return cleanEmotionTag(source.message.content);
  }
  return typeof source.rawText === 'string'
    ? cleanEmotionTag(source.rawText)
    : '';
};

export function useCharacterSupportCore({
  enabled,
  onAudioPlay,
}: UseCharacterSupportCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const onAudioPlayRef = useRef(onAudioPlay);
  const activeAssistantIdRef = useRef<string | null>(null);
  const partialTextRef = useRef('');
  const sequenceRef = useRef(0);
  const reactionSequenceRef = useRef(0);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [reaction, setReaction] = useState<PuruPuruReaction | null>(null);

  useEffect(() => {
    onAudioPlayRef.current = onAudioPlay;
  }, [onAudioPlay]);

  const createId = useCallback((prefix: string) => {
    sequenceRef.current += 1;
    return `${prefix}-${Date.now()}-${sequenceRef.current}`;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const endpoint = `${window.location.origin}/api/support/chat/completions`;
    const ttsEndpoint = `${window.location.origin}/api/support/tts`;
    const core = new AITuberOnAirCore({
      apiKey: '',
      chatProvider: 'openai-compatible',
      model: 'character-support-bot',
      providerOptions: { endpoint },
      chatOptions: {
        systemPrompt: CLIENT_SYSTEM_PROMPT,
        maxTokens: 600,
      },
      voiceOptions: {
        engineType: 'openaiCompatible',
        speaker: 'support-voice',
        openAiCompatibleApiUrl: ttsEndpoint,
        openAiCompatibleModel: 'support-proxy',
        onPlay: async (audioBuffer) => {
          await onAudioPlayRef.current(audioBuffer);
        },
      },
      debug: false,
    } as ConstructorParameters<typeof AITuberOnAirCore>[0]);

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setIsProcessing(true);
    });

    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      setIsProcessing(false);
    });

    core.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (value: unknown) => {
      const delta =
        typeof value === 'string'
          ? value
          : ((value as { message?: unknown })?.message ?? '');
      if (typeof delta !== 'string' || !activeAssistantIdRef.current) return;
      partialTextRef.current += delta;
      const visibleText = cleanEmotionTag(partialTextRef.current);
      const activeId = activeAssistantIdRef.current;
      setMessages((current) =>
        current.map((message) =>
          message.id === activeId
            ? { ...message, content: visibleText }
            : message,
        ),
      );
    });

    core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (value: unknown) => {
      const activeId = activeAssistantIdRef.current;
      if (!activeId) return;
      const content = getAssistantText(value);
      setMessages((current) =>
        current.map((message) =>
          message.id === activeId
            ? { ...message, content, state: undefined }
            : message,
        ),
      );
      activeAssistantIdRef.current = null;
      partialTextRef.current = '';
    });

    core.on(AITuberOnAirCoreEvent.SPEECH_START, (value: unknown) => {
      setIsSpeechActive(true);
      const screenplay = getScreenplay(value);
      const draft = createPuruPuruReactionFromScreenplay(screenplay);
      if (!draft) {
        setReaction(null);
        return;
      }
      reactionSequenceRef.current += 1;
      setReaction({ ...draft, id: reactionSequenceRef.current });
    });

    core.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
      setIsSpeechActive(false);
      setReaction(null);
    });

    core.on(AITuberOnAirCoreEvent.ERROR, (error: unknown) => {
      console.error('Character support core error:', error);
      const activeId = activeAssistantIdRef.current;
      if (activeId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === activeId
              ? {
                  ...message,
                  content:
                    'I could not complete that request. Check the server configuration and try again.',
                  state: 'error',
                }
              : message,
          ),
        );
      }
      activeAssistantIdRef.current = null;
      partialTextRef.current = '';
      setIsProcessing(false);
      setIsSpeechActive(false);
      setReaction(null);
    });

    coreRef.current = core;
    queueMicrotask(() => {
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
      core.stopSpeech();
      core.offAll();
      setIsSpeechActive(false);
      if (coreRef.current === core) coreRef.current = null;
    };
  }, [enabled]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const core = coreRef.current;
      const content = text.trim();
      if (!core || !content || isProcessing) return;

      const userMessage: SupportMessage = {
        id: createId('user'),
        role: 'user',
        content,
      };
      const assistantMessage: SupportMessage = {
        id: createId('assistant'),
        role: 'assistant',
        content: '',
        state: 'streaming',
      };
      activeAssistantIdRef.current = assistantMessage.id;
      partialTextRef.current = '';
      setMessages((current) => [...current, userMessage, assistantMessage]);

      await core.processChat(content);
    },
    [createId, isProcessing],
  );

  return {
    messages,
    isReady,
    isProcessing,
    isSpeechActive,
    reaction,
    sendMessage,
  };
}

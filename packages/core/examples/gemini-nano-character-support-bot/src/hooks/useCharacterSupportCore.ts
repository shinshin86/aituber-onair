import { useCallback, useEffect, useRef, useState } from 'react';
import { AITuberOnAirCore, AITuberOnAirCoreEvent } from '@aituber-onair/core';
import type { Language } from '../i18n';
import {
  createPuruPuruReactionFromScreenplay,
  type PuruPuruReaction,
} from '../lib/purupuruReactions';
import {
  buildSupportSystemPrompt,
  getGeminiNanoLanguageOptions,
  getWebSpeechLanguage,
  normalizeEmotion,
  stripEmotionTag,
  SUPPORT_RESPONSE_LENGTH,
} from '../support';

export interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  state?: 'streaming' | 'error';
}

export interface ScreenplayLike {
  emotion: string;
  text?: string;
}

interface UseCharacterSupportCoreOptions {
  enabled: boolean;
  language: Language;
  errorMessage: string;
}

export const normalizeScreenplayEvent = (
  value: unknown,
): ScreenplayLike | null => {
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
  const text = typeof candidate.text === 'string' ? candidate.text : undefined;
  const hasEmotion = typeof candidate.emotion === 'string';
  if (!text && !hasEmotion) return null;

  return {
    emotion: normalizeEmotion(candidate.emotion),
    text,
  };
};

export const getAssistantText = (value: unknown): string => {
  if (typeof value === 'string') return stripEmotionTag(value);
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
    return stripEmotionTag(source.message);
  }
  if (
    source.message &&
    typeof source.message === 'object' &&
    typeof source.message.content === 'string'
  ) {
    return stripEmotionTag(source.message.content);
  }
  return typeof source.rawText === 'string'
    ? stripEmotionTag(source.rawText)
    : '';
};

export function useCharacterSupportCore({
  enabled,
  language,
  errorMessage,
}: UseCharacterSupportCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const errorMessageRef = useRef(errorMessage);
  const activeAssistantIdRef = useRef<string | null>(null);
  const partialTextRef = useRef('');
  const sequenceRef = useRef(0);
  const reactionSequenceRef = useRef(0);
  const processingRef = useRef(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [readyLanguage, setReadyLanguage] = useState<Language | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [reaction, setReaction] = useState<PuruPuruReaction | null>(null);

  useEffect(() => {
    errorMessageRef.current = errorMessage;
  }, [errorMessage]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setMessages([]);
      setReadyLanguage(null);
      activeAssistantIdRef.current = null;
      partialTextRef.current = '';
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const createId = useCallback((prefix: string) => {
    sequenceRef.current += 1;
    return `${prefix}-${Date.now()}-${sequenceRef.current}`;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const core = new AITuberOnAirCore({
      apiKey: '',
      chatProvider: 'gemini-nano',
      providerOptions: {
        responseLength: SUPPORT_RESPONSE_LENGTH,
        ...getGeminiNanoLanguageOptions(language),
      },
      chatOptions: {
        systemPrompt: buildSupportSystemPrompt(language),
      },
      voiceOptions: {
        engineType: 'webSpeech',
        speaker: '',
        webSpeechLanguage: getWebSpeechLanguage(language),
      },
      debug: false,
    });

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      processingRef.current = true;
      setIsProcessing(true);
    });

    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      processingRef.current = false;
      setIsProcessing(false);
    });

    core.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (value: unknown) => {
      const delta =
        typeof value === 'string'
          ? value
          : ((value as { message?: unknown })?.message ?? '');
      if (typeof delta !== 'string' || !activeAssistantIdRef.current) return;

      partialTextRef.current += delta;
      const visibleText = stripEmotionTag(partialTextRef.current);
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
      const screenplay = normalizeScreenplayEvent(value);
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
      console.error('Gemini Nano character support error:', error);
      const activeId = activeAssistantIdRef.current;
      if (activeId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === activeId
              ? {
                  ...message,
                  content: errorMessageRef.current,
                  state: 'error',
                }
              : message,
          ),
        );
      }
      activeAssistantIdRef.current = null;
      partialTextRef.current = '';
      processingRef.current = false;
      setIsProcessing(false);
      setIsSpeechActive(false);
      setReaction(null);
    });

    coreRef.current = core;
    queueMicrotask(() => {
      if (!cancelled) setReadyLanguage(language);
    });

    return () => {
      cancelled = true;
      core.stopSpeech();
      core.offAll();
      processingRef.current = false;
      setIsProcessing(false);
      setIsSpeechActive(false);
      setReaction(null);
      if (coreRef.current === core) coreRef.current = null;
    };
  }, [enabled, language]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const core = coreRef.current;
      const content = text.trim();
      if (!core || !content || processingRef.current) return;
      processingRef.current = true;

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

      const accepted = await core.processChat(content);
      if (!accepted && activeAssistantIdRef.current === assistantMessage.id) {
        activeAssistantIdRef.current = null;
        partialTextRef.current = '';
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !== userMessage.id &&
              message.id !== assistantMessage.id,
          ),
        );
      }
      processingRef.current = false;
    },
    [createId],
  );

  const resetConversation = useCallback(() => {
    if (processingRef.current) return;
    coreRef.current?.stopSpeech();
    coreRef.current?.clearChatHistory();
    activeAssistantIdRef.current = null;
    partialTextRef.current = '';
    setIsSpeechActive(false);
    setReaction(null);
    setMessages([]);
  }, []);

  return {
    messages,
    isReady: enabled && readyLanguage === language,
    isProcessing,
    isSpeechActive,
    reaction,
    sendMessage,
    resetConversation,
  };
}

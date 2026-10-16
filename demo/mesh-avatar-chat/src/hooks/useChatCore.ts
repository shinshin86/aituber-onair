import { AITuberOnAirCore, AITuberOnAirCoreEvent } from '@aituber-onair/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Provider } from './useSettings';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReply {
  text: string;
  emotion?: string;
}

export interface UseChatCoreOptions {
  provider: Provider;
  apiKey: string;
  /** Whether Chrome's built-in model can answer right now */
  nanoReady: boolean;
  systemPrompt: string;
  /** What the character says when no language model is reachable */
  fallbackReply: AssistantReply;
  onReply: (reply: AssistantReply) => void;
}

interface ResponsePayload {
  message?: { content?: string } | string;
  rawText?: string;
  screenplay?: { emotion?: string; text?: string };
}

let messageSeq = 0;
const nextId = () => `${Date.now()}-${++messageSeq}`;

/** Wires AITuberOnAirCore to a message list; speech is handled by the caller. */
export function useChatCore({
  provider,
  apiKey,
  nanoReady,
  systemPrompt,
  fallbackReply,
  onReply,
}: UseChatCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partial, setPartial] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const onReplyRef = useRef(onReply);
  const fallbackRef = useRef(fallbackReply);

  useEffect(() => {
    onReplyRef.current = onReply;
    fallbackRef.current = fallbackReply;
  }, [onReply, fallbackReply]);

  const canChat =
    provider === 'gemini-nano' ? nanoReady : apiKey.trim().length > 0;

  useEffect(() => {
    if (!canChat) {
      coreRef.current?.offAll();
      coreRef.current = null;
      return;
    }

    const core = new AITuberOnAirCore({
      apiKey,
      chatProvider: provider,
      ...(provider === 'gemini-nano' ? { model: 'gemini-nano' } : {}),
      chatOptions: { systemPrompt },
      debug: false,
    });

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setError('');
      setIsProcessing(true);
      setPartial('');
    });
    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      setIsProcessing(false);
      setPartial('');
    });
    core.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (data: unknown) => {
      const text =
        typeof data === 'string'
          ? data
          : ((data as ResponsePayload)?.rawText ?? '');
      setPartial(text.replace(/^\s*\[[a-z]+\]\s*/i, ''));
    });
    core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data: unknown) => {
      let text = '';
      let emotion: string | undefined;
      if (typeof data === 'string') {
        text = data;
      } else {
        const payload = data as ResponsePayload;
        const content =
          typeof payload.message === 'string'
            ? payload.message
            : payload.message?.content;
        text =
          payload.screenplay?.text?.trim() || content || payload.rawText || '';
        emotion = payload.screenplay?.emotion;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text },
      ]);
      onReplyRef.current({ text, emotion });
    });
    core.on(AITuberOnAirCoreEvent.ERROR, (err: unknown) => {
      console.error('AITuberOnAirCore error:', err);
      setError(
        err instanceof Error ? err.message : '応答の生成に失敗しました。',
      );
      setIsProcessing(false);
    });

    coreRef.current = core;
    return () => {
      core.offAll();
      if (coreRef.current === core) coreRef.current = null;
    };
  }, [apiKey, canChat, provider, systemPrompt]);

  const send = useCallback(async (input: string) => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
    const core = coreRef.current;
    if (!core) {
      const reply = fallbackRef.current;
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text: reply.text },
      ]);
      onReplyRef.current(reply);
      return;
    }
    await core.processChat(text);
  }, []);

  const addAssistantMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text }]);
  }, []);

  const reset = useCallback(() => {
    coreRef.current?.clearChatHistory();
    setMessages([]);
    setPartial('');
    setError('');
  }, []);

  return {
    messages,
    partial,
    isProcessing,
    error,
    canChat,
    send,
    addAssistantMessage,
    reset,
  };
}

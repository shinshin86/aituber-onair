import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getOpenAICompatibleSpeechServerInfo,
  listOpenAICompatibleSpeechModels,
  listOpenAICompatibleSpeechVoices,
  resolveOpenAICompatibleSpeechEndpoint,
  testOpenAICompatibleSpeech,
  type OpenAICompatibleSpeechEndpointError,
  type OpenAICompatibleSpeechServerInfo,
  type VoiceEngineVoice,
} from '@aituber-onair/core';

export const MANUAL_TTS_OPTION = '__manual__';

/** Model value saved by earlier versions of this example before discovery. */
const LEGACY_PLACEHOLDER_MODEL = 'local-model';

export interface LocalTtsEngineHint {
  voice: string;
  instructions: string;
  instructionsSupported: boolean;
}

/**
 * Usage notes for engines whose request fields behave differently from
 * OpenAI's. Matched against the engine name a server reports at its root, so
 * unknown servers simply get the generic hints.
 */
export function getLocalTtsEngineHint(
  engine: string | undefined,
): LocalTtsEngineHint | null {
  if (!engine) return null;
  const name = engine.toLowerCase();
  if (name.startsWith('irodori-tts-lite')) {
    return {
      voice: 'This engine ignores voice.',
      instructions: 'This engine does not accept instructions; leave it empty.',
      instructionsSupported: false,
    };
  }
  if (name.startsWith('irodori-tts-anime')) {
    return {
      voice: 'Use "default". Other voices are rejected.',
      instructions: 'This engine does not accept instructions; leave it empty.',
      instructionsSupported: false,
    };
  }
  if (name.startsWith('irodori-tts')) {
    return {
      voice:
        'Use "default", or "clone" when the server was started with a reference voice.',
      instructions:
        'Used as the caption (style prompt). With voice "default" it designs a new voice from the text; with "clone" it steers the cloned voice.',
      instructionsSupported: true,
    };
  }
  return null;
}

type RequestState =
  | { kind: 'idle' }
  | { kind: 'detecting' | 'testing' }
  | {
      kind: 'detected';
      modelCount: number | null;
      voiceCount: number | null;
    }
  | { kind: 'played'; latencyMs: number }
  | { kind: 'error'; error: OpenAICompatibleSpeechEndpointError };

interface DiscoveryState {
  serverInfo: OpenAICompatibleSpeechServerInfo | null;
  models: string[];
  voices: VoiceEngineVoice[];
}

const emptyDiscovery: DiscoveryState = {
  serverInfo: null,
  models: [],
  voices: [],
};

interface UseLocalTtsSetupOptions {
  endpoint: string;
  model: string;
  voice: string;
  instructions: string;
  speed: string;
  apiKey: string;
  onModelChange: (model: string) => void;
  onVoiceChange: (voice: string) => void;
}

const isEndpointError = (
  error: unknown,
): error is OpenAICompatibleSpeechEndpointError =>
  Boolean(error && typeof error === 'object' && 'code' in error);

export function useLocalTtsSetup({
  endpoint,
  model,
  voice,
  instructions,
  speed,
  apiKey,
  onModelChange,
  onVoiceChange,
}: UseLocalTtsSetupOptions) {
  const [discoveryState, setDiscoveryState] = useState({
    endpoint: '',
    value: emptyDiscovery,
  });
  const [manualState, setManualState] = useState({
    endpoint: '',
    model: false,
    voice: false,
  });
  const [scopedRequestState, setScopedRequestState] = useState<{
    endpoint: string;
    value: RequestState;
  }>({ endpoint: '', value: { kind: 'idle' } });
  const requestRef = useRef<AbortController | null>(null);
  const audioRef = useRef<{ audio: HTMLAudioElement; url: string } | null>(
    null,
  );

  const discovery =
    discoveryState.endpoint === endpoint
      ? discoveryState.value
      : emptyDiscovery;
  const manualModel = manualState.endpoint === endpoint && manualState.model;
  const manualVoice = manualState.endpoint === endpoint && manualState.voice;
  const requestState: RequestState =
    scopedRequestState.endpoint === endpoint
      ? scopedRequestState.value
      : { kind: 'idle' };
  const setRequestState = (value: RequestState) => {
    setScopedRequestState({ endpoint, value });
  };
  const setManualModel = (value: boolean) => {
    setManualState({ endpoint, model: value, voice: manualVoice });
  };
  const setManualVoice = (value: boolean) => {
    setManualState({ endpoint, model: manualModel, voice: value });
  };

  const resolved = useMemo(() => {
    try {
      return {
        value: resolveOpenAICompatibleSpeechEndpoint(endpoint),
        error: '',
      };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Invalid endpoint URL.',
      };
    }
  }, [endpoint]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [endpoint]);

  const stopPlayback = () => {
    if (!audioRef.current) return;
    audioRef.current.audio.pause();
    URL.revokeObjectURL(audioRef.current.url);
    audioRef.current = null;
  };

  useEffect(() => stopPlayback, []);

  const startRequest = () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    return controller;
  };

  const detectServer = async () => {
    if (!resolved.value) return;
    const controller = startRequest();
    setRequestState({ kind: 'detecting' });
    const options = {
      endpoint: resolved.value.baseUrl,
      apiKey,
      signal: controller.signal,
    };

    try {
      const [serverInfo, modelsResult, voiceList] = await Promise.all([
        getOpenAICompatibleSpeechServerInfo(options),
        listOpenAICompatibleSpeechModels(options).then(
          (models) => ({ models, error: null }),
          (error: unknown) => {
            if (isEndpointError(error) && error.code !== 'aborted') {
              return { models: null, error };
            }
            throw error;
          },
        ),
        listOpenAICompatibleSpeechVoices(options),
      ]);
      if (controller.signal.aborted) return;

      if (modelsResult.error && !serverInfo && !voiceList) {
        setRequestState({ kind: 'error', error: modelsResult.error });
        return;
      }

      const models = modelsResult.models ?? [];
      const voices = voiceList?.voices ?? [];
      setDiscoveryState({ endpoint, value: { serverInfo, models, voices } });

      const currentModel = model.trim();
      let nextModel = currentModel;
      if (
        models.length > 0 &&
        (!currentModel || currentModel === LEGACY_PLACEHOLDER_MODEL)
      ) {
        nextModel =
          serverInfo?.model && models.includes(serverInfo.model)
            ? serverInfo.model
            : models[0];
        onModelChange(nextModel);
      }

      const currentVoice = voice.trim();
      const defaultVoice = voiceList?.defaultVoice ?? serverInfo?.defaultVoice;
      if (!currentVoice && defaultVoice) onVoiceChange(defaultVoice);

      setManualState({
        endpoint,
        model: Boolean(nextModel) && !models.includes(nextModel),
        voice:
          Boolean(currentVoice) &&
          !voices.some((item) => item.id === currentVoice),
      });
      setRequestState({
        kind: 'detected',
        modelCount: modelsResult.models ? models.length : null,
        voiceCount: voiceList ? voices.length : null,
      });
    } catch (error) {
      if (!controller.signal.aborted && isEndpointError(error)) {
        setRequestState({ kind: 'error', error });
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const testSpeech = async () => {
    if (!resolved.value) return;
    const controller = startRequest();
    stopPlayback();
    setRequestState({ kind: 'testing' });
    const parsedSpeed = Number.parseFloat(speed);
    const result = await testOpenAICompatibleSpeech({
      endpoint: resolved.value.speechUrl,
      apiKey,
      model,
      voice,
      instructions,
      speed: Number.isNaN(parsedSpeed) ? undefined : parsedSpeed,
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    if (requestRef.current === controller) requestRef.current = null;
    if (!result.ok) {
      setRequestState({ kind: 'error', error: result.error });
      return;
    }

    const url = URL.createObjectURL(
      new Blob([result.audio], { type: result.contentType }),
    );
    const audio = new Audio(url);
    audioRef.current = { audio, url };
    setRequestState({ kind: 'played', latencyMs: result.latencyMs });
    audio.play().catch(() => {
      // Autoplay restrictions only affect the preview; the request succeeded.
    });
  };

  const busy =
    requestState.kind === 'detecting' || requestState.kind === 'testing';

  return {
    busy,
    detectServer,
    discovery,
    engineHint: getLocalTtsEngineHint(discovery.serverInfo?.engine),
    manualModel,
    manualVoice,
    requestState,
    resolved,
    setManualModel,
    setManualVoice,
    testSpeech,
  };
}

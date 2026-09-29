import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OPENAI_COMPATIBLE_LOCAL_PRESETS,
  listOpenAICompatibleModels,
  resolveOpenAICompatibleEndpoint,
  testOpenAICompatibleConnection,
  type OpenAICompatibleConnectionResult,
  type OpenAICompatibleEndpointError,
} from '@aituber-onair/core';

export const MANUAL_MODEL_OPTION = '__manual__';

type RequestState =
  | { kind: 'idle' }
  | { kind: 'loading-models' | 'testing' }
  | { kind: 'models-loaded'; count: number }
  | {
      kind: 'connected';
      result: Extract<OpenAICompatibleConnectionResult, { ok: true }>;
    }
  | { kind: 'error'; error: OpenAICompatibleEndpointError };

interface UseLocalLlmSetupOptions {
  endpoint: string;
  model: string;
  apiKey: string;
  onModelChange: (model: string) => void;
}

export function useLocalLlmSetup({
  endpoint,
  model,
  apiKey,
  onModelChange,
}: UseLocalLlmSetupOptions) {
  const [modelListState, setModelListState] = useState({
    endpoint: '',
    models: [] as string[],
  });
  const [manualModelState, setManualModelState] = useState({
    endpoint: '',
    value: false,
  });
  const [scopedRequestState, setScopedRequestState] = useState<{
    endpoint: string;
    value: RequestState;
  }>({
    endpoint: '',
    value: { kind: 'idle' },
  });
  const requestRef = useRef<AbortController | null>(null);

  const models =
    modelListState.endpoint === endpoint ? modelListState.models : [];
  const manualModel =
    manualModelState.endpoint === endpoint && manualModelState.value;
  const requestState: RequestState =
    scopedRequestState.endpoint === endpoint
      ? scopedRequestState.value
      : { kind: 'idle' };
  const setManualModel = (value: boolean) => {
    setManualModelState({ endpoint, value });
  };
  const setRequestState = (value: RequestState) => {
    setScopedRequestState({ endpoint, value });
  };

  const resolved = useMemo(() => {
    try {
      return { value: resolveOpenAICompatibleEndpoint(endpoint), error: '' };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Invalid endpoint URL.',
      };
    }
  }, [endpoint]);

  const selectedPreset = OPENAI_COMPATIBLE_LOCAL_PRESETS.find(
    (preset) => preset.baseUrl === resolved.value?.baseUrl,
  );

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [endpoint]);

  const startRequest = () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    return controller;
  };

  const fetchModels = async () => {
    if (!resolved.value) return;
    const controller = startRequest();
    setRequestState({ kind: 'loading-models' });
    try {
      const found = await listOpenAICompatibleModels({
        endpoint: resolved.value.baseUrl,
        apiKey,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        const currentModel = model.trim();
        setModelListState({ endpoint, models: found });
        setManualModel(Boolean(currentModel) && !found.includes(currentModel));
        if (!currentModel && found.length > 0) onModelChange(found[0]);
        setRequestState({ kind: 'models-loaded', count: found.length });
      }
    } catch (error) {
      if (
        !controller.signal.aborted &&
        error &&
        typeof error === 'object' &&
        'code' in error
      ) {
        setRequestState({
          kind: 'error',
          error: error as OpenAICompatibleEndpointError,
        });
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const testConnection = async () => {
    if (!resolved.value) return;
    const controller = startRequest();
    setRequestState({ kind: 'testing' });
    const result = await testOpenAICompatibleConnection({
      endpoint: resolved.value.baseUrl,
      apiKey,
      model: model.trim() || undefined,
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    setRequestState(
      result.ok
        ? { kind: 'connected', result }
        : { kind: 'error', error: result.error },
    );
    if (requestRef.current === controller) requestRef.current = null;
  };

  const busy =
    requestState.kind === 'loading-models' || requestState.kind === 'testing';
  const hasModelList = models.length > 0;
  const modelListed = models.includes(model.trim());

  return {
    busy,
    fetchModels,
    hasModelList,
    manualModel,
    modelListed,
    models,
    requestState,
    resolved,
    selectedPreset,
    setManualModel,
    testConnection,
  };
}

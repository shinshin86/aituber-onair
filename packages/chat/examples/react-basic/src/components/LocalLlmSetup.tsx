import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  OPENAI_COMPATIBLE_LOCAL_PRESETS,
  listOpenAICompatibleModels,
  resolveOpenAICompatibleEndpoint,
  testOpenAICompatibleConnection,
  type OpenAICompatibleEndpointError,
  type OpenAICompatibleConnectionResult,
} from '@aituber-onair/chat';

const MANUAL_MODEL_OPTION = '__manual__';

const guideUrl =
  'https://github.com/shinshin86/aituber-onair/blob/main/docs/local-llm.md';

interface LocalLlmSetupProps {
  endpoint: string;
  onEndpointChange: (endpoint: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  disabled?: boolean;
}

type RequestState =
  | { kind: 'idle' }
  | { kind: 'loading-models' | 'testing' }
  | { kind: 'models-loaded'; count: number }
  | {
      kind: 'connected';
      result: Extract<OpenAICompatibleConnectionResult, { ok: true }>;
    }
  | { kind: 'error'; error: OpenAICompatibleEndpointError };

export default function LocalLlmSetup({
  endpoint,
  onEndpointChange,
  model,
  onModelChange,
  apiKey,
  disabled,
}: LocalLlmSetupProps) {
  const [models, setModels] = useState<string[]>([]);
  const [manualModel, setManualModel] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>({
    kind: 'idle',
  });
  const requestRef = useRef<AbortController | null>(null);
  const endpointInputRef = useRef<HTMLInputElement>(null);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing endpoint must clear results and abort the previous request.
  useEffect(() => {
    setModels([]);
    setManualModel(false);
    setRequestState({ kind: 'idle' });
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
        setModels(found);
        // Keep a typed ID that the server does not list editable; otherwise
        // switch to the list and preselect the first model when none is set.
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
  const showModelInput = !hasModelList || manualModel;

  return (
    <div className="local-llm-setup config-full">
      <fieldset className="config-group local-llm-fieldset">
        <legend className="local-llm-label">Local server</legend>
        <div className="local-llm-presets">
          {OPENAI_COMPATIBLE_LOCAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`action-button ${selectedPreset?.id === preset.id ? 'local-llm-preset-active' : ''}`}
              aria-pressed={selectedPreset?.id === preset.id}
              disabled={disabled}
              onClick={() => onEndpointChange(preset.baseUrl)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className={`action-button ${!selectedPreset ? 'local-llm-preset-active' : ''}`}
            aria-pressed={!selectedPreset}
            disabled={disabled}
            onClick={() => {
              onEndpointChange('');
              endpointInputRef.current?.focus();
            }}
          >
            Custom
          </button>
        </div>
      </fieldset>

      <div className="config-group">
        <label htmlFor="openai-compatible-endpoint">Endpoint URL</label>
        <input
          ref={endpointInputRef}
          id="openai-compatible-endpoint"
          type="url"
          value={endpoint}
          onChange={(event) => onEndpointChange(event.target.value)}
          disabled={disabled}
          className="text-input"
          placeholder="http://localhost:11434/v1"
          aria-invalid={Boolean(endpoint && resolved.error)}
        />
        <span className="helper-text">
          Enter the server origin, API base URL, or full Chat Completions URL.
        </span>
        {endpoint && resolved.error && (
          <span className="inline-error" role="alert">
            {resolved.error}
          </span>
        )}
        {resolved.value && (
          <span className="helper-text local-llm-preview">
            Requests go to:{' '}
            <code>
              {resolved.value.chatCompletionsUrl
                .split('/')
                .map((part, index, parts) => (
                  <Fragment key={parts.slice(0, index + 1).join('/')}>
                    {part}
                    {index < parts.length - 1 && (
                      <>
                        /<wbr />
                      </>
                    )}
                  </Fragment>
                ))}
            </code>
          </span>
        )}
      </div>

      <div className="config-group">
        <label htmlFor="openai-compatible-model">Model ID</label>
        {hasModelList && (
          <select
            id="openai-compatible-model"
            className="select-input"
            value={
              manualModel
                ? MANUAL_MODEL_OPTION
                : models.includes(model)
                  ? model
                  : ''
            }
            onChange={(event) => {
              if (event.target.value === MANUAL_MODEL_OPTION) {
                setManualModel(true);
                return;
              }
              setManualModel(false);
              onModelChange(event.target.value);
            }}
            disabled={disabled}
          >
            {!manualModel && !models.includes(model) && (
              <option value="">Choose a model</option>
            )}
            {models.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
            <option value={MANUAL_MODEL_OPTION}>Other (type manually)</option>
          </select>
        )}
        {showModelInput && (
          <input
            id={
              hasModelList
                ? 'openai-compatible-model-manual'
                : 'openai-compatible-model'
            }
            type="text"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={disabled}
            className="text-input"
            placeholder="your-local-model"
            aria-label={hasModelList ? 'Model ID (manual)' : undefined}
          />
        )}
        {hasModelList && manualModel && model.trim() && !modelListed && (
          <span className="helper-text">
            This model ID is not in the list returned by the server.
          </span>
        )}
        <span className="helper-text">
          {hasModelList
            ? 'Pick a model from your server, or choose Other to type an ID.'
            : 'Type the exact model ID, or fetch the list from your server.'}
        </span>
      </div>

      <div className="local-llm-actions">
        <button
          type="button"
          className="action-button"
          onClick={fetchModels}
          disabled={disabled || !resolved.value || busy}
        >
          {requestState.kind === 'loading-models'
            ? 'Fetching…'
            : 'Fetch models'}
        </button>
        <button
          type="button"
          className="action-button"
          onClick={testConnection}
          disabled={disabled || !resolved.value || busy}
        >
          {requestState.kind === 'testing' ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      {requestState.kind === 'models-loaded' && (
        <output className="local-llm-status">
          Found {requestState.count} model{requestState.count === 1 ? '' : 's'}.
        </output>
      )}
      {requestState.kind === 'connected' && (
        <output className="local-llm-status local-llm-status-ok">
          Connected in {requestState.result.latencyMs} ms.
          {requestState.result.modelFound !== undefined &&
            (requestState.result.modelFound
              ? ' Model found.'
              : ' Model not found.')}
        </output>
      )}
      {requestState.kind === 'error' &&
        requestState.error.code !== 'aborted' && (
          <div className="inline-error" role="alert">
            {requestState.error.message}
            {requestState.error.code === 'network' && (
              <p className="local-llm-error-help">
                {selectedPreset?.corsHint && (
                  <span>{selectedPreset.corsHint} </span>
                )}
                <a href={guideUrl} target="_blank" rel="noreferrer">
                  Local LLM setup guide
                </a>
              </p>
            )}
          </div>
        )}
    </div>
  );
}

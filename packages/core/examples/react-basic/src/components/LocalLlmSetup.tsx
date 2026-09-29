import { Fragment, useRef } from 'react';
import { OPENAI_COMPATIBLE_LOCAL_PRESETS } from '@aituber-onair/core';
import {
  MANUAL_MODEL_OPTION,
  useLocalLlmSetup,
} from '../hooks/useLocalLlmSetup';

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

export function LocalLlmSetup({
  endpoint,
  onEndpointChange,
  model,
  onModelChange,
  apiKey,
  disabled,
}: LocalLlmSetupProps) {
  const endpointInputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useLocalLlmSetup({ endpoint, model, apiKey, onModelChange });

  return (
    <div className="local-llm-setup">
      <fieldset className="local-llm-fieldset">
        <legend className="local-llm-label">Local server</legend>
        <div className="local-llm-presets">
          {OPENAI_COMPATIBLE_LOCAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={
                selectedPreset?.id === preset.id
                  ? 'local-llm-preset-active'
                  : undefined
              }
              aria-pressed={selectedPreset?.id === preset.id}
              disabled={disabled}
              onClick={() => onEndpointChange(preset.baseUrl)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className={!selectedPreset ? 'local-llm-preset-active' : undefined}
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

      <div className="local-llm-field">
        <label htmlFor="openAICompatibleEndpoint">Endpoint URL:</label>
        <input
          ref={endpointInputRef}
          id="openAICompatibleEndpoint"
          type="url"
          value={endpoint}
          onChange={(event) => onEndpointChange(event.target.value)}
          disabled={disabled}
          placeholder="http://localhost:11434/v1"
          aria-invalid={Boolean(endpoint && resolved.error)}
        />
        <small>
          Enter the server origin, API base URL, or full Chat Completions URL.
        </small>
        {endpoint && resolved.error && (
          <span className="local-llm-error" role="alert">
            {resolved.error}
          </span>
        )}
        {resolved.value && (
          <small className="local-llm-preview">
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
          </small>
        )}
      </div>

      <div className="local-llm-field">
        <label htmlFor="openAICompatibleModel">Model:</label>
        {hasModelList && (
          <select
            id="openAICompatibleModel"
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
        {(!hasModelList || manualModel) && (
          <input
            id={
              hasModelList
                ? 'openAICompatibleModelManual'
                : 'openAICompatibleModel'
            }
            type="text"
            placeholder="your-local-model"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={disabled}
            aria-label={hasModelList ? 'Model (manual)' : undefined}
          />
        )}
        {hasModelList && manualModel && model.trim() && !modelListed && (
          <small>This model ID is not in the list returned by the server.</small>
        )}
        <small>
          {hasModelList
            ? 'Pick a model from your server, or choose Other to type an ID.'
            : 'Type the exact model ID, or fetch the list from your server.'}
        </small>
      </div>

      <div className="local-llm-actions">
        <button
          type="button"
          onClick={fetchModels}
          disabled={disabled || !resolved.value || busy}
        >
          {requestState.kind === 'loading-models'
            ? 'Fetching…'
            : 'Fetch models'}
        </button>
        <button
          type="button"
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
          <div className="local-llm-error" role="alert">
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

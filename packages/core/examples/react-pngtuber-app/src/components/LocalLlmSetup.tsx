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
  onEndpointCommit: (endpoint: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  disabled?: boolean;
}

export function LocalLlmSetup({
  endpoint,
  onEndpointChange,
  onEndpointCommit,
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

  const commitValidEndpoint = () => {
    if (resolved.value) onEndpointCommit(endpoint.trim());
  };

  return (
    <div className="local-llm-setup">
      <fieldset className="local-llm-fieldset">
        <legend className="settings-field-label">Local server</legend>
        <div className="local-llm-presets">
          {OPENAI_COMPATIBLE_LOCAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`settings-action-button${selectedPreset?.id === preset.id ? ' local-llm-preset-active' : ''}`}
              aria-pressed={selectedPreset?.id === preset.id}
              disabled={disabled}
              onClick={() => {
                onEndpointChange(preset.baseUrl);
                onEndpointCommit(preset.baseUrl);
              }}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className={`settings-action-button${!selectedPreset ? ' local-llm-preset-active' : ''}`}
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

      <div className="settings-field local-llm-field">
        <label htmlFor="llm-endpoint">Endpoint URL</label>
        <input
          ref={endpointInputRef}
          id="llm-endpoint"
          type="text"
          value={endpoint}
          onChange={(event) => onEndpointChange(event.target.value)}
          onBlur={commitValidEndpoint}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          aria-invalid={Boolean(endpoint && resolved.error)}
          aria-describedby={
            endpoint && resolved.error ? 'llm-endpoint-error' : undefined
          }
          placeholder="http://localhost:11434/v1"
          disabled={disabled}
        />
        <p className="settings-field-hint">
          Enter the server origin, API base URL, or full Chat Completions URL.
        </p>
        {endpoint && resolved.error && (
          <p
            id="llm-endpoint-error"
            className="settings-field-error"
            role="alert"
          >
            {resolved.error}
          </p>
        )}
        {resolved.value && (
          <p className="settings-field-hint local-llm-preview">
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
          </p>
        )}
      </div>

      <div className="settings-field local-llm-field">
        <label htmlFor="llm-model">Model</label>
        {hasModelList && (
          <select
            id="llm-model"
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
            id={hasModelList ? 'llm-model-manual' : 'llm-model'}
            type="text"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            placeholder="your-local-model"
            disabled={disabled}
            aria-label={hasModelList ? 'Model (manual)' : undefined}
          />
        )}
        {hasModelList && manualModel && model.trim() && !modelListed && (
          <p className="settings-field-hint">
            This model ID is not in the list returned by the server.
          </p>
        )}
        <p className="settings-field-hint">
          {hasModelList
            ? 'Pick a model from your server, or choose Other to type an ID.'
            : 'Type the exact model ID, or fetch the list from your server.'}
        </p>
      </div>

      <div className="local-llm-actions">
        <button
          type="button"
          className="settings-action-button"
          onClick={fetchModels}
          disabled={disabled || !resolved.value || busy}
        >
          {requestState.kind === 'loading-models'
            ? 'Fetching…'
            : 'Fetch models'}
        </button>
        <button
          type="button"
          className="settings-action-button"
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
          <div className="settings-field-error" role="alert">
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

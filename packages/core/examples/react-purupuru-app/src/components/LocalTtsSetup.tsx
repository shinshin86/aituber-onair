import { Fragment } from 'react';
import { MANUAL_TTS_OPTION, useLocalTtsSetup } from '../hooks/useLocalTtsSetup';

const guideUrl =
  'https://github.com/shinshin86/aituber-onair/blob/main/docs/local-tts.md';

interface LocalTtsSetupProps {
  endpoint: string;
  onEndpointChange: (endpoint: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
  speed: string;
  apiKey: string;
  disabled?: boolean;
}

function BreakableUrl({ url }: { url: string }) {
  return (
    <code>
      {url.split('/').map((part, index, parts) => (
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
  );
}

export function LocalTtsSetup({
  endpoint,
  onEndpointChange,
  model,
  onModelChange,
  voice,
  onVoiceChange,
  instructions,
  onInstructionsChange,
  speed,
  apiKey,
  disabled,
}: LocalTtsSetupProps) {
  const {
    busy,
    detectServer,
    discovery,
    engineHint,
    manualModel,
    manualVoice,
    requestState,
    resolved,
    setManualModel,
    setManualVoice,
    testSpeech,
  } = useLocalTtsSetup({
    endpoint,
    model,
    voice,
    instructions,
    speed,
    apiKey,
    onModelChange,
    onVoiceChange,
  });
  const { models, voices, serverInfo } = discovery;
  const hasModelList = models.length > 0;
  const hasVoiceList = voices.length > 0;
  const voiceListed = voices.some((item) => item.id === voice);

  return (
    <div className="local-tts-setup">
      <div className="settings-field local-tts-field">
        <label htmlFor="tts-openai-compatible-url">Endpoint URL</label>
        <input
          id="tts-openai-compatible-url"
          type="text"
          value={endpoint}
          onChange={(event) => onEndpointChange(event.target.value)}
          aria-invalid={Boolean(endpoint && resolved.error)}
          aria-describedby={
            endpoint && resolved.error
              ? 'tts-openai-compatible-url-error'
              : undefined
          }
          placeholder="http://localhost:8880/v1"
          disabled={disabled}
        />
        <p className="settings-field-hint">
          Enter the server origin, API base URL (…/v1), or full /v1/audio/speech
          URL.
        </p>
        {endpoint && resolved.error && (
          <p
            id="tts-openai-compatible-url-error"
            className="settings-field-error"
            role="alert"
          >
            {resolved.error}
          </p>
        )}
        {resolved.value && (
          <p className="settings-field-hint local-tts-preview">
            Requests go to: <BreakableUrl url={resolved.value.speechUrl} />
          </p>
        )}
      </div>

      <div className="local-tts-actions">
        <button
          type="button"
          className="settings-action-button"
          onClick={detectServer}
          disabled={disabled || !resolved.value || busy}
        >
          {requestState.kind === 'detecting' ? 'Detecting…' : 'Detect server'}
        </button>
        <button
          type="button"
          className="settings-action-button"
          onClick={testSpeech}
          disabled={disabled || !resolved.value || !model.trim() || busy}
        >
          {requestState.kind === 'testing' ? 'Speaking…' : 'Test speech'}
        </button>
      </div>

      {requestState.kind === 'detected' && (
        <output className="local-tts-status local-tts-status-ok">
          {serverInfo
            ? `Detected engine: ${serverInfo.engine}.`
            : 'Server reachable.'}{' '}
          {requestState.modelCount === null
            ? 'No model list.'
            : `Found ${requestState.modelCount} model${requestState.modelCount === 1 ? '' : 's'}.`}{' '}
          {requestState.voiceCount === null
            ? 'No voice list; type the voice manually.'
            : `Found ${requestState.voiceCount} voice${requestState.voiceCount === 1 ? '' : 's'}.`}
        </output>
      )}
      {requestState.kind === 'played' && (
        <output className="local-tts-status local-tts-status-ok">
          Speech generated in {requestState.latencyMs} ms.
        </output>
      )}
      {requestState.kind === 'error' &&
        requestState.error.code !== 'aborted' && (
          <div className="settings-field-error local-tts-error" role="alert">
            {requestState.error.message}
            {requestState.error.code === 'network' && (
              <p className="local-tts-error-help">
                Check that the server is running and allows requests from this
                page (CORS).{' '}
                <a href={guideUrl} target="_blank" rel="noreferrer">
                  Local TTS setup guide
                </a>
              </p>
            )}
          </div>
        )}

      <div className="settings-field local-tts-field">
        <label htmlFor="tts-openai-compatible-model">Model</label>
        {hasModelList && (
          <select
            id="tts-openai-compatible-model"
            value={
              manualModel
                ? MANUAL_TTS_OPTION
                : models.includes(model)
                  ? model
                  : ''
            }
            onChange={(event) => {
              if (event.target.value === MANUAL_TTS_OPTION) {
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
            <option value={MANUAL_TTS_OPTION}>Other (type manually)</option>
          </select>
        )}
        {(!hasModelList || manualModel) && (
          <input
            id={
              hasModelList
                ? 'tts-openai-compatible-model-manual'
                : 'tts-openai-compatible-model'
            }
            type="text"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            placeholder="your-tts-model"
            disabled={disabled}
            aria-label={hasModelList ? 'Model (manual)' : undefined}
          />
        )}
        <p className="settings-field-hint">
          {hasModelList
            ? 'Pick a model from your server, or choose Other to type an ID.'
            : 'Type the model ID your server expects, or press Detect server.'}
        </p>
      </div>

      <div className="settings-field local-tts-field">
        <label htmlFor="tts-openai-compatible-speaker">Voice (optional)</label>
        {hasVoiceList && (
          <select
            id="tts-openai-compatible-speaker"
            value={manualVoice ? MANUAL_TTS_OPTION : voiceListed ? voice : ''}
            onChange={(event) => {
              if (event.target.value === MANUAL_TTS_OPTION) {
                setManualVoice(true);
                return;
              }
              setManualVoice(false);
              onVoiceChange(event.target.value);
            }}
            disabled={disabled}
          >
            {!manualVoice && !voiceListed && (
              <option value="">Server default</option>
            )}
            {voices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.metadata?.description
                  ? `${item.label} — ${item.metadata.description}`
                  : item.label}
              </option>
            ))}
            <option value={MANUAL_TTS_OPTION}>Other (type manually)</option>
          </select>
        )}
        {(!hasVoiceList || manualVoice) && (
          <input
            id={
              hasVoiceList
                ? 'tts-openai-compatible-speaker-manual'
                : 'tts-openai-compatible-speaker'
            }
            type="text"
            value={voice}
            onChange={(event) => onVoiceChange(event.target.value)}
            placeholder="Leave empty to use the server default"
            disabled={disabled}
            aria-label={hasVoiceList ? 'Voice (manual)' : undefined}
          />
        )}
        <p className="settings-field-hint">
          {engineHint?.voice ??
            'The voice name your server accepts. Leave it empty to omit the voice field.'}
        </p>
      </div>

      <div className="settings-field local-tts-field">
        <label htmlFor="tts-openai-compatible-instructions">
          Instructions (optional)
        </label>
        <textarea
          id="tts-openai-compatible-instructions"
          value={instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
          rows={2}
          placeholder={
            engineHint?.instructionsSupported === false
              ? 'Not supported by this engine'
              : 'e.g. A calm, gentle young female voice'
          }
          disabled={disabled}
        />
        <p className="settings-field-hint">
          {engineHint?.instructions ??
            'Sent as the instructions field. Servers that support it usually treat it as a voice style prompt; leave it empty if your server rejects it.'}
        </p>
      </div>
    </div>
  );
}

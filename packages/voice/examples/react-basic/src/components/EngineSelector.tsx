import type { ReactNode } from 'react';
import {
  ENGINE_DEFAULTS,
  OPENAI_VOICES,
  type EngineType,
  type SpeakerOption,
} from '../constants';

interface EngineSelectorProps {
  engine: EngineType;
  onEngineChange: (nextValue: EngineType) => void;
  speaker: string;
  onSpeakerChange: (nextValue: string) => void;
  speakerOptions: SpeakerOption[];
  isFetchingSpeakers: boolean;
  speakerFetchError: string | null;
  onFetchSpeakers: () => void;
  apiKey: string;
  onApiKeyChange: (nextValue: string) => void;
  apiUrl: string;
  onApiUrlChange: (nextValue: string) => void;
  minimaxGroupId: string;
  onMinimaxGroupIdChange: (nextValue: string) => void;
  apiKeyIsRequired: boolean;
  children?: ReactNode;
}

export function EngineSelector({
  engine,
  onEngineChange,
  speaker,
  onSpeakerChange,
  speakerOptions,
  isFetchingSpeakers,
  speakerFetchError,
  onFetchSpeakers,
  apiKey,
  onApiKeyChange,
  apiUrl,
  onApiUrlChange,
  minimaxGroupId,
  onMinimaxGroupIdChange,
  apiKeyIsRequired,
  children,
}: EngineSelectorProps) {
  const defaults = ENGINE_DEFAULTS[engine];
  const hasSpeakerOptions = speakerOptions.length > 0;
  const showApiKey =
    engine === 'openai' ||
    engine === 'openaiCompatible' ||
    engine === 'aivisCloud' ||
    engine === 'minimax';
  const showApiUrl =
    engine === 'openaiCompatible' ||
    engine === 'voicevox' ||
    engine === 'aivisSpeech' ||
    engine === 'voicepeak';

  const renderSpeakerField = () => {
    if (engine === 'openai') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <select
            id="speaker"
            value={speaker}
            onChange={(e) => onSpeakerChange(e.target.value)}
          >
            {Object.entries(OPENAI_VOICES).map(([voiceId, label]) => (
              <option key={voiceId} value={voiceId}>
                {label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (engine === 'minimax') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <select
            id="speaker"
            value={hasSpeakerOptions ? speaker : ''}
            onChange={(e) => onSpeakerChange(e.target.value)}
            disabled={!hasSpeakerOptions}
          >
            {hasSpeakerOptions ? (
              speakerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))
            ) : (
              <option value="">-- 話者一覧を取得してください --</option>
            )}
          </select>
          <div className="speaker-fetch-row">
            <button
              type="button"
              className="secondary-action-button"
              onClick={onFetchSpeakers}
              disabled={isFetchingSpeakers || !apiKey.trim()}
              title={!apiKey.trim() ? 'API Keyを入力してください' : undefined}
            >
              {isFetchingSpeakers
                ? '取得中...'
                : hasSpeakerOptions
                  ? '再取得'
                  : '話者一覧を取得'}
            </button>
          </div>
          {speakerFetchError && (
            <div className="speaker-fetch-message speaker-fetch-message--error">
              {speakerFetchError}
            </div>
          )}
        </div>
      );
    }

    if (engine === 'voicevox' || engine === 'aivisSpeech') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <select
            id="speaker"
            value={hasSpeakerOptions ? speaker : ''}
            onChange={(e) => onSpeakerChange(e.target.value)}
            disabled={!hasSpeakerOptions}
          >
            {hasSpeakerOptions ? (
              speakerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))
            ) : (
              <option value="">-- 話者一覧を取得してください --</option>
            )}
          </select>
          <div className="speaker-fetch-row">
            <button
              type="button"
              className="secondary-action-button"
              onClick={onFetchSpeakers}
              disabled={isFetchingSpeakers}
            >
              {isFetchingSpeakers
                ? '取得中...'
                : hasSpeakerOptions
                  ? '再取得'
                  : '話者一覧を取得'}
            </button>
          </div>
          {speakerFetchError && (
            <div className="speaker-fetch-message speaker-fetch-message--error">
              {speakerFetchError}
            </div>
          )}
        </div>
      );
    }

    if (engine === 'aivisCloud') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <input
            id="speaker"
            type="text"
            value={speaker}
            onChange={(e) => onSpeakerChange(e.target.value)}
            placeholder="例: a59cb814-0083-4369-8542-f51a29e72af7"
          />
        </div>
      );
    }

    if (engine === 'voicepeak') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <input
            id="speaker"
            type="text"
            value={speaker}
            onChange={(e) => onSpeakerChange(e.target.value)}
            placeholder="例: f1, f2, m1"
          />
        </div>
      );
    }

    return (
      <div className="form-group">
        <label htmlFor="speaker">Speaker:</label>
        <input
          id="speaker"
          type="text"
          value={speaker}
          onChange={(e) => onSpeakerChange(e.target.value)}
          placeholder="例: voice-id"
        />
      </div>
    );
  };

  return (
    <>
      <div className="form-group">
        <label htmlFor="engine">Voice Engine:</label>
        <select
          id="engine"
          value={engine}
          onChange={(e) => onEngineChange(e.target.value as EngineType)}
        >
          <option value="openai">OpenAI TTS</option>
          <option value="voicevox">VOICEVOX</option>
          <option value="aivisSpeech">AivisSpeech (Local)</option>
          <option value="aivisCloud">Aivis Cloud API</option>
          <option value="voicepeak">VOICEPEAK</option>
          <option value="minimax">MiniMax</option>
          <option value="openaiCompatible">OpenAI-Compatible TTS</option>
        </select>
      </div>

      {renderSpeakerField()}

      {showApiKey && (
        <div className="form-group">
          <label htmlFor="apiKey">
            {engine === 'minimax'
              ? 'MiniMax API Key (required):'
              : `API Key ${apiKeyIsRequired ? '(required)' : '(optional)'}:`}
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={defaults.placeholder}
          />
        </div>
      )}

      {showApiUrl && (
        <div className="form-group">
          <label htmlFor="apiUrl">API URL (customizable):</label>
          <input
            id="apiUrl"
            type="text"
            value={apiUrl}
            onChange={(e) => onApiUrlChange(e.target.value)}
            placeholder={defaults.apiUrl}
          />
        </div>
      )}

      {engine === 'minimax' && (
        <div className="form-group">
          <label htmlFor="minimaxGroupId">MiniMax Group ID (required):</label>
          <input
            id="minimaxGroupId"
            type="password"
            value={minimaxGroupId}
            onChange={(e) => onMinimaxGroupIdChange(e.target.value)}
            placeholder={ENGINE_DEFAULTS.minimax.groupIdPlaceholder}
          />
        </div>
      )}

      {children}
    </>
  );
}

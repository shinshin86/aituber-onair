import type { ReactNode } from 'react';
import {
  ENGINE_DEFAULTS,
  GEMINI_TTS_VOICES,
  GRADIUM_VOICE_OPTIONS,
  INWORLD_VOICE_LANGUAGE_OPTIONS,
  OPENAI_VOICES,
  XAI_VOICE_OPTIONS,
  type EngineType,
  type InworldVoiceLanguageOption,
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
  inworldVoiceLanguage: InworldVoiceLanguageOption;
  onInworldVoiceLanguageChange: (nextValue: InworldVoiceLanguageOption) => void;
  apiKeyIsRequired: boolean;
  piperPlusAvailable: boolean;
  piperPlusLoading: boolean;
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
  inworldVoiceLanguage,
  onInworldVoiceLanguageChange,
  apiKeyIsRequired,
  piperPlusAvailable,
  piperPlusLoading,
  children,
}: EngineSelectorProps) {
  const defaults = ENGINE_DEFAULTS[engine];
  const hasSpeakerOptions = speakerOptions.length > 0;
  const showApiKey =
    engine === 'openai' ||
    engine === 'xai' ||
    engine === 'unrealSpeech' ||
    engine === 'elevenLabs' ||
    engine === 'inworld' ||
    engine === 'gradium' ||
    engine === 'geminiTts' ||
    engine === 'openaiCompatible' ||
    engine === 'aivisCloud' ||
    engine === 'minimax';
  const showApiUrl =
    engine === 'geminiTts' ||
    engine === 'unrealSpeech' ||
    engine === 'elevenLabs' ||
    engine === 'gradium' ||
    engine === 'openaiCompatible' ||
    engine === 'voicevox' ||
    engine === 'aivisSpeech' ||
    engine === 'voicepeak';

  const renderSpeakerField = () => {
    if (engine === 'piperPlus') {
      return null;
    }

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

    if (engine === 'xai') {
      const hasFetchedSpeakerOptions = speakerOptions.length > 0;
      const xaiSpeakerOptions = hasFetchedSpeakerOptions
        ? speakerOptions
        : XAI_VOICE_OPTIONS;

      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <select
            id="speaker"
            value={speaker}
            onChange={(e) => onSpeakerChange(e.target.value)}
          >
            {xaiSpeakerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
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
                : hasFetchedSpeakerOptions
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

    if (engine === 'geminiTts') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <select
            id="speaker"
            value={speaker}
            onChange={(e) => onSpeakerChange(e.target.value)}
          >
            {Object.entries(GEMINI_TTS_VOICES).map(([voiceId, label]) => (
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

    if (engine === 'gradium') {
      return (
        <div className="form-group">
          <label htmlFor="speaker">Speaker:</label>
          <select
            id="speaker"
            value={speaker}
            onChange={(e) => onSpeakerChange(e.target.value)}
          >
            {GRADIUM_VOICE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="speaker-fetch-message">
            Gradium の話者一覧 API はブラウザ CORS の制約があるため、 公式
            flagship voice をプリセット表示しています。
          </div>
        </div>
      );
    }

    if (engine === 'elevenLabs' || engine === 'inworld') {
      const providerLabel = engine === 'inworld' ? 'Inworld' : 'ElevenLabs';

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
          {engine === 'inworld' && (
            <div className="speaker-fetch-row">
              <label htmlFor="inworldVoiceLanguage">Language:</label>
              <select
                id="inworldVoiceLanguage"
                value={inworldVoiceLanguage}
                onChange={(e) =>
                  onInworldVoiceLanguageChange(
                    e.target.value as InworldVoiceLanguageOption,
                  )
                }
              >
                {Object.entries(INWORLD_VOICE_LANGUAGE_OPTIONS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}
          <div className="speaker-fetch-row">
            <button
              type="button"
              className="secondary-action-button"
              onClick={onFetchSpeakers}
              disabled={isFetchingSpeakers || !apiKey.trim()}
              title={!apiKey.trim() ? 'API Keyを入力してください' : undefined}
              aria-label={`${providerLabel} の話者一覧を取得`}
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

  const renderPiperPlusGuidance = () => {
    if (engine !== 'piperPlus') {
      return null;
    }

    return (
      <div className="piper-plus-panel">
        {piperPlusLoading ? (
          <div className="piper-plus-notice">
            Checking `public/piper/` for Piper Plus assets...
          </div>
        ) : piperPlusAvailable ? (
          <div className="piper-plus-notice piper-plus-notice--ready">
            <span className="piper-plus-ready-indicator" aria-hidden="true" />
            Assets detected — ready to use
          </div>
        ) : (
          <div className="piper-plus-notice piper-plus-notice--setup">
            <div className="piper-plus-notice__title">Piper Plus Setup</div>
            <p>
              Piper Plus requires TTS assets in `public/piper/`. See README for
              setup instructions.
            </p>
            <div className="piper-plus-notice__subtitle">
              Required asset structure:
            </div>
            <pre className="piper-plus-asset-tree">
              {`public/piper/
├── piper-global-loader.js
├── dist/ (ort.min.js, ort-wasm-simd.wasm, openjtalk.js, openjtalk.wasm)
├── src/ (piper-plus JS modules)
├── assets/dict/ (OpenJTalk dictionary)
├── assets/voice/ (HTS voice file)
└── models/ (ONNX model + config JSON)`}
            </pre>
          </div>
        )}

        <div className="piper-plus-license">
          <div className="piper-plus-license__title">
            Third-party licenses and attribution
          </div>
          <ul>
            <li>
              piper-plus (MIT License) {'— '}
              <a
                href="https://github.com/ayutaz/piper-plus"
                target="_blank"
                rel="noreferrer"
              >
                https://github.com/ayutaz/piper-plus
              </a>
            </li>
            <li>
              ONNX Runtime Web (MIT License) {'— '}
              <a
                href="https://onnxruntime.ai/"
                target="_blank"
                rel="noreferrer"
              >
                https://onnxruntime.ai/
              </a>
            </li>
            <li>
              Open JTalk (BSD 3-Clause) {'— '}
              <a
                href="https://open-jtalk.sourceforge.net/"
                target="_blank"
                rel="noreferrer"
              >
                https://open-jtalk.sourceforge.net/
              </a>
            </li>
            <li>
              Tsukuyomi-chan Corpus {'— '}
              <a
                href="https://tyc.rei-yumesaki.net/"
                target="_blank"
                rel="noreferrer"
              >
                https://tyc.rei-yumesaki.net/
              </a>{' '}
              (© Rei Yumesaki)
            </li>
          </ul>
        </div>
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
          <option value="xai">xAI TTS</option>
          <option value="geminiTts">Gemini TTS</option>
          <option value="voicevox">VOICEVOX</option>
          <option value="aivisSpeech">AivisSpeech (Local)</option>
          <option value="aivisCloud">Aivis Cloud API</option>
          <option value="voicepeak">VOICEPEAK</option>
          <option value="minimax">MiniMax</option>
          <option value="unrealSpeech">Unreal Speech</option>
          <option value="elevenLabs">ElevenLabs</option>
          <option value="inworld">Inworld</option>
          <option value="gradium">Gradium</option>
          <option value="openaiCompatible">OpenAI-Compatible TTS</option>
          <option value="piperPlus">Piper Plus (Browser WASM)</option>
        </select>
      </div>

      {renderSpeakerField()}

      {showApiKey && (
        <div className="form-group">
          <label htmlFor="apiKey">
            {engine === 'minimax'
              ? 'MiniMax API Key (required):'
              : engine === 'geminiTts'
                ? 'API Key (required):'
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

      {renderPiperPlusGuidance()}

      {children}
    </>
  );
}

import type { GeminiNanoStatus } from '../hooks/useGeminiNano';
import {
  type DemoSettings,
  type KeyedProvider,
  PIPER_SPEED_RANGE,
  type Provider,
  type VoiceKind,
} from '../hooks/useSettings';
import type { PiperStatus } from '../hooks/useTts';

interface SettingsSheetProps {
  settings: DemoSettings;
  nano: {
    status: GeminiNanoStatus;
    progress: number | null;
    prepare: () => void;
  };
  piperStatus: PiperStatus;
  voices: SpeechSynthesisVoice[];
  onUpdate: (patch: Partial<DemoSettings>) => void;
  onSetApiKey: (provider: KeyedProvider, key: string) => void;
  onPreparePiper: () => void;
  onReset: () => void;
  onClose: () => void;
}

const PROVIDERS: Array<{ id: Provider; label: string }> = [
  { id: 'gemini-nano', label: 'Gemini Nano（Chrome 内蔵・キー不要）' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'claude', label: 'Anthropic Claude' },
];

function nanoLabel(status: GeminiNanoStatus, progress: number | null): string {
  switch (status) {
    case 'available':
      return '使えます';
    case 'downloadable':
      return 'モデルの準備が必要です';
    case 'downloading':
      return progress === null
        ? 'ダウンロード中…'
        : `ダウンロード中… ${progress}%`;
    case 'checking':
      return '確認中…';
    case 'error':
      return '状態を確認できませんでした';
    default:
      return 'このブラウザでは使えません（Chrome 138 以降で chrome://flags の Prompt API を有効にしてください）';
  }
}

export function SettingsSheet({
  settings,
  nano,
  piperStatus,
  voices,
  onUpdate,
  onSetApiKey,
  onPreparePiper,
  onReset,
  onClose,
}: SettingsSheetProps) {
  const keyed = settings.provider !== 'gemini-nano';
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="settings-title">設定</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <fieldset className="group">
          <legend>会話に使う AI</legend>
          <select
            value={settings.provider}
            onChange={(event) =>
              onUpdate({ provider: event.target.value as Provider })
            }
          >
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
          {settings.provider === 'gemini-nano' ? (
            <p className="hint">
              Gemini Nano: {nanoLabel(nano.status, nano.progress)}
              {nano.status === 'downloadable' && (
                <button type="button" className="link" onClick={nano.prepare}>
                  準備する
                </button>
              )}
            </p>
          ) : (
            <>
              <input
                type="password"
                className="text"
                placeholder="API キー"
                value={settings.apiKeys[settings.provider as KeyedProvider]}
                onChange={(event) =>
                  onSetApiKey(
                    settings.provider as KeyedProvider,
                    event.target.value,
                  )
                }
                autoComplete="off"
              />
              <p className="hint">
                キーはこのブラウザにだけ保存され、各社の API
                へ直接送られます。共用の端末では使わないでください。
              </p>
            </>
          )}
          {!keyed && null}
        </fieldset>

        <fieldset className="group">
          <legend>声</legend>
          <label className="radio">
            <input
              type="radio"
              name="voice"
              checked={settings.voice === 'webSpeech'}
              onChange={() => onUpdate({ voice: 'webSpeech' as VoiceKind })}
            />
            ブラウザ標準（Web Speech API）
          </label>
          {settings.voice === 'webSpeech' && voices.length > 0 && (
            <select
              value={settings.webSpeechVoice}
              onChange={(event) =>
                onUpdate({ webSpeechVoice: event.target.value })
              }
            >
              <option value="">自動で選ぶ</option>
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </select>
          )}
          <label className="radio">
            <input
              type="radio"
              name="voice"
              checked={settings.voice === 'piperPlus'}
              disabled={piperStatus !== 'ready'}
              onChange={() => onUpdate({ voice: 'piperPlus' as VoiceKind })}
            />
            ミコの声（piper-plus、ブラウザ内で合成）
          </label>
          {piperStatus === 'ready' && (
            <label className="slider">
              <span>
                ミコの声の速さ{' '}
                <strong>{settings.piperSpeed.toFixed(2)}×</strong>
              </span>
              <input
                type="range"
                min={PIPER_SPEED_RANGE.min}
                max={PIPER_SPEED_RANGE.max}
                step={PIPER_SPEED_RANGE.step}
                value={settings.piperSpeed}
                onChange={(event) =>
                  onUpdate({ piperSpeed: Number(event.target.value) })
                }
              />
            </label>
          )}
          {piperStatus === 'idle' && (
            <button type="button" className="link" onClick={onPreparePiper}>
              準備する（約160MB をダウンロード）
            </button>
          )}
          {piperStatus === 'loading' && <p className="hint">準備中…</p>}
          {piperStatus === 'missing' && (
            <p className="hint">
              このビルドには音声ファイルが含まれていません。
            </p>
          )}
          {piperStatus === 'error' && (
            <p className="hint">準備に失敗しました。</p>
          )}
        </fieldset>

        <div className="sheet-actions">
          <button type="button" className="link" onClick={onReset}>
            会話をリセット
          </button>
        </div>

        <p className="credits">
          ミコ © Yuki Shindo（AITuber OnAir）。ミコの声は
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noreferrer"
          >
            piper-plus
          </a>
          で学習した合成音声モデルです。
        </p>
      </div>
    </div>
  );
}

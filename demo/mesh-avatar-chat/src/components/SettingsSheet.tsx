import type { GeminiNanoStatus } from '../hooks/useGeminiNano';
import {
  type DemoSettings,
  PIPER_SPEED_RANGE,
  type VoiceKind,
} from '../hooks/useSettings';
import type { PiperStatus } from '../hooks/useTts';
import {
  type KeyedProvider,
  PROVIDERS,
  type Provider,
  getProvider,
  isKeyedProvider,
} from '../lib/providers';

interface SettingsSheetProps {
  settings: DemoSettings;
  nano: {
    status: GeminiNanoStatus;
    progress: number | null;
    prepare: () => void;
  };
  piperStatus: PiperStatus;
  voices: SpeechSynthesisVoice[];
  onUpdateLlm: (patch: Partial<DemoSettings['llm']>) => void;
  onUpdateVoice: (patch: Partial<DemoSettings['voice']>) => void;
  onSetApiKey: (provider: KeyedProvider, key: string) => void;
  onSetOpenaiCompatible: (
    patch: Partial<DemoSettings['llm']['openaiCompatible']>,
  ) => void;
  onPreparePiper: () => void;
  onReset: () => void;
  onClose: () => void;
}

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
  onUpdateLlm,
  onUpdateVoice,
  onSetApiKey,
  onSetOpenaiCompatible,
  onPreparePiper,
  onReset,
  onClose,
}: SettingsSheetProps) {
  const provider = settings.llm.provider;
  const info = getProvider(provider);
  const voice = settings.voice;

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
            value={provider}
            onChange={(event) =>
              onUpdateLlm({ provider: event.target.value as Provider })
            }
          >
            {PROVIDERS.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.browser}>
                {item.label}
                {item.browser ? '' : '（ブラウザから直接は呼べません）'}
              </option>
            ))}
          </select>
          {info.auth === 'none' && (
            <p className="hint">
              Gemini Nano: {nanoLabel(nano.status, nano.progress)}
              {nano.status === 'downloadable' && (
                <button type="button" className="link" onClick={nano.prepare}>
                  準備する
                </button>
              )}
            </p>
          )}
          {isKeyedProvider(provider) && (
            <>
              <input
                type="password"
                className="text"
                placeholder={`${info.label} の API キー`}
                value={settings.llm.apiKeys[provider] ?? ''}
                onChange={(event) => onSetApiKey(provider, event.target.value)}
                autoComplete="off"
              />
              <p className="hint">
                各社の既定モデルを使います。メッセージと API
                キーは、このブラウザから選んだ会社の API
                へ直接送られます。キーはこのブラウザのローカルストレージに保存されるので、共用の端末では使わないでください。
              </p>
            </>
          )}
          {info.auth === 'endpoint' && (
            <>
              <input
                type="url"
                className="text"
                placeholder="サーバー URL（例: http://localhost:11434）"
                value={settings.llm.openaiCompatible.endpoint}
                onChange={(event) =>
                  onSetOpenaiCompatible({ endpoint: event.target.value })
                }
                autoComplete="off"
              />
              <input
                type="text"
                className="text"
                placeholder="モデル名（例: gemma3）"
                value={settings.llm.openaiCompatible.model}
                onChange={(event) =>
                  onSetOpenaiCompatible({ model: event.target.value })
                }
                autoComplete="off"
              />
              <p className="hint">
                OpenAI 互換の Chat Completions API
                を持つサーバーに、このブラウザから直接つなぎ、メッセージをそのサーバーへ送ります。サーバー側で
                CORS の許可が必要です。
              </p>
            </>
          )}
        </fieldset>

        <fieldset className="group">
          <legend>声</legend>
          <label className="radio">
            <input
              type="radio"
              name="voice"
              checked={voice.engine === 'webSpeech'}
              onChange={() =>
                onUpdateVoice({ engine: 'webSpeech' as VoiceKind })
              }
            />
            ブラウザ標準（Web Speech API）
          </label>
          {voice.engine === 'webSpeech' && voices.length > 0 && (
            <select
              value={voice.webSpeechVoice}
              onChange={(event) =>
                onUpdateVoice({ webSpeechVoice: event.target.value })
              }
            >
              <option value="">自動で選ぶ</option>
              {voices.map((item) => (
                <option key={item.voiceURI} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <label className="radio">
            <input
              type="radio"
              name="voice"
              checked={voice.engine === 'piperPlus'}
              disabled={piperStatus !== 'ready'}
              onChange={() =>
                onUpdateVoice({ engine: 'piperPlus' as VoiceKind })
              }
            />
            ミコの声（piper-plus、ブラウザ内で合成）
          </label>
          {piperStatus === 'ready' && (
            <label className="slider">
              <span>
                ミコの声の速さ <strong>{voice.piperSpeed.toFixed(2)}×</strong>
              </span>
              <input
                type="range"
                min={PIPER_SPEED_RANGE.min}
                max={PIPER_SPEED_RANGE.max}
                step={PIPER_SPEED_RANGE.step}
                value={voice.piperSpeed}
                onChange={(event) =>
                  onUpdateVoice({ piperSpeed: Number(event.target.value) })
                }
              />
            </label>
          )}
          {piperStatus === 'idle' && (
            <button type="button" className="link" onClick={onPreparePiper}>
              準備する（モデル 38MB、辞書 102MB、実行環境 12MB の合計約150MB
              をダウンロード）
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

import type { EngineType } from '../constants';

interface SpeakControlsProps {
  text: string;
  onTextChange: (nextValue: string) => void;
  isPlaying: boolean;
  onSpeak: () => void;
  onStop: () => void;
  status: string;
  statusType: 'info' | 'success' | 'error';
  engine: EngineType;
}

export function SpeakControls({
  text,
  onTextChange,
  isPlaying,
  onSpeak,
  onStop,
  status,
  statusType,
  engine,
}: SpeakControlsProps) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="text">Text to speak:</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter text to speak..."
        />
      </div>

      <div className="button-group">
        <button
          type="button"
          onClick={onSpeak}
          disabled={isPlaying}
          style={{ opacity: isPlaying ? 0.5 : 1 }}
        >
          🔊 {isPlaying ? 'Speaking...' : 'Speak'}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!isPlaying}
          style={{ opacity: !isPlaying ? 0.5 : 1 }}
        >
          ⏹ Stop
        </button>
      </div>

      <div className={`status ${statusType}`}>{status}</div>
      {engine === 'minimax' ? (
        <p className="helper-text">
          ※ MiniMax では速度・音量・ピッチ・音質パラメータを自由に調整できます
        </p>
      ) : engine === 'voicevox' ? (
        <p className="helper-text">
          ※ VOICEVOX では話速や抑揚・無音長などをカード内で細かく指定できます
        </p>
      ) : engine === 'aivisCloud' ? (
        <p className="helper-text">
          ※ Aivis Cloud ではモデル UUID
          とパラメータ群を任意に指定できます。未入力フィールドはクラウド側の既定値が利用されます
        </p>
      ) : engine === 'aivisSpeech' ? (
        <p className="helper-text">
          ※ AivisSpeech
          では感情の強さ（Intonation）やテンポ緩急など独自パラメータを設定できます
        </p>
      ) : (
        <p className="helper-text">
          ※ その他のエンジンでは推奨パラメータが自動的に適用されます
        </p>
      )}
    </>
  );
}

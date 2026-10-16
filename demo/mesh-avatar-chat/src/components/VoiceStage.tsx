import type { PiperStatus } from '../hooks/useTts';

export type VoiceMode = 'waiting' | 'web' | 'piper';

interface VoiceStageProps {
  mode: VoiceMode;
  piperStatus: PiperStatus;
  /** 0..1 while the voice files download */
  piperProgress: number | null;
  /** True for a few seconds after the Miko voice took over */
  justSwitched: boolean;
  onPrepare: () => void;
  onUseWebSpeech: () => void;
  onUsePiper: () => void;
}

/**
 * Under the avatar: what the page is doing about the voice. Visitors are
 * developers, so it names the parts at work.
 */
export function VoiceStage({
  mode,
  piperStatus,
  piperProgress,
  justSwitched,
  onPrepare,
  onUseWebSpeech,
  onUsePiper,
}: VoiceStageProps) {
  if (mode === 'piper') {
    return (
      <div className="voice-stage">
        <div
          className={`voice-pill voice-pill-miko${justSwitched ? ' voice-pill-pop' : ''}`}
        >
          <span className="voice-icon" aria-hidden="true">
            ✦
          </span>
          <span>
            いまの声: <strong>ミコ</strong>
            <small>piper-plus のモデルをブラウザ内で合成</small>
          </span>
        </div>
        {justSwitched && (
          <p className="voice-toast" role="status">
            準備できたので、ミコの声に切り替わりました
          </p>
        )}
      </div>
    );
  }

  if (piperStatus === 'loading') {
    const percent =
      piperProgress === null ? null : Math.round(piperProgress * 100);
    return (
      <div className="voice-stage">
        <div className="voice-progress" role="status">
          <span className="voice-progress-text">
            {percent === null || percent >= 100
              ? 'ミコの声を読み込んでいます… あと少しです'
              : `ミコの声をダウンロード中… ${percent}%`}
            <small>
              piper-plus のモデルと辞書（約160MB）をブラウザに置きます
            </small>
          </span>
          <span
            className={`voice-progress-bar${percent === null || percent >= 100 ? ' voice-progress-bar-busy' : ''}`}
            aria-hidden="true"
          >
            <span
              className="voice-progress-fill"
              style={{ width: `${percent ?? 0}%` }}
            />
          </span>
        </div>
        {mode === 'waiting' ? (
          <button
            type="button"
            className="link voice-link"
            onClick={onUseWebSpeech}
          >
            待たずにブラウザ標準の声で話す（口の動きは合いません）
          </button>
        ) : (
          <div className="voice-pill">
            <span className="voice-icon" aria-hidden="true">
              ♪
            </span>
            <span>
              いまの声: <strong>ブラウザ標準</strong>
              <small>
                Web Speech API。準備ができたらミコの声に切り替わります
              </small>
            </span>
          </div>
        )}
      </div>
    );
  }

  if (piperStatus === 'ready') {
    return (
      <div className="voice-stage">
        <div className="voice-pill">
          <span className="voice-icon" aria-hidden="true">
            ♪
          </span>
          <span>
            いまの声: <strong>ブラウザ標準</strong>
            <small>Web Speech API</small>
          </span>
        </div>
        <button type="button" className="link voice-link" onClick={onUsePiper}>
          ミコの声に切り替える
        </button>
      </div>
    );
  }

  // idle (not started automatically), missing or error
  return (
    <div className="voice-stage">
      {piperStatus === 'idle' && (
        <button type="button" className="prepare" onClick={onPrepare}>
          ミコの声を準備する（約160MB をブラウザに読み込みます）
        </button>
      )}
      {piperStatus === 'error' && (
        <p className="voice-progress-text">ミコの声の準備に失敗しました。</p>
      )}
      {mode === 'web' ? (
        <div className="voice-pill">
          <span className="voice-icon" aria-hidden="true">
            ♪
          </span>
          <span>
            いまの声: <strong>ブラウザ標準</strong>
            <small>Web Speech API</small>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="link voice-link"
          onClick={onUseWebSpeech}
        >
          ブラウザ標準の声で話す（口の動きは合いません）
        </button>
      )}
    </div>
  );
}

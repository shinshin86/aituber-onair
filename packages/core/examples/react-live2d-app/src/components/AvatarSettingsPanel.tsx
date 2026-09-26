import type { useSettings } from '../hooks/useSettings';
import type {
  BundledLive2DModelEntry,
  Live2DModelSource,
} from '../lib/live2dModel';
import {
  getSpeechLoopRange,
  getAssignedLive2DMotion,
  type Live2DMotionSelection,
} from '../lib/live2dMotions';
import type {
  Live2DEmotionEffect,
  Live2DReactionControlMode,
  Live2DReactionEmotion,
} from '../lib/live2dReactions';

type SettingsHook = ReturnType<typeof useSettings>;

interface AvatarSettingsPanelProps
  extends Pick<
    SettingsHook,
    | 'settings'
    | 'updateVisualLive2DEmotionMotion'
    | 'updateVisualLive2DReactionControlMode'
    | 'updateVisualLive2DEmotionEffect'
    | 'resetVisualLive2DEmotionEffectMap'
  > {
  bundledModels: BundledLive2DModelEntry[];
  selectedBundledModelId: string;
  onSelectedBundledModelIdChange: (id: string) => void;
  onBundledModelLoad: () => void;
  onClearModel: () => void;
  modelSource: Live2DModelSource | null;
  modelPickerError: string;
  isProcessing: boolean;
  onMotionPreview: (motion: Live2DMotionSelection) => void;
}

const EMOTIONS: ReadonlyArray<{
  value: Live2DReactionEmotion;
  label: string;
}> = [
  { value: 'happy', label: '喜び（happy）' },
  { value: 'surprised', label: '驚き（surprised）' },
  { value: 'sad', label: '悲しみ（sad）' },
  { value: 'angry', label: '怒り（angry）' },
  { value: 'relaxed', label: '安らぎ（relaxed）' },
  { value: 'thinking', label: '考え中（thinking）' },
  { value: 'neutral', label: '通常（neutral）' },
];

const EFFECTS: ReadonlyArray<{
  value: Live2DEmotionEffect | 'none';
  label: string;
}> = [
  { value: 'none', label: 'なし' },
  { value: 'happy', label: '喜び（キラキラ）' },
  { value: 'surprised', label: '驚き（放射線）' },
  { value: 'sad', label: '悲しみ（涙）' },
  { value: 'angry', label: '怒り（怒りマーク）' },
  { value: 'relaxed', label: '安らぎ（泡）' },
  { value: 'thinking', label: '考え中（思考バブル）' },
];

function motionValue(motion: Live2DMotionSelection): string {
  return JSON.stringify([motion.group, motion.index]);
}

export function AvatarSettingsPanel({
  settings,
  bundledModels,
  selectedBundledModelId,
  onSelectedBundledModelIdChange,
  onBundledModelLoad,
  onClearModel,
  modelSource,
  modelPickerError,
  isProcessing,
  onMotionPreview,
  updateVisualLive2DEmotionMotion,
  updateVisualLive2DReactionControlMode,
  updateVisualLive2DEmotionEffect,
  resetVisualLive2DEmotionEffectMap,
}: AvatarSettingsPanelProps) {
  const modelPath = modelSource?.modelFilePath;
  const motions = modelSource?.motions || [];

  return (
    <div className="settings-panel avatar-settings-panel">
      <section className="settings-section">
        <h3>Live2D モデル</h3>
        <div className="settings-field">
          <label htmlFor="live2d-bundled-model">
            `models/` フォルダ内のモデル
          </label>
          <div className="settings-file-picker-row">
            <select
              id="live2d-bundled-model"
              value={selectedBundledModelId}
              onChange={(event) =>
                onSelectedBundledModelIdChange(event.target.value)
              }
              disabled={bundledModels.length === 0}
            >
              {bundledModels.length === 0 ? (
                <option value="">`models/` にモデルが見つかりません</option>
              ) : (
                bundledModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))
              )}
            </select>
            <button
              className="settings-file-trigger"
              type="button"
              onClick={onBundledModelLoad}
              disabled={bundledModels.length === 0 || !selectedBundledModelId}
            >
              読み込む
            </button>
          </div>
          <p className="settings-field-hint">
            `models/` 配下にモデルを追加した場合は dev
            サーバーを再起動してください。
          </p>
          <div className="settings-file-actions">
            <span className="settings-file-status">
              {modelPath || '未読み込み'}
            </span>
            <button
              className="settings-clear-button"
              type="button"
              onClick={onClearModel}
              disabled={!modelSource}
            >
              クリア
            </button>
          </div>
          <p className="settings-field-hint">
            このサンプルには Live2D アセットは同梱していません。
          </p>
          {modelPickerError && (
            <p className="settings-field-error">{modelPickerError}</p>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>感情とモデルモーション</h3>
        <p className="settings-field-hint">
          発話の emotion タグに応じて、モデルに含まれるモーションを再生します。
          アイドルモーションはモデルの標準設定を使います。
        </p>
        <p className="settings-field-hint">
          選択肢にはモデル設定のグループ名と File の値をそのまま表示します。
          動きは「再生」で確認してください。
        </p>
        <p className="settings-field-hint">
          発話中は選んだモーションの指定区間を繰り返します。通常表情へ戻る区間がある場合は、開始・終了位置を調整してください。
        </p>
        {modelSource && motions.length === 0 && (
          <p className="settings-field-hint">
            このモデルにモーションがありません。
          </p>
        )}
        <div className="settings-emotion-mapping-list">
          {EMOTIONS.map(({ value, label }) => {
            const selected = getAssignedLive2DMotion(
              settings.visual.live2dEmotionMotionMaps,
              modelPath,
              value,
              motions,
            );
            const selectedMotion = motions.find(
              (motion) =>
                selected && motionValue(motion) === motionValue(selected),
            );
            const loopRange = selected ? getSpeechLoopRange(selected) : null;
            return (
              <div
                className="settings-field settings-motion-mapping-row"
                key={value}
              >
                <label htmlFor={`live2d-motion-${value}`}>{label}</label>
                <select
                  id={`live2d-motion-${value}`}
                  value={selected ? motionValue(selected) : ''}
                  onChange={(event) => {
                    if (!modelPath) return;
                    const motion = motions.find(
                      (candidate) =>
                        motionValue(candidate) === event.target.value,
                    );
                    updateVisualLive2DEmotionMotion(
                      modelPath,
                      value,
                      motion || null,
                    );
                  }}
                  disabled={
                    isProcessing || !modelSource || motions.length === 0
                  }
                >
                  <option value="">なし</option>
                  {motions.map((motion) => (
                    <option
                      key={motionValue(motion)}
                      value={motionValue(motion)}
                    >
                      {motion.group} / {motion.file}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="settings-clear-button"
                  disabled={isProcessing || !selected}
                  onClick={() => {
                    if (selected) onMotionPreview(selected);
                  }}
                  aria-label={`${label}のモーションをプレビュー`}
                >
                  再生
                </button>
                {selectedMotion && (
                  <small className="settings-motion-source">
                    {selectedMotion.group} / {selectedMotion.file}
                  </small>
                )}
                {selected && loopRange && modelPath && (
                  <div className="settings-motion-loop-range">
                    <label>
                      <span>発話中の開始位置</span>
                      <input
                        type="range"
                        min="0"
                        max={loopRange.endPercent - 10}
                        step="5"
                        value={loopRange.startPercent}
                        disabled={isProcessing}
                        onChange={(event) =>
                          updateVisualLive2DEmotionMotion(modelPath, value, {
                            ...selected,
                            speechLoopStartPercent: Number(event.target.value),
                            speechLoopEndPercent: loopRange.endPercent,
                          })
                        }
                      />
                      <output>{loopRange.startPercent}%</output>
                    </label>
                    <label>
                      <span>発話中の終了位置</span>
                      <input
                        type="range"
                        min={loopRange.startPercent + 10}
                        max="100"
                        step="5"
                        value={loopRange.endPercent}
                        disabled={isProcessing}
                        onChange={(event) =>
                          updateVisualLive2DEmotionMotion(modelPath, value, {
                            ...selected,
                            speechLoopStartPercent: loopRange.startPercent,
                            speechLoopEndPercent: Number(event.target.value),
                          })
                        }
                      />
                      <output>{loopRange.endPercent}%</output>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="settings-section">
        <h3>感情表現エフェクト</h3>
        <div className="settings-field">
          <label htmlFor="live2d-reaction-control-mode">操作方法</label>
          <select
            id="live2d-reaction-control-mode"
            value={settings.visual.live2dReactionControlMode}
            onChange={(event) =>
              updateVisualLive2DReactionControlMode(
                event.target.value as Live2DReactionControlMode,
              )
            }
            disabled={isProcessing}
          >
            <option value="none">なし</option>
            <option value="manual">手動ボタン</option>
            <option value="linked">発話感情に連動のみ</option>
          </select>
          <p className="settings-field-hint">
            視覚エフェクトの操作方法です。モデルモーションの割り当てには影響しません。
          </p>
        </div>
        <div className="settings-field">
          <span className="settings-field-label">感情とエフェクトの対応</span>
          <div className="settings-emotion-mapping-list">
            {EMOTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="settings-emotion-mapping-row"
                htmlFor={`live2d-effect-${value}`}
              >
                <span>{label}</span>
                <select
                  id={`live2d-effect-${value}`}
                  value={
                    settings.visual.live2dEmotionEffectMap[value] || 'none'
                  }
                  onChange={(event) =>
                    updateVisualLive2DEmotionEffect(
                      value,
                      event.target.value === 'none'
                        ? null
                        : (event.target.value as Live2DEmotionEffect),
                    )
                  }
                  disabled={isProcessing}
                >
                  {EFFECTS.map((effect) => (
                    <option key={effect.value} value={effect.value}>
                      {effect.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="settings-clear-button settings-inline-button"
            onClick={resetVisualLive2DEmotionEffectMap}
            disabled={isProcessing}
          >
            感情の割り当てを初期値に戻す
          </button>
        </div>
      </section>
    </div>
  );
}

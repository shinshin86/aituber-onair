import { useState } from 'react';
import {
  MOTION_EMOTIONS,
  emptyMotionProfile,
  type MotionProfile,
} from '../lib/inochi2dMotionProfiles';
import './InochiMotionPanel.css';

type Props = {
  names: string[];
  profile: MotionProfile;
  notice: string;
  defaultIdle: string[];
  defaultEmotions: Record<string, string[]>;
  onChange: (profile: MotionProfile) => Promise<void>;
  onPreview: (name: string, loop: boolean) => Promise<void>;
  onResume: () => Promise<void>;
  onEmotion: (emotion: string) => Promise<void>;
};
const encode = (value: string | null | undefined) =>
  value === undefined ? 'default' : value === null ? 'none' : `motion:${value}`;
const decode = (value: string) =>
  value === 'default' ? undefined : value === 'none' ? null : value.slice(7);

export function InochiMotionPanel({
  names,
  profile,
  notice,
  defaultIdle,
  defaultEmotions,
  onChange,
  onPreview,
  onResume,
  onEmotion,
}: Props) {
  const [preview, setPreview] = useState(names[0] ?? '');
  const [loop, setLoop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch {
      setError('モーション操作に失敗しました。再度お試しください。');
    } finally {
      setBusy(false);
    }
  };
  const options = (selected: string | null | undefined, defaults: string[]) => (
    <>
      <option value="default">
        既定：
        {defaults.filter((name) => names.includes(name)).join(' / ') ||
          '指定なし'}
      </option>
      <option value="none">再生しない</option>
      {selected && !names.includes(selected) && (
        <option value={encode(selected)} disabled>
          見つかりません: {selected}
        </option>
      )}
      {names.map((name) => (
        <option key={name} value={encode(name)}>
          {name}
        </option>
      ))}
    </>
  );
  return (
    <section
      id="inochi-motion-panel"
      className="inochi-motion-panel"
      aria-label="モーション設定"
    >
      <div className="inochi-motion-heading">
        <h3>モーション設定</h3>
        <span>{names.length}モーション</span>
      </div>
      <p className="inochi-motion-intro">
        変更はすぐに反映され、このモデルの設定として自動保存されます。
      </p>
      {!names.length && (
        <p role="status">
          再生できるモーションがありません。モーションを含むモデルを読み込んでください。
        </p>
      )}
      <fieldset className="inochi-motion-idle" disabled={busy || !names.length}>
        <legend>待機中のモーション</legend>
        <p>会話や試し再生が終わると、この動きに戻って繰り返します。</p>
        <div className="inochi-motion-selection">
          <select
            aria-label="待機中のモーション"
            value={encode(profile.idle)}
            onChange={(event) => {
              const idle = decode(event.target.value);
              void perform(() => onChange({ ...profile, idle }));
            }}
          >
            {options(profile.idle, defaultIdle)}
          </select>
          <button type="button" onClick={() => void perform(onResume)}>
            待機を再生
          </button>
        </div>
      </fieldset>
      <fieldset
        className="inochi-motion-mapping"
        disabled={busy || !names.length}
      >
        <legend>感情ごとのモーション</legend>
        <p>その感情で話し始めたときに1回再生し、待機中の動きに戻ります。</p>
        <div className="inochi-motion-columns" aria-hidden="true">
          <span>感情</span>
          <span>再生するモーション</span>
          <span>確認</span>
        </div>
        {MOTION_EMOTIONS.map(([emotion, label]) => (
          <div className="inochi-motion-emotion" key={emotion}>
            <label htmlFor={`motion-emotion-${emotion}`}>{label}</label>
            <select
              id={`motion-emotion-${emotion}`}
              aria-label={`${label}のモーション`}
              value={encode(profile.emotions[emotion])}
              onChange={(event) => {
                const emotions = { ...profile.emotions };
                const value = decode(event.target.value);
                if (value === undefined) delete emotions[emotion];
                else emotions[emotion] = value;
                void perform(() => onChange({ ...profile, emotions }));
              }}
            >
              {options(
                profile.emotions[emotion],
                defaultEmotions[emotion] ?? defaultEmotions.neutral ?? [],
              )}
            </select>
            <button
              type="button"
              aria-label={`${label}の割り当てを試す`}
              onClick={() =>
                void perform(async () => {
                  await onEmotion(emotion);
                })
              }
            >
              再生
            </button>
          </div>
        ))}
        <p className="inochi-motion-note">
          「再生しない」を選ぶと、その感情での動きの切り替えを無効にします。
        </p>
      </fieldset>
      <details className="inochi-motion-preview">
        <summary>
          すべてのモーションを試す <span>{names.length}件</span>
        </summary>
        <fieldset disabled={busy || !names.length}>
          <legend className="inochi-motion-sr-only">試し再生</legend>
          <label htmlFor="motion-preview-select">モーション</label>
          <select
            id="motion-preview-select"
            aria-label="試し再生するモーション"
            value={preview}
            onChange={(event) => setPreview(event.target.value)}
          >
            {names.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <div className="inochi-motion-actions">
            <label>
              <input
                type="checkbox"
                checked={loop}
                onChange={(event) => setLoop(event.target.checked)}
              />
              繰り返す
            </label>
            <button
              type="button"
              onClick={() => void perform(() => onPreview(preview, loop))}
            >
              試し再生
            </button>
            <button type="button" onClick={() => void perform(onResume)}>
              待機に戻す
            </button>
          </div>
        </fieldset>
        <p>
          試し再生は割り当てを変更しません。繰り返し再生は「待機に戻す」、または設定を閉じると終了します。
        </p>
      </details>
      <div className="inochi-motion-footer">
        <p role="status">
          {notice || '設定はモデルごとに、このブラウザに保存されます。'}
        </p>
        <button
          type="button"
          disabled={busy || !names.length}
          onClick={() => void perform(() => onChange(emptyMotionProfile()))}
        >
          既定に戻す
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

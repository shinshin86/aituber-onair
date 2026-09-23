import type { useSettings } from '../hooks/useSettings';

type SettingsHook = ReturnType<typeof useSettings>;

interface AvatarSettingsPanelProps
  extends Pick<
    SettingsHook,
    'settings' | 'updateVisualBundledAvatar' | 'updateVisualMotionStyle'
  > {
  isProcessing: boolean;
  avatarImageUrl: string | null;
  onAvatarImageChange: (file: File | null) => void;
  onAvatarMotionPreview: () => void;
}

export function AvatarSettingsPanel({
  settings,
  updateVisualBundledAvatar,
  updateVisualMotionStyle,
  isProcessing,
  avatarImageUrl,
  onAvatarImageChange,
  onAvatarMotionPreview,
}: AvatarSettingsPanelProps) {
  return (
    <div className="settings-panel avatar-settings-panel">
      <section className="settings-section">
        <h3>アバター</h3>

        <div className="settings-field">
          <label htmlFor="bundled-avatar">付属アバター</label>
          <select
            id="bundled-avatar"
            value={settings.visual.bundledAvatar}
            onChange={(event) =>
              updateVisualBundledAvatar(
                event.target.value as 'miko' | 'miko-puppet',
              )
            }
            disabled={isProcessing || Boolean(avatarImageUrl)}
          >
            <option value="miko">Miko（イラスト）</option>
            <option value="miko-puppet">Miko（パペット）</option>
          </select>
          <small>
            アップロード画像を使っている間は、そちらが優先されます。
          </small>
        </div>

        <div className="settings-field">
          <label htmlFor="avatar-image">アバター画像（1枚）</label>
          <div className="settings-file-picker-row">
            <input
              id="avatar-image"
              className="settings-file-input-hidden"
              type="file"
              accept="image/*"
              disabled={isProcessing}
              onChange={(event) => {
                onAvatarImageChange(event.target.files?.[0] ?? null);
                event.currentTarget.value = '';
              }}
            />
            <label
              htmlFor="avatar-image"
              className={`settings-file-trigger${isProcessing ? ' is-disabled' : ''}`}
            >
              画像を選択
            </label>
            <span className="settings-file-hint">透過PNG推奨</span>
          </div>
          <div className="settings-file-actions">
            <span className="settings-file-status">
              {avatarImageUrl ? 'アップロード画像' : '付属画像'}
            </span>
            {avatarImageUrl && (
              <button
                type="button"
                className="settings-clear-button"
                onClick={() => onAvatarImageChange(null)}
                disabled={isProcessing}
              >
                デフォルトに戻す
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>モーション</h3>

        <div className="settings-field">
          <label htmlFor="avatar-motion-style">モーション</label>
          <select
            id="avatar-motion-style"
            value={settings.visual.motionStyle}
            onChange={(event) =>
              updateVisualMotionStyle(event.target.value as 'bounce' | 'puppet')
            }
            disabled={isProcessing}
          >
            <option value="bounce">Bounce</option>
            <option value="puppet">Puppet Wobble</option>
          </select>
          <small>
            Bounceは弾む動き、Puppet Wobbleは小刻みに左右へ揺れる動きです。
          </small>
        </div>

        <button
          type="button"
          className="settings-clear-button settings-inline-button"
          onClick={onAvatarMotionPreview}
          disabled={isProcessing}
        >
          動きをプレビュー
        </button>
      </section>
    </div>
  );
}

import type { useAvatarMedia } from '../hooks/useAvatarMedia';
import {
  AVATAR_EMOTIONS,
  AVATAR_MEDIA_ACCEPT,
  resolveAvatarMedia,
} from '../lib/avatarMedia';
import { AvatarMediaElement } from './AvatarMedia';

interface AvatarSettingsPanelProps {
  isProcessing: boolean;
  avatarMedia: ReturnType<typeof useAvatarMedia>;
}
const LABELS = {
  neutral: '通常',
  happy: '喜び',
  angry: '怒り',
  sad: '悲しみ',
  relaxed: '安らぎ',
  surprised: '驚き',
};

export function AvatarSettingsPanel({
  isProcessing,
  avatarMedia,
}: AvatarSettingsPanelProps) {
  const disabled = isProcessing || avatarMedia.busy;
  return (
    <div className="settings-panel avatar-settings-panel">
      <section className="settings-section">
        <h3>感情別のメディア</h3>
        <p className="settings-file-hint">
          PNG・JPG・WebP・GIF・MP4・WebM、各100
          MBまで。動画はミュートでループ再生します。
        </p>
        <p className="settings-file-hint">
          未設定の感情には、アップロードした通常メディア、感情別の付属GIF、通常の付属GIFの順で表示します。
        </p>
        {avatarMedia.error && (
          <p className="error-message" role="alert">
            {avatarMedia.error}
          </p>
        )}
        {AVATAR_EMOTIONS.map((emotion) => {
          const media = resolveAvatarMedia(emotion, avatarMedia.uploads);
          return (
            <div
              key={emotion}
              className="settings-field"
              data-media-emotion={emotion}
            >
              <label htmlFor={`avatar-media-${emotion}`}>
                {LABELS[emotion]} ({emotion})
              </label>
              <div className="settings-file-picker-row">
                <AvatarMediaElement
                  media={media}
                  className="settings-media-preview"
                />
                <input
                  id={`avatar-media-${emotion}`}
                  className="settings-file-input-hidden"
                  type="file"
                  accept={AVATAR_MEDIA_ACCEPT}
                  disabled={disabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void avatarMedia.changeMedia(emotion, file);
                    event.currentTarget.value = '';
                  }}
                />
                <label
                  htmlFor={`avatar-media-${emotion}`}
                  className={`settings-file-trigger${disabled ? ' is-disabled' : ''}`}
                >
                  ファイルを選択
                </label>
              </div>
              <div className="settings-file-actions">
                <span className="settings-file-status">
                  {media.source === 'upload' ? 'アップロード' : '付属'}：
                  {media.name}
                  {!avatarMedia.uploads[emotion] &&
                  media === avatarMedia.uploads.neutral
                    ? '（通常から使用）'
                    : ''}
                </span>
                <button
                  type="button"
                  className="settings-clear-button"
                  disabled={disabled || !avatarMedia.uploads[emotion]}
                  onClick={() => void avatarMedia.changeMedia(emotion, null)}
                >
                  クリア
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="settings-clear-button settings-inline-button"
          disabled={disabled || Object.keys(avatarMedia.uploads).length === 0}
          onClick={() => void avatarMedia.changeMedia(null, null)}
        >
          すべてデフォルトに戻す
        </button>
      </section>
    </div>
  );
}

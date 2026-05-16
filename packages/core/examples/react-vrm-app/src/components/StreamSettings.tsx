import type {
  StreamSettings,
  StreamingPlatformOption,
} from '../types/settings';

const STREAM_INTERVAL_OPTIONS = [5000, 10000, 20000, 30000, 60000] as const;

interface StreamSettingsProps {
  stream: StreamSettings;
  disabled: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  streamErrorMessage?: string;
  updateStreamPlatform: (platform: StreamingPlatformOption) => void;
  updateYoutubeApiKey: (value: string) => void;
  updateYoutubeLiveId: (value: string) => void;
  updateYoutubeEnabled: (value: boolean) => void;
  updateYoutubeCommentIntervalMs: (value: number) => void;
  updateTwitchClientId: (value: string) => void;
  updateTwitchAccessToken: (value: string) => void;
  updateTwitchChannel: (value: string) => void;
  updateTwitchEnabled: (value: boolean) => void;
  updateTwitchCommentIntervalMs: (value: number) => void;
}

function getTwitchRedirectUri(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URL(window.location.pathname, window.location.origin).toString();
}

export function StreamSettings({
  stream,
  disabled,
  isExpanded,
  onToggleExpand,
  streamErrorMessage,
  updateStreamPlatform,
  updateYoutubeApiKey,
  updateYoutubeLiveId,
  updateYoutubeEnabled,
  updateYoutubeCommentIntervalMs,
  updateTwitchClientId,
  updateTwitchAccessToken,
  updateTwitchChannel,
  updateTwitchEnabled,
  updateTwitchCommentIntervalMs,
}: StreamSettingsProps) {
  const twitchRedirectUri = getTwitchRedirectUri();
  const isYoutubeSelected = stream.platform === 'youtube';
  const isTwitchSelected = stream.platform === 'twitch';
  const isTwitchReady =
    !!stream.twitchAccessToken &&
    !!stream.twitchChannel.trim() &&
    !!stream.twitchClientId.trim();

  const handleConnectTwitch = () => {
    try {
      const state = window.crypto.randomUUID();
      sessionStorage.setItem('twitchOauthState', state);

      const params = new URLSearchParams({
        client_id: stream.twitchClientId,
        redirect_uri: twitchRedirectUri,
        response_type: 'token',
        scope: 'user:read:chat',
        state,
      });

      window.location.assign(
        `https://id.twitch.tv/oauth2/authorize?${params.toString()}`,
      );
    } catch (error) {
      console.error('Failed to start Twitch OAuth:', error);
    }
  };

  return (
    <div className="settings-section">
      <button
        type="button"
        className="settings-section-toggle"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
      >
        <h3>Stream</h3>
        <span
          className={`settings-section-chevron${isExpanded ? ' is-open' : ''}`}
        >
          ⌄
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="settings-field">
            <label htmlFor="stream-platform">Platform</label>
            <select
              id="stream-platform"
              value={stream.platform}
              onChange={(event) =>
                updateStreamPlatform(
                  event.target.value as StreamingPlatformOption,
                )
              }
              disabled={disabled}
            >
              <option value="none">None</option>
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
            </select>
          </div>

          {isYoutubeSelected && (
            <>
              <div className="settings-field">
                <label htmlFor="stream-youtube-apikey">YouTube API Key</label>
                <input
                  id="stream-youtube-apikey"
                  type="password"
                  value={stream.youtubeApiKey}
                  onChange={(event) => updateYoutubeApiKey(event.target.value)}
                  placeholder="YouTube Data API v3 key"
                  disabled={disabled}
                />
              </div>

              <div className="settings-field">
                <label htmlFor="stream-youtube-liveid">
                  YouTube Live Video ID
                </label>
                <input
                  id="stream-youtube-liveid"
                  type="text"
                  value={stream.youtubeLiveId}
                  onChange={(event) => updateYoutubeLiveId(event.target.value)}
                  placeholder="YouTube live video ID"
                  disabled={disabled}
                />
                <p className="settings-field-hint">
                  Use the <code>v=</code> value from the YouTube Live URL.
                </p>
              </div>

              <div className="settings-field">
                <label htmlFor="stream-youtube-interval">
                  Polling Interval
                </label>
                <select
                  id="stream-youtube-interval"
                  value={stream.youtubeCommentIntervalMs}
                  onChange={(event) =>
                    updateYoutubeCommentIntervalMs(Number(event.target.value))
                  }
                  disabled={disabled}
                >
                  {STREAM_INTERVAL_OPTIONS.map((intervalMs) => (
                    <option key={intervalMs} value={intervalMs}>
                      {intervalMs.toLocaleString()} ms
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label htmlFor="stream-youtube-enabled">
                  <input
                    id="stream-youtube-enabled"
                    type="checkbox"
                    checked={stream.youtubeEnabled}
                    onChange={(event) =>
                      updateYoutubeEnabled(event.target.checked)
                    }
                    disabled={disabled}
                    style={{ marginRight: 8 }}
                  />
                  Enable
                </label>
              </div>
            </>
          )}

          {isTwitchSelected && (
            <>
              <div className="settings-field">
                <label htmlFor="stream-twitch-clientid">Twitch Client ID</label>
                <input
                  id="stream-twitch-clientid"
                  type="password"
                  value={stream.twitchClientId}
                  onChange={(event) => updateTwitchClientId(event.target.value)}
                  placeholder="Twitch Client ID"
                  disabled={disabled}
                />
              </div>

              <div className="settings-field">
                <label>Twitch Connection</label>
                {stream.twitchAccessToken ? (
                  <div className="settings-file-actions">
                    <span className="settings-file-status">Connected</span>
                    <button
                      type="button"
                      className="settings-clear-button"
                      onClick={() => {
                        updateTwitchAccessToken('');
                        updateTwitchEnabled(false);
                      }}
                      disabled={disabled}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="settings-file-trigger"
                    onClick={handleConnectTwitch}
                    disabled={disabled || !stream.twitchClientId.trim()}
                  >
                    Connect to Twitch
                  </button>
                )}
                <p className="settings-field-hint">
                  Register this URL in Twitch Developer Console as an OAuth
                  Redirect URL.
                </p>
                <p className="settings-field-hint">{twitchRedirectUri}</p>
              </div>

              <div className="settings-field">
                <label htmlFor="stream-twitch-channel">
                  Twitch Channel (login name)
                </label>
                <input
                  id="stream-twitch-channel"
                  type="text"
                  value={stream.twitchChannel}
                  onChange={(event) => updateTwitchChannel(event.target.value)}
                  placeholder="example_channel"
                  disabled={disabled}
                />
              </div>

              <div className="settings-field">
                <label htmlFor="stream-twitch-interval">Dequeue Interval</label>
                <select
                  id="stream-twitch-interval"
                  value={stream.twitchCommentIntervalMs}
                  onChange={(event) =>
                    updateTwitchCommentIntervalMs(Number(event.target.value))
                  }
                  disabled={disabled}
                >
                  {STREAM_INTERVAL_OPTIONS.map((intervalMs) => (
                    <option key={intervalMs} value={intervalMs}>
                      {intervalMs.toLocaleString()} ms
                    </option>
                  ))}
                </select>
                <p className="settings-field-hint">
                  One queued Twitch message is forwarded per interval.
                </p>
              </div>

              <div className="settings-field">
                <label htmlFor="stream-twitch-enabled">
                  <input
                    id="stream-twitch-enabled"
                    type="checkbox"
                    checked={stream.twitchEnabled}
                    onChange={(event) =>
                      updateTwitchEnabled(event.target.checked)
                    }
                    disabled={disabled || !isTwitchReady}
                    style={{ marginRight: 8 }}
                  />
                  Enable
                </label>
              </div>
            </>
          )}

          {streamErrorMessage ? (
            <p className="settings-field-error">{streamErrorMessage}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

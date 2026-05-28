import type {
  CommentIntelligenceSettings,
  StreamSettings,
  StreamingPlatformOption,
} from '../types/settings';

const STREAM_INTERVAL_OPTIONS = [5000, 10000, 20000, 30000, 60000] as const;
const COMMENT_ANALYSIS_INTERVAL_OPTIONS = [1000, 2000, 5000, 10000] as const;
const COMMENT_BATCH_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;
const COMMENT_LLM_MIN_COMMENTS_OPTIONS = [4, 8, 12, 20] as const;
const VIEWER_BLOCK_DURATION_OPTIONS = [
  { label: '1 min', value: 60 * 1000 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '10 min', value: 10 * 60 * 1000 },
  { label: '30 min', value: 30 * 60 * 1000 },
] as const;

interface StreamSettingsProps {
  stream: StreamSettings;
  commentIntelligence: CommentIntelligenceSettings;
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
  updateCommentIntelligenceEnabled: (value: boolean) => void;
  updateCommentIntelligenceMode: (
    value: CommentIntelligenceSettings['mode'],
  ) => void;
  updateCommentIntelligenceAnalysisIntervalMs: (value: number) => void;
  updateCommentIntelligenceMaxCommentsPerBatch: (value: number) => void;
  updateCommentIntelligenceMinCommentsForLLMAnalysis: (value: number) => void;
  updateCommentIntelligenceBlockHighRiskViewers: (value: boolean) => void;
  updateCommentIntelligenceViewerBlockDurationMs: (value: number) => void;
}

function getTwitchRedirectUri(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URL(window.location.pathname, window.location.origin).toString();
}

export function StreamSettings({
  stream,
  commentIntelligence,
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
  updateCommentIntelligenceEnabled,
  updateCommentIntelligenceMode,
  updateCommentIntelligenceAnalysisIntervalMs,
  updateCommentIntelligenceMaxCommentsPerBatch,
  updateCommentIntelligenceMinCommentsForLLMAnalysis,
  updateCommentIntelligenceBlockHighRiskViewers,
  updateCommentIntelligenceViewerBlockDurationMs,
}: StreamSettingsProps) {
  const twitchRedirectUri = getTwitchRedirectUri();
  const isYoutubeSelected = stream.platform === 'youtube';
  const isTwitchSelected = stream.platform === 'twitch';
  const isTwitchReady =
    !!stream.twitchAccessToken &&
    !!stream.twitchChannel.trim() &&
    !!stream.twitchClientId.trim();
  const commentControlsDisabled = disabled || !commentIntelligence.enabled;

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
                  Queued Twitch messages are forwarded as a batch per interval.
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

          <div className="settings-field">
            <label htmlFor="comment-intelligence-enabled">
              <input
                id="comment-intelligence-enabled"
                type="checkbox"
                checked={commentIntelligence.enabled}
                onChange={(event) =>
                  updateCommentIntelligenceEnabled(event.target.checked)
                }
                disabled={disabled}
                style={{ marginRight: 8 }}
              />
              Comment Intelligence
            </label>
            <p className="settings-field-hint">
              Live comments are queued while the AI is processing or speaking,
              then ranked and filtered before one selected comment is sent.
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-mode">Analysis Mode</label>
            <select
              id="comment-intelligence-mode"
              value={commentIntelligence.mode}
              onChange={(event) =>
                updateCommentIntelligenceMode(
                  event.target.value as CommentIntelligenceSettings['mode'],
                )
              }
              disabled={commentControlsDisabled}
            >
              <option value="rules">Rules (no API key)</option>
              <option value="hybrid">Hybrid</option>
              <option value="llm-assisted">LLM Assisted</option>
            </select>
            <p className="settings-field-hint">
              Rules mode is the default. Hybrid and LLM-assisted modes reuse
              the LLM provider and model from the LLM tab, then fall back to
              rules when that provider is unavailable.
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-interval">
              Analysis Interval
            </label>
            <select
              id="comment-intelligence-interval"
              value={commentIntelligence.analysisIntervalMs}
              onChange={(event) =>
                updateCommentIntelligenceAnalysisIntervalMs(
                  Number(event.target.value),
                )
              }
              disabled={commentControlsDisabled}
            >
              {COMMENT_ANALYSIS_INTERVAL_OPTIONS.map((intervalMs) => (
                <option key={intervalMs} value={intervalMs}>
                  {intervalMs.toLocaleString()} ms
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-batch-size">
              Max Comments per Analysis
            </label>
            <select
              id="comment-intelligence-batch-size"
              value={commentIntelligence.maxCommentsPerBatch}
              onChange={(event) =>
                updateCommentIntelligenceMaxCommentsPerBatch(
                  Number(event.target.value),
                )
              }
              disabled={commentControlsDisabled}
            >
              {COMMENT_BATCH_SIZE_OPTIONS.map((batchSize) => (
                <option key={batchSize} value={batchSize}>
                  {batchSize}
                </option>
              ))}
            </select>
          </div>

          {commentIntelligence.mode !== 'rules' && (
            <div className="settings-field">
              <label htmlFor="comment-intelligence-llm-min-comments">
                Min Comments for LLM Analysis
              </label>
              <select
                id="comment-intelligence-llm-min-comments"
                value={commentIntelligence.minCommentsForLLMAnalysis}
                onChange={(event) =>
                  updateCommentIntelligenceMinCommentsForLLMAnalysis(
                    Number(event.target.value),
                  )
                }
                disabled={commentControlsDisabled}
              >
                {COMMENT_LLM_MIN_COMMENTS_OPTIONS.map((minComments) => (
                  <option key={minComments} value={minComments}>
                    {minComments}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="settings-field">
            <label htmlFor="comment-intelligence-block-viewers">
              <input
                id="comment-intelligence-block-viewers"
                type="checkbox"
                checked={commentIntelligence.blockHighRiskViewers}
                onChange={(event) =>
                  updateCommentIntelligenceBlockHighRiskViewers(
                    event.target.checked,
                  )
                }
                disabled={commentControlsDisabled}
                style={{ marginRight: 8 }}
              />
              Temporarily skip unsafe viewers
            </label>
            <p className="settings-field-hint">
              Viewers who send high-risk comments are skipped for later analyses
              during the block window, so unsafe comments are not sent directly
              to core.
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-block-duration">
              Unsafe Viewer Skip Duration
            </label>
            <select
              id="comment-intelligence-block-duration"
              value={commentIntelligence.viewerBlockDurationMs}
              onChange={(event) =>
                updateCommentIntelligenceViewerBlockDurationMs(
                  Number(event.target.value),
                )
              }
              disabled={
                commentControlsDisabled ||
                !commentIntelligence.blockHighRiskViewers
              }
            >
              {VIEWER_BLOCK_DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

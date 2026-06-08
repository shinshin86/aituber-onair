import type {
  CommentIntelligenceSettings,
  ManneriSettings,
  StreamSettings,
  StreamingPlatformOption,
} from '../types/settings';

const STREAM_INTERVAL_OPTIONS = [5000, 10000, 20000, 30000, 60000] as const;
const COMMENT_ANALYSIS_INTERVAL_OPTIONS = [1000, 2000, 5000, 10000] as const;
const COMMENT_BATCH_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;
const COMMENT_LLM_MIN_COMMENTS_OPTIONS = [4, 8, 12, 20] as const;
const MANNERI_SIMILARITY_THRESHOLD_OPTIONS = [
  0.6,
  0.7,
  0.75,
  0.8,
  0.9,
] as const;
const MANNERI_LOOKBACK_WINDOW_OPTIONS = [4, 6, 8, 10, 15, 20] as const;
const MANNERI_MIN_MESSAGE_LENGTH_OPTIONS = [4, 8, 10, 16, 24] as const;
const VIEWER_BLOCK_DURATION_OPTIONS = [
  { label: '1分', value: 60 * 1000 },
  { label: '5分', value: 5 * 60 * 1000 },
  { label: '10分', value: 10 * 60 * 1000 },
  { label: '30分', value: 30 * 60 * 1000 },
] as const;
const MANNERI_COOLDOWN_OPTIONS = [
  { label: '1分', value: 60 * 1000 },
  { label: '3分', value: 3 * 60 * 1000 },
  { label: '5分', value: 5 * 60 * 1000 },
  { label: '10分', value: 10 * 60 * 1000 },
] as const;

interface StreamSettingsProps {
  stream: StreamSettings;
  commentIntelligence: CommentIntelligenceSettings;
  manneri: ManneriSettings;
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
  updateManneriEnabled: (value: boolean) => void;
  updateManneriSimilarityThreshold: (value: number) => void;
  updateManneriLookbackWindow: (value: number) => void;
  updateManneriInterventionCooldownMs: (value: number) => void;
  updateManneriMinMessageLength: (value: number) => void;
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
  manneri,
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
  updateManneriEnabled,
  updateManneriSimilarityThreshold,
  updateManneriLookbackWindow,
  updateManneriInterventionCooldownMs,
  updateManneriMinMessageLength,
}: StreamSettingsProps) {
  const twitchRedirectUri = getTwitchRedirectUri();
  const isYoutubeSelected = stream.platform === 'youtube';
  const isTwitchSelected = stream.platform === 'twitch';
  const isTwitchReady =
    !!stream.twitchAccessToken &&
    !!stream.twitchChannel.trim() &&
    !!stream.twitchClientId.trim();
  const commentControlsDisabled = disabled || !commentIntelligence.enabled;
  const manneriControlsDisabled = disabled || !manneri.enabled;

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
              コメントインテリジェンス
            </label>
            <p className="settings-field-hint">
              AIが処理中または発話中のライブコメントを一時的にためて、優先度付けと安全判定を行い、選ばれた1件だけを送信します。
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-mode">解析モード</label>
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
              <option value="rules">ルール（APIキー不要）</option>
              <option value="hybrid">ハイブリッド</option>
              <option value="llm-assisted">LLMアシスト</option>
            </select>
            <p className="settings-field-hint">
              ルールは追加のLLM呼び出しなしで動作します。ハイブリッドとLLMアシストはLLMタブのプロバイダーとモデルを使い、利用できない場合はルールに戻ります。
            </p>
            <div className="settings-mode-help">
              <p>
                <strong>ルール:</strong>
                追加コストなしで固定ルールにより、安全判定、優先度付け、要約を行います。
              </p>
              <p>
                <strong>ハイブリッド:</strong>
                通常はルールで処理し、コメント数が設定値以上のときだけLLM解析を使います。
              </p>
              <p>
                <strong>LLMアシスト:</strong>
                毎回LLMでコメント群を分析します。文脈理解は強くなりますが、APIコストと遅延が増えます。
              </p>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-interval">
              解析間隔
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
              1回の解析で扱う最大コメント数
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
                LLM解析を使う最小コメント数
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
              危険な視聴者を一時的にスキップ
            </label>
            <p className="settings-field-hint">
              高リスクコメントを送った視聴者は、指定期間中の解析対象から外します。危険なコメントがそのままcoreへ渡らないようにします。
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-intelligence-block-duration">
              スキップ期間
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

          <div className="settings-field">
            <label htmlFor="manneri-enabled">
              <input
                id="manneri-enabled"
                type="checkbox"
                checked={manneri.enabled}
                onChange={(event) =>
                  updateManneriEnabled(event.target.checked)
                }
                disabled={disabled}
                style={{ marginRight: 8 }}
              />
              Manneri
            </label>
            <p className="settings-field-hint">
              会話が似た流れに偏ったとき、応答前に話題転換の指示を内部的に追加します。
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="manneri-similarity-threshold">
              類似度しきい値
            </label>
            <select
              id="manneri-similarity-threshold"
              value={manneri.similarityThreshold}
              onChange={(event) =>
                updateManneriSimilarityThreshold(Number(event.target.value))
              }
              disabled={manneriControlsDisabled}
            >
              {MANNERI_SIMILARITY_THRESHOLD_OPTIONS.map((threshold) => (
                <option key={threshold} value={threshold}>
                  {Math.round(threshold * 100)}%
                </option>
              ))}
            </select>
            <p className="settings-field-hint">
              低いほど介入しやすく、高いほど強い重複だけを検出します。
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="manneri-lookback-window">直近メッセージ数</label>
            <select
              id="manneri-lookback-window"
              value={manneri.lookbackWindow}
              onChange={(event) =>
                updateManneriLookbackWindow(Number(event.target.value))
              }
              disabled={manneriControlsDisabled}
            >
              {MANNERI_LOOKBACK_WINDOW_OPTIONS.map((lookbackWindow) => (
                <option key={lookbackWindow} value={lookbackWindow}>
                  {lookbackWindow}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="manneri-cooldown">介入間隔</label>
            <select
              id="manneri-cooldown"
              value={manneri.interventionCooldownMs}
              onChange={(event) =>
                updateManneriInterventionCooldownMs(Number(event.target.value))
              }
              disabled={manneriControlsDisabled}
            >
              {MANNERI_COOLDOWN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="manneri-min-message-length">
              最小メッセージ長
            </label>
            <select
              id="manneri-min-message-length"
              value={manneri.minMessageLength}
              onChange={(event) =>
                updateManneriMinMessageLength(Number(event.target.value))
              }
              disabled={manneriControlsDisabled}
            >
              {MANNERI_MIN_MESSAGE_LENGTH_OPTIONS.map((minMessageLength) => (
                <option key={minMessageLength} value={minMessageLength}>
                  {minMessageLength}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useAudioLipsync } from './hooks/useAudioLipsync';
import { useAituberCore } from './hooks/useAituberCore';
import { useLiveCommentIntelligence } from './hooks/useLiveCommentIntelligence';
import { useScreenVisionController } from './hooks/useScreenVisionController';
import { useSettings } from './hooks/useSettings';
import { useTwitchComments } from './hooks/useTwitchComments';
import { useYoutubeComments } from './hooks/useYoutubeComments';
import { clampDialogDragDelta, type DialogDragPoint } from './lib/dialogDrag';
import { getEmotionEffectAnchor } from './lib/emotionEffectAnchor';
import {
  createBundledLive2DModelSource,
  getBundledLive2DModels,
  type BundledLive2DModelEntry,
  type Live2DModelSource,
} from './lib/live2dModel';
import {
  createLinkedLive2DReaction,
  withLive2DReactionId,
  type Live2DReaction,
  type Live2DReactionDraft,
} from './lib/live2dReactions';
import type { TwitchChatMessage } from './services/twitch/twitchService';
import type { YouTubeChatMessage } from './services/youtube/youtubeService';
import './styles/base.css';
import './styles/app.css';

const DEFAULT_SETTINGS_DIALOG_OFFSET: DialogDragPoint = { x: 0, y: 0 };

interface SettingsDialogDragState {
  pointerId: number;
  pointerStart: DialogDragPoint;
  offsetStart: DialogDragPoint;
  rect: DOMRect;
}

export default function App() {
  const { play, stop, audioBinding, isSpeaking } = useAudioLipsync();
  const settingsHook = useSettings();
  const updateTwitchAccessToken = settingsHook.updateTwitchAccessToken;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDialogOffset, setSettingsDialogOffset] =
    useState<DialogDragPoint>(DEFAULT_SETTINGS_DIALOG_OFFSET);
  const [settingsDialogDragging, setSettingsDialogDragging] = useState(false);
  const [streamErrorMessage, setStreamErrorMessage] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    null,
  );
  const [modelSource, setModelSource] = useState<Live2DModelSource | null>(
    null,
  );
  const [bundledModels] = useState<BundledLive2DModelEntry[]>(() =>
    getBundledLive2DModels(),
  );
  const [selectedBundledModelId, setSelectedBundledModelId] = useState(
    () => getBundledLive2DModels()[0]?.id || '',
  );
  const [modelPickerError, setModelPickerError] = useState('');
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const modelSourceRef = useRef<Live2DModelSource | null>(null);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsDialogDragRef = useRef<SettingsDialogDragState | null>(null);
  const reactionIdRef = useRef(0);
  const [avatarReaction, setAvatarReaction] = useState<Live2DReaction | null>(
    null,
  );

  const emitAvatarReaction = useCallback((draft: Live2DReactionDraft) => {
    reactionIdRef.current += 1;
    setAvatarReaction(withLive2DReactionId(draft, reactionIdRef.current));
  }, []);

  const handleSettingsDialogPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if ((event.target as Element).closest('button')) return;
      const dialog = settingsDialogRef.current;
      if (!dialog) return;

      settingsDialogDragRef.current = {
        pointerId: event.pointerId,
        pointerStart: { x: event.clientX, y: event.clientY },
        offsetStart: settingsDialogOffset,
        rect: dialog.getBoundingClientRect(),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setSettingsDialogDragging(true);
      event.preventDefault();
    },
    [settingsDialogOffset],
  );

  const handleSettingsDialogPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = settingsDialogDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const delta = clampDialogDragDelta(
        {
          x: event.clientX - drag.pointerStart.x,
          y: event.clientY - drag.pointerStart.y,
        },
        drag.rect,
        { width: window.innerWidth, height: window.innerHeight },
      );
      setSettingsDialogOffset({
        x: drag.offsetStart.x + delta.x,
        y: drag.offsetStart.y + delta.y,
      });
    },
    [],
  );

  const finishSettingsDialogDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = settingsDialogDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      settingsDialogDragRef.current = null;
      setSettingsDialogDragging(false);
    },
    [],
  );

  const resetSettingsDialogPosition = useCallback(() => {
    settingsDialogDragRef.current = null;
    setSettingsDialogDragging(false);
    setSettingsDialogOffset(DEFAULT_SETTINGS_DIALOG_OFFSET);
  }, []);

  const closeSettingsDialog = useCallback(() => {
    resetSettingsDialogPosition();
    setSettingsOpen(false);
  }, [resetSettingsDialogPosition]);

  const toggleSettingsDialog = useCallback(() => {
    resetSettingsDialogPosition();
    setSettingsOpen((open) => !open);
  }, [resetSettingsDialogPosition]);

  const replaceModelSource = useCallback(
    (nextSource: Live2DModelSource | null) => {
      setModelSource((previousSource) => {
        previousSource?.revoke();
        return nextSource;
      });
    },
    [],
  );

  const handleAudioPlay = useCallback(
    async (arrayBuffer: ArrayBuffer) => {
      await play(arrayBuffer);
    },
    [play],
  );

  const handleSpeechStart = useCallback(
    (screenplay: { emotion?: string; text?: string }) => {
      const reaction = createLinkedLive2DReaction(
        settingsHook.settings.visual.live2dReactionControlMode,
        screenplay,
        settingsHook.settings.visual.live2dEmotionEffectMap,
      );
      if (reaction) {
        emitAvatarReaction(reaction);
      } else {
        setAvatarReaction(null);
      }
    },
    [
      emitAvatarReaction,
      settingsHook.settings.visual.live2dEmotionEffectMap,
      settingsHook.settings.visual.live2dReactionControlMode,
    ],
  );

  const handleSpeechEnd = useCallback(() => {
    setAvatarReaction(null);
  }, []);

  const {
    messages,
    isProcessing,
    partialResponse,
    processChat,
    processVisionChat,
  } = useAituberCore({
    onAudioPlay: handleAudioPlay,
    onSpeechStart: handleSpeechStart,
    onSpeechEnd: handleSpeechEnd,
    settings: settingsHook.settings,
    getApiKeyForProvider: settingsHook.getApiKeyForProvider,
  });
  const screenVisionController = useScreenVisionController({
    settings: settingsHook.settings.screenVision,
    onCapture: processVisionChat,
    onEnabledChange: settingsHook.updateScreenVisionEnabled,
    onDeviceIdChange: settingsHook.updateScreenVisionDeviceId,
  });

  const handleSend = useCallback(
    (text: string) => {
      stop();
      setAvatarReaction(null);
      processChat(text);
    },
    [processChat, stop],
  );

  const { enqueueYouTubeComments, enqueueTwitchComments } =
    useLiveCommentIntelligence({
      messages,
      isProcessing,
      isSpeaking,
      processChat,
      streamPlatform: settingsHook.settings.stream.platform,
      llmSettings: settingsHook.settings.llm,
      getApiKeyForProvider: settingsHook.getApiKeyForProvider,
      enabled: settingsHook.settings.commentIntelligence.enabled,
      mode: settingsHook.settings.commentIntelligence.mode,
      analysisIntervalMs:
        settingsHook.settings.commentIntelligence.analysisIntervalMs,
      maxCommentsPerBatch:
        settingsHook.settings.commentIntelligence.maxCommentsPerBatch,
      minCommentsForLLMAnalysis:
        settingsHook.settings.commentIntelligence.minCommentsForLLMAnalysis,
      blockHighRiskViewers:
        settingsHook.settings.commentIntelligence.blockHighRiskViewers,
      viewerBlockDurationMs:
        settingsHook.settings.commentIntelligence.viewerBlockDurationMs,
      streamTopic: settingsHook.settings.commentIntelligence.streamTopic,
      streamTitle: settingsHook.settings.commentIntelligence.streamTitle,
      topicFilter: settingsHook.settings.commentIntelligence.topicFilter,
    });

  const handleYoutubeComment = useCallback(
    (comment: YouTubeChatMessage) => {
      enqueueYouTubeComments([comment]);
    },
    [enqueueYouTubeComments],
  );

  const handleTwitchComment = useCallback(
    (comment: TwitchChatMessage) => {
      enqueueTwitchComments([comment]);
    },
    [enqueueTwitchComments],
  );

  const handleBackgroundImageChange = useCallback((file: File | null) => {
    if (backgroundObjectUrlRef.current) {
      URL.revokeObjectURL(backgroundObjectUrlRef.current);
      backgroundObjectUrlRef.current = null;
    }

    if (!file) {
      setBackgroundImageUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    backgroundObjectUrlRef.current = nextUrl;
    setBackgroundImageUrl(nextUrl);
  }, []);

  const handleClearModel = useCallback(() => {
    replaceModelSource(null);
    setModelPickerError('');
  }, [replaceModelSource]);

  const handleBundledModelLoad = useCallback(async () => {
    if (!selectedBundledModelId) {
      return;
    }

    try {
      setModelPickerError('');
      const nextSource = await createBundledLive2DModelSource(
        selectedBundledModelId,
      );
      replaceModelSource(nextSource);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '`models/` フォルダ内の Live2D モデルを読み込めませんでした。';
      replaceModelSource(null);
      setModelPickerError(message);
    }
  }, [replaceModelSource, selectedBundledModelId]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('twitchOauthState');

    if (token && state && state === savedState) {
      updateTwitchAccessToken(token);
      queueMicrotask(() => setStreamErrorMessage(''));
      sessionStorage.removeItem('twitchOauthState');
    }

    history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
  }, [updateTwitchAccessToken]);

  useYoutubeComments({
    youtubeLiveId: settingsHook.settings.stream.youtubeLiveId,
    youtubeApiKey: settingsHook.settings.stream.youtubeApiKey,
    isEnabled:
      settingsHook.settings.stream.platform === 'youtube' &&
      settingsHook.settings.stream.youtubeEnabled,
    intervalMs: settingsHook.settings.stream.youtubeCommentIntervalMs,
    onComment: handleYoutubeComment,
  });

  useTwitchComments({
    twitchChannel: settingsHook.settings.stream.twitchChannel,
    twitchClientId: settingsHook.settings.stream.twitchClientId,
    twitchAccessToken: settingsHook.settings.stream.twitchAccessToken,
    isEnabled:
      settingsHook.settings.stream.platform === 'twitch' &&
      settingsHook.settings.stream.twitchEnabled,
    intervalMs: settingsHook.settings.stream.twitchCommentIntervalMs,
    onComment: handleTwitchComment,
    onTokenExpired: () => {
      settingsHook.updateTwitchAccessToken('');
      settingsHook.updateTwitchEnabled(false);
      setStreamErrorMessage('Twitch access token expired. Please reconnect.');
    },
    onError: (message) => {
      setStreamErrorMessage(message);
      if (message) {
        console.warn(message);
      }
    },
  });

  useEffect(() => {
    modelSourceRef.current = modelSource;
  }, [modelSource]);

  // Close the dialog with the Escape key
  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSettingsDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSettingsDialog, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;

    const handleResize = () => resetSettingsDialogPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resetSettingsDialogPosition, settingsOpen]);

  useEffect(() => {
    return () => {
      if (backgroundObjectUrlRef.current) {
        URL.revokeObjectURL(backgroundObjectUrlRef.current);
      }
      modelSourceRef.current?.revoke();
    };
  }, []);

  return (
    <div className="app">
      <ChatPanel
        messages={messages}
        partialResponse={partialResponse}
        isProcessing={isProcessing}
        onSend={handleSend}
        onToggleSettings={toggleSettingsDialog}
        backgroundImageUrl={backgroundImageUrl}
        modelSource={modelSource}
        modelPickerError={modelPickerError}
        avatarReaction={avatarReaction}
        audioBinding={audioBinding}
        visual={settingsHook.settings.visual}
        effectAnchor={getEmotionEffectAnchor(
          settingsHook.settings.visual.live2dEmotionEffectAnchors,
          modelSource?.modelFilePath,
        )}
        onEffectAnchorChange={(anchor) => {
          if (modelSource?.modelFilePath) {
            settingsHook.updateVisualLive2DEmotionEffectAnchor(
              modelSource.modelFilePath,
              anchor,
            );
          }
        }}
        onEffectAnchorReset={() => {
          if (modelSource?.modelFilePath) {
            settingsHook.resetVisualLive2DEmotionEffectAnchor(
              modelSource.modelFilePath,
            );
          }
        }}
      />

      {settingsOpen && (
        <div className="settings-dialog-overlay" onClick={closeSettingsDialog}>
          <div
            ref={settingsDialogRef}
            className="settings-dialog"
            style={{
              transform: `translate3d(${settingsDialogOffset.x}px, ${settingsDialogOffset.y}px, 0)`,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`settings-dialog-header${settingsDialogDragging ? ' is-dragging' : ''}`}
              onPointerDown={handleSettingsDialogPointerDown}
              onPointerMove={handleSettingsDialogPointerMove}
              onPointerUp={finishSettingsDialogDrag}
              onPointerCancel={finishSettingsDialogDrag}
              onLostPointerCapture={finishSettingsDialogDrag}
            >
              <h2>設定</h2>
              <button
                className="settings-dialog-close"
                onClick={closeSettingsDialog}
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="settings-dialog-body">
              <section className="live2d-model-panel">
                <h3>Live2D</h3>
                <div className="settings-field">
                  <label>`models/` フォルダ内のモデル</label>
                  <div className="settings-file-picker-row">
                    <select
                      value={selectedBundledModelId}
                      onChange={(event) =>
                        setSelectedBundledModelId(event.target.value)
                      }
                      disabled={bundledModels.length === 0}
                    >
                      {bundledModels.length === 0 ? (
                        <option value="">
                          `models/` にモデルが見つかりません
                        </option>
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
                      onClick={() => void handleBundledModelLoad()}
                      disabled={
                        bundledModels.length === 0 || !selectedBundledModelId
                      }
                    >
                      読み込む
                    </button>
                  </div>
                  <p className="settings-field-hint">
                    `packages/core/examples/react-live2d-app/models/`
                    配下にあるモデルを表示します。新しいファイルを追加した場合は
                    dev サーバーを再起動してください。
                  </p>
                  <div className="settings-file-actions">
                    <span className="settings-file-status">
                      {modelSource?.modelFilePath || '未読み込み'}
                    </span>
                    <button
                      className="settings-clear-button"
                      type="button"
                      onClick={handleClearModel}
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

              <SettingsPanel
                {...settingsHook}
                isProcessing={isProcessing}
                backgroundImageUrl={backgroundImageUrl}
                streamErrorMessage={streamErrorMessage}
                screenVisionController={screenVisionController}
                onBackgroundImageChange={handleBackgroundImageChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

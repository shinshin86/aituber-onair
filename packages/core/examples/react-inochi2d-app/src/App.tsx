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
  INOCHI2D_CUSTOM_MODEL_ID,
  buildCustomInochiModel,
  loadInochiManifest,
} from './lib/inochi2dManifest';
import {
  createLinkedInochi2DReaction,
  withInochi2DReactionId,
  type Inochi2DReaction,
  type Inochi2DReactionDraft,
} from './lib/inochi2dReactions';
import type { TwitchChatMessage } from './services/twitch/twitchService';
import type { YouTubeChatMessage } from './services/youtube/youtubeService';
import type { ResolvedInochiModelDefinition } from './types/inochi2d';
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
  const settingsHook = useSettings();
  const { play, stop, isSpeaking } = useAudioLipsync();
  const updateTwitchAccessToken = settingsHook.updateTwitchAccessToken;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDialogOffset, setSettingsDialogOffset] =
    useState<DialogDragPoint>(DEFAULT_SETTINGS_DIALOG_OFFSET);
  const [settingsDialogDragging, setSettingsDialogDragging] = useState(false);
  const [streamErrorMessage, setStreamErrorMessage] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    null,
  );
  const [manifestModels, setManifestModels] = useState<
    ResolvedInochiModelDefinition[]
  >([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [customModel, setCustomModel] =
    useState<ResolvedInochiModelDefinition | null>(null);
  const [manifestLoading, setManifestLoading] = useState(true);
  const [modelPickerError, setModelPickerError] = useState('');
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const customModelObjectUrlRef = useRef<string | null>(null);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsDialogDragRef = useRef<SettingsDialogDragState | null>(null);
  const reactionIdRef = useRef(0);
  const [avatarReaction, setAvatarReaction] = useState<Inochi2DReaction | null>(
    null,
  );

  const emitAvatarReaction = useCallback((draft: Inochi2DReactionDraft) => {
    reactionIdRef.current += 1;
    setAvatarReaction(withInochi2DReactionId(draft, reactionIdRef.current));
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

  const handleAudioPlay = useCallback(
    async (arrayBuffer: ArrayBuffer) => {
      await play(arrayBuffer);
    },
    [play],
  );

  const handleSpeechStart = useCallback(
    (screenplay: { emotion?: string; text?: string }) => {
      const reaction = createLinkedInochi2DReaction(
        settingsHook.settings.visual.inochi2dReactionControlMode,
        screenplay,
        settingsHook.settings.visual.inochi2dEmotionEffectMap,
      );
      if (reaction) {
        emitAvatarReaction(reaction);
      } else {
        setAvatarReaction(null);
      }
    },
    [
      emitAvatarReaction,
      settingsHook.settings.visual.inochi2dEmotionEffectMap,
      settingsHook.settings.visual.inochi2dReactionControlMode,
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

  const revokeCustomModelObjectUrl = useCallback(() => {
    if (customModelObjectUrlRef.current) {
      URL.revokeObjectURL(customModelObjectUrlRef.current);
      customModelObjectUrlRef.current = null;
    }
  }, []);

  const handleCustomModelFileChange = useCallback(
    (file: File | null) => {
      revokeCustomModelObjectUrl();
      setModelPickerError('');

      if (!file) {
        setCustomModel(null);
        return;
      }

      const nextUrl = URL.createObjectURL(file);
      customModelObjectUrlRef.current = nextUrl;
      const nextModel = buildCustomInochiModel({
        name: file.name.replace(/\.[^/.]+$/, ''),
        modelUrl: nextUrl,
      });

      if (!nextModel) {
        URL.revokeObjectURL(nextUrl);
        customModelObjectUrlRef.current = null;
        setModelPickerError('Inochi2D モデルファイルを読み込めませんでした。');
        return;
      }

      setCustomModel(nextModel);
      setSelectedModelId(INOCHI2D_CUSTOM_MODEL_ID);
    },
    [revokeCustomModelObjectUrl],
  );

  const handleClearCustomModel = useCallback(() => {
    revokeCustomModelObjectUrl();
    setCustomModel(null);
    setModelPickerError('');
    setSelectedModelId(manifestModels[0]?.id || '');
  }, [manifestModels, revokeCustomModelObjectUrl]);

  useEffect(() => {
    let active = true;

    loadInochiManifest()
      .then((manifest) => {
        if (!active) return;
        setManifestModels(manifest.models);
        setSelectedModelId((current) => {
          if (current) {
            return current;
          }
          return manifest.defaultModelId || manifest.models[0]?.id || '';
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setManifestModels([]);
        setModelPickerError(
          error instanceof Error
            ? error.message
            : 'Inochi2D manifest を読み込めませんでした。',
        );
      })
      .finally(() => {
        if (active) {
          setManifestLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
      revokeCustomModelObjectUrl();
    };
  }, [revokeCustomModelObjectUrl]);

  const activeModelLabel =
    selectedModelId === INOCHI2D_CUSTOM_MODEL_ID && customModel
      ? customModel.name
      : manifestModels.find((model) => model.id === selectedModelId)?.name ||
        '未読み込み';

  return (
    <div className="app">
      <ChatPanel
        messages={messages}
        partialResponse={partialResponse}
        isProcessing={isProcessing}
        onSend={handleSend}
        onToggleSettings={toggleSettingsDialog}
        backgroundImageUrl={backgroundImageUrl}
        selectedModelId={selectedModelId}
        customModel={customModel}
        modelPickerError={modelPickerError}
        onModelResolved={setSelectedModelId}
        avatarReaction={avatarReaction}
        visual={settingsHook.settings.visual}
        effectAnchor={getEmotionEffectAnchor(
          settingsHook.settings.visual.inochi2dEmotionEffectAnchors,
          selectedModelId || customModel?.id,
        )}
        onEffectAnchorChange={(anchor) => {
          const profileId = selectedModelId || customModel?.id;
          if (profileId) {
            settingsHook.updateVisualInochi2DEmotionEffectAnchor(
              profileId,
              anchor,
            );
          }
        }}
        onEffectAnchorReset={() => {
          const profileId = selectedModelId || customModel?.id;
          if (profileId) {
            settingsHook.resetVisualInochi2DEmotionEffectAnchor(profileId);
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
              <section className="inochi2d-model-panel">
                <h3>Inochi2D</h3>
                <div className="settings-field">
                  <label>`public/inochi2d/manifest.json` のモデル</label>
                  <select
                    value={
                      selectedModelId === INOCHI2D_CUSTOM_MODEL_ID
                        ? ''
                        : selectedModelId
                    }
                    onChange={(event) => {
                      setSelectedModelId(event.target.value);
                      setModelPickerError('');
                    }}
                    disabled={manifestLoading || manifestModels.length === 0}
                  >
                    {manifestLoading ? (
                      <option value="">manifest を読み込み中...</option>
                    ) : manifestModels.length === 0 ? (
                      <option value="">manifest にモデルがありません</option>
                    ) : (
                      manifestModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="settings-field-hint">
                    ランタイムと manifest は
                    `packages/core/examples/react-inochi2d-app/public/inochi2d/`
                    配下から読み込みます。manifest にモデルを追加した場合は dev
                    サーバーを再起動してください。
                  </p>
                </div>

                <div className="settings-field">
                  <label>ローカル Inochi2D モデル</label>
                  <input
                    type="file"
                    accept=".inx,.inp"
                    onChange={(event) => {
                      handleCustomModelFileChange(
                        event.currentTarget.files?.[0] ?? null,
                      );
                      event.currentTarget.value = '';
                    }}
                  />
                  <p className="settings-field-hint">
                    `.inx` または `.inp` ファイルを一時的に読み込みます。motion
                    JSON が必要なモデルは manifest に登録してください。
                  </p>
                  <div className="settings-file-actions">
                    <span className="settings-file-status">
                      {activeModelLabel}
                    </span>
                    <button
                      className="settings-clear-button"
                      type="button"
                      onClick={handleClearCustomModel}
                      disabled={!customModel}
                    >
                      カスタムをクリア
                    </button>
                  </div>
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

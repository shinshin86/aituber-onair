import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AvatarSettingsPanel,
  type MeshAvatarOptions,
} from './components/AvatarSettingsPanel';
import { BondToastStack } from './components/BondToastStack';
import type { ChatVoiceInputProps } from './components/ChatInput';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useAituberCore } from './hooks/useAituberCore';
import { useAudioMotion } from './hooks/useAudioMotion';
import { useLiveCommentIntelligence } from './hooks/useLiveCommentIntelligence';
import { useScreenVisionController } from './hooks/useScreenVisionController';
import { useSettings } from './hooks/useSettings';
import { useSpeechPreview } from './hooks/useSpeechPreview';
import { useTwitchComments } from './hooks/useTwitchComments';
import { useYoutubeComments } from './hooks/useYoutubeComments';
import { type DialogDragPoint, clampDialogDragDelta } from './lib/dialogDrag';
import { getEmotionEffectAnchor } from './lib/emotionEffectAnchor';
import { createBondIdentity } from './lib/kizunaBond';
import {
  type PngTuberEmotionReaction,
  type PngTuberEmotionReactionDraft,
  createLinkedPngTuberEmotionReaction,
  withPngTuberEmotionReactionId,
} from './lib/pngtuberEmotionEffects';
import type {
  MeshAvatar,
  MeshAvatarMotionInfo,
} from './meshAvatar/createMeshAvatar.js';
import { MOTION_LIST } from './meshAvatar/motionList';
import './styles/app.css';
import './styles/localLlmSetup.css';
import './styles/localTtsSetup.css';
import type { TwitchChatMessage } from './services/twitch/twitchService';
import type { YouTubeChatMessage } from './services/youtube/youtubeService';

const DEFAULT_SETTINGS_DIALOG_OFFSET: DialogDragPoint = { x: 0, y: 0 };
const AVATAR_EFFECT_ANCHOR_PROFILE_ID = 'mesh-avatar';

interface SettingsDialogDragState {
  pointerId: number;
  pointerStart: DialogDragPoint;
  offsetStart: DialogDragPoint;
  rect: DOMRect;
}

export default function App() {
  const { play, stop, voiceLevel, isSpeaking } = useAudioMotion();
  const settingsHook = useSettings();
  const { openai: openAiKey = '', gemini: geminiKey = '' } =
    settingsHook.settings.llm.apiKeys;
  // Voice input shares the API keys entered in the LLM settings.
  const voiceInputApiKeys = useMemo(
    () => ({ openai: openAiKey, gemini: geminiKey }),
    [openAiKey, geminiKey],
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<
    'avatar' | 'conversation'
  >('avatar');
  const [settingsDialogOffset, setSettingsDialogOffset] =
    useState<DialogDragPoint>(DEFAULT_SETTINGS_DIALOG_OFFSET);
  const [settingsDialogDragging, setSettingsDialogDragging] = useState(false);
  const [streamErrorMessage, setStreamErrorMessage] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    null,
  );
  const backgroundObjectUrlRef = useRef<string | null>(null);
  // mesh avatar: emotion / motion requests carry a counter so repeats re-trigger
  const meshSeqRef = useRef(0);
  const [meshEmotion, setMeshEmotion] = useState<{
    tag: string;
    seq: number;
  } | null>(null);
  const [meshMotionRequest, setMeshMotionRequest] = useState<{
    id: string;
    seq: number;
  } | null>(null);
  const [meshKanaRequest, setMeshKanaRequest] = useState<{
    text: string;
    seq: number;
  } | null>(null);
  const [meshOptions, setMeshOptions] = useState<MeshAvatarOptions>({
    autoIdle: true,
    autoMotion: true,
    swayGain: 1,
  });
  const meshMotions: MeshAvatarMotionInfo[] = MOTION_LIST;
  const speechPreview = useSpeechPreview();
  const [playingMotion, setPlayingMotion] = useState<string | null>(null);
  const [previewEmotion, setPreviewEmotion] = useState<string | null>(null);
  const handleMeshAvatarReady = useCallback((avatar: MeshAvatar) => {
    avatar.onMotion(setPlayingMotion);
  }, []);
  const setMeshEmotionTag = useCallback((tag: string) => {
    meshSeqRef.current += 1;
    setMeshEmotion({ tag, seq: meshSeqRef.current });
  }, []);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsDialogDragRef = useRef<SettingsDialogDragState | null>(null);
  const reactionIdRef = useRef(0);
  const [avatarReaction, setAvatarReaction] =
    useState<PngTuberEmotionReaction | null>(null);

  const emitAvatarReaction = useCallback(
    (draft: PngTuberEmotionReactionDraft) => {
      reactionIdRef.current += 1;
      setAvatarReaction(
        withPngTuberEmotionReactionId(draft, reactionIdRef.current),
      );
    },
    [],
  );

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
      setMeshEmotionTag(screenplay.emotion ?? 'neutral');
      const reaction = createLinkedPngTuberEmotionReaction(
        settingsHook.settings.visual.pngtuberReactionControlMode,
        screenplay,
        settingsHook.settings.visual.pngtuberEmotionEffectMap,
      );
      if (reaction) {
        emitAvatarReaction(reaction);
      } else {
        setAvatarReaction(null);
      }
    },
    [
      emitAvatarReaction,
      setMeshEmotionTag,
      settingsHook.settings.visual.pngtuberEmotionEffectMap,
      settingsHook.settings.visual.pngtuberReactionControlMode,
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
    bondToasts,
    dismissBondToast,
    recordBondMessage,
    resetKizunaData,
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
  const updateTwitchAccessToken = settingsHook.updateTwitchAccessToken;

  const handleSend = useCallback(
    (text: string) => {
      // Stop previous audio if speech is currently playing
      stop();
      setAvatarReaction(null);
      processChat(text, {
        bondIdentity: createBondIdentity('form', 'あなた'),
        bondMessage: text,
      });
    },
    [stop, processChat],
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
      analysisEngine: settingsHook.settings.commentIntelligence.analysisEngine,
      jevTransport: settingsHook.settings.commentIntelligence.jevTransport,
      jevApiKey:
        settingsHook.settings.commentIntelligence.jevTransport === 'typesafe'
          ? settingsHook.settings.commentIntelligence.typesafeApiKey
          : (settingsHook.settings.llm.apiKeys.openrouter ?? ''),
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

  const handleYouTubeComments = useCallback(
    (comments: YouTubeChatMessage[]) => {
      for (const comment of comments) {
        const timestamp = new Date(comment.publishedAt).getTime();
        void recordBondMessage(
          createBondIdentity('youtube', comment.userName),
          comment.userComment,
          Number.isFinite(timestamp) ? timestamp : Date.now(),
        ).catch((error) => {
          console.error('Failed to record YouTube Kizuna interaction:', error);
        });
      }
      enqueueYouTubeComments(comments);
    },
    [enqueueYouTubeComments, recordBondMessage],
  );

  const handleTwitchComments = useCallback(
    (comments: TwitchChatMessage[]) => {
      for (const comment of comments) {
        const timestamp = new Date(comment.publishedAt).getTime();
        void recordBondMessage(
          createBondIdentity('twitch', comment.userName),
          comment.userComment,
          Number.isFinite(timestamp) ? timestamp : Date.now(),
        ).catch((error) => {
          console.error('Failed to record Twitch Kizuna interaction:', error);
        });
      }
      enqueueTwitchComments(comments);
    },
    [enqueueTwitchComments, recordBondMessage],
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
    onComments: handleYouTubeComments,
  });

  useTwitchComments({
    twitchChannel: settingsHook.settings.stream.twitchChannel,
    twitchClientId: settingsHook.settings.stream.twitchClientId,
    twitchAccessToken: settingsHook.settings.stream.twitchAccessToken,
    isEnabled:
      settingsHook.settings.stream.platform === 'twitch' &&
      settingsHook.settings.stream.twitchEnabled,
    intervalMs: settingsHook.settings.stream.twitchCommentIntervalMs,
    onComments: handleTwitchComments,
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
    if (!settingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettingsDialog();
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
    const backgroundObjectUrl = backgroundObjectUrlRef;

    return () => {
      if (backgroundObjectUrl.current) {
        URL.revokeObjectURL(backgroundObjectUrl.current);
      }
    };
  }, []);

  const voiceInput: ChatVoiceInputProps = {
    mode: settingsHook.settings.voiceInput.mode,
    service: settingsHook.settings.voiceInput.service,
    onModeChange: settingsHook.updateVoiceInputMode,
    onServiceChange: settingsHook.updateVoiceInputService,
    apiKeys: voiceInputApiKeys,
    onApiKeyChange: settingsHook.updateLLMApiKey,
    isSpeaking,
  };

  return (
    <div className="app">
      <ChatPanel
        messages={messages}
        partialResponse={partialResponse}
        isProcessing={isProcessing}
        onSend={handleSend}
        voiceLevel={Math.max(voiceLevel, speechPreview.level)}
        isSpeaking={isSpeaking || speechPreview.active}
        backgroundImageUrl={backgroundImageUrl}
        meshAvatar={{
          emotion: meshEmotion,
          motionRequest: meshMotionRequest,
          kanaRequest: meshKanaRequest,
          autoIdle: meshOptions.autoIdle,
          autoMotion: meshOptions.autoMotion,
          swayGain: meshOptions.swayGain,
          onReady: handleMeshAvatarReady,
        }}
        avatarReaction={avatarReaction}
        visual={settingsHook.settings.visual}
        voiceInput={voiceInput}
        effectAnchor={getEmotionEffectAnchor(
          settingsHook.settings.visual.pngtuberEmotionEffectAnchors,
          AVATAR_EFFECT_ANCHOR_PROFILE_ID,
        )}
        onEffectAnchorChange={(anchor) =>
          settingsHook.updateVisualPngTuberEmotionEffectAnchor(
            AVATAR_EFFECT_ANCHOR_PROFILE_ID,
            anchor,
          )
        }
        onEffectAnchorReset={() =>
          settingsHook.resetVisualPngTuberEmotionEffectAnchor(
            AVATAR_EFFECT_ANCHOR_PROFILE_ID,
          )
        }
        onToggleSettings={toggleSettingsDialog}
      />

      <BondToastStack toasts={bondToasts} onDismiss={dismissBondToast} />

      {settingsOpen && (
        <div className="settings-dialog-overlay" onClick={closeSettingsDialog}>
          <div
            ref={settingsDialogRef}
            className="settings-dialog"
            style={{
              transform: `translate3d(${settingsDialogOffset.x}px, ${settingsDialogOffset.y}px, 0)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`settings-dialog-header${settingsDialogDragging ? ' is-dragging' : ''}`}
              onPointerDown={handleSettingsDialogPointerDown}
              onPointerMove={handleSettingsDialogPointerMove}
              onPointerUp={finishSettingsDialogDrag}
              onPointerCancel={finishSettingsDialogDrag}
              onLostPointerCapture={finishSettingsDialogDrag}
            >
              <h2>Settings</h2>
              <button
                type="button"
                aria-label="設定を閉じる"
                className="settings-dialog-close"
                onClick={closeSettingsDialog}
              >
                &times;
              </button>
            </div>
            <nav className="settings-category-nav" aria-label="設定カテゴリ">
              <button
                type="button"
                aria-pressed={settingsCategory === 'avatar'}
                onClick={() => setSettingsCategory('avatar')}
              >
                アバター・モーション
              </button>
              <button
                type="button"
                aria-pressed={settingsCategory === 'conversation'}
                onClick={() => setSettingsCategory('conversation')}
              >
                AI・音声・配信
              </button>
            </nav>
            <div className="settings-dialog-body">
              {settingsCategory === 'avatar' && (
                <AvatarSettingsPanel
                  options={meshOptions}
                  onOptionsChange={setMeshOptions}
                  motions={meshMotions}
                  playingMotion={playingMotion}
                  previewEmotion={speechPreview.active ? previewEmotion : null}
                  onPlayMotion={(id) => {
                    meshSeqRef.current += 1;
                    setMeshMotionRequest({ id, seq: meshSeqRef.current });
                  }}
                  onSpeakKana={(text) => {
                    meshSeqRef.current += 1;
                    setMeshKanaRequest({ text, seq: meshSeqRef.current });
                  }}
                  onPreviewSpeech={(emotion) => {
                    setPreviewEmotion(emotion);
                    setMeshEmotionTag(emotion);
                    speechPreview.start();
                  }}
                />
              )}
              {settingsCategory === 'conversation' && (
                <SettingsPanel
                  {...settingsHook}
                  isProcessing={isProcessing}
                  backgroundImageUrl={backgroundImageUrl}
                  streamErrorMessage={streamErrorMessage}
                  screenVisionController={screenVisionController}
                  onBackgroundImageChange={handleBackgroundImageChange}
                  onResetKizunaData={resetKizunaData}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

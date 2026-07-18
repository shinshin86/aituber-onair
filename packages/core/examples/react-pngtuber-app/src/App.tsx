import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { AvatarImageKey, AvatarImageUrls } from './components/AvatarPanel';
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
  createLinkedPngTuberEmotionReaction,
  withPngTuberEmotionReactionId,
  type PngTuberEmotionReaction,
  type PngTuberEmotionReactionDraft,
} from './lib/pngtuberEmotionEffects';
import './styles/app.css';

const DEFAULT_SETTINGS_DIALOG_OFFSET: DialogDragPoint = { x: 0, y: 0 };
const PNGTUBER_EFFECT_ANCHOR_PROFILE_ID = 'avatar-image-set';

interface SettingsDialogDragState {
  pointerId: number;
  pointerStart: DialogDragPoint;
  offsetStart: DialogDragPoint;
  rect: DOMRect;
}

export default function App() {
  const { play, stop, mouthLevel, isSpeaking } = useAudioLipsync();
  const settingsHook = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDialogOffset, setSettingsDialogOffset] =
    useState<DialogDragPoint>(DEFAULT_SETTINGS_DIALOG_OFFSET);
  const [settingsDialogDragging, setSettingsDialogDragging] = useState(false);
  const [streamErrorMessage, setStreamErrorMessage] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    null,
  );
  const [avatarImageUrls, setAvatarImageUrls] = useState<AvatarImageUrls>({});
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const avatarObjectUrlRef = useRef<AvatarImageUrls>({});
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
      processChat(text);
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

  const handleAvatarImageChange = useCallback(
    (key: AvatarImageKey, file: File | null) => {
      const previousUrl = avatarObjectUrlRef.current[key];
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
        delete avatarObjectUrlRef.current[key];
      }

      setAvatarImageUrls((prev) => {
        if (!file) {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }

        const nextUrl = URL.createObjectURL(file);
        avatarObjectUrlRef.current[key] = nextUrl;
        return { ...prev, [key]: nextUrl };
      });
    },
    [],
  );

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
    onComments: enqueueYouTubeComments,
  });

  useTwitchComments({
    twitchChannel: settingsHook.settings.stream.twitchChannel,
    twitchClientId: settingsHook.settings.stream.twitchClientId,
    twitchAccessToken: settingsHook.settings.stream.twitchAccessToken,
    isEnabled:
      settingsHook.settings.stream.platform === 'twitch' &&
      settingsHook.settings.stream.twitchEnabled,
    intervalMs: settingsHook.settings.stream.twitchCommentIntervalMs,
    onComments: enqueueTwitchComments,
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
    const avatarObjectUrls = avatarObjectUrlRef;

    return () => {
      if (backgroundObjectUrl.current) {
        URL.revokeObjectURL(backgroundObjectUrl.current);
      }
      Object.values(avatarObjectUrls.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  return (
    <div className="app">
      <ChatPanel
        messages={messages}
        partialResponse={partialResponse}
        isProcessing={isProcessing}
        onSend={handleSend}
        mouthLevel={mouthLevel}
        isSpeaking={isSpeaking}
        backgroundImageUrl={backgroundImageUrl}
        avatarImageUrls={avatarImageUrls}
        avatarReaction={avatarReaction}
        visual={settingsHook.settings.visual}
        effectAnchor={getEmotionEffectAnchor(
          settingsHook.settings.visual.pngtuberEmotionEffectAnchors,
          PNGTUBER_EFFECT_ANCHOR_PROFILE_ID,
        )}
        onEffectAnchorChange={(anchor) =>
          settingsHook.updateVisualPngTuberEmotionEffectAnchor(
            PNGTUBER_EFFECT_ANCHOR_PROFILE_ID,
            anchor,
          )
        }
        onEffectAnchorReset={() =>
          settingsHook.resetVisualPngTuberEmotionEffectAnchor(
            PNGTUBER_EFFECT_ANCHOR_PROFILE_ID,
          )
        }
        onToggleSettings={toggleSettingsDialog}
      />

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
                className="settings-dialog-close"
                onClick={closeSettingsDialog}
              >
                &times;
              </button>
            </div>
            <SettingsPanel
              {...settingsHook}
              isProcessing={isProcessing}
              backgroundImageUrl={backgroundImageUrl}
              avatarImageUrls={avatarImageUrls}
              streamErrorMessage={streamErrorMessage}
              screenVisionController={screenVisionController}
              onBackgroundImageChange={handleBackgroundImageChange}
              onAvatarImageChange={handleAvatarImageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

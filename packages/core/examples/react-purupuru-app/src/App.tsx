import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useAudioLipsync } from './hooks/useAudioLipsync';
import { useAituberCore } from './hooks/useAituberCore';
import { useLiveCommentIntelligence } from './hooks/useLiveCommentIntelligence';
import { useScreenVisionController } from './hooks/useScreenVisionController';
import { useSettings } from './hooks/useSettings';
import { useTwitchComments } from './hooks/useTwitchComments';
import { useYoutubeComments } from './hooks/useYoutubeComments';
import { getPuruPuruEffectAnchor } from './lib/purupuruEffectAnchor';
import type { PuruPuruAvatarPackage } from './lib/purupuruPackage';
import { loadPuruPuruPackage } from './lib/purupuruPackage';
import type {
  PuruPuruReaction,
  PuruPuruReactionDraft,
  ScreenplayLike,
} from './lib/purupuruReactions';
import {
  createLinkedPuruPuruReaction,
  withReactionId,
} from './lib/purupuruReactions';
import type { PuruPuruEffectAnchor } from './types/settings';
import type { TwitchChatMessage } from './services/twitch/twitchService';
import type { YouTubeChatMessage } from './services/youtube/youtubeService';
import './styles/app.css';

type AvatarPackageSource = 'default' | 'user';

const DEFAULT_AVATAR_URL = `${import.meta.env.BASE_URL}avatar/miko.purupuru`;
const DEFAULT_AVATAR_FILE_NAME = 'miko.purupuru';

export default function App() {
  const { play, stop, mouthLevel, isSpeaking, smoothedValue } =
    useAudioLipsync();
  const settingsHook = useSettings();
  const updateTwitchAccessToken = settingsHook.updateTwitchAccessToken;
  const updateVisualPuruPuruEffectAnchor =
    settingsHook.updateVisualPuruPuruEffectAnchor;
  const resetVisualPuruPuruEffectAnchor =
    settingsHook.resetVisualPuruPuruEffectAnchor;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streamErrorMessage, setStreamErrorMessage] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    null,
  );
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const [avatarPackage, setAvatarPackage] =
    useState<PuruPuruAvatarPackage | null>(null);
  const [avatarPackageSource, setAvatarPackageSource] =
    useState<AvatarPackageSource | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState<string | null>(null);
  const avatarPackageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const avatarLoadRequestRef = useRef(0);
  const avatarReactionIdRef = useRef(0);
  const [avatarReaction, setAvatarReaction] = useState<PuruPuruReaction | null>(
    null,
  );

  const emitAvatarReaction = useCallback((draft: PuruPuruReactionDraft) => {
    avatarReactionIdRef.current += 1;
    setAvatarReaction(withReactionId(draft, avatarReactionIdRef.current));
  }, []);

  const resetAvatarReaction = useCallback(() => {
    setAvatarReaction(null);
  }, []);

  const handleAudioPlay = useCallback(
    async (arrayBuffer: ArrayBuffer) => {
      await play(arrayBuffer);
    },
    [play],
  );

  const handleSpeechStart = useCallback(
    (screenplay: ScreenplayLike) => {
      const reaction = createLinkedPuruPuruReaction(
        settingsHook.settings.visual.purupuruReactionControlMode,
        screenplay,
        settingsHook.settings.visual.purupuruEmotionEffectMap,
      );

      if (reaction) {
        emitAvatarReaction(reaction);
      } else {
        setAvatarReaction(null);
      }
    },
    [
      emitAvatarReaction,
      settingsHook.settings.visual.purupuruEmotionEffectMap,
      settingsHook.settings.visual.purupuruReactionControlMode,
    ],
  );

  const handleSpeechEnd = useCallback(() => {
    resetAvatarReaction();
  }, [resetAvatarReaction]);

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
      // Stop previous audio if speech is currently playing
      stop();
      resetAvatarReaction();
      processChat(text);
    },
    [stop, resetAvatarReaction, processChat],
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

  const installAvatarPackage = useCallback(
    (loaded: PuruPuruAvatarPackage, source: AvatarPackageSource) => {
      setAvatarPackage((current) => {
        current?.dispose();
        avatarPackageRef.current = loaded;
        return loaded;
      });
      setAvatarPackageSource(source);
    },
    [],
  );

  const clearAvatarPackage = useCallback(() => {
    setAvatarPackage((current) => {
      current?.dispose();
      avatarPackageRef.current = null;
      return null;
    });
    setAvatarPackageSource(null);
  }, []);

  const loadDefaultAvatarPackage = useCallback(async () => {
    const requestId = avatarLoadRequestRef.current + 1;
    avatarLoadRequestRef.current = requestId;

    try {
      const response = await fetch(DEFAULT_AVATAR_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${DEFAULT_AVATAR_URL}.`);
      }

      const blob = await response.blob();
      const file = new File([blob], DEFAULT_AVATAR_FILE_NAME, {
        type: blob.type || 'application/zip',
      });
      const loaded = await loadPuruPuruPackage(file);

      if (requestId !== avatarLoadRequestRef.current) {
        loaded.dispose();
        return;
      }

      setAvatarLoadError(null);
      installAvatarPackage(loaded, 'default');
    } catch (error) {
      if (requestId !== avatarLoadRequestRef.current) return;
      console.warn('Failed to load the bundled default avatar.', error);
      setAvatarLoadError(null);
      clearAvatarPackage();
    }
  }, [clearAvatarPackage, installAvatarPackage]);

  const handleAvatarPackageChange = useCallback(
    async (file: File | null) => {
      if (!file) {
        void loadDefaultAvatarPackage();
        return;
      }

      const requestId = avatarLoadRequestRef.current + 1;
      avatarLoadRequestRef.current = requestId;

      try {
        setAvatarLoadError(null);
        const loaded = await loadPuruPuruPackage(file);

        if (requestId !== avatarLoadRequestRef.current) {
          loaded.dispose();
          return;
        }

        installAvatarPackage(loaded, 'user');
      } catch (error) {
        if (requestId !== avatarLoadRequestRef.current) return;
        setAvatarLoadError(
          error instanceof Error
            ? error.message
            : 'Failed to load the .purupuru package.',
        );
      }
    },
    [installAvatarPackage, loadDefaultAvatarPackage],
  );

  useEffect(() => {
    void loadDefaultAvatarPackage();
  }, [loadDefaultAvatarPackage]);

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
    if (!settingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);

  useEffect(() => {
    const backgroundObjectUrl = backgroundObjectUrlRef;

    return () => {
      if (backgroundObjectUrl.current) {
        URL.revokeObjectURL(backgroundObjectUrl.current);
      }
    };
  }, []);

  useEffect(() => {
    avatarPackageRef.current = avatarPackage;
  }, [avatarPackage]);

  useEffect(() => {
    return () => {
      avatarLoadRequestRef.current += 1;
      avatarPackageRef.current?.dispose();
      avatarPackageRef.current = null;
    };
  }, []);

  const avatarViewTransform = useMemo(
    () => ({
      x: settingsHook.settings.visual.avatarViewX,
      y: settingsHook.settings.visual.avatarViewY,
      scale: settingsHook.settings.visual.avatarViewScale,
    }),
    [
      settingsHook.settings.visual.avatarViewX,
      settingsHook.settings.visual.avatarViewY,
      settingsHook.settings.visual.avatarViewScale,
    ],
  );

  const effectAnchor = useMemo(
    () =>
      getPuruPuruEffectAnchor(
        settingsHook.settings.visual.purupuruEffectAnchors,
        avatarPackage?.profileId,
      ),
    [
      avatarPackage?.profileId,
      settingsHook.settings.visual.purupuruEffectAnchors,
    ],
  );

  const handleEffectAnchorChange = useCallback(
    (anchor: PuruPuruEffectAnchor) => {
      const profileId = avatarPackageRef.current?.profileId;
      if (profileId) {
        updateVisualPuruPuruEffectAnchor(profileId, anchor);
      }
    },
    [updateVisualPuruPuruEffectAnchor],
  );

  const handleEffectAnchorReset = useCallback(() => {
    const profileId = avatarPackageRef.current?.profileId;
    if (profileId) {
      resetVisualPuruPuruEffectAnchor(profileId);
    }
  }, [resetVisualPuruPuruEffectAnchor]);

  return (
    <div className="app">
      <ChatPanel
        messages={messages}
        partialResponse={partialResponse}
        isProcessing={isProcessing}
        onSend={handleSend}
        mouthLevel={mouthLevel}
        voiceLevel={smoothedValue}
        isSpeaking={isSpeaking}
        avatarPackage={avatarPackage}
        avatarReaction={avatarReaction}
        backgroundImageUrl={backgroundImageUrl}
        visual={settingsHook.settings.visual}
        avatarViewTransform={avatarViewTransform}
        onAvatarViewTransformChange={settingsHook.updateVisualAvatarView}
        effectAnchor={effectAnchor}
        onEffectAnchorChange={handleEffectAnchorChange}
        onEffectAnchorReset={handleEffectAnchorReset}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
      />

      {settingsOpen && (
        <div
          className="settings-dialog-overlay"
          onClick={() => setSettingsOpen(false)}
        >
          <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="settings-dialog-header">
              <h2>Settings</h2>
              <button
                className="settings-dialog-close"
                onClick={() => setSettingsOpen(false)}
              >
                &times;
              </button>
            </div>
            <SettingsPanel
              {...settingsHook}
              isProcessing={isProcessing}
              backgroundImageUrl={backgroundImageUrl}
              streamErrorMessage={streamErrorMessage}
              avatarPackage={avatarPackage}
              avatarPackageSource={avatarPackageSource}
              avatarLoadError={avatarLoadError}
              screenVisionController={screenVisionController}
              onBackgroundImageChange={handleBackgroundImageChange}
              onAvatarPackageChange={handleAvatarPackageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

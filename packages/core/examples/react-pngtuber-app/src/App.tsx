import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarImageKey, AvatarImageUrls } from './components/AvatarPanel';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useAudioLipsync } from './hooks/useAudioLipsync';
import { useAituberCore } from './hooks/useAituberCore';
import { useSettings } from './hooks/useSettings';
import { useTwitchComments } from './hooks/useTwitchComments';
import { useYoutubeComments } from './hooks/useYoutubeComments';
import type { TwitchChatMessage } from './services/twitch/twitchService';
import type { YouTubeChatMessage } from './services/youtube/youtubeService';
import './styles/app.css';

export default function App() {
  const { play, stop, mouthLevel, isSpeaking } = useAudioLipsync();
  const settingsHook = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streamErrorMessage, setStreamErrorMessage] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [avatarImageUrls, setAvatarImageUrls] = useState<AvatarImageUrls>({});
  const backgroundObjectUrlRef = useRef<string | null>(null);
  const avatarObjectUrlRef = useRef<AvatarImageUrls>({});

  const handleAudioPlay = useCallback(
    async (arrayBuffer: ArrayBuffer) => {
      await play(arrayBuffer);
    },
    [play]
  );

  const { messages, isProcessing, partialResponse, processChat } =
    useAituberCore({
      onAudioPlay: handleAudioPlay,
      settings: settingsHook.settings,
      getApiKeyForProvider: settingsHook.getApiKeyForProvider,
    });

  const handleSend = useCallback(
    (text: string) => {
      // Stop previous audio if speech is currently playing
      stop();
      processChat(text);
    },
    [stop, processChat]
  );

  const handleYoutubeComment = useCallback(
    (comment: YouTubeChatMessage) => {
      stop();
      processChat(`「${comment.userName}」さんのコメント: ${comment.userComment}`);
    },
    [processChat, stop]
  );

  const handleTwitchComment = useCallback(
    (comment: TwitchChatMessage) => {
      stop();
      processChat(`「${comment.userName}」さんのコメント: ${comment.userComment}`);
    },
    [processChat, stop]
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

  const handleAvatarImageChange = useCallback((key: AvatarImageKey, file: File | null) => {
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
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token')) return;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('twitchOauthState');

    if (token && state && state === savedState) {
      settingsHook.updateTwitchAccessToken(token);
      settingsHook.updateTwitchEnabled(true);
      setStreamErrorMessage('');
      sessionStorage.removeItem('twitchOauthState');
    }

    history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
  }, []);

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
      <header className="app-header">
        <h1>PNGTuber Chat</h1>
        <button
          className="settings-button"
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label="Settings"
        >
          ⚙
        </button>
      </header>
      <main className="app-main">
        <ChatPanel
          messages={messages}
          partialResponse={partialResponse}
          isProcessing={isProcessing}
          onSend={handleSend}
          mouthLevel={mouthLevel}
          isSpeaking={isSpeaking}
          backgroundImageUrl={backgroundImageUrl}
          avatarImageUrls={avatarImageUrls}
        />
      </main>

      {settingsOpen && (
        <div className="settings-dialog-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-dialog" onClick={e => e.stopPropagation()}>
            <div className="settings-dialog-header">
              <h2>Settings</h2>
              <button className="settings-dialog-close" onClick={() => setSettingsOpen(false)}>&times;</button>
            </div>
            <SettingsPanel
              {...settingsHook}
              isProcessing={isProcessing}
              backgroundImageUrl={backgroundImageUrl}
              avatarImageUrls={avatarImageUrls}
              streamErrorMessage={streamErrorMessage}
              onBackgroundImageChange={handleBackgroundImageChange}
              onAvatarImageChange={handleAvatarImageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

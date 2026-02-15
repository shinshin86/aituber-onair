import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarImageKey, AvatarImageUrls } from './components/AvatarPanel';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useAudioLipsync } from './hooks/useAudioLipsync';
import { useAituberCore } from './hooks/useAituberCore';
import { useSettings } from './hooks/useSettings';
import './styles/app.css';

export default function App() {
  const { play, stop, mouthLevel, isSpeaking } = useAudioLipsync();
  const settingsHook = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
              onBackgroundImageChange={handleBackgroundImageChange}
              onAvatarImageChange={handleAvatarImageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const backgroundObjectUrlRef = useRef<string | null>(null);

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
        onToggleSettings={() => setSettingsOpen((v) => !v)}
      />

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
              onBackgroundImageChange={handleBackgroundImageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

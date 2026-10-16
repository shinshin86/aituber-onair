import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { MeshAvatarCanvas } from './components/MeshAvatarCanvas';
import { SettingsSheet } from './components/SettingsSheet';
import { StartOverlay } from './components/StartOverlay';
import { type VoiceMode, VoiceStage } from './components/VoiceStage';
import { useAudioMotion } from './hooks/useAudioMotion';
import { type AssistantReply, useChatCore } from './hooks/useChatCore';
import { useGeminiNano } from './hooks/useGeminiNano';
import { useSettings } from './hooks/useSettings';
import { useSpeechEnvelope } from './hooks/useSpeechEnvelope';
import { useTts } from './hooks/useTts';
import { listJapaneseVoices } from './lib/webSpeechVoice';

const REPO_URL = 'https://github.com/shinshin86/aituber-onair';
const STUDIO_URL = 'https://shinshin86.github.io/mesh-avatar-studio/';

const SYSTEM_PROMPT = [
  'あなたは「ミコ」。AITuber OnAir の公式キャラクターで、明るく親しみやすい AITuber の女の子です。',
  '返答は日本語の話し言葉で、1〜2文に短くまとめてください。',
  '返信の文頭には必ず内容に応じて [happy] [sad] [angry] [surprised] [relaxed] [neutral] のいずれかを付けてください。',
].join('\n');

const GREETING_READY: AssistantReply = {
  text: 'こんにちは、ミコだよ！なんでも話しかけてね。',
  emotion: 'happy',
};
const GREETING_NO_MODEL: AssistantReply = {
  text: 'こんにちは、ミコだよ！この環境では Chrome の Gemini Nano が使えないみたい。右上の設定から API キーを入れると会話できるよ。',
  emotion: 'happy',
};
const FALLBACK_REPLY: AssistantReply = {
  text: 'ごめんね、まだ会話に使う AI がつながっていないの。右上の設定から Gemini Nano を準備するか、API キーを入れてね。',
  emotion: 'sad',
};

/** Phones and metered connections should not download about 150MB on their own. */
function shouldAutoPreparePiper(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  if (connection?.saveData) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  return window.innerWidth >= 760;
}

export default function App() {
  const {
    settings,
    updateLlm,
    updateVoice,
    setApiKey,
    setOpenaiCompatible,
    apiKey,
  } = useSettings();
  const nano = useGeminiNano();
  const audioMotion = useAudioMotion();
  const envelope = useSpeechEnvelope();
  const tts = useTts({
    play: audioMotion.play,
    stopPlayback: audioMotion.stop,
    envelope,
  });
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emotion, setEmotion] = useState<{ tag: string; seq: number } | null>(
    null,
  );
  const [justSwitched, setJustSwitched] = useState(false);
  /** The visitor chose to talk with the browser voice before Miko's was ready */
  const [webSpeechEarly, setWebSpeechEarly] = useState(false);
  const autoSwitchedRef = useRef(false);
  const greetedRef = useRef(false);
  const emotionSeqRef = useRef(0);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const nanoReady = nano.status === 'available';

  const speakReply = useCallback(
    (reply: AssistantReply) => {
      if (reply.emotion) {
        emotionSeqRef.current += 1;
        setEmotion({ tag: reply.emotion, seq: emotionSeqRef.current });
      }
      const current = settingsRef.current.voice;
      void tts.speak(reply.text, {
        voice: current.engine,
        webSpeechVoice: current.webSpeechVoice,
        piperSpeed: current.piperSpeed,
      });
    },
    [tts],
  );

  const chat = useChatCore({
    provider: settings.llm.provider,
    apiKey,
    openaiCompatible: settings.llm.openaiCompatible,
    nanoReady,
    systemPrompt: SYSTEM_PROMPT,
    fallbackReply: FALLBACK_REPLY,
    onReply: speakReply,
  });

  useEffect(() => {
    void listJapaneseVoices().then(tts.setVoices);
  }, [tts.setVoices]);

  const voiceMode: VoiceMode =
    settings.voice.engine === 'piperPlus' && tts.piperReady
      ? 'piper'
      : webSpeechEarly ||
          (tts.piperStatus === 'ready' && settings.voice.engine === 'webSpeech')
        ? 'web'
        : 'waiting';

  const handleStart = useCallback(() => {
    setStarted(true);
    if (nano.status === 'available') nano.warmUp();
    if (shouldAutoPreparePiper()) void tts.preparePiper();
  }, [nano, tts]);

  // Miko greets once, with whichever voice becomes usable first: her own when
  // it is ready, or the browser voice if the visitor asked not to wait.
  useEffect(() => {
    if (!started || greetedRef.current || voiceMode === 'waiting') return;
    greetedRef.current = true;
    const greeting = chat.canChat ? GREETING_READY : GREETING_NO_MODEL;
    chat.addAssistantMessage(greeting.text);
    speakReply(greeting);
  }, [started, voiceMode, chat, speakReply]);

  // The Miko voice takes over once, as soon as it is ready; the visitor can
  // still go back to the browser voice from the settings.
  useEffect(() => {
    if (!started || !tts.piperReady || autoSwitchedRef.current) return;
    autoSwitchedRef.current = true;
    updateVoice({ engine: 'piperPlus' });
    if (!webSpeechEarly) return;
    const show = window.setTimeout(() => setJustSwitched(true), 0);
    const hide = window.setTimeout(() => setJustSwitched(false), 6000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [started, tts.piperReady, updateVoice, webSpeechEarly]);

  const handleUseWebSpeech = useCallback(() => {
    setWebSpeechEarly(true);
    updateVoice({ engine: 'webSpeech' });
  }, [updateVoice]);

  const handleUsePiper = useCallback(() => {
    updateVoice({ engine: 'piperPlus' });
  }, [updateVoice]);

  const handleReset = useCallback(() => {
    tts.stop();
    chat.reset();
    setSettingsOpen(false);
  }, [chat, tts]);

  const voiceLevel = Math.max(audioMotion.voiceLevel, envelope.level);
  const isSpeaking = audioMotion.isSpeaking || envelope.active;
  const chatDisabled = !started || voiceMode === 'waiting';

  const nanoBanner = useMemo(() => {
    if (settings.llm.provider !== 'gemini-nano') return null;
    if (nano.status === 'downloadable') {
      return (
        <div className="banner">
          <span>
            Chrome 内蔵の Gemini Nano を準備すると、キーなしで会話できます。
          </span>
          <button type="button" className="link" onClick={nano.prepare}>
            準備する
          </button>
        </div>
      );
    }
    if (nano.status === 'downloading') {
      return (
        <div className="banner">
          <span className="spinner" aria-hidden="true" />
          <span>
            Gemini Nano を準備中…
            {nano.progress === null ? '' : ` ${nano.progress}%`}
          </span>
        </div>
      );
    }
    return null;
  }, [nano.prepare, nano.progress, nano.status, settings.llm.provider]);

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={REPO_URL} target="_blank" rel="noreferrer">
          AITuber OnAir
        </a>
        <a
          className="topbar-credit"
          href={STUDIO_URL}
          target="_blank"
          rel="noreferrer"
        >
          Created with <strong>Mesh Avatar Studio</strong>
        </a>
        <nav className="topbar-links" aria-label="リンク">
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定"
            title="設定"
          >
            ⚙
          </button>
        </nav>
      </header>

      <main className="stage">
        <section
          className="avatar-pane"
          aria-label="アバター"
          data-speaking={isSpeaking ? 'true' : 'false'}
        >
          <MeshAvatarCanvas
            voiceLevel={voiceLevel}
            isSpeaking={isSpeaking}
            emotion={emotion}
          />
          <VoiceStage
            mode={voiceMode}
            piperStatus={tts.piperStatus}
            piperProgress={tts.piperProgress}
            justSwitched={justSwitched}
            onPrepare={() => void tts.preparePiper()}
            onUseWebSpeech={handleUseWebSpeech}
            onUsePiper={handleUsePiper}
          />
        </section>
        <section className="chat-pane">
          {nanoBanner}
          <ChatPanel
            messages={chat.messages}
            partial={chat.partial}
            isProcessing={chat.isProcessing}
            error={chat.error}
            disabled={chatDisabled}
            disabledHint="ミコの声を準備しています…"
            onSend={(text) => void chat.send(text)}
          />
          <p className="stack-line">
            Built with <code>@aituber-onair/core</code> ·{' '}
            <code>@aituber-onair/voice</code> · <code>mesh-avatar</code>
          </p>
        </section>
      </main>

      {!started && <StartOverlay onStart={handleStart} />}
      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          nano={nano}
          piperStatus={tts.piperStatus}
          voices={tts.voices}
          onUpdateLlm={updateLlm}
          onUpdateVoice={updateVoice}
          onSetApiKey={setApiKey}
          onSetOpenaiCompatible={setOpenaiCompatible}
          onPreparePiper={() => void tts.preparePiper()}
          onReset={handleReset}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

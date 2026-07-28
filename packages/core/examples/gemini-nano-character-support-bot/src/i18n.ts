export type Language = 'en' | 'ja';
export const TSUKUYOMI_CORPUS_URL =
  'https://tyc.rei-yumesaki.net/material/corpus/';

type ModelStatus =
  | 'checking'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'promptTooLarge'
  | 'error';

interface TranslationRecord {
  document: {
    title: string;
    description: string;
  };
  language: {
    label: string;
    english: string;
    japanese: string;
  };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleEmphasis: string;
    description: string;
    openChat: string;
    readPackage: string;
    localBadge: string;
    keyBadge: string;
    characterBadge: string;
  };
  model: Record<ModelStatus, string> & {
    eyebrow: string;
    title: string;
    description: string;
    prepare: string;
    preparing: string;
    progress: string;
    requirements: string;
  };
  details: {
    chatTitle: string;
    chatDescription: string;
    voiceTitle: string;
    voiceDescription: string;
    avatarTitle: string;
    avatarDescription: string;
  };
  voice: {
    webSpeechReady: string;
    checkingAssets: string;
    assetsReady: string;
    initializing: string;
    ready: string;
    missing: string;
    error: string;
    runtimeError: string;
    progress: string;
    credit: string;
    creditCorpus: string;
    creditLinkLabel: string;
  };
  chat: {
    widgetLabel: string;
    panelLabel: string;
    kicker: string;
    speaking: string;
    local: string;
    reset: string;
    close: string;
    dismissModelStatus: string;
    dismissVoiceStatus: string;
    welcome: string;
    typing: string;
    messageLabel: string;
    inputPlaceholder: string;
    inputDisabled: string;
    send: string;
    poweredBy: string;
    closeWidget: string;
    openWidget: string;
    launcherKicker: string;
    launcherTitle: string;
    coreError: string;
  };
  footer: string;
}

const LANGUAGE_STORAGE_KEY =
  'aituber-onair.core.gemini-nano-character-support-language';

export const translations: Record<Language, TranslationRecord> = {
  en: {
    document: {
      title: 'Gemini Nano Character Support — AITuber OnAir',
      description:
        'A browser-only character support bot powered by Gemini Nano, PiperPlus, Web Speech, and AITuber OnAir Core.',
    },
    language: {
      label: 'Display and response language',
      english: 'Switch to English',
      japanese: 'Switch to Japanese',
    },
    hero: {
      eyebrow: 'On-device character support',
      titleLead: 'Chat, voice, and reactions.',
      titleEmphasis: 'Entirely in Chrome.',
      description:
        'Miko combines Chrome built-in Gemini Nano, Japanese PiperPlus or English Web Speech, and a PuruPuru avatar through @aituber-onair/core.',
      openChat: 'Talk with Miko',
      readPackage: 'Read the Core README',
      localBadge: 'On-device chat',
      keyBadge: 'No API key',
      characterBadge: 'Voice + avatar',
    },
    model: {
      eyebrow: 'Chrome built-in AI',
      title: 'Gemini Nano status',
      description:
        'The support knowledge and conversation stay in this browser.',
      checking: 'Checking whether Gemini Nano is available…',
      available: 'Gemini Nano is ready on this device.',
      downloadable: 'Download Gemini Nano before starting the conversation.',
      downloading: 'Gemini Nano is downloading and being prepared…',
      unavailable:
        'Built-in AI is unavailable. Use Chrome 148+ on a supported desktop device.',
      promptTooLarge: 'The support knowledge does not fit this model context.',
      error: 'Chrome could not check or prepare the built-in model.',
      prepare: 'Prepare Gemini Nano',
      preparing: 'Preparing…',
      progress: 'Model download progress',
      requirements: 'Chrome 148+ desktop · PiperPlus assets for Japanese',
    },
    details: {
      chatTitle: 'Private, local chat',
      chatDescription:
        'Gemini Nano answers from the public Core knowledge bundled with this page.',
      voiceTitle: 'Language-aware local voice',
      voiceDescription:
        'Japanese uses PiperPlus with Tsukuyomi-chan; English uses the browser Web Speech voice.',
      avatarTitle: 'Emotion-aware Miko',
      avatarDescription:
        'Core events connect emotion tags, RMS lip sync, and synthetic lip sync to the PuruPuru avatar.',
    },
    voice: {
      webSpeechReady: 'English voice: Web Speech is ready.',
      checkingAssets: 'Checking local PiperPlus assets…',
      assetsReady:
        'Japanese voice: PiperPlus assets are ready. The first reply initializes the model.',
      initializing:
        'Initializing PiperPlus and the Tsukuyomi-chan model for the first reply…',
      ready: 'Japanese voice: PiperPlus with Tsukuyomi-chan is ready.',
      missing:
        'PiperPlus assets are missing. Run npm run setup:piper, then reload this page.',
      error:
        'PiperPlus assets could not be checked. Run npm run setup:piper and reload.',
      runtimeError:
        'PiperPlus audio could not start. Run npm run setup:piper -- --force, reload, and try again.',
      progress: 'PiperPlus preparation progress',
      credit:
        'This software uses voice data made freely available by the free material character "Tsukuyomi-chan" (c) Rei Yumesaki for speech synthesis.',
      creditCorpus: 'Tsukuyomi-chan Corpus (CV. Rei Yumesaki)',
      creditLinkLabel: 'Tsukuyomi-chan Corpus terms',
    },
    chat: {
      widgetLabel: 'Gemini Nano character support',
      panelLabel: 'Chat with Miko',
      kicker: 'On-device character support',
      speaking: 'Speaking',
      local: 'Local in Chrome',
      reset: 'Reset conversation',
      close: 'Close support',
      dismissModelStatus: 'Dismiss model status',
      dismissVoiceStatus: 'Dismiss voice status',
      welcome:
        'Hi! I’m Miko. Ask me a short question about @aituber-onair/core.',
      typing: 'Miko is thinking',
      messageLabel: 'Message Miko',
      inputPlaceholder: 'Ask about AITuber OnAir Core…',
      inputDisabled: 'Prepare Gemini Nano to start chatting',
      send: 'Send',
      poweredBy: 'Orchestrated locally by',
      closeWidget: 'Close character support',
      openWidget: 'Open character support',
      launcherKicker: 'Need a hand?',
      launcherTitle: 'Ask Miko',
      coreError:
        'I could not complete that local request. Check Gemini Nano availability and try again.',
    },
    footer: 'Browser-only Gemini Nano character support example',
  },
  ja: {
    document: {
      title: 'Gemini Nano キャラクターサポート — AITuber OnAir',
      description:
        'Gemini Nano、PiperPlus、Web Speech、AITuber OnAir Coreを組み合わせた、ブラウザだけで動作するキャラクターサポートボットです。',
    },
    language: {
      label: '表示言語と回答言語',
      english: '英語に切り替える',
      japanese: '日本語に切り替える',
    },
    hero: {
      eyebrow: '端末内で動くキャラクターサポート',
      titleLead: 'チャット、音声、リアクション。',
      titleEmphasis: 'すべてChromeの中で。',
      description:
        'Chrome内蔵のGemini Nanoと、日本語PiperPlus・英語Web Speechの音声、PuruPuruアバターを、@aituber-onair/core がひとつにつなぎます。',
      openChat: 'ミコと話す',
      readPackage: 'CoreのREADMEを読む',
      localBadge: '端末内チャット',
      keyBadge: 'APIキー不要',
      characterBadge: '音声 + アバター',
    },
    model: {
      eyebrow: 'Chrome内蔵AI',
      title: 'Gemini Nanoの状態',
      description:
        'サポート知識の参照も会話の生成も、すべてこのブラウザ内で完結します。',
      checking: 'この端末でGemini Nanoを利用できるか確認しています…',
      available: 'この端末ではGemini Nanoを利用できます。',
      downloadable: '会話を始める前に、Gemini Nanoをダウンロードしてください。',
      downloading: 'Gemini Nanoをダウンロードして準備しています…',
      unavailable:
        '内蔵AIは利用できません。Gemini Nanoに対応するデスクトップ端末でChrome 148以降をお使いください。',
      promptTooLarge: 'サポート知識がこのモデルのコンテキストに収まりません。',
      error: 'Chrome内蔵モデルを確認または準備できませんでした。',
      prepare: 'Gemini Nanoを準備',
      preparing: '準備中…',
      progress: 'モデルのダウンロード状況',
      requirements:
        'デスクトップ版Chrome 148以降 · 日本語音声にはPiperPlusアセットが必要',
    },
    details: {
      chatTitle: '端末内で完結するチャット',
      chatDescription:
        'このページに同梱したCoreの公開情報をもとに、Gemini Nanoが回答します。',
      voiceTitle: '言語に合わせて端末内で読み上げ',
      voiceDescription:
        '日本語はPiperPlusのつくよみちゃん音声で、英語はブラウザのWeb Speechで読み上げます。',
      avatarTitle: '感情に反応するミコ',
      avatarDescription:
        'Coreのイベントを通じて、感情タグをPuruPuruアバターの表情に、RMSによる口パクと疑似口パクを口の動きに反映します。',
    },
    voice: {
      webSpeechReady: '英語音声: Web Speechを利用できます。',
      checkingAssets: '端末内にあるPiperPlusアセットを確認しています…',
      assetsReady:
        '日本語音声: PiperPlusアセットの準備ができました。モデルは初回の回答時に初期化します。',
      initializing:
        '初回の回答に向けて、PiperPlusとつくよみちゃんモデルを初期化しています…',
      ready: '日本語音声: PiperPlusによるつくよみちゃんの音声を利用できます。',
      missing:
        'PiperPlusアセットが見つかりません。npm run setup:piper を実行してから、ページを再読み込みしてください。',
      error:
        'PiperPlusアセットを確認できませんでした。npm run setup:piper を実行してから、ページを再読み込みしてください。',
      runtimeError:
        'PiperPlus音声を開始できません。npm run setup:piper -- --force を実行し、再読み込みしたうえで、もう一度お試しください。',
      progress: 'PiperPlusの準備状況',
      credit:
        '本ソフトウェアの音声合成には、フリー素材キャラクター「つくよみちゃん」(c) Rei Yumesaki が無料公開している音声データを使用しています。',
      creditCorpus: 'つくよみちゃんコーパス（CV.夢前黎）',
      creditLinkLabel: 'つくよみちゃんコーパス利用規約',
    },
    chat: {
      widgetLabel: 'Gemini Nano キャラクターサポート',
      panelLabel: 'ミコとチャット',
      kicker: '端末内で動くキャラクターサポート',
      speaking: '音声を再生中',
      local: 'Chrome内だけで動作中',
      reset: '会話をリセット',
      close: 'サポートを閉じる',
      dismissModelStatus: 'モデルの状態を閉じる',
      dismissVoiceStatus: '音声の状態を閉じる',
      welcome:
        'こんにちは、ミコです。@aituber-onair/core について、短い質問をどうぞ。',
      typing: 'ミコが回答を考えています',
      messageLabel: 'ミコへのメッセージ',
      inputPlaceholder: 'AITuber OnAir Coreについて質問する…',
      inputDisabled: 'Gemini Nanoの準備ができるとチャットを始められます',
      send: '送信',
      poweredBy: '端末内での連携:',
      closeWidget: 'キャラクターサポートを閉じる',
      openWidget: 'キャラクターサポートを開く',
      launcherKicker: 'お困りですか？',
      launcherTitle: 'ミコに聞く',
      coreError:
        'このブラウザ内での処理に失敗しました。Gemini Nanoの状態を確認して、もう一度お試しください。',
    },
    footer: 'ブラウザだけで動作するGemini Nanoキャラクターサポートのサンプル',
  },
};

export const getInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'ja') return stored;
  } catch {
    // Fall through to browser-language detection.
  }

  return typeof navigator !== 'undefined' &&
    navigator.language.toLowerCase().startsWith('ja')
    ? 'ja'
    : 'en';
};

export const persistLanguage = (language: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Browser storage is optional for this example.
  }
};

export type Language = 'en' | 'ja';

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
  chat: {
    widgetLabel: string;
    panelLabel: string;
    kicker: string;
    speaking: string;
    local: string;
    reset: string;
    close: string;
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
        'A browser-only character support bot powered by Gemini Nano, Web Speech, and AITuber OnAir Core.',
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
        'Miko combines Chrome built-in Gemini Nano, Web Speech, and a PuruPuru avatar through @aituber-onair/core. No server or API key is required.',
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
      requirements: 'Chrome 148+ desktop · Web Speech API',
    },
    details: {
      chatTitle: 'Private, local chat',
      chatDescription:
        'Gemini Nano answers from the public Core knowledge bundled with this page.',
      voiceTitle: 'Built-in browser voice',
      voiceDescription:
        'Web Speech speaks each answer directly without a voice server or audio upload.',
      avatarTitle: 'Emotion-aware Miko',
      avatarDescription:
        'Core events connect emotion tags and synthetic lip sync to the PuruPuru avatar.',
    },
    chat: {
      widgetLabel: 'Gemini Nano character support',
      panelLabel: 'Chat with Miko',
      kicker: 'On-device character support',
      speaking: 'Speaking',
      local: 'Local in Chrome',
      reset: 'Reset conversation',
      close: 'Close support',
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
        'Gemini Nano、Web Speech、AITuber OnAir Coreで動くブラウザ完結のキャラクターサポートボットです。',
    },
    language: {
      label: '表示言語と回答言語',
      english: '英語に切り替える',
      japanese: '日本語に切り替える',
    },
    hero: {
      eyebrow: 'オンデバイス・キャラクターサポート',
      titleLead: 'チャット、音声、リアクション。',
      titleEmphasis: 'すべてChromeの中で。',
      description:
        'ミコがChrome内蔵のGemini Nano、Web Speech、PuruPuruアバターを@aituber-onair/coreで連携します。サーバーもAPIキーも不要です。',
      openChat: 'ミコと話す',
      readPackage: 'CoreのREADMEを読む',
      localBadge: '端末内チャット',
      keyBadge: 'APIキー不要',
      characterBadge: '音声 + アバター',
    },
    model: {
      eyebrow: 'Chrome内蔵AI',
      title: 'Gemini Nanoの状態',
      description: 'サポート知識と会話は、このブラウザの中で処理されます。',
      checking: 'Gemini Nanoを利用できるか確認しています…',
      available: 'この端末でGemini Nanoを利用できます。',
      downloadable: '会話を始める前にGemini Nanoをダウンロードしてください。',
      downloading: 'Gemini Nanoをダウンロードして準備しています…',
      unavailable:
        '内蔵AIを利用できません。対応デスクトップ端末のChrome 148以降を使用してください。',
      promptTooLarge:
        'サポート知識が、このモデルのコンテキストに収まりません。',
      error: 'Chrome内蔵モデルの確認または準備に失敗しました。',
      prepare: 'Gemini Nanoを準備',
      preparing: '準備中…',
      progress: 'モデルのダウンロード進捗',
      requirements: 'デスクトップ版Chrome 148以降 · Web Speech API',
    },
    details: {
      chatTitle: '端末内で完結するチャット',
      chatDescription:
        'ページに同梱した公開Core知識をもとに、Gemini Nanoが回答します。',
      voiceTitle: 'ブラウザ内蔵音声',
      voiceDescription:
        'Web Speechが音声サーバーやアップロードなしで回答を直接読み上げます。',
      avatarTitle: '感情に反応するミコ',
      avatarDescription:
        'Coreイベントが感情タグと疑似口パクをPuruPuruアバターへつなぎます。',
    },
    chat: {
      widgetLabel: 'Gemini Nano キャラクターサポート',
      panelLabel: 'ミコとチャット',
      kicker: 'オンデバイス・キャラクターサポート',
      speaking: '音声再生中',
      local: 'Chrome内でローカル動作',
      reset: '会話をリセット',
      close: 'サポートを閉じる',
      welcome:
        'こんにちは、ミコです。@aituber-onair/coreについて短い質問をしてください。',
      typing: 'ミコが考えています',
      messageLabel: 'ミコへのメッセージ',
      inputPlaceholder: 'AITuber OnAir Coreについて質問する…',
      inputDisabled: 'Gemini Nanoを準備するとチャットできます',
      send: '送信',
      poweredBy: 'ローカル連携',
      closeWidget: 'キャラクターサポートを閉じる',
      openWidget: 'キャラクターサポートを開く',
      launcherKicker: 'お困りですか？',
      launcherTitle: 'ミコに聞く',
      coreError:
        'ローカル処理を完了できませんでした。Gemini Nanoの状態を確認して、もう一度お試しください。',
    },
    footer: 'ブラウザ完結Gemini Nanoキャラクターサポート例',
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

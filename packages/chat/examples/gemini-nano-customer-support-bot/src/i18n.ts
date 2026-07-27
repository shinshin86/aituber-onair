export type Language = 'en' | 'ja';

const LANGUAGE_STORAGE_KEY = 'aituber-onair-gemini-nano-support-language';

export const translations = {
  en: {
    document: {
      title: 'Gemini Nano Support — AITuber OnAir',
      description:
        'A browser-only customer support bot powered by Gemini Nano and @aituber-onair/chat',
    },
    language: {
      label: 'Display and response language',
      english: 'Switch to English',
      japanese: 'Switch to Japanese',
    },
    hero: {
      eyebrow: 'Browser-only support',
      title: 'Customer support, entirely in Chrome.',
      description:
        'This support assistant runs with Gemini Nano in Chrome. No API key, application server, or cloud inference is required.',
      openChat: 'Ask the support bot',
      readPackage: 'Read the package README',
      localBadge: 'On-device',
      keyBadge: 'No API key',
      languageBadge: 'English / Japanese',
    },
    model: {
      title: 'Built-in AI status',
      checking: 'Checking whether Gemini Nano is available…',
      available: 'Gemini Nano is ready on this device.',
      downloadable:
        'Gemini Nano needs to be downloaded before the support bot can answer.',
      downloading: 'Gemini Nano is downloading and being prepared…',
      unavailable:
        'Built-in AI is unavailable. Use Chrome 148+ on a supported desktop device.',
      promptTooLarge:
        'The complete support knowledge does not fit this model context.',
      error: 'Chrome could not check or prepare the built-in model.',
      prepare: 'Prepare Gemini Nano',
      preparing: 'Preparing…',
      progress: 'Model download progress',
      requirements: 'Chrome 148+ desktop · no flags required',
    },
    details: {
      privacyTitle: 'Private by design',
      privacyDescription:
        'After the initial model download, questions and answers are processed on this device.',
      knowledgeTitle: 'Curated package knowledge',
      knowledgeDescription:
        'The same public @aituber-onair/chat knowledge used by the server example is bundled into this page.',
      languageTitle: 'Selected-language answers',
      languageDescription:
        'The EN / JA switch controls the interface, model language configuration, and required response language.',
    },
    chat: {
      panelLabel: 'AITuber OnAir browser support chat',
      displayName: 'Nano Support',
      subtitle: 'On-device · Gemini Nano',
      online: 'Ready',
      offline: 'Unavailable',
      close: 'Close support chat',
      reset: 'Reset conversation',
      open: 'Open support chat',
      welcome:
        'Hi! I am the on-device AITuber OnAir support assistant. Ask me about @aituber-onair/chat setup, providers, streaming, tools, vision, or MCP.',
      inputPlaceholder: 'Ask about @aituber-onair/chat…',
      inputDisabled: 'Prepare Gemini Nano to start chatting',
      messageLabel: 'Message for the support assistant',
      send: 'Send message',
      typing: 'Nano Support is thinking',
      errorPrefix: 'Sorry, the on-device request failed.',
      unknownError: 'Please try again or reset the conversation.',
      poweredBy: 'Powered locally by',
    },
    footer: 'Browser-only customer support example',
  },
  ja: {
    document: {
      title: 'Gemini Nano サポート — AITuber OnAir',
      description:
        'Gemini Nanoと@aituber-onair/chatで動く、ブラウザ完結のカスタマーサポートボット',
    },
    language: {
      label: '表示言語と回答言語',
      english: '英語に切り替える',
      japanese: '日本語に切り替える',
    },
    hero: {
      eyebrow: 'ブラウザ完結サポート',
      title: 'Chromeブラウザだけで、カスタマーサポートを。',
      description:
        'Chrome内蔵のGemini Nanoで動くサポートアシスタントです。APIキー、アプリケーションサーバー、クラウド推論は必要ありません。',
      openChat: 'サポートボットに質問する',
      readPackage: 'パッケージREADMEを読む',
      localBadge: 'オンデバイス',
      keyBadge: 'APIキー不要',
      languageBadge: '日本語・英語',
    },
    model: {
      title: '内蔵AIの状態',
      checking: 'Gemini Nanoを利用できるか確認しています…',
      available: 'この端末でGemini Nanoを利用できます。',
      downloadable: '回答を始める前にGemini Nanoのダウンロードが必要です。',
      downloading: 'Gemini Nanoをダウンロードして準備しています…',
      unavailable:
        '内蔵AIを利用できません。対応デスクトップ端末のChrome 148以降を使用してください。',
      promptTooLarge:
        '完全版のサポート知識が、このモデルのコンテキストに収まりません。',
      error: 'Chrome内蔵モデルの確認または準備に失敗しました。',
      prepare: 'Gemini Nanoを準備',
      preparing: '準備中…',
      progress: 'モデルのダウンロード進捗',
      requirements: 'デスクトップ版Chrome 148以降 · フラグ設定不要',
    },
    details: {
      privacyTitle: 'Chrome内でローカル処理',
      privacyDescription:
        '初回のモデルダウンロード後、質問と回答はこの端末内で処理されます。',
      knowledgeTitle: '厳選したパッケージ知識',
      knowledgeDescription:
        'サーバー版と同じ公開@aituber-onair/chat知識をページへ組み込んでいます。',
      languageTitle: '選択言語で回答',
      languageDescription:
        'EN／JAスイッチが表示、モデルの言語設定、回答言語の指示をまとめて切り替えます。',
    },
    chat: {
      panelLabel: 'AITuber OnAir ブラウザサポートチャット',
      displayName: 'Nanoサポート',
      subtitle: 'オンデバイス · Gemini Nano',
      online: '利用可能',
      offline: '利用不可',
      close: 'サポートチャットを閉じる',
      reset: '会話をリセット',
      open: 'サポートチャットを開く',
      welcome:
        'こんにちは。端末内で動くAITuber OnAirサポートアシスタントです。@aituber-onair/chatのセットアップ、プロバイダー、ストリーミング、ツール、画像入力、MCPについて質問してください。',
      inputPlaceholder: '@aituber-onair/chatについて質問する…',
      inputDisabled: 'Gemini Nanoを準備するとチャットできます',
      messageLabel: 'サポートアシスタントへのメッセージ',
      send: 'メッセージを送信',
      typing: 'Nanoサポートが回答を考えています',
      errorPrefix: '申し訳ありません。端末内での処理に失敗しました。',
      unknownError: 'もう一度試すか、会話をリセットしてください。',
      poweredBy: '端末内で動作',
    },
    footer: 'ブラウザ完結カスタマーサポート例',
  },
} as const;

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

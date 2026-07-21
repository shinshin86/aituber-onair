export type Language = 'en' | 'ja';

export interface TranslationRecord {
  document: {
    title: string;
    description: string;
  };
  language: {
    label: string;
    english: string;
    japanese: string;
  };
  nav: {
    homeLabel: string;
    mainLabel: string;
    guides: string;
    apiReference: string;
    github: string;
  };
  hero: {
    title: string;
    description: string;
    startBuilding: string;
    readReadme: string;
    codeLabel: string;
  };
  trust: {
    label: string;
    providers: string;
    streaming: string;
    runtimes: string;
  };
  docs: {
    eyebrow: string;
    title: string;
    description: string;
    providersTitle: string;
    providersDescription: string;
    providersLink: string;
    streamingTitle: string;
    streamingDescription: string;
    streamingLink: string;
    capabilitiesTitle: string;
    capabilitiesDescription: string;
    capabilitiesLink: string;
  };
  quickStart: {
    eyebrow: string;
    title: string;
  };
  supportCta: {
    title: string;
    description: string;
  };
  footer: {
    example: string;
  };
  chat: {
    panelLabel: string;
    online: string;
    subtitle: string;
    openSettings: string;
    settingsTitle: string;
    closeChat: string;
    close: string;
    openChat: string;
    welcome: string;
    setupTitle: string;
    setupDescription: string;
    openSettingsButton: string;
    inputDisabledPlaceholder: string;
    inputPlaceholder: string;
    messageLabel: string;
    sendMessage: string;
    typing: string;
    poweredBy: string;
    providerErrorFallback: string;
    providerErrorPrefix: string;
  };
  settings: {
    configuration: string;
    title: string;
    close: string;
    provider: string;
    model: string;
    modelPlaceholder: string;
    modelsLoaded: string;
    modelHelp: string;
    endpoint: string;
    endpointHelp: string;
    geminiNanoHelp: string;
    apiKey: string;
    optional: string;
    optionalBearerToken: string;
    apiKeyPlaceholder: string;
    storageHelp: string;
    persona: string;
    personaHelp: string;
    cancel: string;
    save: string;
  };
}

export const SETTINGS_STORAGE_KEY =
  'aituber-onair.chat.customer-support-bot.settings';

export const translations: Record<Language, TranslationRecord> = {
  en: {
    document: {
      title: 'OnAir Docs — Support Widget Example',
      description:
        'Customer support widget example powered by @aituber-onair/chat',
    },
    language: {
      label: 'Display language',
      english: 'Switch to English',
      japanese: 'Switch to Japanese',
    },
    nav: {
      homeLabel: 'OnAir Docs home',
      mainLabel: 'Main navigation',
      guides: 'Guides',
      apiReference: 'API Reference',
      github: 'GitHub',
    },
    hero: {
      title: 'One chat interface. Every character you can imagine.',
      description:
        'Connect OpenAI, Claude, Gemini, and more through a consistent, strongly typed API built for responsive AI character experiences.',
      startBuilding: 'Start building',
      readReadme: 'Read the README',
      codeLabel: 'Quick start code example',
    },
    trust: {
      label: 'Package highlights',
      providers: 'Typed provider abstraction',
      streaming: 'Streaming by default',
      runtimes: 'Browser and server runtimes',
    },
    docs: {
      eyebrow: 'Build with confidence',
      title: 'Everything a conversational product needs',
      description:
        'Keep the application layer stable while providers and models evolve underneath it.',
      providersTitle: 'Unified providers',
      providersDescription:
        'Create OpenAI, Claude, Gemini, and other services from one factory with a consistent message contract.',
      providersLink: 'Explore providers',
      streamingTitle: 'Token streaming',
      streamingDescription:
        'Render each partial response as it arrives so character and support experiences feel immediate.',
      streamingLink: 'View quick start',
      capabilitiesTitle: 'Tools, vision, and MCP',
      capabilitiesDescription:
        'Move beyond text with model-aware capabilities and structured integrations.',
      capabilitiesLink: 'See capabilities',
    },
    quickStart: {
      eyebrow: 'Quick start',
      title: 'From install to first response in minutes.',
    },
    supportCta: {
      title: 'Need a hand?',
      description:
        'Open the support widget to ask Onair-chan about installation, providers, streaming, tools, vision, or MCP.',
    },
    footer: {
      example: 'Support widget example',
    },
    chat: {
      panelLabel: 'AITuber OnAir support chat',
      online: 'Online',
      subtitle: 'AITuber OnAir support',
      openSettings: 'Open settings',
      settingsTitle: 'Settings',
      closeChat: 'Close support chat',
      close: 'Close',
      openChat: 'Open support chat',
      welcome:
        "Hi! I'm Onair-chan. Ask me anything about @aituber-onair/chat — providers, streaming, tools, vision, or setup.",
      setupTitle: 'Complete provider setup to start chatting',
      setupDescription: 'Demo settings stay in this browser.',
      openSettingsButton: 'Open settings',
      inputDisabledPlaceholder: 'Complete Settings to start chatting',
      inputPlaceholder: 'Ask about @aituber-onair/chat…',
      messageLabel: 'Message Onair-chan',
      sendMessage: 'Send message',
      typing: 'Onair-chan is typing',
      poweredBy: 'Powered by',
      providerErrorFallback:
        'The provider request failed. Check your API key and model settings.',
      providerErrorPrefix: "Sorry, I couldn't reach the provider.",
    },
    settings: {
      configuration: 'Configuration',
      title: 'Support bot settings',
      close: 'Close settings',
      provider: 'Provider',
      model: 'Model',
      modelPlaceholder: 'Model identifier',
      modelsLoaded: 'Loaded from the provider registry.',
      modelHelp: 'Enter the model exposed by your compatible server.',
      endpoint: 'Chat completions endpoint',
      endpointHelp: 'Use the full URL for your OpenAI-compatible endpoint.',
      geminiNanoHelp:
        "Gemini Nano runs through Chrome's built-in Prompt API and does not require an API key.",
      apiKey: 'API key',
      optional: 'optional',
      optionalBearerToken: 'Optional bearer token',
      apiKeyPlaceholder: 'API key',
      storageHelp: "Stored only in this browser's localStorage for the demo.",
      persona: 'Persona',
      personaHelp: 'This text is appended to the support system prompt.',
      cancel: 'Cancel',
      save: 'Save settings',
    },
  },
  ja: {
    document: {
      title: 'OnAir Docs — サポートウィジェット例',
      description:
        '@aituber-onair/chat を利用したカスタマーサポートウィジェットの実装例',
    },
    language: {
      label: '表示言語',
      english: '英語に切り替える',
      japanese: '日本語に切り替える',
    },
    nav: {
      homeLabel: 'OnAir Docs ホーム',
      mainLabel: 'メインナビゲーション',
      guides: 'ガイド',
      apiReference: 'APIリファレンス',
      github: 'GitHub',
    },
    hero: {
      title: 'ひとつのチャットAPIで、想像どおりのキャラクターを。',
      description:
        'OpenAI、Claude、Geminiなどを、レスポンシブなAIキャラクター体験のための一貫した型安全なAPIで接続できます。',
      startBuilding: '開発を始める',
      readReadme: 'READMEを読む',
      codeLabel: 'クイックスタートのコード例',
    },
    trust: {
      label: 'パッケージの特長',
      providers: '型安全なプロバイダー抽象化',
      streaming: '標準でストリーミング対応',
      runtimes: 'ブラウザとサーバーに対応',
    },
    docs: {
      eyebrow: '安心して開発',
      title: '会話プロダクトに必要な機能を、ひとつに',
      description:
        'プロバイダーやモデルが進化しても、アプリケーション層を安定したまま保てます。',
      providersTitle: '統一されたプロバイダー',
      providersDescription:
        'OpenAI、Claude、Geminiなどを、一貫したメッセージ形式で同じファクトリーから作成できます。',
      providersLink: 'プロバイダーを見る',
      streamingTitle: 'トークンストリーミング',
      streamingDescription:
        '応答を受け取った部分から描画し、キャラクターやサポート体験をすばやく届けます。',
      streamingLink: 'クイックスタートを見る',
      capabilitiesTitle: 'ツール・画像入力・MCP',
      capabilitiesDescription:
        'モデルに応じた機能と構造化された連携で、テキストの先へ進めます。',
      capabilitiesLink: '対応機能を見る',
    },
    quickStart: {
      eyebrow: 'クイックスタート',
      title: 'インストールから最初の応答まで、わずか数分。',
    },
    supportCta: {
      title: 'お困りですか？',
      description:
        'サポートウィジェットを開き、インストール、プロバイダー、ストリーミング、ツール、画像入力、MCPについてOnair-chanに質問できます。',
    },
    footer: {
      example: 'サポートウィジェット例',
    },
    chat: {
      panelLabel: 'AITuber OnAir サポートチャット',
      online: 'オンライン',
      subtitle: 'AITuber OnAir サポート',
      openSettings: '設定を開く',
      settingsTitle: '設定',
      closeChat: 'サポートチャットを閉じる',
      close: '閉じる',
      openChat: 'サポートチャットを開く',
      welcome:
        'こんにちは、Onair-chanです。@aituber-onair/chat のプロバイダー、ストリーミング、ツール、画像入力、セットアップについて何でも聞いてください。',
      setupTitle: 'チャットを始めるにはプロバイダーを設定してください',
      setupDescription: 'デモ設定はこのブラウザ内に保存されます。',
      openSettingsButton: '設定を開く',
      inputDisabledPlaceholder: '設定を完了するとチャットできます',
      inputPlaceholder: '@aituber-onair/chat について質問する…',
      messageLabel: 'Onair-chanへのメッセージ',
      sendMessage: 'メッセージを送信',
      typing: 'Onair-chanが入力中',
      poweredBy: '提供',
      providerErrorFallback:
        'プロバイダーへのリクエストに失敗しました。APIキーとモデル設定を確認してください。',
      providerErrorPrefix: 'プロバイダーに接続できませんでした。',
    },
    settings: {
      configuration: '設定',
      title: 'サポートボット設定',
      close: '設定を閉じる',
      provider: 'プロバイダー',
      model: 'モデル',
      modelPlaceholder: 'モデルID',
      modelsLoaded: 'プロバイダー登録情報から読み込みました。',
      modelHelp: '互換サーバーが公開しているモデルIDを入力してください。',
      endpoint: 'Chat Completionsエンドポイント',
      endpointHelp: 'OpenAI互換エンドポイントの完全なURLを入力してください。',
      geminiNanoHelp:
        'Gemini NanoはChrome組み込みのPrompt APIで動作するため、APIキーは不要です。',
      apiKey: 'APIキー',
      optional: '任意',
      optionalBearerToken: '任意のBearerトークン',
      apiKeyPlaceholder: 'APIキー',
      storageHelp:
        'デモ用として、このブラウザのlocalStorageにのみ保存されます。',
      persona: 'ペルソナ',
      personaHelp: 'この文章はサポート用のシステムプロンプトに追加されます。',
      cancel: 'キャンセル',
      save: '設定を保存',
    },
  },
};

export const isLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'ja';

const detectBrowserLanguage = (): Language =>
  typeof navigator !== 'undefined' &&
  navigator.language.toLowerCase().startsWith('ja')
    ? 'ja'
    : 'en';

export const getInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { language?: unknown };
      if (isLanguage(parsed.language)) return parsed.language;
    }
  } catch {
    // Fall through to browser language detection.
  }

  return detectBrowserLanguage();
};

export const persistLanguage = (language: Language): void => {
  let settings: Record<string, unknown> = {};

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        settings = parsed as Record<string, unknown>;
      }
    }
  } catch {
    // Replace invalid demo settings with a valid language preference.
  }

  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...settings, language }),
  );
};

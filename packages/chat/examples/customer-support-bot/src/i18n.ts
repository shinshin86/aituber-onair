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
    displayName: string;
    avatarAlt: string;
    online: string;
    subtitle: string;
    openMenu: string;
    menuEyebrow: string;
    menuTitle: string;
    closeMenu: string;
    menuDescription: string;
    openAdminDashboard: string;
    closeChat: string;
    close: string;
    openChat: string;
    welcome: string;
    checkingStatus: string;
    notConfiguredTitle: string;
    notConfiguredDescription: string;
    statusUnavailableTitle: string;
    statusUnavailableDescription: string;
    inputDisabledPlaceholder: string;
    inputPlaceholder: string;
    messageLabel: string;
    sendMessage: string;
    typing: string;
    poweredBy: string;
    providerErrorFallback: string;
    providerErrorPrefix: string;
  };
  admin: {
    documentTitle: string;
    documentDescription: string;
    backToSite: string;
    configuration: string;
    title: string;
    intro: string;
    securityTitle: string;
    securityDescription: string;
    formLabel: string;
    loading: string;
    loadError: string;
    noProviders: string;
    provider: string;
    model: string;
    modelPlaceholder: string;
    modelsLoaded: string;
    modelHelp: string;
    endpoint: string;
    endpointHelp: string;
    apiKey: string;
    optional: string;
    apiKeyPlaceholder: string;
    apiKeyConfigured: string;
    apiKeyHelp: string;
    persona: string;
    personaHelp: string;
    personaResetPrompt: string;
    personaReset: string;
    personaKeep: string;
    save: string;
    saving: string;
    saved: string;
    saveError: string;
  };
}

const LEGACY_SETTINGS_STORAGE_KEY =
  'aituber-onair.chat.customer-support-bot.settings';
const LANGUAGE_STORAGE_KEY = 'aituber-onair.chat.customer-support-bot.language';

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
        'Open the support widget to ask the support assistant about installation, providers, streaming, tools, vision, or MCP.',
    },
    footer: {
      example: 'Support widget example',
    },
    chat: {
      panelLabel: 'AITuber OnAir support chat',
      displayName: 'Support',
      avatarAlt: 'Support assistant avatar',
      online: 'Online',
      subtitle: 'AITuber OnAir',
      openMenu: 'Open support options',
      menuEyebrow: 'Support options',
      menuTitle: 'Widget settings',
      closeMenu: 'Close support options',
      menuDescription:
        'Use the EN/JA switch in the site header to change language. Provider settings are managed securely on the server.',
      openAdminDashboard: 'Open admin dashboard',
      closeChat: 'Close support chat',
      close: 'Close',
      openChat: 'Open support chat',
      welcome:
        "Hi! I'm the support assistant for AITuber OnAir. Ask me anything about @aituber-onair/chat — providers, streaming, tools, vision, or setup.",
      checkingStatus: 'Checking support availability…',
      notConfiguredTitle: 'The support assistant is not configured yet',
      notConfiguredDescription:
        'An operator can finish setup in the admin dashboard.',
      statusUnavailableTitle: 'The support service is unavailable',
      statusUnavailableDescription:
        'Start the Node server and try opening the widget again.',
      inputDisabledPlaceholder: 'Support is not available yet',
      inputPlaceholder: 'Ask about @aituber-onair/chat…',
      messageLabel: 'Message the support assistant',
      sendMessage: 'Send message',
      typing: 'The support assistant is typing',
      poweredBy: 'Powered by',
      providerErrorFallback:
        'The support request failed. Please try again later.',
      providerErrorPrefix: 'Sorry, support is unavailable.',
    },
    admin: {
      documentTitle: 'Support Admin — AITuber OnAir',
      documentDescription:
        'Server-side provider settings for the customer support bot example',
      backToSite: 'Back to site',
      configuration: 'Configuration',
      title: 'Support admin dashboard',
      intro:
        'Configure the server-side provider used by the customer support widget.',
      securityTitle: 'Demo admin routes are unauthenticated',
      securityDescription:
        'Add real authentication and authorization before using this pattern in production.',
      formLabel: 'Support provider configuration',
      loading: 'Loading server settings…',
      loadError: 'Could not load settings from the Node server.',
      noProviders: 'No server providers are available.',
      provider: 'Provider',
      model: 'Model',
      modelPlaceholder: 'Model identifier',
      modelsLoaded: 'Loaded from the provider registry.',
      modelHelp: 'Enter the model exposed by your compatible server.',
      endpoint: 'Chat completions endpoint',
      endpointHelp: 'Use the full URL for your OpenAI-compatible endpoint.',
      apiKey: 'API key',
      optional: 'optional',
      apiKeyPlaceholder: 'Enter a server-side API key',
      apiKeyConfigured: 'A masked API key is already configured',
      apiKeyHelp:
        'Leave blank to keep the stored key. The browser never receives the raw value.',
      persona: 'Persona',
      personaHelp: 'This text is appended to the support system prompt.',
      personaResetPrompt:
        'Reset the customized persona to the English default?',
      personaReset: 'Use English default',
      personaKeep: 'Keep current persona',
      save: 'Save server settings',
      saving: 'Saving…',
      saved: 'Server settings saved.',
      saveError: 'Could not save server settings.',
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
        'サポートウィジェットを開き、インストール、プロバイダー、ストリーミング、ツール、画像入力、MCPについてサポートアシスタントに質問できます。',
    },
    footer: {
      example: 'サポートウィジェット例',
    },
    chat: {
      panelLabel: 'AITuber OnAir サポートチャット',
      displayName: 'サポート',
      avatarAlt: 'サポートアシスタントのアバター',
      online: 'オンライン',
      subtitle: 'AITuber OnAir',
      openMenu: 'サポートオプションを開く',
      menuEyebrow: 'サポートオプション',
      menuTitle: 'ウィジェット設定',
      closeMenu: 'サポートオプションを閉じる',
      menuDescription:
        '表示言語はサイト上部のEN／JAスイッチで変更できます。プロバイダー設定はサーバーで安全に管理されます。',
      openAdminDashboard: '管理ダッシュボードを開く',
      closeChat: 'サポートチャットを閉じる',
      close: '閉じる',
      openChat: 'サポートチャットを開く',
      welcome:
        'こんにちは。AITuber OnAirのサポートアシスタントです。@aituber-onair/chat のプロバイダー、ストリーミング、ツール、画像入力、セットアップについて何でも聞いてください。',
      checkingStatus: 'サポートの利用状況を確認しています…',
      notConfiguredTitle: 'サポートアシスタントはまだ設定されていません',
      notConfiguredDescription:
        '運用担当者が管理ダッシュボードで設定を完了できます。',
      statusUnavailableTitle: 'サポートサービスを利用できません',
      statusUnavailableDescription:
        'Nodeサーバーを起動してから、ウィジェットを開き直してください。',
      inputDisabledPlaceholder: 'サポートはまだ利用できません',
      inputPlaceholder: '@aituber-onair/chat について質問する…',
      messageLabel: 'サポートアシスタントへのメッセージ',
      sendMessage: 'メッセージを送信',
      typing: 'サポートアシスタントが入力中',
      poweredBy: '提供',
      providerErrorFallback:
        'サポートリクエストに失敗しました。しばらくしてからお試しください。',
      providerErrorPrefix: '申し訳ありません。サポートを利用できません。',
    },
    admin: {
      documentTitle: 'サポート管理 — AITuber OnAir',
      documentDescription:
        'カスタマーサポートボット例のサーバー側プロバイダー設定',
      backToSite: 'サイトに戻る',
      configuration: '設定',
      title: 'サポート管理ダッシュボード',
      intro:
        'カスタマーサポートウィジェットが使用するサーバー側プロバイダーを設定します。',
      securityTitle: 'デモの管理APIには認証がありません',
      securityDescription:
        '本番利用する前に、必ず認証と認可を追加してください。',
      formLabel: 'サポートプロバイダー設定',
      loading: 'サーバー設定を読み込んでいます…',
      loadError: 'Nodeサーバーから設定を読み込めませんでした。',
      noProviders: '利用可能なサーバープロバイダーがありません。',
      provider: 'プロバイダー',
      model: 'モデル',
      modelPlaceholder: 'モデルID',
      modelsLoaded: 'プロバイダー登録情報から読み込みました。',
      modelHelp: '互換サーバーが公開しているモデルIDを入力してください。',
      endpoint: 'Chat Completionsエンドポイント',
      endpointHelp: 'OpenAI互換エンドポイントの完全なURLを入力してください。',
      apiKey: 'APIキー',
      optional: '任意',
      apiKeyPlaceholder: 'サーバー側APIキーを入力',
      apiKeyConfigured: 'マスク済みのAPIキーが設定されています',
      apiKeyHelp:
        '空欄のまま保存すると現在のキーを維持します。生の値はブラウザへ返されません。',
      persona: 'ペルソナ',
      personaHelp: 'この文章はサポート用のシステムプロンプトに追加されます。',
      personaResetPrompt:
        'カスタマイズしたペルソナを日本語のデフォルトに戻しますか？',
      personaReset: '日本語のデフォルトを使う',
      personaKeep: '現在のペルソナを維持',
      save: 'サーバー設定を保存',
      saving: '保存中…',
      saved: 'サーバー設定を保存しました。',
      saveError: 'サーバー設定を保存できませんでした。',
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
  let language: Language | undefined;

  try {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(storedLanguage)) language = storedLanguage;

    if (!language) {
      const legacySettings = localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (legacySettings) {
        const parsed = JSON.parse(legacySettings) as { language?: unknown };
        if (isLanguage(parsed.language)) language = parsed.language;
      }
    }
  } catch {
    // Fall through to browser language detection.
  } finally {
    try {
      localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore unavailable browser storage in the example.
    }
  }

  if (language) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore unavailable browser storage in the example.
    }
    return language;
  }

  return detectBrowserLanguage();
};

export const persistLanguage = (language: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
  } catch {
    // Ignore unavailable browser storage in the example.
  }
};

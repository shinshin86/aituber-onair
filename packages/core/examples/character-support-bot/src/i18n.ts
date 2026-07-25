import type { SpeechRecognitionMessages } from './lib/speechRecognition';

export type Language = 'en' | 'ja';

interface TranslationRecord {
  document: {
    landingTitle: string;
    landingDescription: string;
    adminTitle: string;
    adminDescription: string;
  };
  language: {
    label: string;
    english: string;
    japanese: string;
  };
  brand: {
    landingSubtitle: string;
    adminSubtitle: string;
  };
  nav: {
    label: string;
    features: string;
    howItWorks: string;
    startBuilding: string;
  };
  hero: {
    titleLead: string;
    titleEmphasis: string;
    description: string;
    explore: string;
    meetMiko: string;
    typeScriptFirst: string;
    browserServer: string;
    providerAgnostic: string;
  };
  diagram: {
    label: string;
    orchestration: string;
    streamingLlm: string;
    expressiveTts: string;
    liveReaction: string;
    captionLead: string;
    captionEnd: string;
    capabilitiesLabel: string;
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    streamTitle: string;
    streamDescription: string;
    speakTitle: string;
    speakDescription: string;
    reactTitle: string;
    reactDescription: string;
  };
  flow: {
    eyebrow: string;
    title: string;
    coreTitle: string;
    coreDescription: string;
    proxyTitle: string;
    proxyDescription: string;
    audioTitle: string;
    audioDescription: string;
  };
  quickStart: {
    eyebrow: string;
    title: string;
    terminal: string;
    documentation: string;
  };
  footer: {
    example: string;
  };
  chat: {
    widgetLabel: string;
    panelLabel: string;
    kicker: string;
    speaking: string;
    online: string;
    settings: string;
    close: string;
    welcome: string;
    typing: string;
    checkingConfiguration: string;
    serverUnavailable: string;
    configurationRequired: string;
    startServer: string;
    addSettings: string;
    openAdmin: string;
    messageLabel: string;
    inputPlaceholder: string;
    send: string;
    poweredBy: string;
    closeWidget: string;
    openWidget: string;
    launcherKicker: string;
    launcherTitle: string;
    coreError: string;
  };
  voiceInput: SpeechRecognitionMessages & {
    pausedLabel: string;
    stopLabel: string;
    startLabel: string;
  };
  admin: {
    back: string;
    eyebrow: string;
    title: string;
    intro: string;
    securityTitle: string;
    securityDescription: string;
    loading: string;
    loadError: string;
    llmTitle: string;
    llmDescription: string;
    ttsTitle: string;
    ttsDescription: string;
    provider: string;
    model: string;
    chatEndpoint: string;
    speechEndpoint: string;
    apiKey: string;
    savedKeyPrefix: string;
    enterServerKey: string;
    persona: string;
    voice: string;
    speed: string;
    voiceId: string;
    loadVoices: string;
    loadingVoices: string;
    voicesLoaded: string;
    voiceListUnavailable: string;
    groupId: string;
    enterGroupId: string;
    mockProviderLabel: string;
    mockNote: string;
    save: string;
    saving: string;
    saved: string;
    saveError: string;
  };
}

const LANGUAGE_STORAGE_KEY =
  'aituber-onair.core.character-support-bot.language';

export const translations: Record<Language, TranslationRecord> = {
  en: {
    document: {
      landingTitle: 'AITuber OnAir Core — Character Support Bot',
      landingDescription:
        'A speaking character support bot built with AITuber OnAir Core.',
      adminTitle: 'Character Support Bot — Server Settings',
      adminDescription:
        'Server-side chat and voice settings for the character support bot.',
    },
    language: {
      label: 'Display language',
      english: 'Switch to English',
      japanese: 'Switch to Japanese',
    },
    brand: {
      landingSubtitle: 'Chat, voice, and avatar library',
      adminSubtitle: 'Character Support Bot',
    },
    nav: {
      label: 'Main navigation',
      features: 'Features',
      howItWorks: 'How it works',
      startBuilding: 'View setup',
    },
    hero: {
      titleLead: 'Streaming chat, TTS,',
      titleEmphasis: 'and avatar reactions.',
      description:
        '@aituber-onair/core coordinates partial LLM responses, synthesized audio, memory, and character events. This example shows the browser-and-server flow with Miko.',
      explore: 'See Core features',
      meetMiko: 'Open Miko demo',
      typeScriptFirst: 'TypeScript first',
      browserServer: 'Browser + server',
      providerAgnostic: 'Provider agnostic',
    },
    diagram: {
      label: 'AITuber OnAir event flow',
      orchestration: 'orchestration',
      streamingLlm: 'streaming LLM',
      expressiveTts: 'expressive TTS',
      liveReaction: 'live reaction',
      captionLead: 'Core coordinates chat,',
      captionEnd: 'speech, and reactions.',
      capabilitiesLabel: 'Core capabilities',
    },
    features: {
      eyebrow: 'What Core connects',
      title: 'Stream responses, synthesize speech, and react through one API.',
      description:
        'Choose the chat, voice, and avatar layers your app needs while Core emits the events that connect them.',
      streamTitle: 'Stream partial responses to the UI.',
      streamDescription:
        'Render text as the LLM produces it, then pass the completed answer to speech.',
      speakTitle: 'Send completed text to TTS.',
      speakDescription:
        'Use interchangeable voice engines and receive audio bytes for playback and analysis.',
      reactTitle: 'Map emotion and audio to the avatar.',
      reactDescription:
        'Turn screenplay emotion tags and speech amplitude into reactions, idle motion, and lip sync.',
    },
    flow: {
      eyebrow: 'How this example works',
      title: 'The Node server keeps API keys; the browser runs Miko.',
      coreTitle: 'Core streams through a same-origin endpoint',
      coreDescription:
        'The browser uses the OpenAI-compatible adapter with no API key.',
      proxyTitle: 'The Node proxy owns provider credentials',
      proxyDescription:
        'LLM and TTS keys are loaded from a gitignored settings file.',
      audioTitle: 'Audio bytes drive Miko’s mouth',
      audioDescription:
        'Web Audio analysis turns speech amplitude into live lip sync.',
    },
    quickStart: {
      eyebrow: 'Quick start',
      title:
        'Install Core, then connect the chat and voice providers you need.',
      terminal: 'Terminal',
      documentation: 'Read the documentation',
    },
    footer: {
      example: 'Character Support Bot example',
    },
    chat: {
      widgetLabel: 'Character support',
      panelLabel: 'Chat with Miko',
      kicker: 'Character support',
      speaking: 'Speaking now',
      online: 'Online',
      settings: 'Settings',
      close: 'Close support',
      welcome: 'Hi! I’m Miko. Ask me anything about AITuber OnAir Core.',
      typing: 'Miko is typing',
      checkingConfiguration: 'Checking server configuration…',
      serverUnavailable: 'Support server unavailable',
      configurationRequired: 'Configuration required',
      startServer: 'Start the example server and try again.',
      addSettings: 'Add the server-side LLM and TTS settings to begin.',
      openAdmin: 'Open admin',
      messageLabel: 'Message Miko',
      inputPlaceholder: 'Ask Miko about Core…',
      send: 'Send',
      poweredBy: 'Powered by',
      closeWidget: 'Close character support',
      openWidget: 'Open character support',
      launcherKicker: 'Need a hand?',
      launcherTitle: 'Ask Miko',
      coreError:
        'I could not complete that request. Check the server configuration and try again.',
    },
    voiceInput: {
      startError: 'Voice input could not start. You can keep typing instead.',
      noSpeech: 'No speech was detected. Try again or keep typing.',
      permissionDenied:
        'Microphone access was denied. You can keep typing instead.',
      noMicrophone: 'No microphone is available. You can keep typing instead.',
      networkError:
        'Voice input is temporarily unavailable. You can keep typing.',
      stopped: 'Voice input stopped. You can keep typing instead.',
      paused: 'Voice input paused while Miko is speaking.',
      listening: 'Listening in {language}…',
      starting: 'Starting voice input…',
      pausedLabel: 'Voice input paused while Miko speaks',
      stopLabel: 'Stop voice input',
      startLabel: 'Start voice input',
    },
    admin: {
      back: 'Back to example',
      eyebrow: 'Server-side configuration',
      title: 'Connect Miko’s chat and voice',
      intro:
        'Provider credentials are saved only by the local Node server. The browser receives masked values and calls same-origin proxy routes.',
      securityTitle: 'Local demo only — do not expose this admin page.',
      securityDescription:
        'This example intentionally has no authentication. Add access control, CSRF protection, and deployment-specific secret storage before adapting it for any public environment.',
      loading: 'Loading configuration…',
      loadError: 'The configuration could not be loaded.',
      llmTitle: 'Language model',
      llmDescription:
        'The Node server calls this provider through @aituber-onair/chat.',
      ttsTitle: 'Text-to-speech',
      ttsDescription:
        'Audio bytes return through the server proxy so the browser can play them and drive Miko’s lip sync.',
      provider: 'Provider',
      model: 'Model',
      chatEndpoint: 'Chat completions endpoint',
      speechEndpoint: 'Speech endpoint',
      apiKey: 'API key',
      savedKeyPrefix: 'Saved:',
      enterServerKey: 'Enter a server-side key',
      persona: 'Character persona',
      voice: 'Voice',
      speed: 'Speed',
      voiceId: 'Voice or speaker ID',
      loadVoices: 'Load available voices',
      loadingVoices: 'Loading voices…',
      voicesLoaded: '{count} voices loaded. You can also enter an ID manually.',
      voiceListUnavailable:
        'The voice list is unavailable. Enter a voice or speaker ID manually.',
      groupId: 'Group ID',
      enterGroupId: 'Enter the MiniMax Group ID',
      mockProviderLabel: 'Built-in mock (development)',
      mockNote:
        'The built-in mock returns a short generated WAV for local lip-sync testing. It is not a production TTS provider.',
      save: 'Save server settings',
      saving: 'Saving…',
      saved: 'Server settings saved. The character widget is ready to retry.',
      saveError: 'Could not save the server configuration.',
    },
  },
  ja: {
    document: {
      landingTitle: 'AITuber OnAir Core — キャラクターサポートボット',
      landingDescription:
        'AITuber OnAir Coreで構築した、音声とアバター付きのキャラクターサポートボットです。',
      adminTitle: 'キャラクターサポートボット — サーバー設定',
      adminDescription:
        'キャラクターサポートボットのサーバー側チャット・音声設定です。',
    },
    language: {
      label: '表示言語',
      english: '英語に切り替える',
      japanese: '日本語に切り替える',
    },
    brand: {
      landingSubtitle: 'チャット・音声・アバター連携ライブラリ',
      adminSubtitle: 'キャラクターサポートボット',
    },
    nav: {
      label: 'メインナビゲーション',
      features: '特長',
      howItWorks: '仕組み',
      startBuilding: 'セットアップを見る',
    },
    hero: {
      titleLead: 'チャット、音声、アバターを',
      titleEmphasis: 'Coreで連携。',
      description:
        '@aituber-onair/coreは、LLMの部分応答、音声合成、メモリ、キャラクターイベントを連携します。このサンプルでは、ミコを使ってブラウザとサーバーの一連の流れを確認できます。',
      explore: 'Coreの機能を見る',
      meetMiko: 'ミコのデモを開く',
      typeScriptFirst: 'TypeScriptファースト',
      browserServer: 'ブラウザ + サーバー',
      providerAgnostic: 'プロバイダー非依存',
    },
    diagram: {
      label: 'AITuber OnAirのイベントフロー',
      orchestration: 'オーケストレーション',
      streamingLlm: 'LLMストリーミング',
      expressiveTts: '表現豊かなTTS',
      liveReaction: 'リアルタイム反応',
      captionLead: 'Coreがチャット、音声、',
      captionEnd: 'リアクションを連携。',
      capabilitiesLabel: 'Coreの機能',
    },
    features: {
      eyebrow: 'Coreが連携する機能',
      title: '応答表示、音声合成、アバター反応をひとつのAPIで連携。',
      description:
        'アプリに必要なチャット、音声、アバターを選び、Coreのイベントで接続できます。',
      streamTitle: '部分応答をすぐにUIへ表示。',
      streamDescription:
        'LLMが生成中のテキストを表示し、完成した回答を音声合成へ渡します。',
      speakTitle: '完成したテキストをTTSへ送信。',
      speakDescription:
        '交換可能な音声エンジンを使い、再生や解析に使える音声データを受け取ります。',
      reactTitle: '感情と音声をアバターへ反映。',
      reactDescription:
        '台本の感情タグと音声振幅を、リアクション、待機モーション、リップシンクへ変換します。',
    },
    flow: {
      eyebrow: 'このサンプルの仕組み',
      title: 'APIキーはNodeサーバーで管理し、ミコはブラウザで動作。',
      coreTitle: 'Coreは同一オリジンのエンドポイントへ接続',
      coreDescription:
        'ブラウザはAPIキーなしでOpenAI互換アダプターを利用します。',
      proxyTitle: 'Nodeプロキシが認証情報を管理',
      proxyDescription:
        'LLMとTTSのキーはgitignore対象の設定ファイルから読み込みます。',
      audioTitle: '音声データでミコの口を動かす',
      audioDescription:
        'Web Audio解析で音声の振幅をリアルタイムのリップシンクへ変換します。',
    },
    quickStart: {
      eyebrow: 'クイックスタート',
      title: 'Coreをインストールし、必要なチャット・音声を接続します。',
      terminal: 'ターミナル',
      documentation: 'ドキュメントを読む',
    },
    footer: {
      example: 'キャラクターサポートボット例',
    },
    chat: {
      widgetLabel: 'キャラクターサポート',
      panelLabel: 'ミコとチャット',
      kicker: 'キャラクターサポート',
      speaking: '発話中',
      online: 'オンライン',
      settings: '設定',
      close: 'サポートを閉じる',
      welcome:
        'こんにちは、ミコです。AITuber OnAir Coreについて何でも聞いてください。',
      typing: 'ミコが入力中',
      checkingConfiguration: 'サーバー設定を確認しています…',
      serverUnavailable: 'サポートサーバーを利用できません',
      configurationRequired: '設定が必要です',
      startServer: 'サンプルサーバーを起動して、もう一度お試しください。',
      addSettings: 'サーバー側のLLMとTTSを設定してください。',
      openAdmin: '管理画面を開く',
      messageLabel: 'ミコへのメッセージ',
      inputPlaceholder: 'Coreについてミコに質問…',
      send: '送信',
      poweredBy: '提供',
      closeWidget: 'キャラクターサポートを閉じる',
      openWidget: 'キャラクターサポートを開く',
      launcherKicker: 'お困りですか？',
      launcherTitle: 'ミコに聞く',
      coreError:
        'リクエストを完了できませんでした。サーバー設定を確認して、もう一度お試しください。',
    },
    voiceInput: {
      startError: '音声入力を開始できませんでした。文字入力は利用できます。',
      noSpeech: '音声を認識できませんでした。もう一度お試しください。',
      permissionDenied:
        'マイクの使用が許可されていません。文字入力は利用できます。',
      noMicrophone: 'マイクを利用できません。文字入力は利用できます。',
      networkError:
        '音声入力を一時的に利用できません。文字入力は利用できます。',
      stopped: '音声入力が停止しました。文字入力は利用できます。',
      paused: 'ミコの発話中は音声入力を一時停止します。',
      listening: '{language}で音声を認識しています…',
      starting: '音声入力を開始しています…',
      pausedLabel: 'ミコの発話中は音声入力を一時停止',
      stopLabel: '音声入力を停止',
      startLabel: '音声入力を開始',
    },
    admin: {
      back: 'サンプルに戻る',
      eyebrow: 'サーバー側設定',
      title: 'ミコのチャットと音声を接続',
      intro:
        'プロバイダーの認証情報はローカルNodeサーバーだけに保存されます。ブラウザはマスク済みの値を受け取り、同一オリジンのプロキシを呼び出します。',
      securityTitle: 'ローカルデモ専用 — 管理画面を公開しないでください。',
      securityDescription:
        'このサンプルには意図的に認証がありません。公開環境へ応用する前に、アクセス制御、CSRF対策、環境に適したシークレット管理を追加してください。',
      loading: '設定を読み込んでいます…',
      loadError: '設定を読み込めませんでした。',
      llmTitle: '言語モデル',
      llmDescription:
        'Nodeサーバーは@aituber-onair/chatを通じて、このプロバイダーを呼び出します。',
      ttsTitle: 'テキスト読み上げ',
      ttsDescription:
        'ブラウザが音声を再生してミコのリップシンクへ利用できるよう、音声データをサーバープロキシ経由で返します。',
      provider: 'プロバイダー',
      model: 'モデル',
      chatEndpoint: 'Chat Completionsエンドポイント',
      speechEndpoint: '音声エンドポイント',
      apiKey: 'APIキー',
      savedKeyPrefix: '保存済み:',
      enterServerKey: 'サーバー側APIキーを入力',
      persona: 'キャラクターのペルソナ',
      voice: '音声',
      speed: '速度',
      voiceId: '音声または話者ID',
      loadVoices: '利用可能な音声を取得',
      loadingVoices: '音声一覧を取得中…',
      voicesLoaded:
        '{count}件の音声を取得しました。IDを直接入力することもできます。',
      voiceListUnavailable:
        '音声一覧を取得できませんでした。音声または話者IDを直接入力してください。',
      groupId: 'グループID',
      enterGroupId: 'MiniMaxのグループIDを入力',
      mockProviderLabel: '組み込みモック（開発用）',
      mockNote:
        '組み込みモックは、ローカルのリップシンク確認用に短いWAVを生成します。本番用のTTSプロバイダーではありません。',
      save: 'サーバー設定を保存',
      saving: '保存中…',
      saved:
        'サーバー設定を保存しました。キャラクターウィジェットから再試行できます。',
      saveError: 'サーバー設定を保存できませんでした。',
    },
  },
};

export const isLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'ja';

export const detectBrowserLanguage = (browserLanguage?: string): Language =>
  browserLanguage?.toLowerCase().startsWith('ja') ? 'ja' : 'en';

export const resolveInitialLanguage = (
  storedLanguage: unknown,
  browserLanguage?: string,
): Language =>
  isLanguage(storedLanguage)
    ? storedLanguage
    : detectBrowserLanguage(browserLanguage);

export const getInitialLanguage = (): Language => {
  let storedLanguage: unknown;
  try {
    storedLanguage =
      typeof localStorage === 'undefined'
        ? undefined
        : localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // Fall through to browser language detection.
  }

  return resolveInitialLanguage(
    storedLanguage,
    typeof navigator === 'undefined' ? undefined : navigator.language,
  );
};

export const persistLanguage = (language: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore unavailable browser storage in the example.
  }
};

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
    optionalVoice: string;
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
      landingSubtitle: 'Open source character toolkit',
      adminSubtitle: 'Character Support Bot',
    },
    nav: {
      label: 'Main navigation',
      features: 'Features',
      howItWorks: 'How it works',
      startBuilding: 'Start building',
    },
    hero: {
      titleLead: 'Give your AI',
      titleEmphasis: 'a face and a voice.',
      description:
        'One event-driven core connects streaming chat, expressive speech, memory, and animated characters—without locking your app to one provider.',
      explore: 'Explore the core',
      meetMiko: 'Meet Miko',
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
      captionLead: 'Events in.',
      captionEnd: 'Character out.',
      capabilitiesLabel: 'Core capabilities',
    },
    features: {
      eyebrow: 'BUILT FOR CHARACTERS',
      title: 'Everything moves through one clear event flow.',
      description:
        'Keep the experience responsive while swapping the providers and presentation layers underneath it.',
      streamTitle: 'Responses arrive as they happen.',
      streamDescription:
        'Partial-response events let your interface feel immediate while the complete answer moves into speech.',
      speakTitle: 'Voice is part of the orchestration.',
      speakDescription:
        'Route text through interchangeable TTS engines and receive the audio bytes your character animation needs.',
      reactTitle: 'Emotion becomes visible behavior.',
      reactDescription:
        'Parse screenplay emotion tags into avatar reactions, blinks, idle motion, and audio-driven lip sync.',
    },
    flow: {
      eyebrow: 'HOW THIS EXAMPLE WORKS',
      title: 'Keys stay on the server. The character stays in the browser.',
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
      eyebrow: 'QUICK START',
      title: 'Build a character, not a pile of integrations.',
      terminal: 'TERMINAL',
      documentation: 'Read the documentation',
    },
    footer: {
      example: 'Character Support Bot example',
    },
    chat: {
      widgetLabel: 'Character support',
      panelLabel: 'Chat with Miko',
      kicker: 'CHARACTER SUPPORT',
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
      inputPlaceholder: 'Ask about setup, chat, voice, or events…',
      send: 'Send',
      poweredBy: 'Powered by',
      closeWidget: 'Close character support',
      openWidget: 'Open character support',
      launcherKicker: 'NEED A HAND?',
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
      eyebrow: 'SERVER-SIDE CONFIGURATION',
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
      optionalVoice: 'Optional voice ID',
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
      landingSubtitle: 'オープンソースのキャラクターツールキット',
      adminSubtitle: 'キャラクターサポートボット',
    },
    nav: {
      label: 'メインナビゲーション',
      features: '特長',
      howItWorks: '仕組み',
      startBuilding: '開発を始める',
    },
    hero: {
      titleLead: 'AIに',
      titleEmphasis: '顔と声を。',
      description:
        'イベント駆動のCoreひとつで、ストリーミングチャット、表現豊かな音声、メモリ、アニメーションキャラクターを接続。特定のプロバイダーに縛られません。',
      explore: 'Coreを見る',
      meetMiko: 'ミコと話す',
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
      captionLead: 'イベントを受け取り、',
      captionEnd: 'キャラクターが動く。',
      capabilitiesLabel: 'Coreの機能',
    },
    features: {
      eyebrow: 'キャラクターのための設計',
      title: 'すべてが、ひとつの明確なイベントフローで動きます。',
      description:
        'プロバイダーや表示レイヤーを交換しても、レスポンシブな体験を保てます。',
      streamTitle: '応答を届いた瞬間から表示。',
      streamDescription:
        '部分応答イベントでUIへすぐに反映し、完成した回答を音声へつなげます。',
      speakTitle: '音声もオーケストレーションの一部。',
      speakDescription:
        '交換可能なTTSエンジンへテキストを渡し、キャラクターアニメーションに必要な音声データを受け取れます。',
      reactTitle: '感情を見える動きに変換。',
      reactDescription:
        '台本の感情タグを、アバターのリアクション、まばたき、待機モーション、音声連動のリップシンクへ変換します。',
    },
    flow: {
      eyebrow: 'このサンプルの仕組み',
      title: 'キーはサーバーに置いたまま。キャラクターはブラウザで動きます。',
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
      title: '連携処理の寄せ集めではなく、キャラクターを作ろう。',
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
      inputPlaceholder: 'セットアップ、チャット、音声、イベントについて質問…',
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
      optionalVoice: '任意の音声ID',
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

export const DISPLAY_LANGUAGES = ['en', 'ja'] as const;

export type DisplayLanguage = (typeof DISPLAY_LANGUAGES)[number];

const englishMessages = {
  pageTitle: 'AITuber OnAir Transcription',
  metaDescription: 'Minimal browser example for @aituber-onair/transcription',
  displayLanguage: 'Language',
  heroTitle: 'Browser transcription check',
  heroCopy:
    'Test Web Speech and OpenAI Realtime through the same session API. Final transcripts remain on this page and are never auto-submitted.',
  sessionSettings: 'Session settings',
  checkingSupport: 'Checking support',
  browserSupported: 'Supported',
  unsupported: 'Unsupported',
  provider: 'Provider',
  recognitionLanguage: 'Recognition language',
  webSpeechHint: 'Availability and recognition behavior depend on the browser.',
  openAIApiKey: 'End-user OpenAI API key',
  openAIApiKeyPlaceholder: 'Not stored by this example',
  openAIApiKeyHint: 'The key is read from this field when the session starts.',
  browserByokRisk:
    'Browser BYOK exposes the standard key to the page runtime, extensions, XSS, and local device access. Use only your own restricted test key and revoke it after testing.',
  expectedLanguages: 'Expected languages',
  commaSeparatedLanguages: 'Comma-separated language codes',
  delay: 'Delay',
  delayMinimal: 'Minimal',
  delayLow: 'Low',
  delayMedium: 'Medium',
  delayHigh: 'High',
  delayExtraHigh: 'Extra high',
  keywords: 'Keywords',
  keywordsHint: 'Comma-separated; <, >, and line breaks are rejected',
  contextPrompt: 'Context prompt',
  contextPromptValue: 'An AITuber livestream in Japanese and English.',
  openAICost:
    'OpenAI usage may incur charges while the session is listening, including silent periods.',
  liveOutput: 'Live output',
  startMicrophone: 'Start microphone',
  stop: 'Stop',
  clear: 'Clear',
  interim: 'Interim',
  waitingForAudio: 'Waiting for audio…',
  finalUtterances: 'Final utterances',
  noFinalTranscript: 'No final transcript yet.',
  stateIdle: 'Idle',
  stateConnecting: 'Connecting',
  stateListening: 'Listening',
  stateStopping: 'Stopping',
  stateError: 'Error',
  stateDisposed: 'Disposed',
  errorUnsupportedProvider:
    'The selected transcription provider is unavailable in this browser.',
  errorInsecureContext:
    'OpenAI Realtime transcription requires HTTPS or localhost.',
  errorPermissionDenied: 'Microphone permission was denied.',
  errorNoSpeech: 'No speech was detected.',
  errorAuthenticationFailed: 'OpenAI authentication failed.',
  errorClientSecretFailed:
    'The browser could not create an OpenAI Realtime client secret.',
  errorConnectionFailed: 'The transcription connection failed.',
  errorProvider: 'The transcription provider returned an error.',
  errorInvalidConfiguration: 'The transcription settings are invalid.',
  errorSessionDisposed: 'The transcription session has already been disposed.',
} as const;

export type TranslationKey = keyof typeof englishMessages;
type Messages = Record<TranslationKey, string>;

const japaneseMessages: Messages = {
  pageTitle: 'AITuber OnAir 文字起こし',
  metaDescription: '@aituber-onair/transcription のブラウザサンプル',
  displayLanguage: '表示言語',
  heroTitle: 'ブラウザ文字起こしチェック',
  heroCopy:
    'Web Speech と OpenAI Realtime を共通のセッションAPIで試せます。確定した文字起こしはこの画面にだけ表示され、自動送信されません。',
  sessionSettings: 'セッション設定',
  checkingSupport: '対応状況を確認中',
  browserSupported: '対応済み',
  unsupported: '未対応',
  provider: 'プロバイダー',
  recognitionLanguage: '認識言語',
  webSpeechHint: '利用可否と認識動作はブラウザによって異なります。',
  openAIApiKey: '利用者自身の OpenAI API キー',
  openAIApiKeyPlaceholder: 'このサンプルには保存されません',
  openAIApiKeyHint: 'セッション開始時に、この入力欄からキーを読み取ります。',
  browserByokRisk:
    '入力したOpenAI APIキーは、セッション開始時の認証にだけ使用され、このサンプルには保存されません。ご自身の端末とAPIキーでお試しください。',
  expectedLanguages: '想定言語',
  commaSeparatedLanguages: '言語コードをカンマ区切りで入力',
  delay: '遅延',
  delayMinimal: '最小',
  delayLow: '低',
  delayMedium: '中',
  delayHigh: '高',
  delayExtraHigh: '最大',
  keywords: 'キーワード',
  keywordsHint: 'カンマ区切り。<、>、改行は使用できません',
  contextPrompt: 'コンテキストプロンプト',
  contextPromptValue: '日本語と英語のAITuber配信です。',
  openAICost:
    'セッションの待機中は、無音の時間を含めてOpenAIの利用料金が発生する場合があります。',
  liveOutput: 'リアルタイム出力',
  startMicrophone: 'マイクを開始',
  stop: '停止',
  clear: 'クリア',
  interim: '認識途中',
  waitingForAudio: '音声を待っています…',
  finalUtterances: '確定した発話',
  noFinalTranscript: '確定した文字起こしはまだありません。',
  stateIdle: '待機中',
  stateConnecting: '接続中',
  stateListening: '認識中',
  stateStopping: '停止中',
  stateError: 'エラー',
  stateDisposed: '終了済み',
  errorUnsupportedProvider:
    '選択した文字起こし方式は、このブラウザでは利用できません。',
  errorInsecureContext:
    'OpenAI Realtimeの文字起こしには、HTTPSまたはlocalhostが必要です。',
  errorPermissionDenied: 'マイクの使用が許可されませんでした。',
  errorNoSpeech: '音声を検出できませんでした。',
  errorAuthenticationFailed: 'OpenAIの認証に失敗しました。',
  errorClientSecretFailed:
    'OpenAI Realtimeのクライアントシークレットを発行できませんでした。',
  errorConnectionFailed: '文字起こしサービスへ接続できませんでした。',
  errorProvider: '文字起こしサービスからエラーが返されました。',
  errorInvalidConfiguration: '文字起こしの設定が正しくありません。',
  errorSessionDisposed: '文字起こしセッションはすでに終了しています。',
};

const messages: Record<DisplayLanguage, Messages> = {
  en: englishMessages,
  ja: japaneseMessages,
};

export function isDisplayLanguage(value: string): value is DisplayLanguage {
  return DISPLAY_LANGUAGES.some((language) => language === value);
}

export function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(englishMessages, value);
}

export function detectDisplayLanguage(
  browserLanguages: readonly string[]
): DisplayLanguage {
  return browserLanguages.some((language) =>
    language.toLowerCase().startsWith('ja')
  )
    ? 'ja'
    : 'en';
}

export function translate(
  language: DisplayLanguage,
  key: TranslationKey
): string {
  return messages[language][key];
}

export function translatedValues(key: TranslationKey): string[] {
  return DISPLAY_LANGUAGES.map((language) => messages[language][key]);
}

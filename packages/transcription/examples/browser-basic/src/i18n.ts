export const DISPLAY_LANGUAGES = ['en', 'ja'] as const;

export type DisplayLanguage = (typeof DISPLAY_LANGUAGES)[number];

const englishMessages = {
  pageTitle: 'AITuber OnAir Transcription',
  metaDescription: 'Minimal browser example for @aituber-onair/transcription',
  displayLanguage: 'Language',
  heroTitle: 'Try realtime transcription',
  heroCopy:
    'Transcribe microphone audio with Web Speech, OpenAI Realtime, or Local Whisper. Results are not submitted as chat messages automatically.',
  sessionSettings: 'Transcription settings',
  checkingSupport: 'Checking availability',
  browserSupported: 'Available',
  unsupported: 'Unavailable',
  provider: 'Transcription provider',
  recognitionLanguage: 'Recognition language',
  webSpeechHint: 'Availability and recognition quality vary by browser.',
  openAIApiKey: 'OpenAI API key',
  openAIApiKeyPlaceholder: 'Enter your OpenAI API key',
  openAIApiKeyHint: 'Use a key from your own OpenAI account.',
  browserByokNotice:
    'This example connects to OpenAI directly from your browser. Avoid using it on a shared device.',
  expectedLanguages: 'Transcription languages',
  commaSeparatedLanguages:
    'Comma-separated language codes (for example: ja,en)',
  delay: 'Transcription delay',
  delayMinimal: 'Minimal',
  delayLow: 'Low',
  delayMedium: 'Medium',
  delayHigh: 'High',
  delayExtraHigh: 'Extra high',
  keywords: 'Recognition keywords',
  keywordsValue: 'OpenAI, realtime transcription',
  keywordsHint:
    'Comma-separated. The characters < and > and line breaks are not allowed.',
  contextPrompt: 'Conversation context',
  contextPromptValue: 'An English conversation recorded through a microphone.',
  openAICost:
    'OpenAI usage may be billed while transcription is running, including during silence.',
  localWhisperLanguage: 'Language hint',
  localWhisperLanguageHint:
    'Optional BCP 47 language code. Leave blank for automatic detection.',
  localWhisperSilence: 'End silence (ms)',
  localWhisperSilenceHint:
    'Minimum 150 ms. Lower values finalize speech sooner.',
  localWhisperNotice:
    'WebGPU is required. The first start downloads about 120 MB and caches it in the browser. Microphone audio stays in this browser.',
  liveOutput: 'Transcription results',
  startMicrophone: 'Start transcription',
  stop: 'Stop',
  clear: 'Clear',
  interim: 'In progress',
  waitingForAudio: 'Waiting for audio…',
  finalUtterances: 'Final results',
  noFinalTranscript: 'No final results yet.',
  stateIdle: 'Idle',
  stateConnecting: 'Connecting',
  stateListening: 'Listening',
  stateStopping: 'Stopping',
  stateError: 'Error',
  stateDisposed: 'Disposed',
  progressDownloadModel: 'Downloading model (first use only, about 120 MB)',
  progressInitializeModel: 'Initializing model',
  errorUnsupportedProvider:
    'The selected transcription provider is unavailable in this browser.',
  errorInsecureContext: 'Microphone transcription requires HTTPS or localhost.',
  errorPermissionDenied: 'Microphone permission was denied.',
  errorNoSpeech: 'No speech was detected.',
  errorAuthenticationFailed:
    'OpenAI authentication failed. Check the API key and try again.',
  errorClientSecretFailed:
    'OpenAI connection setup failed. Wait a moment and try again.',
  errorConnectionFailed:
    'The transcription service could not be reached. Wait a moment and try again.',
  errorProvider: 'Transcription failed. Please try again.',
  errorInvalidConfiguration: 'Check the transcription settings and try again.',
  errorSessionDisposed: 'The transcription session has already been disposed.',
} as const;

export type TranslationKey = keyof typeof englishMessages;
type Messages = Record<TranslationKey, string>;

const japaneseMessages: Messages = {
  pageTitle: 'AITuber OnAir 文字起こし',
  metaDescription: '@aituber-onair/transcription のブラウザサンプル',
  displayLanguage: '表示言語',
  heroTitle: 'リアルタイム文字起こしを試す',
  heroCopy:
    'Web Speech、OpenAI Realtime、Local Whisperで、マイク音声をリアルタイムに文字起こしできます。結果がチャットへ自動送信されることはありません。',
  sessionSettings: '文字起こし設定',
  checkingSupport: '利用可否を確認中',
  browserSupported: '利用可能',
  unsupported: '利用不可',
  provider: '文字起こし方式',
  recognitionLanguage: '認識言語',
  webSpeechHint: '利用可否や認識精度はブラウザによって異なります。',
  openAIApiKey: 'OpenAI APIキー',
  openAIApiKeyPlaceholder: 'OpenAI APIキーを入力',
  openAIApiKeyHint: 'ご自身のOpenAIアカウントのAPIキーを入力してください。',
  browserByokNotice:
    'このサンプルはブラウザからOpenAIへ直接接続します。共有端末での利用は避けてください。',
  expectedLanguages: '文字起こしする言語',
  commaSeparatedLanguages: '言語コードをカンマ区切りで入力（例：ja,en）',
  delay: '文字起こしの遅延',
  delayMinimal: '最小',
  delayLow: '低',
  delayMedium: '中',
  delayHigh: '高',
  delayExtraHigh: '最大',
  keywords: '認識キーワード',
  keywordsValue: 'OpenAI, リアルタイム文字起こし',
  keywordsHint: 'カンマ区切りで入力（<、>、改行は使用不可）',
  contextPrompt: '会話の背景',
  contextPromptValue: 'マイクから入力された日本語の会話です。',
  openAICost:
    '文字起こし中は、無音の時間を含めてOpenAIの利用料金が発生する場合があります。',
  localWhisperLanguage: '言語ヒント',
  localWhisperLanguageHint:
    '任意のBCP 47言語コードです。空欄にすると自動判定します。',
  localWhisperSilence: '発話終了の無音（ms）',
  localWhisperSilenceHint: '最小150msです。小さくすると発話を早く確定します。',
  localWhisperNotice:
    'WebGPUが必要です。初回開始時に約120MBをダウンロードし、ブラウザにキャッシュします。マイク音声がブラウザ外へ送信されることはありません。',
  liveOutput: '文字起こし結果',
  startMicrophone: '文字起こしを開始',
  stop: '停止',
  clear: 'クリア',
  interim: '途中結果',
  waitingForAudio: '音声を待っています…',
  finalUtterances: '確定結果',
  noFinalTranscript: '確定した結果はまだありません。',
  stateIdle: '待機中',
  stateConnecting: '接続中',
  stateListening: '文字起こし中',
  stateStopping: '停止中',
  stateError: 'エラー',
  stateDisposed: '終了済み',
  progressDownloadModel: 'モデルをダウンロード中(初回のみ・約120MB)',
  progressInitializeModel: 'モデルを初期化中',
  errorUnsupportedProvider:
    '選択した文字起こし方式は、このブラウザでは利用できません。',
  errorInsecureContext:
    'マイク文字起こしを使うには、HTTPSまたはlocalhostでこのページを開いてください。',
  errorPermissionDenied:
    'マイクを使用できません。ブラウザの権限設定を確認してください。',
  errorNoSpeech: '音声を検出できませんでした。',
  errorAuthenticationFailed:
    'OpenAIの認証に失敗しました。APIキーを確認してください。',
  errorClientSecretFailed:
    'OpenAIへの接続準備に失敗しました。しばらく待ってからもう一度お試しください。',
  errorConnectionFailed:
    '文字起こしサービスへ接続できませんでした。しばらく待ってからもう一度お試しください。',
  errorProvider: '文字起こし中にエラーが発生しました。もう一度お試しください。',
  errorInvalidConfiguration: '入力内容を確認してください。',
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

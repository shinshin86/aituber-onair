import {
  createRealtimeTranscriptionSession,
  isTranscriptionProviderSupported,
  type LocalWhisperModelSize,
  type RealtimeTranscriptionSession,
  type TranscriptUpdate,
  type TranscriptionDelay,
  type TranscriptionError,
  type TranscriptionErrorCode,
  type TranscriptionProviderName,
  type TranscriptionProgress,
  type TranscriptionState,
} from '@aituber-onair/transcription';
import localWhisperWorkerUrl from '../../../src/providers/local-whisper.worker.ts?worker&url';
import {
  detectDisplayLanguage,
  isDisplayLanguage,
  isTranslationKey,
  translate,
  translatedValues,
  type DisplayLanguage,
  type TranslationKey,
} from './i18n';
import './style.css';

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`Missing example element: ${selector}`);
  return result;
}

const displayLanguageSelect = element<HTMLSelectElement>('#display-language');
const providerSelect = element<HTMLSelectElement>('#provider');
const supportBadge = element<HTMLSpanElement>('#support-badge');
const webSpeechFields = element<HTMLDivElement>('#web-speech-fields');
const webSpeechLanguage = element<HTMLInputElement>('#web-speech-language');
const openAIFields = element<HTMLDivElement>('#openai-fields');
const openAIApiKey = element<HTMLInputElement>('#openai-api-key');
const openAILanguages = element<HTMLInputElement>('#openai-languages');
const openAIKeywords = element<HTMLInputElement>('#openai-keywords');
const openAIPrompt = element<HTMLTextAreaElement>('#openai-prompt');
const openAIDelay = element<HTMLSelectElement>('#openai-delay');
const localWhisperFields = element<HTMLDivElement>('#local-whisper-fields');
const localWhisperModel = element<HTMLSelectElement>('#local-whisper-model');
const localWhisperModelHint = element<HTMLElement>('#local-whisper-model-hint');
const localWhisperLanguage = element<HTMLInputElement>(
  '#local-whisper-language'
);
const localWhisperSilence = element<HTMLInputElement>('#local-whisper-silence');
const stateBadge = element<HTMLSpanElement>('#state-badge');
const progressMessage = element<HTMLParagraphElement>('#progress-message');
const startButton = element<HTMLButtonElement>('#start-button');
const stopButton = element<HTMLButtonElement>('#stop-button');
const clearButton = element<HTMLButtonElement>('#clear-button');
const errorMessage = element<HTMLParagraphElement>('#error-message');
const interimTranscript = element<HTMLParagraphElement>('#interim-transcript');
const finalTranscripts = element<HTMLOListElement>('#final-transcripts');

let session: RealtimeTranscriptionSession | null = null;
let displayLanguage: DisplayLanguage = 'en';
let activeError: TranscriptionError | Error | null = null;
const interimByUtterance = new Map<string, string>();
const downloadProgressByFile = new Map<
  string,
  Pick<TranscriptionProgress, 'loadedBytes' | 'totalBytes' | 'progress'>
>();
let activeProgress: TranscriptionProgress | null = null;

const stateTranslationKeys: Record<TranscriptionState, TranslationKey> = {
  idle: 'stateIdle',
  connecting: 'stateConnecting',
  listening: 'stateListening',
  stopping: 'stateStopping',
  error: 'stateError',
  disposed: 'stateDisposed',
};

const errorTranslationKeys: Record<TranscriptionErrorCode, TranslationKey> = {
  'unsupported-provider': 'errorUnsupportedProvider',
  'insecure-context': 'errorInsecureContext',
  'permission-denied': 'errorPermissionDenied',
  'no-speech': 'errorNoSpeech',
  'authentication-failed': 'errorAuthenticationFailed',
  'client-secret-failed': 'errorClientSecretFailed',
  'connection-failed': 'errorConnectionFailed',
  'provider-error': 'errorProvider',
  'invalid-configuration': 'errorInvalidConfiguration',
  'session-disposed': 'errorSessionDisposed',
};

const localWhisperModelHintKeys: Record<LocalWhisperModelSize, TranslationKey> =
  {
    tiny: 'localWhisperModelTinyHint',
    base: 'localWhisperModelBaseHint',
    small: 'localWhisperModelSmallHint',
  };

function commaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedProvider(): TranscriptionProviderName {
  return providerSelect.value as TranscriptionProviderName;
}

function selectedLocalWhisperModel(): LocalWhisperModelSize {
  const model = localWhisperModel.value;
  if (model === 'base' || model === 'small') return model;
  return 'tiny';
}

function renderLocalWhisperModelHint(): void {
  localWhisperModelHint.textContent = translate(
    displayLanguage,
    localWhisperModelHintKeys[selectedLocalWhisperModel()]
  );
}

function translationKey(
  target: HTMLElement,
  attribute: string
): TranslationKey | null {
  const value = target.getAttribute(attribute);
  return value && isTranslationKey(value) ? value : null;
}

function localizeStaticContent(): void {
  document.documentElement.lang = displayLanguage;
  document.title = translate(displayLanguage, 'pageTitle');
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute('content', translate(displayLanguage, 'metaDescription'));

  for (const target of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = translationKey(target, 'data-i18n');
    if (key) target.textContent = translate(displayLanguage, key);
  }

  for (const target of document.querySelectorAll<HTMLInputElement>(
    '[data-i18n-placeholder]'
  )) {
    const key = translationKey(target, 'data-i18n-placeholder');
    if (key) target.placeholder = translate(displayLanguage, key);
  }

  for (const target of document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement
  >('[data-i18n-value]')) {
    const key = translationKey(target, 'data-i18n-value');
    if (!key) continue;
    const knownValues = translatedValues(key);
    if (knownValues.includes(target.value.trim())) {
      target.value = translate(displayLanguage, key);
    }
  }
}

function translatedErrorMessage(error: TranscriptionError | Error): string {
  if (displayLanguage !== 'ja' || !('code' in error)) return error.message;
  const key = errorTranslationKeys[error.code as TranscriptionErrorCode];
  return key ? translate(displayLanguage, key) : error.message;
}

function setError(error: TranscriptionError | Error | null): void {
  activeError = error;
  if (!error) {
    errorMessage.hidden = true;
    errorMessage.textContent = '';
    return;
  }

  const code = 'code' in error ? `[${String(error.code)}] ` : '';
  errorMessage.textContent = `${code}${translatedErrorMessage(error)}`;
  errorMessage.hidden = false;
}

function aggregateDownloadPercentage(): number | null {
  let loadedBytes = 0;
  let totalBytes = 0;

  for (const fileProgress of downloadProgressByFile.values()) {
    const fileTotal = fileProgress.totalBytes;
    if (fileTotal === undefined || fileTotal <= 0) continue;
    const fileLoaded =
      fileProgress.loadedBytes ??
      (fileProgress.progress !== undefined
        ? fileProgress.progress * fileTotal
        : 0);
    loadedBytes += Math.min(fileTotal, Math.max(0, fileLoaded));
    totalBytes += fileTotal;
  }

  return totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : null;
}

function renderProgress(): void {
  if (!activeProgress || activeProgress.phase === 'ready') {
    progressMessage.hidden = true;
    progressMessage.textContent = '';
    return;
  }

  if (activeProgress.phase === 'initialize') {
    progressMessage.textContent = translate(
      displayLanguage,
      'progressInitializeModel'
    );
    progressMessage.hidden = false;
    return;
  }

  const percentage = aggregateDownloadPercentage();
  const suffix = percentage === null ? '' : ` ${percentage}%`;
  progressMessage.textContent = `${translate(
    displayLanguage,
    'progressDownloadModel'
  )}${suffix}`;
  progressMessage.hidden = false;
}

function handleProgress(progress: TranscriptionProgress): void {
  activeProgress = progress;
  if (progress.phase === 'download' && progress.file) {
    const current = downloadProgressByFile.get(progress.file);
    downloadProgressByFile.set(progress.file, {
      loadedBytes: progress.loadedBytes ?? current?.loadedBytes,
      totalBytes: progress.totalBytes ?? current?.totalBytes,
      progress: progress.progress ?? current?.progress,
    });
  }
  renderProgress();
}

function resetProgress(): void {
  activeProgress = null;
  downloadProgressByFile.clear();
  renderProgress();
}

function renderState(state: TranscriptionState): void {
  stateBadge.textContent = translate(
    displayLanguage,
    stateTranslationKeys[state]
  );
  stateBadge.className = `badge state-${state}`;

  const active = state === 'connecting' || state === 'listening';
  const busy = active || state === 'stopping';
  startButton.disabled =
    busy || !isTranscriptionProviderSupported(selectedProvider());
  stopButton.disabled = !active;
  localWhisperModel.disabled = busy;
  if (state !== 'connecting') resetProgress();
}

function renderInterim(): void {
  const value = [...interimByUtterance.values()].join(' ').trim();
  interimTranscript.textContent =
    value || translate(displayLanguage, 'waitingForAudio');
  interimTranscript.classList.toggle('muted', !value);
}

function appendFinal(text: string): void {
  finalTranscripts.querySelector('.empty')?.remove();
  const item = document.createElement('li');
  item.textContent = text;
  finalTranscripts.append(item);
}

function handleTranscript(update: TranscriptUpdate): void {
  if (update.isFinal) {
    interimByUtterance.delete(update.utteranceId);
    appendFinal(update.text);
  } else {
    interimByUtterance.set(update.utteranceId, update.text);
  }
  renderInterim();
}

function createSession(): RealtimeTranscriptionSession {
  switch (selectedProvider()) {
    case 'web-speech':
      return createRealtimeTranscriptionSession({
        provider: 'web-speech',
        language: webSpeechLanguage.value.trim() || 'ja-JP',
        continuous: true,
      });
    case 'openai-realtime':
      return createRealtimeTranscriptionSession({
        provider: 'openai-realtime',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => openAIApiKey.value,
          acknowledgeBrowserKeyRisk: true,
        },
        languages: commaSeparated(openAILanguages.value),
        keywords: commaSeparated(openAIKeywords.value),
        prompt: openAIPrompt.value,
        delay: openAIDelay.value as TranscriptionDelay,
      });
    case 'local-whisper':
      return createRealtimeTranscriptionSession({
        provider: 'local-whisper',
        model: selectedLocalWhisperModel(),
        language: localWhisperLanguage.value.trim() || undefined,
        silenceDurationMs: Number(localWhisperSilence.value),
        workerUrl: localWhisperWorkerUrl,
      });
  }
}

async function disposeSession(): Promise<void> {
  const current = session;
  session = null;
  if (current) await current.dispose();
  resetProgress();
}

async function startSession(): Promise<void> {
  setError(null);
  await disposeSession();

  let nextSession: RealtimeTranscriptionSession | null = null;
  try {
    nextSession = createSession();
    session = nextSession;
    nextSession.onTranscript(handleTranscript);
    nextSession.onProgress(handleProgress);
    nextSession.onStateChange(renderState);
    nextSession.onError(setError);
    await nextSession.start();
  } catch (cause) {
    if (nextSession && session !== nextSession) return;
    const error = cause instanceof Error ? cause : new Error(String(cause));
    setError(error);
    renderState('error');
  }
}

async function stopSession(): Promise<void> {
  try {
    await session?.stop();
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    setError(error);
    renderState('error');
  }
}

function clearTranscripts(): void {
  interimByUtterance.clear();
  renderInterim();
  finalTranscripts.replaceChildren();
  const empty = document.createElement('li');
  empty.className = 'empty';
  empty.textContent = translate(displayLanguage, 'noFinalTranscript');
  finalTranscripts.append(empty);
  setError(null);
}

function syncSettings(): void {
  const provider = selectedProvider();
  const openAISelected = provider === 'openai-realtime';
  const localWhisperSelected = provider === 'local-whisper';

  webSpeechFields.hidden = openAISelected || localWhisperSelected;
  openAIFields.hidden = !openAISelected;
  localWhisperFields.hidden = !localWhisperSelected;
  renderLocalWhisperModelHint();

  const supported = isTranscriptionProviderSupported(provider);
  supportBadge.textContent = translate(
    displayLanguage,
    supported ? 'browserSupported' : 'unsupported'
  );
  supportBadge.className = `badge ${supported ? 'supported' : 'unsupported'}`;
  renderState(session?.state ?? 'idle');
}

function applyDisplayLanguage(language: DisplayLanguage): void {
  displayLanguage = language;
  displayLanguageSelect.value = language;
  localizeStaticContent();
  renderInterim();
  const emptyTranscript = finalTranscripts.querySelector('.empty');
  if (emptyTranscript) {
    emptyTranscript.textContent = translate(language, 'noFinalTranscript');
  }
  syncSettings();
  renderProgress();
  if (activeError) setError(activeError);
}

async function resetSessionForSettings(): Promise<void> {
  await disposeSession();
  setError(null);
  syncSettings();
}

providerSelect.addEventListener('change', () => void resetSessionForSettings());
localWhisperModel.addEventListener('change', renderLocalWhisperModelHint);
displayLanguageSelect.addEventListener('change', () => {
  if (isDisplayLanguage(displayLanguageSelect.value)) {
    applyDisplayLanguage(displayLanguageSelect.value);
  }
});
startButton.addEventListener('click', () => void startSession());
stopButton.addEventListener('click', () => void stopSession());
clearButton.addEventListener('click', clearTranscripts);
window.addEventListener('pagehide', () => void disposeSession());

applyDisplayLanguage(detectDisplayLanguage(navigator.languages));

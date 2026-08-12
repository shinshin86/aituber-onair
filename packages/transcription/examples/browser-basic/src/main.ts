import {
  createRealtimeTranscriptionSession,
  isTranscriptionProviderSupported,
  type RealtimeTranscriptionSession,
  type TranscriptUpdate,
  type TranscriptionDelay,
  type TranscriptionError,
  type TranscriptionProviderName,
  type TranscriptionState,
} from '@aituber-onair/transcription';
import './style.css';

function element<T extends HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`Missing example element: ${selector}`);
  return result;
}

const providerSelect = element<HTMLSelectElement>('#provider');
const supportBadge = element<HTMLSpanElement>('#support-badge');
const webSpeechFields = element<HTMLDivElement>('#web-speech-fields');
const webSpeechLanguage = element<HTMLInputElement>('#web-speech-language');
const openAIFields = element<HTMLDivElement>('#openai-fields');
const openAIAuthMode = element<HTMLSelectElement>('#openai-auth-mode');
const serverAuthFields = element<HTMLDivElement>('#server-auth-fields');
const browserAuthFields = element<HTMLDivElement>('#browser-auth-fields');
const clientSecretEndpoint = element<HTMLInputElement>(
  '#client-secret-endpoint'
);
const openAIApiKey = element<HTMLInputElement>('#openai-api-key');
const openAILanguages = element<HTMLInputElement>('#openai-languages');
const openAIKeywords = element<HTMLInputElement>('#openai-keywords');
const openAIPrompt = element<HTMLTextAreaElement>('#openai-prompt');
const openAIDelay = element<HTMLSelectElement>('#openai-delay');
const stateBadge = element<HTMLSpanElement>('#state-badge');
const startButton = element<HTMLButtonElement>('#start-button');
const stopButton = element<HTMLButtonElement>('#stop-button');
const clearButton = element<HTMLButtonElement>('#clear-button');
const errorMessage = element<HTMLParagraphElement>('#error-message');
const interimTranscript = element<HTMLParagraphElement>('#interim-transcript');
const finalTranscripts = element<HTMLOListElement>('#final-transcripts');

let session: RealtimeTranscriptionSession | null = null;
const interimByUtterance = new Map<string, string>();

function commaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedProvider(): TranscriptionProviderName {
  return providerSelect.value as TranscriptionProviderName;
}

function setError(error: TranscriptionError | Error | null): void {
  if (!error) {
    errorMessage.hidden = true;
    errorMessage.textContent = '';
    return;
  }

  const code = 'code' in error ? `[${String(error.code)}] ` : '';
  errorMessage.textContent = `${code}${error.message}`;
  errorMessage.hidden = false;
}

function renderState(state: TranscriptionState): void {
  const label = state.charAt(0).toUpperCase() + state.slice(1);
  stateBadge.textContent = label;
  stateBadge.className = `badge state-${state}`;

  const active = state === 'connecting' || state === 'listening';
  const busy = active || state === 'stopping';
  startButton.disabled =
    busy || !isTranscriptionProviderSupported(selectedProvider());
  stopButton.disabled = !active;
}

function renderInterim(): void {
  const value = [...interimByUtterance.values()].join(' ').trim();
  interimTranscript.textContent = value || 'Waiting for audio…';
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

async function requestClientSecret(endpoint: string): Promise<string> {
  const response = await fetch(endpoint, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Client-secret endpoint returned HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as { value?: unknown };
  if (typeof payload.value !== 'string' || !payload.value.trim()) {
    throw new Error('Client-secret endpoint returned an invalid response.');
  }
  return payload.value.trim();
}

function createSession(): RealtimeTranscriptionSession {
  if (selectedProvider() === 'web-speech') {
    return createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: webSpeechLanguage.value.trim() || 'ja-JP',
      continuous: true,
    });
  }

  return createRealtimeTranscriptionSession({
    provider: 'openai-realtime',
    auth:
      openAIAuthMode.value === 'server'
        ? {
            type: 'client-secret',
            getClientSecret: () =>
              requestClientSecret(clientSecretEndpoint.value.trim()),
          }
        : {
            type: 'browser-api-key',
            getApiKey: async () => openAIApiKey.value,
            acknowledgeBrowserKeyRisk: true,
          },
    languages: commaSeparated(openAILanguages.value),
    keywords: commaSeparated(openAIKeywords.value),
    prompt: openAIPrompt.value,
    delay: openAIDelay.value as TranscriptionDelay,
  });
}

async function disposeSession(): Promise<void> {
  const current = session;
  session = null;
  if (current) await current.dispose();
}

async function startSession(): Promise<void> {
  setError(null);
  await disposeSession();

  let nextSession: RealtimeTranscriptionSession | null = null;
  try {
    nextSession = createSession();
    session = nextSession;
    nextSession.onTranscript(handleTranscript);
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
  empty.textContent = 'No final transcript yet.';
  finalTranscripts.append(empty);
  setError(null);
}

function syncSettings(): void {
  const provider = selectedProvider();
  const openAISelected = provider === 'openai-realtime';
  const browserKeySelected = openAIAuthMode.value === 'browser-api-key';

  webSpeechFields.hidden = openAISelected;
  openAIFields.hidden = !openAISelected;
  serverAuthFields.hidden = browserKeySelected;
  browserAuthFields.hidden = !browserKeySelected;

  const supported = isTranscriptionProviderSupported(provider);
  supportBadge.textContent = supported ? 'Browser supported' : 'Unsupported';
  supportBadge.className = `badge ${supported ? 'supported' : 'unsupported'}`;
  renderState(session?.state ?? 'idle');
}

async function resetSessionForSettings(): Promise<void> {
  await disposeSession();
  setError(null);
  syncSettings();
}

providerSelect.addEventListener('change', () => void resetSessionForSettings());
openAIAuthMode.addEventListener('change', () => void resetSessionForSettings());
startButton.addEventListener('click', () => void startSession());
stopButton.addEventListener('click', () => void stopSession());
clearButton.addEventListener('click', clearTranscripts);
window.addEventListener('pagehide', () => void disposeSession());

syncSettings();

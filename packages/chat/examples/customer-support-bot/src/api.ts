export interface SupportStatus {
  configured: boolean;
}

export interface SupportChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdminProvider {
  provider: string;
  models: string[];
  defaultModel: string;
  requiresApiKey: boolean;
  supportsCustomEndpoint: boolean;
}

export interface AdminSettings {
  provider: string;
  model: string;
  apiKey: string;
  hasApiKey: boolean;
  endpoint: string;
  persona: string;
  defaultPersonas: DefaultPersonas;
}

export interface DefaultPersonas {
  en: string;
  ja: string;
}

export interface AdminSettingsInput {
  provider: string;
  model: string;
  apiKey?: string;
  endpoint?: string;
  persona?: string;
}

interface ProvidersResponse {
  providers: AdminProvider[];
}

const readError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === 'string') return payload.error;
  } catch {
    // Fall back to the HTTP status below.
  }

  return `Request failed with status ${response.status}.`;
};

const requestJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(input, init);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
};

export const getSupportStatus = (): Promise<SupportStatus> =>
  requestJson<SupportStatus>('/api/support/status');

export const getAdminProviders = async (): Promise<AdminProvider[]> =>
  (await requestJson<ProvidersResponse>('/api/admin/providers')).providers;

export const getAdminSettings = (): Promise<AdminSettings> =>
  requestJson<AdminSettings>('/api/admin/settings');

export const saveAdminSettings = (
  settings: AdminSettingsInput,
): Promise<AdminSettings> =>
  requestJson<AdminSettings>('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

interface SupportStreamEvent {
  delta?: unknown;
  done?: unknown;
  text?: unknown;
  error?: unknown;
}

export const streamSupportChat = async (
  messages: SupportChatMessage[],
  onDelta: (delta: string) => void,
): Promise<string> => {
  const response = await fetch('/api/support/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) throw new Error(await readError(response));
  if (!response.body) throw new Error('The support stream is unavailable.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamedText = '';
  let completedText: string | undefined;

  const processFrame = (frame: string) => {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) return;

    const event = JSON.parse(data) as SupportStreamEvent;
    if (typeof event.error === 'string') throw new Error(event.error);
    if (typeof event.delta === 'string') {
      streamedText += event.delta;
      onDelta(event.delta);
    }
    if (event.done === true && typeof event.text === 'string') {
      completedText = event.text;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';
    for (const frame of frames) processFrame(frame);

    if (done) break;
  }

  if (buffer.trim()) processFrame(buffer);
  if (completedText === undefined) {
    throw new Error('The support stream ended before completion.');
  }

  return completedText || streamedText;
};

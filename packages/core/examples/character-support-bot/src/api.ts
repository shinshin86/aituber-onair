export interface SupportStatus {
  configured: boolean;
  llmConfigured: boolean;
  ttsConfigured: boolean;
}

export interface ProviderRecord {
  provider: string;
  label: string;
  models: string[];
  voices?: string[];
  defaultModel: string;
  defaultVoice?: string;
  defaultEndpoint?: string;
  requiresApiKey: boolean;
  acceptsApiKey?: boolean;
  supportsCustomEndpoint: boolean;
  supportsVoiceList?: boolean;
  supportsSpeed?: boolean;
  speedMin?: number;
  speedMax?: number;
  speedStep?: number;
  modelRequired?: boolean;
  voiceRequired?: boolean;
  requiresGroupId?: boolean;
  developmentOnly?: boolean;
}

export interface VoiceOption {
  id: string;
  label: string;
}

export interface AdminSettings {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
    hasApiKey: boolean;
    endpoint: string;
    persona: string;
    defaultPersonas: {
      en: string;
      ja: string;
    };
    defaultPersonaAliases: string[];
  };
  tts: {
    provider: string;
    model: string;
    voice: string;
    apiKey: string;
    hasApiKey: boolean;
    endpoint: string;
    speed: number;
    groupId: string;
  };
}

export interface AdminSettingsInput {
  llm: Omit<
    AdminSettings['llm'],
    'apiKey' | 'hasApiKey' | 'defaultPersonas' | 'defaultPersonaAliases'
  > & {
    apiKey?: string;
  };
  tts: Omit<AdminSettings['tts'], 'apiKey' | 'hasApiKey'> & {
    apiKey?: string;
  };
}

interface ProvidersResponse {
  llm: ProviderRecord[];
  tts: ProviderRecord[];
  ttsExcluded: Array<{ provider: string; reason: string }>;
}

const readError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === 'string') return payload.error;
  } catch {
    // Fall back to the HTTP status.
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

export const getAdminProviders = (): Promise<ProvidersResponse> =>
  requestJson<ProvidersResponse>('/api/admin/providers');

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

export const getTtsVoices = (
  provider: string,
  endpoint: string,
  apiKey?: string,
): Promise<{ voices: VoiceOption[] }> =>
  requestJson<{ voices: VoiceOption[] }>('/api/admin/tts/voices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      endpoint,
      ...(apiKey?.trim() ? { apiKey: apiKey.trim() } : {}),
    }),
  });

import { createConfigurationError } from './utils';

export const OPENROUTER_VOICE_SUFFIXES = {
  'microsoft/mai-voice-2.1': 'MAI-Voice-2.1',
  'microsoft/mai-voice-2.1-flash': 'MAI-Voice-2.1-Flash',
} as const;

export const OPENROUTER_AUDIO_FORMATS = {
  'microsoft/mai-voice-2.1': 'pcm',
  'microsoft/mai-voice-2.1-flash': 'pcm',
  'elevenlabs/eleven-v4': 'mp3',
  'elevenlabs/eleven-v4-turbo': 'mp3',
} as const;

export type OpenRouterTtsModel = keyof typeof OPENROUTER_AUDIO_FORMATS;

export function requireOpenRouterModel(model?: string): OpenRouterTtsModel {
  if (
    !model ||
    !Object.prototype.hasOwnProperty.call(OPENROUTER_AUDIO_FORMATS, model)
  ) {
    throw createConfigurationError(
      'Select a supported OpenRouter TTS model explicitly: ' +
        Object.keys(OPENROUTER_AUDIO_FORMATS).join(', '),
    );
  }
  return model as OpenRouterTtsModel;
}

export function isOpenRouterVoice(
  voice: unknown,
  model: OpenRouterTtsModel,
): voice is string {
  if (typeof voice !== 'string') return false;
  if (
    model === 'elevenlabs/eleven-v4' ||
    model === 'elevenlabs/eleven-v4-turbo'
  ) {
    return voice.trim().length > 0 && !voice.includes(':');
  }
  const [name, suffix, extra] = voice.split(':');
  return (
    Boolean(name) &&
    !/\s/.test(name) &&
    suffix === OPENROUTER_VOICE_SUFFIXES[model] &&
    extra === undefined
  );
}

export function resolveOpenRouterUrl(endpoint: string): URL {
  const browserBaseUrl =
    typeof globalThis.location?.href === 'string'
      ? globalThis.location.href
      : undefined;
  let url: URL;
  try {
    url = new URL(endpoint, browserBaseUrl);
  } catch {
    throw createConfigurationError(
      'OpenRouter API URL must be a valid absolute URL outside the browser, or a same-origin browser URL',
    );
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw createConfigurationError('OpenRouter API URL must use HTTP or HTTPS');
  }
  return url;
}

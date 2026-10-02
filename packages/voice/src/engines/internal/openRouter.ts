import { createConfigurationError } from './utils';

export const OPENROUTER_VOICE_SUFFIXES = {
  'microsoft/mai-voice-2.1': 'MAI-Voice-2.1',
  'microsoft/mai-voice-2.1-flash': 'MAI-Voice-2.1-Flash',
} as const;

export type OpenRouterTtsModel = keyof typeof OPENROUTER_VOICE_SUFFIXES;

export function requireOpenRouterModel(model?: string): OpenRouterTtsModel {
  if (
    !model ||
    !Object.prototype.hasOwnProperty.call(OPENROUTER_VOICE_SUFFIXES, model)
  ) {
    throw createConfigurationError(
      'Select an OpenRouter public-preview TTS model explicitly: microsoft/mai-voice-2.1 or microsoft/mai-voice-2.1-flash',
    );
  }
  return model as OpenRouterTtsModel;
}

export function isOpenRouterVoice(
  voice: unknown,
  model: OpenRouterTtsModel,
): voice is string {
  if (typeof voice !== 'string') return false;
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

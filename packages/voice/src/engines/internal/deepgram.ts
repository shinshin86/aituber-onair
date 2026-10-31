/**
 * Flux voice IDs supported by this integration: English (`-en`) and Japanese
 * (`-ja`). Deepgram documents both on the same `/v2/speak` request shape.
 */
export const DEEPGRAM_FLUX_VOICE_ID_PATTERN = /^flux-[a-z0-9-]+-(en|ja)$/;

/** Return the language suffix of a supported Flux voice ID, if any. */
export function getDeepgramFluxVoiceLanguage(
  voiceId: string,
): 'en' | 'ja' | undefined {
  const match = DEEPGRAM_FLUX_VOICE_ID_PATTERN.exec(voiceId);
  return match ? (match[1] as 'en' | 'ja') : undefined;
}

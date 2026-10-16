import { getWebSpeechVoiceList } from '@aituber-onair/core';

/**
 * Japanese voices in rough order of quality. Web Speech only exposes what the
 * browser and OS ship, so the best available voice differs per environment:
 * Edge offers a neural voice, Android ships Google's voice, macOS has Kyoko.
 */
const PREFERRED_VOICES: RegExp[] = [
  /nanami/i, // Edge: Microsoft Nanami Online (Natural)
  /google/i, // Chrome on Android / ChromeOS
  /ayumi/i, // Windows
  /sayaka/i, // Windows
  /o-?ren/i, // macOS (premium voice)
  /kyoko/i, // macOS (default voice)
  /haruka/i, // Windows
];

export function isJapaneseVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.toLowerCase().replace('_', '-').startsWith('ja');
}

export async function listJapaneseVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') return [];
  try {
    const voices = await getWebSpeechVoiceList({ timeoutMs: 1500 });
    return voices.filter(isJapaneseVoice);
  } catch {
    return [];
  }
}

/** Pick the preferred voice by name, or the best Japanese voice available. */
export function pickJapaneseVoice(
  voices: SpeechSynthesisVoice[],
  preferredName?: string,
): SpeechSynthesisVoice | undefined {
  if (preferredName) {
    const chosen = voices.find(
      (voice) =>
        voice.name === preferredName || voice.voiceURI === preferredName,
    );
    if (chosen) return chosen;
  }
  for (const pattern of PREFERRED_VOICES) {
    const match = voices.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return voices[0];
}

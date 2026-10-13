const WHISPER_HALLUCINATIONS = [
  'ご視聴ありがとうございました',
  'ご視聴ありがとうございます',
  'おやすみなさい',
  'チャンネル登録お願いします',
  'Thank you.',
  'Thanks for watching.',
  'Thank you for watching.',
];

const TRAILING_PUNCTUATION = /[。．.！!？?]+$/u;

function normalizedHallucinationText(text: string): string {
  return text
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(TRAILING_PUNCTUATION, '')
    .trim();
}

const NORMALIZED_WHISPER_HALLUCINATIONS = new Set(
  WHISPER_HALLUCINATIONS.map(normalizedHallucinationText)
);

export function isLikelyWhisperHallucination(text: string): boolean {
  return NORMALIZED_WHISPER_HALLUCINATIONS.has(
    normalizedHallucinationText(text)
  );
}

export function normalizeWhisperLanguage(
  language: string | undefined
): string | undefined {
  return language?.trim().replace(/_/g, '-').toLowerCase().split('-')[0];
}

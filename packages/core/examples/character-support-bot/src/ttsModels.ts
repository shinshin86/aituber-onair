export const OPENAI_TTS_MODELS = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];

const OPENAI_SPEAKERS = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
];

export function getOpenAiSpeakers(model = 'tts-1'): string[] {
  return OPENAI_SPEAKERS.filter(
    (voice) =>
      model === 'gpt-4o-mini-tts' ||
      !['ballad', 'verse', 'marin', 'cedar'].includes(voice),
  );
}

export function getTtsModelLabel(model: string, language: 'en' | 'ja'): string {
  if (
    [
      'gemini-3.1-flash-tts-preview',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
    ].includes(model)
  ) {
    return language === 'ja'
      ? `${model}（非推奨・最短で2026-11-17に提供終了）`
      : `${model} (deprecated, earliest shutdown 2026-11-17)`;
  }
  if (model === 's1')
    return language === 'ja'
      ? 's1（非推奨・2026-12-31に提供終了・タグを角括弧形式へ移行）'
      : 's1 (deprecated, retires 2026-12-31; migrate tags to brackets)';
  if (model === 's2.1-pro-free')
    return language === 'ja'
      ? 's2.1-pro-free（無料期間は2026-11-30まで・SLAなし）'
      : 's2.1-pro-free (free through 2026-11-30, no SLA)';
  return model;
}

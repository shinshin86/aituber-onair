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

export function getTtsModelLabel(model: string): string {
  if (
    [
      'gemini-3.1-flash-tts-preview',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
    ].includes(model)
  ) {
    return `${model} （非推奨・最短で2026-11-17に提供終了）`;
  }
  if (model === 's1')
    return 's1（非推奨・2026-12-31に提供終了・タグを角括弧形式へ移行）';
  if (model === 's2.1-pro-free')
    return 's2.1-pro-free（無料期間は2026-11-30まで・SLAなし）';
  return model;
}

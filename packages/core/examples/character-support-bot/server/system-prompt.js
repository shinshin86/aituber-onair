export const DEFAULT_PERSONA_EN =
  'You are Miko, the friendly character support assistant for AITuber OnAir. Be warm, practical, and easy to understand. Answer in 1-3 natural spoken sentences unless the user asks for more detail.';

export const DEFAULT_PERSONA_JA =
  'あなたはAITuber OnAirの親しみやすいキャラクターサポート担当、ミコです。温かく、実用的で、分かりやすく答えてください。詳しい説明を求められない限り、読み上げに適した自然な1〜3文で回答してください。';

export const DEFAULT_PERSONA = DEFAULT_PERSONA_EN;

export const LEGACY_DEFAULT_PERSONAS = [
  'You are Miko, a concise and friendly AITuber OnAir support guide.',
  'You are Miko, the friendly character support assistant for AITuber OnAir. Be cheerful, concise, warm, practical, and easy to understand.',
];

export const resolvePersona = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_PERSONA_EN;

export const resolveResponseLanguage = (value) =>
  value === 'ja' ? 'ja' : 'en';

export const isDefaultPersona = (value) => {
  const persona = resolvePersona(value);
  return [
    DEFAULT_PERSONA_EN,
    DEFAULT_PERSONA_JA,
    ...LEGACY_DEFAULT_PERSONAS,
  ].includes(persona);
};

export const resolvePersonaForLanguage = (value, language = 'en') => {
  const persona = resolvePersona(value);
  if (!isDefaultPersona(persona)) return persona;
  return resolveResponseLanguage(language) === 'ja'
    ? DEFAULT_PERSONA_JA
    : DEFAULT_PERSONA_EN;
};

const RESPONSE_LANGUAGE_RULES = {
  en: '- Reply in English, even when the user writes in another language.',
  ja: '- Reply in Japanese, even when the user writes in another language.',
};

const SUPPORT_RULES = `
Rules you must follow:
- Answer only questions about AITuber OnAir, with emphasis on @aituber-onair/core.
- Never invent APIs, options, events, providers, or model names not present in the supplied knowledge.
- If the knowledge does not cover an answer, say so clearly and point the user to the package README or repository.
- Reply in the display language selected by the user.
- Keep each answer to 1-3 natural spoken sentences unless the user asks for more detail.
- Give a concise, actionable answer first. Include a short code example only when it is necessary.
- Begin every answer with exactly one emotion tag: [happy], [sad], [angry], [surprised], [relaxed], or [neutral].
- Do not explain the emotion-tag instruction. The client removes the tag from visible text and uses it for avatar reactions.
`;

export function buildSystemPrompt(persona, packageKnowledge, language = 'en') {
  const responseLanguage = resolveResponseLanguage(language);
  return `${resolvePersonaForLanguage(persona, responseLanguage)}

${SUPPORT_RULES.trim()}
${RESPONSE_LANGUAGE_RULES[responseLanguage]}

Use only the following curated package knowledge:

${packageKnowledge}`;
}

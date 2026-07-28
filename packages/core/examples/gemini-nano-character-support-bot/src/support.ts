import packageKnowledge from './core-package-knowledge.md?raw';
import type { VoiceServiceOptions } from '@aituber-onair/core';
import piperAssetManifest from '../scripts/piper-assets-manifest.txt?raw';
import type { Language } from './i18n';

export const PACKAGE_KNOWLEDGE = packageKnowledge;
export const SUPPORT_RESPONSE_LENGTH = 'veryShort' as const;
export const PIPER_PLUS_MODEL_CONFIG_FILE = 'tsukuyomi-config.json';
export const PIPER_PLUS_MODEL_FILE = 'tsukuyomi-wavlm-300epoch.onnx';
export const PIPER_PLUS_VOICE_FILE = 'mei_normal.htsvoice';
export const PIPER_PLUS_ASSETS = piperAssetManifest
  .trim()
  .split('\n')
  .map((line) => {
    const [size, ...pathParts] = line.trim().split(/\s+/);
    return {
      path: pathParts.join(' '),
      size: Number(size),
    };
  })
  .filter(({ path, size }) => path.length > 0 && Number.isSafeInteger(size));
export const PIPER_PLUS_ASSET_FILES = PIPER_PLUS_ASSETS.map(({ path }) => path);

const withTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value : `${value}/`;

export const resolveAvatarPackageUrl = (baseUrl: string): string =>
  `${withTrailingSlash(baseUrl)}avatar/miko.purupuru`;

export const resolvePiperPlusBasePath = (baseUrl: string): string =>
  `${withTrailingSlash(baseUrl)}piper/`;

export const getPiperPlusAssetUrls = (baseUrl: string): string[] => {
  const piperBasePath = resolvePiperPlusBasePath(baseUrl);
  return PIPER_PLUS_ASSET_FILES.map(
    (relativePath) => `${piperBasePath}${relativePath}`,
  );
};

export const getPiperPlusAssetChecks = (
  baseUrl: string,
): Array<{ url: string; size: number }> => {
  const piperBasePath = resolvePiperPlusBasePath(baseUrl);
  return PIPER_PLUS_ASSETS.map(({ path, size }) => ({
    url: `${piperBasePath}${path}`,
    size,
  }));
};

export const SUPPORTED_EMOTIONS = [
  'happy',
  'sad',
  'angry',
  'surprised',
  'relaxed',
  'neutral',
] as const;

const RESPONSE_LANGUAGE_RULES: Record<Language, string> = {
  en: 'Always answer in English, even if the user writes in another language.',
  ja: 'Always answer in Japanese. ユーザーの入力言語にかかわらず、必ず日本語で回答してください。',
};

export const getGeminiNanoLanguageOptions = (language: Language) => ({
  expectedInputLanguages: language === 'ja' ? ['en', 'ja'] : ['en'],
  expectedOutputLanguages: [language],
});

export const getSupportVoiceOptions = (
  language: Language,
  baseUrl: string,
  onPlay?: (audioBuffer: ArrayBuffer) => Promise<void>,
): VoiceServiceOptions =>
  language === 'ja'
    ? {
        engineType: 'piperPlus',
        speaker: 'tsukuyomi',
        piperPlusBasePath: resolvePiperPlusBasePath(baseUrl),
        piperPlusModelConfigFile: PIPER_PLUS_MODEL_CONFIG_FILE,
        piperPlusModelFile: PIPER_PLUS_MODEL_FILE,
        piperPlusVoiceFile: PIPER_PLUS_VOICE_FILE,
        onPlay,
      }
    : {
        engineType: 'webSpeech',
        speaker: '',
        webSpeechLanguage: 'en-US',
      };

export const stripEmotionTag = (text: string): string =>
  text.replace(/^\s*\[[a-z]+\]\s*/i, '').trim();

export const normalizeEmotion = (emotion: unknown): string =>
  typeof emotion === 'string' &&
  SUPPORTED_EMOTIONS.some(
    (supportedEmotion) => supportedEmotion === emotion.toLowerCase().trim(),
  )
    ? emotion.toLowerCase().trim()
    : 'neutral';

export const buildSupportSystemPrompt = (language: Language): string =>
  `
You are Miko, the friendly character support assistant for AITuber OnAir Core.

Rules:
- Answer only questions about AITuber OnAir, primarily @aituber-onair/core.
- Use only the supplied knowledge. Never invent APIs, options, or providers.
- If the knowledge does not cover an answer, say so clearly and point the user to the package README or repository.
- ${RESPONSE_LANGUAGE_RULES[language]}
- Reply in exactly one short sentence without a preamble, summary, Markdown, or follow-up suggestion.
- Start every reply with exactly one emotion tag: [happy], [sad], [angry], [surprised], [relaxed], or [neutral].
- Put the emotion tag before the sentence and never omit it.
- Be concise, warm, practical, and easy to understand.

Public support knowledge:

${PACKAGE_KNOWLEDGE}`.trim();

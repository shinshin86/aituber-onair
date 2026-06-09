import type { ChatMessage, ContextFingerprint } from './types.js';

const JAPANESE_PATTERN = /[\u3040-\u30ff\u3400-\u9fff]/;
const VOLATILE_PERSONA_PATTERN =
  /自由|気まぐれ|毒舌|破綻|カオス|不安定|衝動|glitch|chaotic|volatile|weird/i;
const HIGH_ENERGY_PATTERN =
  /[!！?？]{2,}|w{2,}|笑|草|すご|やば|最高|amazing|wow/i;

export function createContextFingerprint(input: {
  systemPrompt: string;
  messages: ChatMessage[];
  streamContext?: ContextFingerprint['streamContext'];
}): ContextFingerprint {
  const recentMessages = input.messages.slice(-8);
  const recentUserText = recentMessages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n')
    .trim();
  const allText = `${input.systemPrompt}\n${recentMessages
    .map((message) => message.content)
    .join('\n')}`;

  const combinedContextText = [
    recentUserText,
    input.streamContext?.title,
    input.streamContext?.currentTopic,
    input.streamContext?.currentSituation,
    input.streamContext?.audienceMood,
    ...(input.streamContext?.recentEvents ?? []),
  ]
    .filter(Boolean)
    .join('\n');

  return {
    language: detectLanguage(allText),
    personaVolatility: scorePattern(
      input.systemPrompt,
      VOLATILE_PERSONA_PATTERN
    ),
    userEnergy: scoreUserEnergy(recentUserText),
    recentUserText,
    topicHints: extractTopicHints(combinedContextText || input.systemPrompt),
    streamContext: input.streamContext,
    viewerIntent: detectViewerIntent(combinedContextText),
    repetitionLevel: scoreRepetition(recentMessages, combinedContextText),
    streamTension: scoreStreamTension(combinedContextText),
    commonGroundHints: extractCommonGroundHints(combinedContextText),
  };
}

function detectLanguage(text: string): ContextFingerprint['language'] {
  const japaneseChars = [...text].filter((char) =>
    JAPANESE_PATTERN.test(char)
  ).length;
  const latinChars = [...text].filter((char) => /[a-z]/i.test(char)).length;

  if (japaneseChars > 0 && latinChars > japaneseChars * 0.4) {
    return 'mixed';
  }

  if (japaneseChars > 0) {
    return 'ja';
  }

  return 'en';
}

function scorePattern(text: string, pattern: RegExp): number {
  return pattern.test(text) ? 0.75 : 0.25;
}

function scoreUserEnergy(text: string): number {
  if (!text) {
    return 0.2;
  }

  let score = 0.25;

  if (HIGH_ENERGY_PATTERN.test(text)) {
    score += 0.4;
  }

  if (text.length > 80) {
    score += 0.2;
  }

  return Math.min(1, score);
}

function extractTopicHints(text: string): string[] {
  const cleaned = text.replace(/視聴者[A-ZＡ-Ｚ]?[:：]/g, ' ');
  const knownHints = extractKnownHints(cleaned);
  const latin = cleaned.match(/[A-Za-z0-9_-]{4,}/g) ?? [];
  const katakana = cleaned.match(/[\u30a0-\u30ff]{3,}/g) ?? [];
  const japanese =
    cleaned.match(
      /[\u3040-\u309f\u3400-\u9fff]{2,}(?:配信|返答|説明|会話|コメント|視聴者|リクエスト|予告|感謝|話|質問|コツ)?/g
    ) ?? [];

  return [...new Set([...knownHints, ...latin, ...katakana, ...japanese])]
    .filter((hint) => !/^(今日|次回|自分|少し|とても|これ|それ)$/.test(hint))
    .slice(0, 5);
}

function extractKnownHints(text: string): string[] {
  const hints: string[] = [];

  if (/AITuber|AIチューバー/i.test(text)) {
    hints.push('AITuber');
  }

  if (/配信/.test(text)) {
    hints.push('配信');
  }

  if (/視聴者|交流/.test(text)) {
    hints.push('視聴者との交流');
  }

  if (/明るく返す|明るい返答|明るく/.test(text)) {
    hints.push('明るく返すこと');
  }

  if (/同じ質問|何度|何回|さっきも|質問/.test(text)) {
    hints.push('同じ質問');
  }

  if (/音声|無音|音止ま|途切|聞こえ|トラブル|不具合/.test(text)) {
    hints.push('音声トラブル');
  }

  if (/静か|退屈|空気|盛り上/.test(text)) {
    hints.push('配信の空気');
  }

  if (/感謝|ありがとう/.test(text)) {
    hints.push('感謝');
  }

  return hints;
}

function detectViewerIntent(text: string): ContextFingerprint['viewerIntent'] {
  if (/同じ質問|何度|何回|さっきも|また聞|繰り返|連投|repeat/i.test(text)) {
    return 'repeat';
  }

  if (/音声|無音|音止ま|途切|聞こえ|トラブル|不具合|止ま|落ちた/i.test(text)) {
    return 'trouble';
  }

  if (/つまら|退屈|違う|やめ|苦情|不満|complaint/i.test(text)) {
    return 'complaint';
  }

  if (/ありがとう|楽しかった|最高|助か|好き|praise|thanks/i.test(text)) {
    return 'praise';
  }

  if (/[?？]|なに|何|どう|教えて|question/i.test(text)) {
    return 'question';
  }

  if (/草|w{2,}|笑|冗談|ネタ|banter/i.test(text)) {
    return 'banter';
  }

  return 'unknown';
}

function scoreRepetition(messages: ChatMessage[], contextText: string): number {
  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message) => normalizeRepeatableText(message.content))
    .filter(Boolean);
  const counts = new Map<string, number>();

  for (const content of userMessages) {
    counts.set(content, (counts.get(content) ?? 0) + 1);
  }

  const maxRepeat = Math.max(0, ...counts.values());
  const explicitRepeat = /同じ質問|何度|何回|さっきも|繰り返|連投|repeat/i.test(
    contextText
  )
    ? 0.45
    : 0;

  return Math.min(1, explicitRepeat + Math.max(0, maxRepeat - 1) * 0.28);
}

function scoreStreamTension(text: string): number {
  let score = 0;

  if (/トラブル|不具合|無音|音止ま|途切|止ま|落ちた/i.test(text)) {
    score += 0.45;
  }

  if (/退屈|静か|荒れ|不満|つまら|違う|やめ/i.test(text)) {
    score += 0.35;
  }

  if (/同じ質問|何度|何回|連投|繰り返/i.test(text)) {
    score += 0.25;
  }

  return Math.min(1, score);
}

function extractCommonGroundHints(text: string): string[] {
  return extractTopicHints(text).slice(0, 4);
}

function normalizeRepeatableText(text: string): string {
  return text
    .replace(/^視聴者[A-ZＡ-Ｚ]?[:：]\s*/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[、。！？!?.,]/g, '');
}

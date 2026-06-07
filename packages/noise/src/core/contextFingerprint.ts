import type { ChatMessage, ContextFingerprint } from './types.js';

const JAPANESE_PATTERN = /[\u3040-\u30ff\u3400-\u9fff]/;
const VOLATILE_PERSONA_PATTERN =
  /自由|気まぐれ|毒舌|破綻|カオス|不安定|衝動|glitch|chaotic|volatile|weird/i;
const HIGH_ENERGY_PATTERN =
  /[!！?？]{2,}|w{2,}|笑|草|すご|やば|最高|amazing|wow/i;

export function createContextFingerprint(input: {
  systemPrompt: string;
  messages: ChatMessage[];
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

  return {
    language: detectLanguage(allText),
    personaVolatility: scorePattern(
      input.systemPrompt,
      VOLATILE_PERSONA_PATTERN
    ),
    userEnergy: scoreUserEnergy(recentUserText),
    recentUserText,
    topicHints: extractTopicHints(recentUserText || input.systemPrompt),
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

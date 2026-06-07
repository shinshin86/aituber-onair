import type {
  ContextFingerprint,
  NoiseMemory,
  PlannedStain,
  StainKind,
} from '../core/types.js';

const DEFAULT_MAX_RECENT_ENTRIES = 30;

export function createInitialNoiseMemory(): NoiseMemory {
  return {
    version: 1,
    recentClosings: [],
    repeatedPhrases: [],
    usedStains: [],
    topicLoops: [],
    avoidedPatterns: [],
    learnedRules: [],
    updatedAt: Date.now(),
  };
}

export function normalizeNoiseMemory(
  memory: NoiseMemory | undefined
): NoiseMemory {
  if (!memory || memory.version !== 1) {
    return createInitialNoiseMemory();
  }

  return {
    ...createInitialNoiseMemory(),
    ...memory,
    repeatedPhrases: memory.repeatedPhrases ?? [],
    usedStains: memory.usedStains ?? [],
    topicLoops: memory.topicLoops ?? [],
    avoidedPatterns: memory.avoidedPatterns ?? [],
    learnedRules: memory.learnedRules ?? [],
  };
}

export function updateNoiseMemory(input: {
  memory: NoiseMemory | undefined;
  before: string;
  after: string;
  context: ContextFingerprint;
  applied: PlannedStain[];
  maxRecentEntries?: number;
}): NoiseMemory {
  const maxRecentEntries = input.maxRecentEntries ?? DEFAULT_MAX_RECENT_ENTRIES;
  const memory = normalizeNoiseMemory(input.memory);
  const closing = extractClosing(input.before);
  const phrases = extractPhrases(input.before);
  const topic = input.context.topicHints[0];

  return {
    ...memory,
    recentClosings: trimList(
      closing ? [...memory.recentClosings, closing] : memory.recentClosings,
      maxRecentEntries
    ),
    repeatedPhrases: trimPhraseCounts(
      incrementPhraseCounts(memory.repeatedPhrases, phrases),
      maxRecentEntries
    ),
    usedStains: trimList(
      [
        ...memory.usedStains,
        ...input.applied.map((stain) => ({
          kind: stain.kind,
          timestamp: Date.now(),
        })),
      ],
      maxRecentEntries
    ),
    topicLoops: topic
      ? trimTopicLoops(
          incrementTopicLoops(memory.topicLoops, topic, closing),
          maxRecentEntries
        )
      : memory.topicLoops,
    updatedAt: Date.now(),
  };
}

export function getRecentlyOverusedStains(memory: NoiseMemory): StainKind[] {
  const counts = new Map<StainKind, number>();

  for (const record of memory.usedStains.slice(-8)) {
    counts.set(record.kind, (counts.get(record.kind) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([kind]) => kind);
}

export function getRepeatedClosingPatterns(memory: NoiseMemory): string[] {
  const counts = new Map<string, number>();

  for (const closing of memory.recentClosings) {
    counts.set(closing, (counts.get(closing) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([closing]) => closing);
}

function extractClosing(text: string): string | undefined {
  const sentences = text
    .split(/(?<=[。.!！？?])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences[sentences.length - 1]?.slice(0, 80);
}

function extractPhrases(text: string): string[] {
  const matches =
    text.match(
      /ありがとうございます|ありがとう|楽しみにして|よろしくお願いします|まとめると|大切です|重要です|thank you|looking forward|in summary|important/gi
    ) ?? [];

  return [...new Set(matches.map((match) => match.toLowerCase()))];
}

function incrementPhraseCounts(
  current: Array<{ phrase: string; count: number }>,
  phrases: string[]
): Array<{ phrase: string; count: number }> {
  const counts = new Map(current.map((item) => [item.phrase, item.count]));

  for (const phrase of phrases) {
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  return [...counts.entries()].map(([phrase, count]) => ({ phrase, count }));
}

function incrementTopicLoops(
  current: Array<{ topic: string; pattern: string; count: number }>,
  topic: string,
  closing: string | undefined
): Array<{ topic: string; pattern: string; count: number }> {
  if (!closing) {
    return current;
  }

  const key = `${topic}\n${closing}`;
  const counts = new Map(
    current.map((item) => [`${item.topic}\n${item.pattern}`, item.count])
  );
  counts.set(key, (counts.get(key) ?? 0) + 1);

  return [...counts.entries()].map(([entry, count]) => {
    const [entryTopic, pattern] = entry.split('\n');
    return {
      topic: entryTopic,
      pattern,
      count,
    };
  });
}

function trimList<T>(items: T[], max: number): T[] {
  return items.slice(Math.max(0, items.length - max));
}

function trimPhraseCounts(
  items: Array<{ phrase: string; count: number }>,
  max: number
): Array<{ phrase: string; count: number }> {
  return [...items].sort((a, b) => b.count - a.count).slice(0, max);
}

function trimTopicLoops(
  items: Array<{ topic: string; pattern: string; count: number }>,
  max: number
): Array<{ topic: string; pattern: string; count: number }> {
  return [...items].sort((a, b) => b.count - a.count).slice(0, max);
}

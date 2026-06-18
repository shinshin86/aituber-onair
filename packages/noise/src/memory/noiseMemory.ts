import { createInitialRhythmState } from '../core/rhythmController.js';
import type {
  ContextFingerprint,
  InterventionKind,
  MemorableMoment,
  NoiseMemory,
  NoiseReactionSignal,
  PlannedIntervention,
  StainKind,
} from '../core/types.js';

const DEFAULT_MAX_RECENT_ENTRIES = 30;
const DEFAULT_VIOLATION_BUDGET = 1;
const MIN_VIOLATION_BUDGET = 0.2;
const MAX_MEMORABLE_MOMENTS = 20;
const CALLBACK_MIN_SPACING_TURNS = 6;
const RESPONSE_SNIPPET_LENGTH = 200;

export function createInitialNoiseMemory(): NoiseMemory {
  return {
    version: 1,
    recentClosings: [],
    recentResponses: [],
    repeatedPhrases: [],
    usedStains: [],
    topicLoops: [],
    avoidedPatterns: [],
    learnedRules: [],
    memorableMoments: [],
    rhythm: createInitialRhythmState(),
    violationBudget: DEFAULT_VIOLATION_BUDGET,
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
    recentResponses: memory.recentResponses ?? [],
    repeatedPhrases: memory.repeatedPhrases ?? [],
    usedStains: memory.usedStains ?? [],
    topicLoops: memory.topicLoops ?? [],
    avoidedPatterns: memory.avoidedPatterns ?? [],
    learnedRules: memory.learnedRules ?? [],
    memorableMoments: memory.memorableMoments ?? [],
    rhythm: memory.rhythm ?? createInitialRhythmState(),
    violationBudget: memory.violationBudget ?? DEFAULT_VIOLATION_BUDGET,
  };
}

export function updateNoiseMemory(input: {
  memory: NoiseMemory | undefined;
  before: string;
  after: string;
  context: ContextFingerprint;
  applied: PlannedIntervention[];
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
    recentResponses: trimList(
      [
        ...memory.recentResponses,
        input.after.slice(0, RESPONSE_SNIPPET_LENGTH),
      ],
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

/** Record the latest tilt so a later positive reaction can promote it. */
export function recordLastTilt(input: {
  memory: NoiseMemory;
  text: string;
  interventions: InterventionKind[];
}): NoiseMemory {
  return {
    ...input.memory,
    lastTilt: {
      turn: input.memory.rhythm.totalTurns,
      summary: input.text.slice(0, 120),
      interventions: input.interventions,
      promoted: false,
    },
    updatedAt: Date.now(),
  };
}

/** Add a memorable moment to the gag ledger. */
export function addMemorableMoment(input: {
  memory: NoiseMemory;
  summary: string;
  source?: MemorableMoment['source'];
}): NoiseMemory {
  const memory = input.memory;
  const summary = input.summary.trim().slice(0, 120);

  if (!summary) {
    return memory;
  }

  const existing = memory.memorableMoments.find(
    (moment) => moment.summary === summary
  );

  if (existing) {
    return memory;
  }

  const moment: MemorableMoment = {
    id: `moment-${memory.rhythm.totalTurns}-${memory.memorableMoments.length}`,
    summary,
    source: input.source ?? 'assistant',
    callbacks: 0,
    lastUsedTurn: -1,
    createdTurn: memory.rhythm.totalTurns,
  };

  return {
    ...memory,
    memorableMoments: [...memory.memorableMoments, moment].slice(
      -MAX_MEMORABLE_MOMENTS
    ),
    updatedAt: Date.now(),
  };
}

/**
 * Pick a moment for a callback intervention. Callbacks are the highest-value,
 * lowest-risk surprise (proof of shared memory), but they must stay sparse to
 * remain surprising, so a minimum turn spacing is enforced per moment.
 */
export function pickCallbackMoment(
  memory: NoiseMemory
): MemorableMoment | undefined {
  const currentTurn = memory.rhythm.totalTurns;
  const eligible = memory.memorableMoments.filter((moment) => {
    if (moment.lastUsedTurn === -1) {
      return currentTurn - moment.createdTurn >= 1;
    }

    return currentTurn - moment.lastUsedTurn >= CALLBACK_MIN_SPACING_TURNS;
  });

  if (eligible.length === 0) {
    return undefined;
  }

  return [...eligible].sort((left, right) => {
    const leftIdle =
      currentTurn -
      (left.lastUsedTurn === -1 ? left.createdTurn : left.lastUsedTurn);
    const rightIdle =
      currentTurn -
      (right.lastUsedTurn === -1 ? right.createdTurn : right.lastUsedTurn);

    return rightIdle - leftIdle;
  })[0];
}

export function markMomentUsed(input: {
  memory: NoiseMemory;
  momentId: string;
}): NoiseMemory {
  return {
    ...input.memory,
    memorableMoments: input.memory.memorableMoments.map((moment) =>
      moment.id === input.momentId
        ? {
            ...moment,
            callbacks: moment.callbacks + 1,
            lastUsedTurn: input.memory.rhythm.totalTurns,
          }
        : moment
    ),
    updatedAt: Date.now(),
  };
}

const REACTION_BUDGET_DELTAS: Record<NoiseReactionSignal, number> = {
  laughter: 0.08,
  positive: 0.05,
  neutral: 0,
  silence: -0.08,
  pushback: -0.15,
  discomfort: -0.25,
};

const REPAIR_TURNS_ON_NEGATIVE = 2;

/**
 * Apply an observed audience reaction. Positive reactions widen the budget
 * and promote the latest tilt into the gag ledger; negative reactions shrink
 * the budget and schedule repair turns (forced platform).
 */
export function applyReactionToMemory(input: {
  memory: NoiseMemory;
  signal: NoiseReactionSignal;
  detail?: string;
}): {
  memory: NoiseMemory;
  repairAdvised: boolean;
  promotedMoment?: MemorableMoment;
} {
  const memory = input.memory;
  const delta = REACTION_BUDGET_DELTAS[input.signal];
  const violationBudget = Math.min(
    1,
    Math.max(MIN_VIOLATION_BUDGET, memory.violationBudget + delta)
  );
  const negative = input.signal === 'pushback' || input.signal === 'discomfort';
  const positive = input.signal === 'laughter' || input.signal === 'positive';
  let next: NoiseMemory = {
    ...memory,
    violationBudget,
    rhythm: negative
      ? {
          ...memory.rhythm,
          repairRemaining: Math.max(
            memory.rhythm.repairRemaining,
            REPAIR_TURNS_ON_NEGATIVE
          ),
        }
      : memory.rhythm,
    updatedAt: Date.now(),
  };
  let promotedMoment: MemorableMoment | undefined;

  if (positive && next.lastTilt && !next.lastTilt.promoted) {
    const summary = input.detail?.trim() || next.lastTilt.summary;
    next = addMemorableMoment({
      memory: { ...next, lastTilt: { ...next.lastTilt, promoted: true } },
      summary,
      source: 'assistant',
    });
    promotedMoment = next.memorableMoments.find(
      (moment) => moment.summary === summary.slice(0, 120)
    );
  }

  return {
    memory: next,
    repairAdvised: negative,
    promotedMoment,
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

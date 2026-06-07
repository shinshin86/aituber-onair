import { clamp01, createSeededRandom } from './random.js';
import {
  getRecentlyOverusedStains,
  getRepeatedClosingPatterns,
} from '../memory/noiseMemory.js';
import type {
  ContextFingerprint,
  NoiseMemory,
  NoiseMode,
  PlannedStain,
  StainKind,
  StainPlan,
} from './types.js';

const MVP_STAINS: StainKind[] = [
  'anti_summary',
  'rhythm_break',
  'self_interruption',
  'concrete_noise',
  'unfinished_thought',
];

export function planStains(input: {
  draft: string;
  context: ContextFingerprint;
  predictability: number;
  intensity: number;
  mode: NoiseMode;
  memory?: NoiseMemory;
  seed?: string | number;
}): StainPlan {
  const intensity = clamp01(input.intensity);
  const candidates = createCandidates(input);
  const rng = createSeededRandom(input.seed);
  const maxCount =
    input.mode === 'subtle' ? 2 : input.mode === 'chaotic' ? 5 : 3;
  const count = Math.max(
    1,
    Math.min(
      maxCount,
      Math.ceil(intensity * maxCount) + (input.predictability > 0.75 ? 1 : 0)
    )
  );
  const stains: PlannedStain[] = [];

  while (stains.length < count && candidates.length > 0) {
    const index = Math.floor(rng.next() * candidates.length);
    const [kind] = candidates.splice(index, 1);
    stains.push({
      kind,
      reason: explainStainChoice(kind, input.predictability, input.context),
    });
  }

  const plannedStains = enforceContextualSpecificity(stains, input);

  return {
    intensity,
    stains: removeConflictingStains(plannedStains),
  };
}

function createCandidates(input: {
  draft: string;
  context: ContextFingerprint;
  predictability: number;
  mode: NoiseMode;
  memory?: NoiseMemory;
}): StainKind[] {
  const candidates: StainKind[] = [];
  const repeatedClosings = input.memory
    ? getRepeatedClosingPatterns(input.memory)
    : [];

  if (hasCleanSummary(input.draft) || repeatedClosings.length > 0) {
    candidates.push('anti_summary');
  }

  if (input.predictability > 0.35) {
    candidates.push('rhythm_break');
  }

  if (input.context.userEnergy > 0.55) {
    candidates.push('self_interruption');
  }

  candidates.push('concrete_noise', 'unfinished_thought');

  if (input.mode === 'chaotic' && input.context.personaVolatility > 0.5) {
    candidates.push('emotional_leak', 'persona_glitch', 'wrong_turn');
  }

  const overused = input.memory ? getRecentlyOverusedStains(input.memory) : [];
  const preferred = candidates.filter((kind) => !overused.includes(kind));

  return (preferred.length > 0 ? preferred : candidates).filter((kind) =>
    MVP_STAINS.includes(kind)
  );
}

function hasCleanSummary(draft: string): boolean {
  return /まとめると|結論として|最後に|次回も楽しみに|よろしくお願いします|良い一日を|嬉しいです|証拠なので|少しお待ちください|ご不便をおかけして|楽しい時間にしていきましょう|in summary|to summarize|finally|see you next|have a great day/i.test(
    draft
  );
}

function enforceContextualSpecificity(
  stains: PlannedStain[],
  input: {
    draft: string;
    context: ContextFingerprint;
    predictability: number;
  }
): PlannedStain[] {
  if (
    !hasLiveContextTension(input.draft, input.context) ||
    stains.some((stain) => stain.kind === 'concrete_noise') ||
    stains.length === 0
  ) {
    return stains;
  }

  const replaceIndex = Math.max(
    stains.findIndex((stain) => stain.kind === 'unfinished_thought'),
    0
  );
  const next = [...stains];
  next[replaceIndex] = {
    kind: 'concrete_noise',
    reason: explainStainChoice(
      'concrete_noise',
      input.predictability,
      input.context
    ),
  };

  return next;
}

function hasLiveContextTension(
  draft: string,
  context: ContextFingerprint
): boolean {
  return /同じ質問|何度|何回|さっきも|順番|待って|音声|無音|音止ま|途切|聞こえ|トラブル|不具合|静か|退屈|空気|盛り上|明るく|楽しい時間/.test(
    `${draft}\n${context.recentUserText}`
  );
}

function removeConflictingStains(stains: PlannedStain[]): PlannedStain[] {
  const hasAntiSummary = stains.some((stain) => stain.kind === 'anti_summary');
  const hasContextualSpecificity = stains.some(
    (stain) => stain.kind === 'concrete_noise'
  );

  if (!hasAntiSummary && !hasContextualSpecificity) {
    return stains;
  }

  return stains.filter((stain) => stain.kind !== 'unfinished_thought');
}

function explainStainChoice(
  kind: StainKind,
  predictability: number,
  context: ContextFingerprint
): string {
  switch (kind) {
    case 'anti_summary':
      return `Clean closing detected at predictability ${predictability.toFixed(2)}.`;
    case 'rhythm_break':
      return 'Sentence cadence looked too even.';
    case 'self_interruption':
      return `Recent user energy was ${context.userEnergy.toFixed(2)}.`;
    case 'concrete_noise':
      return 'A small concrete image can reduce generic phrasing.';
    case 'unfinished_thought':
      return 'The draft ended too completely for a live performer.';
    default:
      return 'Selected by the stain planner.';
  }
}

import { clamp01 } from './random.js';
import type { InterventionKind, NoiseMode, RelationshipTier } from './types.js';

const MODE_ORDER: NoiseMode[] = [
  'subtle',
  'performer',
  'bold',
  'inversion',
  'chaotic',
];

/**
 * Interventions unlocked per tier. Expectancy violations theory: the same
 * tease that charms an established audience alienates a new one, so the
 * violation budget scales with relationship capital. Each tier includes the
 * interventions of the tiers below it.
 */
const TIER_INTERVENTIONS: Record<RelationshipTier, InterventionKind[]> = {
  stranger: [
    'break_clean_closing',
    'increase_specificity',
    'ground_in_recent_comment',
    'self_repair',
    'unfinished_margin',
    'reduce_over_apology',
    'reduce_over_agreement',
  ],
  acquaintance: [
    'soft_disagreement',
    'acknowledge_tension',
    'add_streamer_judgment',
    'dispreferred_shape',
    'response_length_violation',
  ],
  regular: ['contrarian_reframe', 'callback', 'boke_bait', 'status_seesaw'],
  companion: ['tsukkomi', 'withheld_uptake'],
};

const TIER_MAX_MODE: Record<RelationshipTier, NoiseMode> = {
  stranger: 'subtle',
  acquaintance: 'performer',
  regular: 'inversion',
  companion: 'chaotic',
};

export function resolveRelationshipTier(capital: number): RelationshipTier {
  const value = clamp01(capital);

  if (value < 0.25) {
    return 'stranger';
  }

  if (value < 0.55) {
    return 'acquaintance';
  }

  if (value < 0.8) {
    return 'regular';
  }

  return 'companion';
}

export function getAllowedInterventions(
  tier: RelationshipTier
): Set<InterventionKind> {
  const tiers: RelationshipTier[] = [
    'stranger',
    'acquaintance',
    'regular',
    'companion',
  ];
  const allowed = new Set<InterventionKind>();

  for (const current of tiers) {
    for (const kind of TIER_INTERVENTIONS[current]) {
      allowed.add(kind);
    }

    if (current === tier) {
      break;
    }
  }

  return allowed;
}

/** Cap the requested mode at what the relationship has earned. */
export function gateMode(
  requested: NoiseMode,
  tier: RelationshipTier
): NoiseMode {
  const maxMode = TIER_MAX_MODE[tier];
  const requestedIndex = MODE_ORDER.indexOf(requested);
  const maxIndex = MODE_ORDER.indexOf(maxMode);

  return requestedIndex <= maxIndex ? requested : maxMode;
}

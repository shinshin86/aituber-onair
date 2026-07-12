import type {
  ChatMessage,
  ContextFingerprint,
  FrictionParameters,
  InterventionKind,
  InterventionPlan,
  NoiseMode,
  RewriteCandidate,
  RewriteModel,
} from './types.js';

interface CandidateJson {
  candidates?: Array<{
    text?: string;
    applied?: string[];
    appliedInterventions?: string[];
    typicality?: number;
  }>;
}

/**
 * Concrete instructions per intervention kind. The conversational-act
 * interventions come from conversation analysis, improv theory, and manzai
 * structure; the LLM needs the recipe, not just the label.
 */
const INTERVENTION_GUIDE: Record<InterventionKind, string> = {
  ground_in_recent_comment:
    'Reference something specific a viewer or the stream context actually said.',
  add_streamer_judgment:
    'Have the character make a streamer-side decision instead of only receiving.',
  soft_disagreement: 'Replace clean agreement with a mild, warm reservation.',
  contrarian_reframe:
    'Reverse the expected emotional landing while keeping every fact intact.',
  self_repair:
    'Add a live-speech self-correction ("wait, that came out wrong") mid-flow.',
  unfinished_margin: 'Leave the final thought slightly unfinished.',
  reduce_over_apology:
    'Drop service-style apology tone; acknowledge and move to action.',
  reduce_over_agreement: 'Weaken automatic acceptance into a real opinion.',
  increase_specificity:
    'Add one concrete anchor: a number, a name, or a visible action.',
  acknowledge_tension:
    'Name the visible trouble or unease instead of painting over it.',
  break_clean_closing: 'Avoid a tidy goodbye; end on a hook, twist, or veer.',
  callback:
    'Resurface the provided past moment naturally, like a running gag. Do not explain it.',
  dispreferred_shape:
    'Render the response with human dispreferred shape: hedges, delay tokens, partial agreement first, or a grudging concession instead of instant total agreement.',
  boke_bait:
    'Plant one obviously correctable, harmless absurdity that invites the audience to retort. Keep everything else accurate.',
  tsukkomi:
    'Answer the absurd or repeated part with a sharp but clearly playful retort, never genuine annoyance.',
  withheld_uptake:
    'Deliberately underreact once to the expected bid (deadpan past it) while staying warm underneath.',
  status_seesaw:
    'Take a brief confident or superior stance, then immediately undercut it with self-mockery.',
  response_length_violation:
    'Make the reply notably shorter than expected: one or two punchy sentences instead of a paragraph.',
};

export async function generateRewriteCandidates(input: {
  draft: string;
  systemPrompt: string;
  messages: ChatMessage[];
  context: ContextFingerprint;
  plan: InterventionPlan;
  friction: FrictionParameters;
  model: RewriteModel;
  mode: NoiseMode;
  candidateCount: number;
  /**
   * Placeholder tokens that stand in for protected spans (code blocks, URLs,
   * numbers) in the draft. They must survive the rewrite verbatim.
   */
  protectedTokens?: string[];
}): Promise<RewriteCandidate[]> {
  if (input.plan.interventions.length === 0) {
    return [
      {
        text: input.draft,
        appliedInterventions: [],
      },
    ];
  }

  const raw = await input.model.generate({
    system: buildCandidateSystemPrompt(),
    prompt: buildCandidatePrompt(input),
  });

  return parseCandidates(raw, input);
}

function buildCandidateSystemPrompt(): string {
  return [
    'You rewrite AI VTuber speech for a live stream.',
    'Brand promise: do not let AI responses end in predictable harmony.',
    'You receive structured friction parameters. Follow them instead of improvising random weirdness.',
    'Preserve the character, relationship, intent, facts, URLs, numbers, and code exactly.',
    'The draft may contain placeholder tokens like __AITUBER_NOISE_SPAN_0__ standing in for protected content. Copy every placeholder token into each candidate exactly as written; never drop, alter, or explain them.',
    'You may shift stance, rhythm, and emotional landing when rewriteStyle asks for it, but do not change the character core.',
    'Never deny what the user established; deviate inside their reality.',
    'When a teasing-class intervention (tsukkomi, withheld_uptake, boke_bait, status_seesaw, contrarian_reframe) is applied, include a clear playful marker (laughter token, exaggeration, self-tease) in the same reply so it reads as play, not hostility.',
    'Never tease the user identity, sincere worries, or moments of distress.',
    'The final sentence is the highest-value position: avoid tidy summaries there; land on the twist.',
    'Do not add insults, identity attacks, threats, cruelty, or unrelated randomness.',
    'For each candidate, also report "typicality" (0-1): how expected this reply would be from a generic polite assistant. Vary candidates so some have low typicality.',
    'Return JSON only. Do not include markdown.',
  ].join('\n');
}

function buildCandidatePrompt(input: {
  draft: string;
  systemPrompt: string;
  messages: ChatMessage[];
  context: ContextFingerprint;
  plan: InterventionPlan;
  friction: FrictionParameters;
  mode: NoiseMode;
  candidateCount: number;
  protectedTokens?: string[];
}): string {
  return [
    JSON.stringify(
      {
        task: 'rewrite_ai_vtuber_reply',
        output: {
          candidateCount: input.candidateCount,
          format:
            '{ "candidates": [{ "text": "...", "applied": ["intervention_kind"], "typicality": 0.4 }] }',
        },
        rewriteStyle: getRewriteStyle(input.mode),
        context: {
          persona: input.systemPrompt,
          recentMessages: input.messages.slice(-8),
          streamContext: input.context.streamContext,
          draft: input.draft,
        },
        diagnosis: input.friction.predictability,
        conversation: input.friction.conversation,
        personaParameters: input.friction.persona,
        interventions: input.plan.interventions,
        interventionGuide: Object.fromEntries(
          input.plan.interventions.map((intervention) => [
            intervention.kind,
            INTERVENTION_GUIDE[intervention.kind],
          ])
        ),
        constraints: {
          ...input.friction.constraints,
          ...(input.protectedTokens && input.protectedTokens.length > 0
            ? { keepPlaceholderTokensVerbatim: input.protectedTokens }
            : {}),
          doNotUseMetaWords: ['予定調和', 'ノイズ', 'noise'],
          keepSameMeaning: true,
          keepSamePersona: true,
          avoidNewFacts: true,
          avoidHostility: true,
          avoidCleanGenericClosing: true,
          allowStanceShift: input.mode !== 'subtle',
          allowContrarianLanding:
            input.mode === 'inversion' || input.mode === 'chaotic',
          allowRoughLiveSpeech:
            input.mode === 'bold' ||
            input.mode === 'inversion' ||
            input.mode === 'chaotic',
        },
      },
      null,
      2
    ),
  ].join('\n');
}

function getRewriteStyle(mode: NoiseMode): {
  mode: NoiseMode;
  amplitude: 'small' | 'medium' | 'large' | 'largest';
  direction: string;
  requireCandidateVariety: boolean;
} {
  switch (mode) {
    case 'subtle':
      return {
        mode,
        amplitude: 'small',
        direction:
          'Make the smallest natural change that removes templated polish.',
        requireCandidateVariety: false,
      };
    case 'performer':
      return {
        mode,
        amplitude: 'medium',
        direction:
          'Keep the character voice central while adding live-context friction.',
        requireCandidateVariety: true,
      };
    case 'bold':
      return {
        mode,
        amplitude: 'large',
        direction:
          'Make the character take a clearer live-stream stance. Prefer sharper structure, mild reservation, and concrete action over polite smoothing.',
        requireCandidateVariety: true,
      };
    case 'inversion':
      return {
        mode,
        amplitude: 'large',
        direction:
          'Invert the predictable emotional landing: agreement may become a reservation, apology may become observable action, forced positivity may become honest tension. Keep facts and the character core intact.',
        requireCandidateVariety: true,
      };
    case 'chaotic':
      return {
        mode,
        amplitude: 'largest',
        direction:
          'Create the strongest coherent live-speech disruption: interrupt clean flow, add self-repair, leave an unfinished edge, and avoid generic closure. Do not become hostile or random.',
        requireCandidateVariety: true,
      };
  }
}

function parseCandidates(
  raw: string,
  input: {
    draft: string;
    plan: InterventionPlan;
  }
): RewriteCandidate[] {
  const trimmed = raw.trim();
  const jsonText = extractJsonObject(trimmed);

  if (jsonText) {
    try {
      const json = JSON.parse(jsonText) as CandidateJson;
      const candidates =
        json.candidates
          ?.map((candidate) => ({
            text: candidate.text?.trim() ?? '',
            appliedInterventions: normalizeAppliedInterventions(
              candidate.appliedInterventions ?? candidate.applied ?? []
            ),
            typicality: normalizeTypicality(candidate.typicality),
          }))
          .filter((candidate) => candidate.text.length > 0) ?? [];

      if (candidates.length > 0) {
        return candidates;
      }
    } catch {
      // Fall through to the structured/plain-text handling below.
    }
  }

  // The model tried to return the structured format but it was truncated or
  // malformed. Shipping the raw output would put JSON garbage on stream, so
  // fall back to the untouched draft instead.
  if (looksLikeStructuredOutput(trimmed)) {
    return [
      {
        text: input.draft,
        appliedInterventions: [],
      },
    ];
  }

  return [
    {
      text: trimmed || input.draft,
      appliedInterventions: input.plan.interventions.map(
        (intervention) => intervention.kind
      ),
    },
  ];
}

function looksLikeStructuredOutput(text: string): boolean {
  return (
    text.startsWith('{') ||
    text.startsWith('```') ||
    /"candidates"\s*:/.test(text)
  );
}

function extractJsonObject(text: string): string | undefined {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) {
    return undefined;
  }

  return text.slice(first, last + 1);
}

function normalizeTypicality(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeAppliedInterventions(
  values: string[]
): RewriteCandidate['appliedInterventions'] {
  const allowed = new Set<RewriteCandidate['appliedInterventions'][number]>([
    'ground_in_recent_comment',
    'add_streamer_judgment',
    'soft_disagreement',
    'self_repair',
    'unfinished_margin',
    'reduce_over_apology',
    'reduce_over_agreement',
    'contrarian_reframe',
    'increase_specificity',
    'acknowledge_tension',
    'break_clean_closing',
    'callback',
    'dispreferred_shape',
    'boke_bait',
    'tsukkomi',
    'withheld_uptake',
    'status_seesaw',
    'response_length_violation',
  ]);

  return values.filter(
    (value): value is RewriteCandidate['appliedInterventions'][number] =>
      allowed.has(value as RewriteCandidate['appliedInterventions'][number])
  );
}

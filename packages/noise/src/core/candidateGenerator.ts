import type {
  ChatMessage,
  ContextFingerprint,
  FrictionParameters,
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
  }>;
}

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
    'You may shift stance, rhythm, and emotional landing when rewriteStyle asks for it, but do not change the character core.',
    'Do not add insults, identity attacks, threats, cruelty, or unrelated randomness.',
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
}): string {
  return [
    JSON.stringify(
      {
        task: 'rewrite_ai_vtuber_reply',
        output: {
          candidateCount: input.candidateCount,
          format:
            '{ "candidates": [{ "text": "...", "applied": ["intervention_kind"] }] }',
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
        constraints: {
          ...input.friction.constraints,
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
          }))
          .filter((candidate) => candidate.text.length > 0) ?? [];

      if (candidates.length > 0) {
        return candidates;
      }
    } catch {
      // Fall through to plain-text compatibility mode.
    }
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

function extractJsonObject(text: string): string | undefined {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');

  if (first === -1 || last === -1 || last <= first) {
    return undefined;
  }

  return text.slice(first, last + 1);
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
  ]);

  return values.filter(
    (value): value is RewriteCandidate['appliedInterventions'][number] =>
      allowed.has(value as RewriteCandidate['appliedInterventions'][number])
  );
}

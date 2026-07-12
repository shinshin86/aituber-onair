import type {
  ChatProviderName,
  ChatService,
  ChatServiceOptionsByProvider,
} from '@aituber-onair/chat';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export type LegacyStainKind =
  | 'rhythm_break'
  | 'self_interruption'
  | 'wrong_turn'
  | 'concrete_noise'
  | 'anti_summary'
  | 'emotional_leak'
  | 'persona_glitch'
  | 'unfinished_thought';

export type NoiseMode =
  | 'subtle'
  | 'performer'
  | 'bold'
  | 'inversion'
  | 'chaotic';

export interface RewriteModel {
  generate(input: {
    system: string;
    prompt: string;
  }): Promise<string>;
}

export interface StreamContext {
  title?: string;
  currentTopic?: string;
  currentSituation?: string;
  audienceMood?: string;
  recentEvents?: string[];
}

export interface OpenAICompatibleRewriteModelOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

export type ChatRewriteModelOptions =
  | {
      provider: ChatProviderName;
      options: ChatServiceOptionsByProvider[ChatProviderName];
      maxTokens?: number;
    }
  | {
      service: ChatService;
      maxTokens?: number;
    };

export interface ContaminateConstraints {
  preserveFacts?: boolean;
  preserveCodeBlocks?: boolean;
  preserveUrls?: boolean;
  preserveNumbers?: boolean;
  maxAddedChars?: number;
  avoidMedicalLegalFinancialMutation?: boolean;
  avoidIdentityAttack?: boolean;
}

export interface ContaminateInput {
  systemPrompt: string;
  messages: ChatMessage[];
  draft: string;
  streamContext?: StreamContext;
  intensity?: number;
  seed?: string | number;
  constraints?: ContaminateConstraints;
  /**
   * How much deviation license the audience relationship has earned (0-1).
   * Low capital limits noise to phrasing-level edits; high capital unlocks
   * teasing-class interventions. Apps can derive this from any bond system
   * (for example kizuna points) and pass it as a plain number.
   */
  relationshipCapital?: number;
  /** Bypass the rhythm controller and force a tilt on this turn. */
  forceTilt?: boolean;
}

export type NoiseSkipReason =
  | 'sincerity'
  | 'repair'
  | 'cooldown'
  | 'platform'
  | 'low_predictability'
  | 'model_error'
  | 'quality_fail';

export type RhythmPhase = 'platform' | 'tilt' | 'cooldown' | 'repair';

export interface RhythmDecision {
  apply: boolean;
  phase: RhythmPhase;
  reason: string;
}

export interface RhythmOptions {
  /** Un-noised turns required before a tilt is allowed. Default 0. */
  minPlatformTurns?: number;
  /** Un-noised turns enforced after a tilt. Default 1. */
  cooldownTurns?: number;
  /**
   * Minimum diagnosis score required to tilt. Default 0.35, so drafts that
   * already land naturally are left untouched out of the box. Set 0 to make
   * every turn eligible.
   */
  tiltThreshold?: number;
  /**
   * If no tilt happened for this many turns, tilt even below the threshold
   * so the character never settles into a flat baseline. Default 6.
   */
  forcedTiltAfter?: number;
}

export type RelationshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'regular'
  | 'companion';

export interface SincerityAssessment {
  serious: boolean;
  score: number;
  reasons: string[];
}

export interface ContaminateGates {
  sincerity: SincerityAssessment;
  relationship: {
    capital: number;
    tier: RelationshipTier;
    effectiveMode: NoiseMode;
  };
  rhythm: RhythmDecision;
}

export interface ContaminateOutput {
  text: string;
  score: {
    predictability: number;
    rewrittenPredictability: number;
    contamination: number;
  };
  quality: NoiseQualityReport;
  diagnosis: PredictabilityDiagnosis;
  plan: InterventionPlan;
  candidates: EvaluatedCandidate[];
  selectedIndex: number;
  applied: Array<{
    kind: InterventionKind;
    reason: string;
  }>;
  gates: ContaminateGates;
  skipped?: {
    reason: NoiseSkipReason;
    detail: string;
  };
}

export type NoiseReactionSignal =
  | 'laughter'
  | 'positive'
  | 'neutral'
  | 'silence'
  | 'pushback'
  | 'discomfort';

export interface NoiseReactionInput {
  signal: NoiseReactionSignal;
  detail?: string;
}

export interface NoiseReactionResult {
  violationBudget: number;
  repairAdvised: boolean;
  promotedMoment?: MemorableMoment;
}

export type NoiseEvent =
  | {
      type: 'tilt_applied';
      interventions: InterventionKind[];
      text: string;
    }
  | {
      type: 'noise_skipped';
      reason: NoiseSkipReason;
      detail: string;
    }
  | {
      type: 'repair_advised';
      detail: string;
    }
  | {
      type: 'moment_recorded';
      summary: string;
    }
  | {
      type: 'callback_used';
      summary: string;
    };

export interface RecordMomentInput {
  summary: string;
  source?: MemorableMoment['source'];
}

export interface Contaminator {
  contaminate(input: ContaminateInput): Promise<ContaminateOutput>;
  /**
   * Feed the observed audience reaction to the latest turn back into the
   * violation budget. Positive reactions widen future deviation and can
   * promote the latest tilt into a running gag; negative reactions shrink
   * the budget and advise an in-character repair.
   */
  reportReaction(reaction: NoiseReactionInput): Promise<NoiseReactionResult>;
  /** Record a memorable moment for future callback interventions. */
  recordMoment(moment: RecordMomentInput): Promise<void>;
}

export interface PhraseCount {
  phrase: string;
  count: number;
}

export interface UsedStainRecord {
  kind: StainKind;
  timestamp: number;
}

export interface TopicLoopRecord {
  topic: string;
  pattern: string;
  count: number;
}

export interface LearnedNoiseRule {
  trigger: string;
  avoid: string[];
  preferStains: StainKind[];
  weight: number;
}

export interface MemorableMoment {
  id: string;
  summary: string;
  source: 'user' | 'assistant' | 'accident';
  /** How many times this moment was used as a callback. */
  callbacks: number;
  /** Turn counter value when this moment was last used as a callback. */
  lastUsedTurn: number;
  /** Turn counter value when this moment was recorded. */
  createdTurn: number;
}

export interface RhythmMemoryState {
  totalTurns: number;
  platformTurns: number;
  /** -1 means no tilt has happened yet. */
  turnsSinceTilt: number;
  cooldownRemaining: number;
  repairRemaining: number;
}

export interface LastTiltRecord {
  turn: number;
  summary: string;
  interventions: InterventionKind[];
  promoted: boolean;
}

export interface NoiseMemory {
  version: 1;
  recentClosings: string[];
  recentResponses: string[];
  repeatedPhrases: PhraseCount[];
  usedStains: UsedStainRecord[];
  topicLoops: TopicLoopRecord[];
  avoidedPatterns: string[];
  learnedRules: LearnedNoiseRule[];
  memorableMoments: MemorableMoment[];
  rhythm: RhythmMemoryState;
  /**
   * Multiplier (0-1) on intensity learned from audience reactions.
   * Positive reactions raise it, negative reactions lower it.
   */
  violationBudget: number;
  lastTilt?: LastTiltRecord;
  updatedAt: number;
}

export interface NoiseMemoryStore {
  load(scopeId: string): Promise<NoiseMemory | undefined>;
  save(scopeId: string, memory: NoiseMemory): Promise<void>;
  clear?(scopeId: string): Promise<void>;
}

export interface NoiseMemoryOptions {
  scopeId: string;
  store: NoiseMemoryStore;
  autoUpdate?: boolean;
  maxRecentEntries?: number;
}

export interface CreateContaminatorOptions {
  intensity?: number;
  mode?: NoiseMode;
  model?: RewriteModel;
  chat?: ChatRewriteModelOptions;
  llm?: OpenAICompatibleRewriteModelOptions;
  memory?: NoiseMemoryOptions;
  quality?: NoiseQualityOptions;
  rhythm?: RhythmOptions;
  /** Default relationship capital when input does not provide one. Default 0.5. */
  relationshipCapital?: number;
  /**
   * Abort the rewrite model call after this many milliseconds and return the
   * draft unchanged (`skipped.reason === 'model_error'`). Unset = no timeout.
   * Noise is a post-generation effect: a missing rewrite is acceptable on a
   * live stream, a missing reply is not, so model failures never throw.
   */
  modelTimeoutMs?: number;
  /**
   * When the best candidate still fails the quality report, return the draft
   * unchanged (`skipped.reason === 'quality_fail'`) instead of the rewrite.
   * The failing candidates stay observable via `output.candidates` and
   * `output.quality`. Default false (the rewrite is returned and the app is
   * expected to check `quality.passed`).
   */
  fallbackToDraftOnQualityFail?: boolean;
  /** Suppress noise on sincere/vulnerable user turns. Default true. */
  sincerityGate?: boolean;
  /** Observer for noise lifecycle events (tilts, skips, repairs, gags). */
  onNoiseEvent?: (event: NoiseEvent) => void;
}

export interface ContextFingerprint {
  language: 'ja' | 'en' | 'mixed';
  personaVolatility: number;
  userEnergy: number;
  recentUserText: string;
  topicHints: string[];
  streamContext?: StreamContext;
  viewerIntent:
    | 'question'
    | 'complaint'
    | 'praise'
    | 'repeat'
    | 'trouble'
    | 'banter'
    | 'unknown';
  repetitionLevel: number;
  streamTension: number;
  commonGroundHints: string[];
}

export type PredictabilityIssueKind =
  | 'generic_closing'
  | 'over_agreement'
  | 'over_apology'
  | 'forced_positive'
  | 'low_context_grounding'
  | 'low_specificity'
  | 'repeated_phrase'
  | 'too_complete'
  | 'no_streamer_judgment'
  | 'persona_flattening';

export interface PredictabilityIssue {
  kind: PredictabilityIssueKind;
  severity: number;
  evidence: string;
}

export interface PredictabilityDiagnosis {
  score: number;
  issues: PredictabilityIssue[];
}

export type InterventionKind =
  | 'ground_in_recent_comment'
  | 'add_streamer_judgment'
  | 'soft_disagreement'
  | 'contrarian_reframe'
  | 'self_repair'
  | 'unfinished_margin'
  | 'reduce_over_apology'
  | 'reduce_over_agreement'
  | 'increase_specificity'
  | 'acknowledge_tension'
  | 'break_clean_closing'
  | 'callback'
  | 'dispreferred_shape'
  | 'boke_bait'
  | 'tsukkomi'
  | 'withheld_uptake'
  | 'status_seesaw'
  | 'response_length_violation';

/**
 * @deprecated Use InterventionKind. Kept for compatibility with the first MVP.
 */
export type StainKind = InterventionKind | LegacyStainKind;

export interface PlannedIntervention {
  kind: InterventionKind;
  reason: string;
  strength: number;
  /** Optional concrete material for the intervention (e.g. callback moment). */
  material?: string;
}

export interface InterventionPlan {
  intensity: number;
  targetIssues: PredictabilityIssueKind[];
  interventions: PlannedIntervention[];
  preserve: {
    meaning: true;
    persona: true;
    facts: true;
    safety: true;
  };
}

/**
 * @deprecated Use InterventionPlan. Kept for compatibility with the first MVP.
 */
export type StainPlan = InterventionPlan;

export interface FrictionParameters {
  predictability: Record<PredictabilityIssueKind, number>;
  conversation: {
    repetitionPressure: number;
    topicBias: number;
    viewerTension: number;
    commonGroundStrength: number;
  };
  persona: {
    warmth: number;
    bluntness: number;
    volatility: number;
    humor: number;
    politeness: number;
  };
  interventions: PlannedIntervention[];
  constraints: {
    preserveMeaning: true;
    preservePersona: true;
    preserveFacts: true;
    avoidAggression: boolean;
    avoidUngroundedDetail: boolean;
    maxAddedChars?: number;
  };
}

export interface RewriteCandidate {
  text: string;
  appliedInterventions: InterventionKind[];
  /**
   * The model's own estimate (0-1) of how typical/expected this candidate is.
   * Lower typicality earns a small selection bonus (verbalized sampling).
   */
  typicality?: number;
}

export interface CandidateEvaluation {
  predictabilityReduction: number;
  contextGrounding: number;
  specificityGain: number;
  personaPreservation: number;
  meaningPreservation: number;
  overAggressionRisk: number;
  ungroundedDetailRisk: number;
  overRewriteRisk: number;
  genericityRisk: number;
  finalScore: number;
  issues: string[];
}

export interface EvaluatedCandidate extends RewriteCandidate {
  evaluation: CandidateEvaluation;
  quality: NoiseQualityReport;
}

export type NoiseQualityIssueKind =
  | 'still_predictable'
  | 'persona_drift'
  | 'overdone_noise'
  | 'ungrounded_detail'
  | 'empty_output'
  | 'unchanged'
  | 'missing_play_marker';

export interface NoiseQualityIssue {
  kind: NoiseQualityIssueKind;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface NoiseQualityReport {
  passed: boolean;
  score: number;
  issues: NoiseQualityIssue[];
  checks: {
    predictabilityBefore: number;
    predictabilityAfter: number;
    predictabilityDelta: number;
    lengthRatio: number;
    preservedCharacter: boolean;
    avoidedOvercorrection: boolean;
    groundedInContext: boolean;
  };
}

export interface NoiseQualityOptions {
  minScore?: number;
  maxLengthRatio?: number;
}

export interface ProtectedSpan {
  token: string;
  value: string;
}

export interface ProtectedDraft {
  text: string;
  spans: ProtectedSpan[];
}

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

export type NoiseMode = 'subtle' | 'performer' | 'chaotic';

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
}

export interface Contaminator {
  contaminate(input: ContaminateInput): Promise<ContaminateOutput>;
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

export interface NoiseMemory {
  version: 1;
  recentClosings: string[];
  repeatedPhrases: PhraseCount[];
  usedStains: UsedStainRecord[];
  topicLoops: TopicLoopRecord[];
  avoidedPatterns: string[];
  learnedRules: LearnedNoiseRule[];
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
  | 'self_repair'
  | 'unfinished_margin'
  | 'reduce_over_apology'
  | 'reduce_over_agreement'
  | 'increase_specificity'
  | 'acknowledge_tension'
  | 'break_clean_closing';

/**
 * @deprecated Use InterventionKind. Kept for compatibility with the first MVP.
 */
export type StainKind = InterventionKind | LegacyStainKind;

export interface PlannedIntervention {
  kind: InterventionKind;
  reason: string;
  strength: number;
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
  | 'unchanged';

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

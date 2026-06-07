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

export type StainKind =
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
  applied: Array<{
    kind: StainKind;
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
}

export interface PlannedStain {
  kind: StainKind;
  reason: string;
}

export interface StainPlan {
  intensity: number;
  stains: PlannedStain[];
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

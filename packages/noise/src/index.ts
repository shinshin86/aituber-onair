export { createContaminator } from './core/createContaminator.js';
export { createContextFingerprint } from './core/contextFingerprint.js';
export { scorePredictability } from './core/predictability.js';
export { diagnosePredictability } from './core/predictabilityDiagnosis.js';
export { assessSincerity } from './core/sincerityGate.js';
export {
  advanceRhythmState,
  createInitialRhythmState,
  decideRhythm,
  DEFAULT_RHYTHM_OPTIONS,
} from './core/rhythmController.js';
export {
  gateMode,
  getAllowedInterventions,
  resolveRelationshipTier,
} from './core/relationshipGate.js';
export {
  hasPlayMarker,
  requiresPlayMarker,
  TEASING_INTERVENTIONS,
} from './core/playMarkers.js';
export {
  changedFinalSentence,
  getFinalSentence,
  scoreGenericity,
} from './core/genericity.js';
export {
  buildFrictionParameters,
  buildInterventionPlan,
} from './core/frictionPlanner.js';
export { generateRewriteCandidates } from './core/candidateGenerator.js';
export {
  evaluateRewriteCandidates,
  selectBestCandidate,
} from './core/candidateEvaluator.js';
export { evaluateNoiseQuality } from './core/qualityEvaluator.js';
export { detectNoiseRuntime } from './core/runtime.js';
export { rewriteWithStains } from './core/rewriteEngine.js';
export {
  protectSensitiveSpans,
  restoreSensitiveSpans,
  safetyGuard,
} from './core/safetyGuard.js';
export { planStains } from './core/stainPlanner.js';
export {
  addMemorableMoment,
  applyReactionToMemory,
  createInitialNoiseMemory,
  getLoopedTopicPatterns,
  getOverusedPhrases,
  getRecentlyOverusedStains,
  getRepeatedClosingPatterns,
  markMomentUsed,
  normalizeNoiseMemory,
  pickCallbackMoment,
  recordLastTilt,
  updateNoiseMemory,
} from './memory/noiseMemory.js';
export { InMemoryNoiseMemoryStore } from './memory/stores/InMemoryNoiseMemoryStore.js';
export { createContaminationStream } from './stream/createContaminationStream.js';
export { createChatRewriteModel } from './models/chatRewriteModel.js';
export { createOpenAICompatibleRewriteModel } from './models/openAICompatibleRewriteModel.js';
export type {
  ChatMessage,
  ChatRole,
  ChatRewriteModelOptions,
  CandidateEvaluation,
  ContaminateConstraints,
  ContaminateGates,
  ContaminateInput,
  ContaminateOutput,
  Contaminator,
  ContextFingerprint,
  CreateContaminatorOptions,
  EvaluatedCandidate,
  FrictionParameters,
  InterventionKind,
  InterventionPlan,
  LastTiltRecord,
  LearnedNoiseRule,
  LegacyStainKind,
  MemorableMoment,
  NoiseEvent,
  NoiseMemory,
  NoiseMemoryOptions,
  NoiseMemoryStore,
  NoiseMode,
  NoiseQualityIssue,
  NoiseQualityIssueKind,
  NoiseQualityOptions,
  NoiseQualityReport,
  NoiseReactionInput,
  NoiseReactionResult,
  NoiseReactionSignal,
  NoiseSkipReason,
  OpenAICompatibleRewriteModelOptions,
  PlannedIntervention,
  PhraseCount,
  PredictabilityDiagnosis,
  PredictabilityIssue,
  PredictabilityIssueKind,
  ProtectedDraft,
  ProtectedSpan,
  RecordMomentInput,
  RelationshipTier,
  RewriteModel,
  RewriteCandidate,
  RhythmDecision,
  RhythmMemoryState,
  RhythmOptions,
  RhythmPhase,
  SincerityAssessment,
  StainKind,
  StainPlan,
  StreamContext,
  TopicLoopRecord,
  UsedStainRecord,
} from './core/types.js';
export type { NoiseRuntime } from './core/runtime.js';

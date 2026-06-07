export { createContaminator } from './core/createContaminator.js';
export { createContextFingerprint } from './core/contextFingerprint.js';
export { scorePredictability } from './core/predictability.js';
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
  createInitialNoiseMemory,
  getRecentlyOverusedStains,
  getRepeatedClosingPatterns,
  normalizeNoiseMemory,
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
  ContaminateConstraints,
  ContaminateInput,
  ContaminateOutput,
  Contaminator,
  ContextFingerprint,
  CreateContaminatorOptions,
  LearnedNoiseRule,
  NoiseMemory,
  NoiseMemoryOptions,
  NoiseMemoryStore,
  NoiseMode,
  NoiseQualityIssue,
  NoiseQualityIssueKind,
  NoiseQualityOptions,
  NoiseQualityReport,
  OpenAICompatibleRewriteModelOptions,
  PlannedStain,
  PhraseCount,
  ProtectedDraft,
  ProtectedSpan,
  RewriteModel,
  StainKind,
  StainPlan,
  TopicLoopRecord,
  UsedStainRecord,
} from './core/types.js';
export type { NoiseRuntime } from './core/runtime.js';

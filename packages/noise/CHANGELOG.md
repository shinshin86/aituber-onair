# @aituber-onair/noise

## Unreleased

### Added

- Failure handling: `contaminate()` no longer throws when the rewrite model
  fails — it returns the draft unchanged with `skipped.reason 'model_error'`.
  Added `modelTimeoutMs` to abort hanging rewrite calls and
  `fallbackToDraftOnQualityFail` to return the draft (reason `'quality_fail'`)
  when every candidate fails the quality report.
- `NoiseLexicon` option (`predictablePhrases` / `stockReplies` /
  `playMarkers`) extending the built-in detection vocabulary across the
  diagnosis, genericity penalty, and play-marker certification, plus an
  English concrete-action pattern for specificity scoring.
- Memory feedback: repeated closings, overused phrases, and topic loops
  recorded in the noise memory are now fed back into
  `diagnosePredictability()` (new `getOverusedPhrases()` and
  `getLoopedTopicPatterns()` helpers).
- `inferReactionFromComments()` infers the reaction signal from the chat
  comments observed after a tilt.
- `ContaminateOutput.turnId` and `reportReaction({ turnId })` link reactions
  to the tilt they belong to, so late reactions cannot promote the wrong
  tilt into the gag ledger.
- New skip reasons: `'model_error'`, `'quality_fail'`, and
  `'no_licensed_intervention'` (the latter skips before the LLM call when
  the relationship tier licenses none of the planned interventions).
- Dual ESM/CJS builds (`dist/esm` / `dist/cjs`) with `import` / `require`
  conditions for the root, `./web`, and `./node` entries.

### Changed

- The default `rhythm.tiltThreshold` is now `0.35` (was `0`), so
  already-natural drafts are left untouched out of the box. Set it to `0`
  to restore the always-eligible behavior.
- Protected-span placeholder tokens are now announced to the rewrite model,
  and candidates that drop or mangle a protected span (including code
  blocks) degrade to the draft.
- Malformed or truncated candidate JSON now falls back to the draft instead
  of shipping the raw model output as the reply.
- `@aituber-onair/chat` is loaded lazily, so importing the package in pure
  Node.js ESM works even though chat's ESM build is not Node-resolvable.
- Memory updates are serialized across concurrent `contaminate()` /
  `reportReaction()` / `recordMoment()` calls to prevent lost updates.

### Removed

- `ContaminateInput.seed` (accepted but never used) and the unused
  `learnedRules` / `avoidedPatterns` memory fields. Persisted memory JSON
  from earlier versions stays loadable.

## 0.0.2

### Added

- Redesigned the package from a response rewrite engine into a deviation
  orchestration engine, grounded in the research notes at
  `docs/design-research.md`.
- Added the rhythm controller (`decideRhythm`, `advanceRhythmState`) that
  enforces a platform -> tilt -> platform cadence with configurable
  `rhythm` options and `forceTilt` bypass.
- Added the relationship capital gate (`resolveRelationshipTier`,
  `getAllowedInterventions`, `gateMode`) that scales the violation budget
  with `relationshipCapital` (0-1) per call.
- Added the sincerity gate (`assessSincerity`) that suppresses all noise on
  distress, serious consultations, and heavy life events.
- Added conversational-act interventions: `callback`, `dispreferred_shape`,
  `boke_bait`, `tsukkomi`, `withheld_uptake`, `status_seesaw`, and
  `response_length_violation`.
- Added play-marker certification for teasing-class interventions
  (`hasPlayMarker`, `missing_play_marker` quality issue).
- Added the gag ledger: `recordMoment()`, automatic promotion of
  well-received tilts, and callback planning with per-moment spacing.
- Added the reaction loop: `reportReaction()` adjusts the violation budget,
  schedules repair turns on negative reactions, and `onNoiseEvent` exposes
  lifecycle events (`tilt_applied`, `noise_skipped`, `repair_advised`,
  `moment_recorded`, `callback_used`).
- Added the genericity penalty (MMI-style stock-phrase and self-repetition
  scoring), final-sentence change bonus, and verbalized-sampling typicality
  bonus to candidate evaluation.
- Added the `noise-session-sample` browser example: a turn-by-turn stream
  simulator that plays a scripted session, narrates each decision, shows the
  before/after diff, exposes a per-turn pipeline trace, and includes an
  integration code snippet.
- Expanded the `noise-sample` browser lab to visualize the gates, violation
  budget, gag ledger, and reaction loop.

### Changed

- `contaminate()` now returns `gates` (sincerity, relationship, rhythm) and
  `skipped` metadata; skipped turns return the draft unchanged.

### Fixed

- Made "applied interventions" consistent across `output.applied`, memory,
  `recordLastTilt`, `tilt_applied`, and `callback_used`: the single source of
  truth is now the intersection of the selected candidate's claims and the
  plan. Candidates that claim unauthorized interventions are penalized
  (teasing-class harder), and the selection diversity bonus only counts
  planned-and-applied interventions.

### Docs

- Added "why this exists" and "how it works (one turn)" sections to the README
  (English and Japanese) covering the background and per-turn pipeline.

## 0.0.1

### Added

- Initial MVP of AITuber OnAir Noise.
- Added LLM-based response rewriting with intensity and mode support.
- Added OpenAI-compatible API key rewrite adapter support.
- Added protected spans for code blocks, URLs, and numbers.
- Added custom rewrite model adapter support.
- Added quality reports for predictability reduction, persona drift, overdone
  noise, and ungrounded details.
- Added buffered `TransformStream` support.
- Added adaptive noise memory with in-memory, localStorage, and JSON file stores.

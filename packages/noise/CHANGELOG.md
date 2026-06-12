# @aituber-onair/noise

## Unreleased

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
- `contaminate()` now returns `gates` (sincerity, relationship, rhythm) and
  `skipped` metadata; skipped turns return the draft unchanged.

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

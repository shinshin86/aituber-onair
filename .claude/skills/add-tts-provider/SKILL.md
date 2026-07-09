---
name: add-tts-provider
description: Add a new TTS provider to @aituber-onair/voice and wire it through engine implementation, public voice option types, internal engine handlers, factory registration, tests, docs, examples, and optional versioning updates. Use when requests include adding a TTS engine, supporting a voice provider or speech service, adding <provider> TTS, or updating supported voice providers.
---

# Add TTS Provider

## Overview

Add a new TTS provider for `@aituber-onair/voice` while preserving the current
public API shape and usage style.

Before adding any provider as first-class support, read
`docs/agent-model-provider-guidelines.md`. A provider/model is not eligible for
public support unless the exact speech endpoint, request body, response shape,
and user configuration path are documented or live-verified.

## Inputs

Collect missing inputs before editing:

- `engine_type`: public engine id string (example: `acmeTts`)
- `engine_class_name`: engine class name (example: `AcmeTtsEngine`)
- `display_name`: user-facing provider name (example: `Acme TTS`)
- `provider_kind`: `local` or `cloud`
- `default_speaker`: default speaker or voice id example
- `requires_api_key`: boolean
- `supports_emotion`: boolean
- `option_fields`: provider-specific public option fields to add under
  `VoiceServiceOptions`
- `default_api_url`: optional default endpoint for local or overridable services
- `examples_scope`: optional, one of `docs-only`, `react-only`, or
  `all-examples`; default `react-only`
- `bump_version`: boolean, default `false`; set `true` only when the user
  explicitly requests release/version work
- `next_version`: optional explicit target version

## Procedure

1. Run preflight checks:
   - Read `docs/agent-model-provider-guidelines.md` and classify the candidate
     as recommended/default, supported/explicit, exported deprecated
     compatibility, or candidate-only.
   - Search for existing candidate notes or research notes:
     `rg "<engine_type>|<provider>|candidate|research|notes" docs skills .claude`.
     Treat any matches as non-authoritative until official docs or live API
     behavior re-confirm them.
   - `rg "<engine_type>|<engine_class_name>" packages/voice`
   - Inspect current provider patterns in:
     - `packages/voice/CONTRIBUTING.md`
     - `packages/voice/src/services/VoiceService.ts`
     - `packages/voice/src/services/internal/engineHandlers/`
     - `packages/voice/src/engines/`
   - If the provider already partially exists, switch to gap-fix mode.
2. Preserve public API rules:
   - Do not introduce a nested config format.
   - Follow the existing `VoiceServiceOptions` top-level naming style.
   - Keep `VoiceEngineAdapter` public usage unchanged.
   - Keep existing public engine exports and methods backward compatible.
   - If adding support for an OpenAI-compatible endpoint would change the
     behavior of the existing `openai` provider, add a new provider instead of
     mutating `openai`.
3. Add engine implementation:
   - Confirm the provider's official docs or live API behavior for the exact
     speech endpoint, request body, audio response format, and voice-list
     endpoint when applicable.
   - Do not add a first-class engine based only on a model/provider marketing
     page or a global model list.
   - If any hard gate in `docs/agent-model-provider-guidelines.md` fails, keep
     the provider as candidate-only and do not add engine/type/factory/example
     support.
   - Create `packages/voice/src/engines/<engine_class_name>.ts`.
   - Implement `VoiceEngine`.
   - Reuse shared helpers from `packages/voice/src/engines/internal/` and
     `packages/voice/src/utils/` for URL building, decoding, clamping, WAV
     creation, and fetch timeout behavior.
   - Prefer explicit setter methods only when the provider needs runtime
     overrides.
   - If the provider has a default endpoint, add a constant in
     `packages/voice/src/constants/voiceEngine.ts`.
4. Add public engine registration:
   - Update `packages/voice/src/types/voiceEngine.ts`.
   - Update `packages/voice/src/engines/index.ts`.
   - Ensure `packages/voice/src/index.ts` still exposes the engine via
     `export * from './engines';`.
5. Add public option types:
   - Add `<engine_class_name without Engine>VoiceServiceOptions` to
     `packages/voice/src/services/VoiceService.ts`.
   - Add update type alias for the provider.
   - Extend `VoiceServiceOptions` and `VoiceServiceOptionsUpdate`.
   - Follow existing field naming conventions such as
     `<engine_type>ApiUrl`, `<engine_type>Speed`, or provider-specific names.
   - For OpenAI-compatible providers, prefer explicit top-level fields such as
     `<engine_type>ApiUrl`, `<engine_type>Model`, and `<engine_type>Speed`
     instead of reusing `openAi*` fields.
6. Add internal handler wiring:
   - Create
     `packages/voice/src/services/internal/engineHandlers/<engine_type>.ts`.
   - Implement:
     - `allowedUpdateKeys`
     - `applyOptions(engine, options)`
     - `mergeOptions(current, update)`
   - Register it in
     `packages/voice/src/services/internal/engineHandlers/index.ts`.
   - Keep the logic explicit. Do not generate setter names dynamically.
7. Add factory registration:
   - Update `packages/voice/src/engines/VoiceEngineFactory.ts`.
8. Add tests:
   - Create `packages/voice/tests/<engine_class_name>.test.ts`.
   - Add adapter coverage in
     `packages/voice/tests/VoiceEngineAdapter.test.ts`.
   - If the provider changes public exports, update
     `packages/voice/tests/index.test.ts`.
   - Verify `updateOptions()` behavior for provider-specific fields.
9. Update docs:
   - `packages/voice/README.md`
   - `packages/voice/README_ja.md`
   - Add provider overview, sample options, and any constraints such as API key
     or local server requirements.
10. Update examples according to `examples_scope`:
    - For `react-only`, update
      `packages/voice/examples/react-basic/src/App.tsx`
      and the related example README if needed.
    - In the React example, update `ENGINE_DEFAULTS`, engine selector options,
      provider-specific controls, API key behavior, and custom API URL wiring.
    - If a provider accepts but does not require an API key, keep UI behavior
      explicit rather than inferring from `needsApiKey` alone.
    - For `all-examples`, also add or update Node/Bun/Deno examples and example
      READMEs.
    - Keep example usage aligned with the current public API style.
11. If `bump_version` is `true`, prepare release updates for
    `@aituber-onair/voice`:
    - Decide next version:
      - Use `next_version` if provided.
      - Otherwise use a minor bump for new provider support unless repository
        rules differ.
    - Update `packages/voice/package.json`.
    - Update `packages/voice/CHANGELOG.md`.
    - Update affected lockfiles when workspace metadata changes.
    - Keep this release prep scoped to `@aituber-onair/voice`.
    - Do not bump dependent package versions or add dependent package
      changelog entries only for dependency range alignment.
    - In particular, do not bump or add release notes for
      `@aituber-onair/core` or `create-aituber-onair` unless the user
      explicitly asks to release those packages in the same task.
    - If root lockfile resolution adds a nested previous voice version for a
      dependent package because of `0.x` semver ranges, keep the dependent
      package range unchanged unless a separate core propagation/release task is
      explicitly requested.
    - After voice release prep is complete, ask whether to handle core
      propagation/release as a separate follow-up. Skip that question only when
      the user already requested voice + core release work in the same task.
12. Verify:
    - Run package-level `fmt`, `lint`, `test`, and `build`.
    - If the React example changed, run its `build` too.
    - Grep for `<engine_type>` to confirm expected placements.
    - Confirm no public API usage pattern changed in README or examples.
    - If the provider has a local default endpoint, optionally try a simple
      `curl` smoke test against that endpoint when the local service is
      expected to be running.

## References

- For touchpoints and naming patterns, read:
  `skills/add-tts-provider/references/voice-provider-touchpoints.md`

## Verification Commands

Run commands from repository root:

```bash
npm -w @aituber-onair/voice run fmt
npm -w @aituber-onair/voice run lint
npm -w @aituber-onair/voice run test
npm -w @aituber-onair/voice run build
rg "<engine_type>|<engine_class_name>" packages/voice
```

## Acceptance Criteria

- New provider has a concrete engine implementation.
- Official docs or live API behavior confirm the exact speech endpoint,
  request body, response shape, and user configuration path.
- `VoiceEngineType` includes the new engine id.
- `VoiceServiceOptions` supports the new provider without changing existing
  public usage patterns.
- An internal engine handler exists and is registered.
- `VoiceEngineFactory.getEngine()` supports the new provider.
- Adapter tests cover provider option application and `updateOptions()`.
- English and Japanese README mention the provider.
- Examples are updated for the requested scope.
- Final notes include the model/provider decision record from
  `docs/agent-model-provider-guidelines.md`.
- Version and changelog are updated when `bump_version` is `true`.
- Package verification commands pass.

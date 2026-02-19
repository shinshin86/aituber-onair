---
name: add-chat-model
description: Add a new chat model id to @aituber-onair/chat and wire it through constants, provider implementation, tests, example UI selector, docs, and versioning updates. Use when requests include adding a new model, supporting a specific model id, adding a provider model, or updating supported models for providers such as claude, gemini, and openai.
---

# Add Chat Model

## Overview

Add a new model id for an existing chat provider and complete all required
code, test, docs, and version updates in one pass.

## Inputs

Collect missing inputs before editing:

- `provider`: one of `claude`, `gemini`, `openai`, or another existing provider
- `model_id`: model id string (example: `claude-sonnet-4-6`)
- `model_const_name`: exported const name (example:
  `MODEL_CLAUDE_4_6_SONNET`)
- `display_name`: UI label (example: `Claude Sonnet 4.6`)
- `supports_vision`: boolean
- `api_version_hint`: optional hint for API version routing (example:
  `v1beta only`, `v1 preferred`, `unknown`)
- `bump_version`: boolean, default `true`
- `next_version`: optional, explicit target version (example: `0.15.0`)

## Procedure

1. Run preflight checks before editing:
   - Grep existing usage to avoid duplicate work:
     `rg "<model_id>" packages/chat`.
   - Inspect provider constants and provider `getSupportedModels()` before
     adding anything.
   - If the model already exists, stop and switch to gap-fix mode
     (tests/docs/versioning only if missing).
2. Locate the provider constants file and add:
   - `export const <model_const_name> = '<model_id>';`
   - Keep ordering consistent with neighboring entries.
   - For `claude`, edit `packages/chat/src/constants/claude.ts`.
3. If `supports_vision` is `true`, add the new constant to the provider vision
   list.
   - For `claude`, update `CLAUDE_VISION_SUPPORTED_MODELS`.
4. Update provider implementation so supported models include the new constant.
   - For `claude`, edit
     `packages/chat/src/services/providers/claude/ClaudeChatServiceProvider.ts`.
5. Update provider tests:
   - Assert supported models include the new constant.
   - If `supports_vision` is `true`, assert `supportsVisionForModel` is `true`
     for that model.
   - For `claude`, edit
     `packages/chat/tests/providers/ClaudeChatServiceProvider.test.ts`.
6. Validate API version/endpoint routing requirements for this model family:
   - Confirm whether the model must use a specific API version or endpoint
     flavor (for example Gemini `v1` vs `v1beta`).
   - If special routing is required, update service request routing logic.
   - Treat `api_version_hint` as a starting point, then verify in provider docs
     or behavior.
7. Add or update service-level transport tests for request routing:
   - Verify actual request path/version selection (not only provider model list).
   - Include fallback behavior tests when applicable (for example `v1` to
     `v1beta`).
8. Update example model selector:
   - Edit
     `packages/chat/examples/react-basic/src/components/ProviderSelector.tsx`.
   - Add a new `allModels` entry:
     - `id: <model_const_name>`
     - `name: <display_name>`
     - `provider: '<provider>'`
     - `default: false`
   - Keep import ordering consistent with nearby models.
9. Update docs using this checklist:
   - `packages/chat/README.md`
     - provider-specific usage/model section
     - "Available Providers" model list
   - `packages/chat/README.ja.md`
     - provider-specific usage/model section
     - "利用可能なプロバイダー" model list
   - If model lists appear in examples docs, update:
     `packages/chat/examples/react-basic/README.md`
10. If `bump_version` is `true`, prepare release updates for
   `@aituber-onair/chat`:
   - Decide next version:
     - Use `next_version` if provided.
     - Otherwise use a minor bump for new model support unless repository rules
       differ.
   - Update `packages/chat/package.json` version.
   - Update `packages/chat/CHANGELOG.md` for the target version:
     - If a section for `next_version` already exists, append to it.
     - Do not create duplicate headers for the same version.
   - Align dependent ranges:
     - Update `packages/core/package.json` dependency
       `@aituber-onair/chat` to the new range (for example `^0.14.0`).
     - Do not bump `@aituber-onair/core` version only for this dependency range
       change.
   - Update lockfiles affected by version/range changes:
     - `package-lock.json`
     - package/example lockfiles that embed workspace metadata when changed
   - Follow repository rule: do not create `.changeset/*`.
11. Verify:
   - Run lockfile/install sanity check.
   - Run chat package tests.
   - Run typecheck/build for chat package.
   - Run core typecheck to ensure dependency range updates are valid.
   - Grep for `model_id` to confirm expected placements and no duplicates.
12. Prepare final commit:
   - Use a release-prep message such as:
     `chore(release): prepare @aituber-onair/chat v<next_version>`.
   - Keep release-prep changes (version/changelog/lockfiles) in the same commit.

## Verification Commands

Run commands from repository root:

```bash
npm ci
npm -w @aituber-onair/chat run test
npm -w @aituber-onair/chat run typecheck
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/core run typecheck
rg "<model_id>" packages/chat
rg "v1beta|streamGenerateContent|generateContent" packages/chat/src/services/providers
```

## Acceptance Criteria

- New model constant exists and is exported.
- Provider supported models contain the new model.
- If vision is enabled, vision support list contains the model and related tests
  pass.
- Example selector displays the model label.
- Service request routing matches model API requirements (version/endpoint).
- Service-level tests cover request path/version and fallback behavior when used.
- English and Japanese README mention the model.
- Version and changelog are updated when `bump_version` is `true`.
- `@aituber-onair/core` dependency range is aligned to the new chat version.
- Lockfiles are consistent and `npm ci` succeeds.

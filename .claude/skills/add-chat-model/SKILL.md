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
- `bump_version`: boolean, default `true`
- `next_version`: optional, explicit target version (example: `0.15.0`)

## Procedure

1. Locate the provider constants file and add:
   - `export const <model_const_name> = '<model_id>';`
   - Keep ordering consistent with neighboring entries.
   - For `claude`, edit `packages/chat/src/constants/claude.ts`.
2. If `supports_vision` is `true`, add the new constant to the provider vision
   list.
   - For `claude`, update `CLAUDE_VISION_SUPPORTED_MODELS`.
3. Update provider implementation so supported models include the new constant.
   - For `claude`, edit
     `packages/chat/src/services/providers/claude/ClaudeChatServiceProvider.ts`.
4. Update provider tests:
   - Assert supported models include the new constant.
   - If `supports_vision` is `true`, assert `supportsVisionForModel` is `true`
     for that model.
   - For `claude`, edit
     `packages/chat/tests/providers/ClaudeChatServiceProvider.test.ts`.
5. Update example model selector:
   - Edit
     `packages/chat/examples/react-basic/src/components/ProviderSelector.tsx`.
   - Add a new `allModels` entry:
     - `id: <model_const_name>`
     - `name: <display_name>`
     - `provider: '<provider>'`
     - `default: false`
   - Keep import ordering consistent with nearby models.
6. Update docs:
   - `packages/chat/README.md`
   - `packages/chat/README.ja.md`
   - If model lists appear in examples docs, update:
     `packages/chat/examples/react-basic/README.md`
7. If `bump_version` is `true`, prepare release updates for
   `@aituber-onair/chat`:
   - Decide next version:
     - Use `next_version` if provided.
     - Otherwise use a minor bump for new model support unless repository rules
       differ.
   - Update `packages/chat/package.json` version.
   - Add a new top section to `packages/chat/CHANGELOG.md` for the target
     version, summarizing model support and related docs/example updates.
   - Align dependent ranges:
     - Update `packages/core/package.json` dependency
       `@aituber-onair/chat` to the new range (for example `^0.14.0`).
     - Do not bump `@aituber-onair/core` version only for this dependency range
       change.
   - Update lockfiles affected by version/range changes:
     - `package-lock.json`
     - package/example lockfiles that embed workspace metadata when changed
   - Follow repository rule: do not create `.changeset/*`.
8. Verify:
   - Run lockfile/install sanity check.
   - Run chat package tests.
   - Run typecheck/build for chat package.
   - Run core typecheck to ensure dependency range updates are valid.
   - Grep for `model_id` to confirm expected placements and no duplicates.
9. Prepare final commit:
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
```

## Acceptance Criteria

- New model constant exists and is exported.
- Provider supported models contain the new model.
- If vision is enabled, vision support list contains the model and related tests
  pass.
- Example selector displays the model label.
- English and Japanese README mention the model.
- Version and changelog are updated when `bump_version` is `true`.
- `@aituber-onair/core` dependency range is aligned to the new chat version.
- Lockfiles are consistent and `npm ci` succeeds.

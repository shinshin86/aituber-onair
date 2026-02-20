---
name: sync-core-after-chat-upgrade
description: Apply released @aituber-onair/chat updates to @aituber-onair/core and core React examples, including dependency alignment, core re-exports, example model lists, docs, version/changelog, lockfiles, and verification. Use after chat package upgrades or when users ask to propagate chat changes into core.
---

# Sync Core After Chat Upgrade

## Overview

Propagate chat package upgrades into core and related examples so users can use
new chat capabilities from `@aituber-onair/core` immediately.

## Inputs

Collect missing inputs before editing:

- `chat_version`: target chat version already released/prepared (example:
  `0.15.0`)
- `core_next_version`: optional explicit target core version (example:
  `0.23.1`)
- `bump_version`: boolean, default `true`
- `update_docs`: boolean, default `true`
- `update_examples`: boolean, default `true`

## Procedure

1. Preflight:
   - Inspect `packages/chat/package.json` and `packages/core/package.json`.
   - Read `packages/chat/CHANGELOG.md` latest entry and list what must surface
     in core (new constants/models/provider behavior).
2. Align core dependency:
   - Update `packages/core/package.json` dependency
     `@aituber-onair/chat` to include `^<chat_version>` when needed.
3. Update core public exports:
   - Edit `packages/core/src/index.ts` to re-export newly relevant chat
     constants/types/providers that should be available from core.
   - Keep ordering consistent with nearby export groups.
4. Update core examples when `update_examples` is `true`:
   - `packages/core/examples/react-basic/src/constants/*.ts`:
     add/replace model constants so new chat models are selectable.
   - `packages/core/examples/react-pngtuber-app`:
     update defaults or UI only if required by the chat change.
5. Update docs when `update_docs` is `true`:
   - `packages/core/README.md`
   - `packages/core/README_ja.md`
   - `packages/core/examples/react-basic/README.md`
   - `packages/core/examples/react-pngtuber-app/README.md` (if relevant)
6. Versioning when `bump_version` is `true`:
   - Choose bump type:
     - patch for dependency/export alignment and non-breaking propagation.
     - minor only when core public behavior/features are expanded.
   - Use `core_next_version` if provided; otherwise compute next version.
   - Update `packages/core/package.json` version.
   - Add release note entry to `packages/core/CHANGELOG.md`.
7. Lockfiles:
   - Update root `package-lock.json`.
   - Update example lockfiles that embed workspace metadata:
     - `packages/core/examples/react-basic/package-lock.json`
     - `packages/core/examples/react-pngtuber-app/package-lock.json`
8. Verify:
   - `npm -w @aituber-onair/core run test`
   - `npm -w @aituber-onair/core run build`
   - `npm --prefix packages/core/examples/react-basic run build`
   - `npm --prefix packages/core/examples/react-pngtuber-app run build`
9. Final check:
   - Confirm newly added chat models/features are reachable from core exports
     and visible in examples.

## Verification Commands

Run commands from repository root:

```bash
npm -w @aituber-onair/core run test
npm -w @aituber-onair/core run build
npm --prefix packages/core/examples/react-basic run build
npm --prefix packages/core/examples/react-pngtuber-app run build
```

## Acceptance Criteria

- Core depends on the intended chat version range.
- Required new chat constants/features are re-exported from core.
- Core examples can select/use newly propagated models as needed.
- Core docs reflect the updated provider/model coverage.
- Core version/changelog and lockfiles are consistent when `bump_version` is
  `true`.
- Core tests/build and both React example builds pass.

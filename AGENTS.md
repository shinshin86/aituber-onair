# Repository Guidelines

## Project Structure & Modules
- Monorepo via npm workspaces under `packages/*` with `src`, `tests`, `images`, `dist`, and `examples` per package.
- Key packages: `core` (integration/orchestration), `chat` (LLM providers), `voice` (TTS engines), `manneri` (conversation pattern detection), `bushitsu-client` (WebSocket + React hooks), `kizuna` (relationship/points).
- Each package is usable independently; import from package entry points, not `dist`.

## Architecture Overview (from CLAUDE.md)
- Event‑driven core with strong typing: AITuberOnAirCore (orchestrator), ChatProcessor (LLM flow), MemoryManager (auto‑summarization to avoid token bloat).
- Chat abstracts OpenAI/Claude/Gemini under a unified interface; Voice supports multiple TTS engines with emotion cues; packages avoid tight coupling.
- Cross‑runtime focus (browser/Node/Bun/Deno). Optional Node audio: `speaker` or `play-sound`.

## Build, Test, and Development
- Install: `npm ci`
- Build all: `npm run build --workspaces` (CI builds in dependency order on Node 20)
- Build one: `npm -w @aituber-onair/chat run build`
- Test all: `npm run test --workspaces` (watch: `npm -w @aituber-onair/core run test:watch`)
- Lint/Format: `npm run lint --workspaces` • `npm run fmt --workspaces` (check: `fmt:check`)
- Type check (per pkg): `npm -w <name> run typecheck`
- After any code fix/change, always run `fmt`, `build`, then `test` for the affected scope before completing the task.

## Definition of Done (DoD)
- Before push/PR, always run the following repository-wide commands in this order and ensure all pass:
  - `npm run fmt`
  - `npm run lint`
  - `npm run test`
  - `npm run build`

## Coding Style & Naming
- TypeScript + Biome (2‑space indent, single quotes, 80‑char width). Code/comments in English.
- Use barrel exports (`index.ts`) to define public API; minimize external deps.
- Tests live in `tests` with `*.test.ts` naming.

## Testing Guidelines
- Framework: Vitest (jsdom where browser APIs are needed).
- Prefer AAA pattern and focused unit tests; include environment differences (browser vs Node).
- Coverage: `npm -w <name> run test:coverage`.

## Commit & Pull Requests
- Conventional Commits: `feat(core): ...`, `fix(manneri): ...`, `test(voice): ...`.
- PRs: clear description, linked issues, screenshots for example/UI changes.
- Must pass CI, lint/format, tests. Keep per-package CHANGELOG and version bumps in sync; do not add files under `.changeset/`. Do not publish locally—CI handles releases; never commit `dist` or secrets.
- **Version bump commits must include `package-lock.json` and dependent `package.json` range updates.** All packages use `0.x` versioning, so `^0.x.y` does NOT span minor bumps (e.g. `^0.22.0` excludes `0.23.0`). Omitting these causes `npm ci` to fail in CI. Always run `npm install --package-lock-only` then `npm ci` before committing.

## Release Notes / Process
- Applies to all packages: do not use the Changeset CLI or create `.changeset/*` files.
- For releases, update each package’s `CHANGELOG.md` and `package.json` manually (align dependent version ranges as needed).
- Refer to `README.md` for the current release flow; when in doubt, re-read it before acting.
### Release Flow & Failure Recovery
- `release.yml` runs `changesets/action@v1` with `createGithubReleases: true`.
- On merge to `main`, it publishes updated packages to npm, creates tags like `@aituber-onair/<pkg>@x.y.z`, and creates GitHub Releases **only for packages published in that run**.
- `prerelease-next.yml` only updates the `next` prerelease; it does not create stable releases.
- If the release CI fails after some packages were published, re-running will skip already-published packages and only publish the remaining ones; missing GitHub Releases must be created manually.
- Manual recovery (when a Release is missing): ensure the tag exists, then create the Release with changelog notes (e.g., `gh release create "@aituber-onair/chat@0.10.0" -t "@aituber-onair/chat v0.10.0" -F /tmp/chat-0.10.0.md`).

## Security & Configuration
- Never hardcode API keys (OpenAI/Gemini/etc). Use environment variables; `.env*` stays untracked.
- Preserve backwards‑compatible exports; treat `dist` as build output only.

## Agent Skills Usage
- Use the shared skill guide in `docs/agent-skills.md`.
- Skills:
  - `add-chat-model`
  - `add-tts-provider`
  - `sync-core-after-chat-upgrade`
  - `wrap-tts-as-openai-compatible`
- Canonical skill sources:
  - `skills/add-chat-model/SKILL.md`
  - `skills/add-tts-provider/SKILL.md`
  - `skills/sync-core-after-chat-upgrade/SKILL.md`
  - `skills/wrap-tts-as-openai-compatible/SKILL.md`
- Claude Code mirror paths:
  - `.claude/skills/add-chat-model/SKILL.md`
  - `.claude/skills/add-tts-provider/SKILL.md`
  - `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`
  - `.claude/skills/wrap-tts-as-openai-compatible/SKILL.md`
- When requests match "add a new model", "support model <model_id>", "add <provider> model", or "update supported models", follow `skills/add-chat-model/SKILL.md`.
- When requests match "add a TTS provider", "support <provider> TTS", "add voice provider", or "update supported voice providers", follow `skills/add-tts-provider/SKILL.md`.
- When requests ask to apply chat upgrades to core/examples, follow `skills/sync-core-after-chat-upgrade/SKILL.md`.
- When propagating `@aituber-onair/voice` upgrades into `@aituber-onair/core`,
  do not stop at core exports or the React basic example. Check and update all
  core React examples that expose TTS settings:
  `packages/core/examples/react-basic`,
  `packages/core/examples/react-pngtuber-app`,
  `packages/core/examples/react-vrm-app`, and
  `packages/core/examples/react-live2d-app`. For each provider, verify the
  engine selector, persisted settings type/defaults, settings UI,
  `VoiceServiceOptions` wiring, README mention, lockfile metadata, and example
  build. Cloud voice providers that expose voice-list APIs should provide a
  selectable voice list instead of requiring users to type opaque voice IDs.
- When requests match "wrap a TTS engine as OpenAI-compatible", "build an OpenAI-compatible speech server", "expose <provider> as `/v1/audio/speech`", or "set up a Colab TTS compatibility server", follow `skills/wrap-tts-as-openai-compatible/SKILL.md`.
- For `wrap-tts-as-openai-compatible`, first classify the upstream TTS as direct Python API, CLI/file-output, or internal runtime plus save helper, then validate the wrapper from `@aituber-onair/voice` when applicable.
- Prefer this skill for practical local TTS engines that cleanly support one-shot WAV generation. Do not force research-first or streaming-first systems into this workflow.
- If required inputs are missing, collect: `provider`, `model_id`, `model_const_name`, `display_name`, `supports_vision`, and optional `bump_version` (default `true`).
- For `add-tts-provider`, collect missing inputs: `engine_type`, `engine_class_name`, `display_name`, `provider_kind`, `default_speaker`, `requires_api_key`, `supports_emotion`, and `option_fields`, plus optional `default_api_url`, `examples_scope`, and `bump_version` (default `true`).
- After finishing `add-chat-model`, ask whether to run `sync-core-after-chat-upgrade` unless the user already asked for end-to-end chat+core propagation.
- Keep skill copies synchronized when updating procedures.

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
  - `sync-core-after-chat-upgrade`
- Canonical skill sources:
  - `skills/add-chat-model/SKILL.md`
  - `skills/sync-core-after-chat-upgrade/SKILL.md`
- Claude Code mirror paths:
  - `.claude/skills/add-chat-model/SKILL.md`
  - `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`
- When requests match "add a new model", "support model <model_id>", "add <provider> model", or "update supported models", follow `skills/add-chat-model/SKILL.md`.
- When requests ask to apply chat upgrades to core/examples, follow `skills/sync-core-after-chat-upgrade/SKILL.md`.
- If required inputs are missing, collect: `provider`, `model_id`, `model_const_name`, `display_name`, `supports_vision`, and optional `bump_version` (default `true`).
- After finishing `add-chat-model`, ask whether to run `sync-core-after-chat-upgrade` unless the user already asked for end-to-end chat+core propagation.
- Keep skill copies synchronized when updating procedures.

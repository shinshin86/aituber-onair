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

## Security & Configuration
- Never hardcode API keys (OpenAI/Gemini/etc). Use environment variables; `.env*` stays untracked.
- Preserve backwards‑compatible exports; treat `dist` as build output only.

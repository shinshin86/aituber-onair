# Agent Skills in This Repository

This repository manages Agent Skills with an open SKILL.md format and keeps
Codex and Claude Code usage aligned.

References:

- Agent Skills blog:
  https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills
- Open specification: https://agentskills.io/specification
- Claude Code skills docs: https://code.claude.com/docs/en/skills

## Layout

- Canonical skill source:
  `skills/<skill-name>/SKILL.md`
- Codex UI metadata:
  `skills/<skill-name>/agents/openai.yaml`
- Claude Code runtime skill:
  `.claude/skills/<skill-name>/SKILL.md`

`SKILL.md` is the shared source of truth for skill behavior. Keep frontmatter
minimal (`name`, `description`) and keep the body procedural.

## Current Skills

- `add-chat-model`
  - Canonical: `skills/add-chat-model/SKILL.md`
  - Claude Code: `.claude/skills/add-chat-model/SKILL.md`
  - Codex metadata: `skills/add-chat-model/agents/openai.yaml`
- `add-tts-provider`
  - Canonical: `skills/add-tts-provider/SKILL.md`
  - Claude Code: `.claude/skills/add-tts-provider/SKILL.md`
  - Codex metadata: `skills/add-tts-provider/agents/openai.yaml`
- `sync-core-after-chat-upgrade`
  - Canonical: `skills/sync-core-after-chat-upgrade/SKILL.md`
  - Claude Code: `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`
  - Codex metadata: `skills/sync-core-after-chat-upgrade/agents/openai.yaml`
- `wrap-tts-as-openai-compatible`
  - Canonical: `skills/wrap-tts-as-openai-compatible/SKILL.md`
  - Claude Code: `.claude/skills/wrap-tts-as-openai-compatible/SKILL.md`
  - Codex metadata: `skills/wrap-tts-as-openai-compatible/agents/openai.yaml`

Use this skill when adding a new model id to `@aituber-onair/chat`, including
constants, provider support, tests, examples, docs, and versioning updates.
Use `add-tts-provider` when adding a new voice/TTS provider to
`@aituber-onair/voice`, including engine implementation, public option types,
internal handler wiring, tests, docs, examples, and release prep. This also
fits OpenAI-compatible TTS endpoints such as Kokoro FastAPI when they should be
added as a dedicated provider.
Use `sync-core-after-chat-upgrade` after chat upgrades to propagate changes
into `@aituber-onair/core` and core examples.
Use `wrap-tts-as-openai-compatible` when exposing a local or self-hosted TTS
runtime through an OpenAI-compatible `POST /v1/audio/speech` server, including
JSON request handling, browser CORS, Colab-friendly setup, upstream TTS pattern
classification, and debugging of 422/500/runtime issues. This skill also
includes validation guidance for consuming the wrapper from
`@aituber-onair/voice`. It is optimized for practical local TTS engines rather
than research-first or streaming-first systems.

## Usage

Codex prompt examples:

- "add a new model"
- "support model claude-sonnet-4-6"
- "add claude model"
- "update supported models"
- "add a TTS provider"
- "support Acme TTS in voice"
- "add <provider> TTS"
- "wrap a TTS engine as OpenAI-compatible"
- "build an OpenAI-compatible speech server in Colab"

Claude Code prompt examples:

- "Use $add-chat-model to add claude-sonnet-4-6 for claude."
- "Use $add-chat-model and wire the model through tests/docs/versioning."
- "Use $sync-core-after-chat-upgrade for chat 0.15.0."

If the request does not include all required inputs, collect:
`provider`, `model_id`, `model_const_name`, `display_name`,
`supports_vision`, and optional `bump_version` (default `true`).

Handoff rule:

- After finishing `$add-chat-model`, ask whether to run
  `$sync-core-after-chat-upgrade`.
- If the user already requested chat + core propagation in one task, continue
  directly without asking again.

## Update Workflow

1. Edit canonical file:
   `skills/<skill-name>/SKILL.md`
2. Sync to Claude Code path:
   `.claude/skills/<skill-name>/SKILL.md`
3. If needed, update Codex metadata:
   `skills/<skill-name>/agents/openai.yaml`
4. Update references in `AGENTS.md` and `CLAUDE.md` if behavior changed.

Recommended sync check:

```bash
diff -u skills/add-chat-model/SKILL.md .claude/skills/add-chat-model/SKILL.md
diff -u skills/add-tts-provider/SKILL.md .claude/skills/add-tts-provider/SKILL.md
diff -u skills/sync-core-after-chat-upgrade/SKILL.md .claude/skills/sync-core-after-chat-upgrade/SKILL.md
diff -u skills/wrap-tts-as-openai-compatible/SKILL.md .claude/skills/wrap-tts-as-openai-compatible/SKILL.md
```

# Agent Skills in This Repository

This repository manages Agent Skills with an open SKILL.md format and keeps
Codex and Claude Code usage aligned.

References:

- Agent Skills blog:
  https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills
- Open specification: https://agentskills.io/specification
- Claude Code skills docs: https://code.claude.com/docs/en/skills
- Model/provider update judgment guide:
  `docs/agent-model-provider-guidelines.md`

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
- `connect-colab-local-tts`
  - Canonical: `skills/connect-colab-local-tts/SKILL.md`
  - Claude Code: `.claude/skills/connect-colab-local-tts/SKILL.md`
  - Codex metadata: `skills/connect-colab-local-tts/agents/openai.yaml`
- `create-pngtuber-avatar-states`
  - Canonical: `skills/create-pngtuber-avatar-states/SKILL.md`
  - Claude Code: `.claude/skills/create-pngtuber-avatar-states/SKILL.md`
  - Codex metadata: `skills/create-pngtuber-avatar-states/agents/openai.yaml`

Use `add-chat-model` when adding a new model id to `@aituber-onair/chat`,
including constants, provider support, tests, examples, docs, and versioning
updates.
Before adding or reorganizing LLM/TTS models, read
`docs/agent-model-provider-guidelines.md` to classify the model or API as
recommended/default, supported/explicit, deprecated compatibility, or
candidate-only.
Use `add-tts-provider` when adding a new voice/TTS provider to
`@aituber-onair/voice`, including engine implementation, public option types,
internal handler wiring, tests, docs, examples, and release prep. This also fits
OpenAI-compatible TTS endpoints such as `<openai-compatible-tts-endpoint>` when
they should be added as a dedicated provider.
Use `sync-core-after-chat-upgrade` after chat upgrades to propagate changes
into `@aituber-onair/core` and core examples.
Use `wrap-tts-as-openai-compatible` when exposing a local or self-hosted TTS
runtime through an OpenAI-compatible `POST /v1/audio/speech` server, including
JSON request handling, browser CORS, Colab-friendly setup, upstream TTS pattern
classification, and debugging of 422/500/runtime issues. This skill also
includes validation guidance for consuming the wrapper from
`@aituber-onair/voice`. It is optimized for practical local TTS engines rather
than research-first or streaming-first systems.
Use `create-pngtuber-avatar-states` when creating PNGTuber avatar state images, including 2x2 state sheets, mouth/eye open-close variants, background transparency, alignment, and validation. The image generation phase requires Codex with ImageGen or an equivalent image-generation tool. In Claude Code, use this skill only for existing image files: splitting, background transparency when appropriate, alignment, and validation.
Use `connect-colab-local-tts` when driving
`shinshin86/local-tts-on-google-colab` through Colab MCP Go, exposing the
selected engine with `trycloudflare`, and validating the resulting
OpenAI-compatible speech endpoint from `@aituber-onair/voice`.

## Usage

Codex prompt examples:

- "add a new model"
- "support model <provider-model-id>"
- "add claude model"
- "update supported models"
- "add a TTS provider"
- "support Acme TTS in voice"
- "add <provider> TTS"
- "wrap a TTS engine as OpenAI-compatible"
- "build an OpenAI-compatible speech server in Colab"
- "connect Colab local TTS to AITuber OnAir voice"
- "create PNGTuber avatar state images from this character"
- "generate mouth and eye open-close variants for react-pngtuber-app"
- "launch local-tts-on-google-colab with Colab MCP Go"
- "Use $connect-colab-local-tts to launch <local-tts-engine> from
  local-tts-on-google-colab through Colab MCP Go, expose it with trycloudflare,
  and verify it from @aituber-onair/voice."

Claude Code prompt examples:

- "Use $add-chat-model to add <provider-model-id> for <provider>."
- "Use $add-chat-model and wire the model through tests/docs/versioning."
- "Use $sync-core-after-chat-upgrade for chat 0.15.0."

## Task Prompt Templates

Use these when you want a copy-pasteable prompt for a specific workflow.

### PNGTuber Avatar Assets

```text
Use $create-pngtuber-avatar-states to create four PNGTuber avatar state images from the attached character image.

Requirements:
- Save outputs under `outputs/pngtuber-avatar/<name-or-date>/`.
- Create these files:
  - `mouth_close_eyes_open.png`
  - `mouth_open_eyes_open.png`
  - `mouth_close_eyes_close.png`
  - `mouth_open_eyes_close.png`
- Preserve the character, expression direction, hairstyle, outfit, composition, and background mood as much as possible.
- Change only the mouth and eyes between states.
- If the source image has a meaningful background, keep it. If it has a plain white/chroma-key background intended as a cutout, remove it.
- Check and correct position jitter between the four states.
- Report the saved paths and validation result.
```

If the request does not include all required inputs, collect:
`provider`, `model_id`, `model_const_name`, `display_name`,
`supports_vision`, and optional `bump_version` (default `false`; set `true`
only when release/version work is explicitly requested).

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
diff -u skills/connect-colab-local-tts/SKILL.md .claude/skills/connect-colab-local-tts/SKILL.md
diff -u skills/create-pngtuber-avatar-states/SKILL.md .claude/skills/create-pngtuber-avatar-states/SKILL.md
```

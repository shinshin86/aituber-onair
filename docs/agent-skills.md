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
- `sync-core-after-chat-upgrade`
  - Canonical: `skills/sync-core-after-chat-upgrade/SKILL.md`
  - Claude Code: `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`
  - Codex metadata: `skills/sync-core-after-chat-upgrade/agents/openai.yaml`

Use this skill when adding a new model id to `@aituber-onair/chat`, including
constants, provider support, tests, examples, docs, and versioning updates.
Use `sync-core-after-chat-upgrade` after chat upgrades to propagate changes
into `@aituber-onair/core` and core examples.

## Usage

Codex prompt examples:

- "add a new model"
- "support model claude-sonnet-4-6"
- "add claude model"
- "update supported models"

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
diff -u skills/sync-core-after-chat-upgrade/SKILL.md .claude/skills/sync-core-after-chat-upgrade/SKILL.md
```

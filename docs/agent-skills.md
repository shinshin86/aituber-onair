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

## Current Skill

- `add-chat-model`
  - Canonical: `skills/add-chat-model/SKILL.md`
  - Claude Code: `.claude/skills/add-chat-model/SKILL.md`
  - Codex metadata: `skills/add-chat-model/agents/openai.yaml`

Use this skill when adding a new model id to `@aituber-onair/chat`, including
constants, provider support, tests, examples, docs, and versioning updates.

## Usage

Codex prompt examples:

- "add a new model"
- "support model claude-sonnet-4-6"
- "add claude model"
- "update supported models"

Claude Code prompt examples:

- "Use $add-chat-model to add claude-sonnet-4-6 for claude."
- "Use $add-chat-model and wire the model through tests/docs/versioning."

If the request does not include all required inputs, collect:
`provider`, `model_id`, `model_const_name`, `display_name`,
`supports_vision`, and optional `bump_version` (default `true`).

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
```

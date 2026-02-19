# このリポジトリの Agent Skills

このリポジトリでは、Agent Skills のオープン形式（`SKILL.md`）を採用し、
Codex と Claude Code の運用をそろえています。

参考:

- Agent Skills 紹介:
  https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills
- オープン仕様: https://agentskills.io/specification
- Claude Code Skills ドキュメント: https://code.claude.com/docs/en/skills

## 配置ルール

- スキル正本:
  `skills/<skill-name>/SKILL.md`
- Codex UI メタデータ:
  `skills/<skill-name>/agents/openai.yaml`
- Claude Code 実行用:
  `.claude/skills/<skill-name>/SKILL.md`

挙動の正本は `SKILL.md` です。frontmatter は
`name` / `description` を基本とし、本文は手順中心で記述します。

## 現在のスキル

- `add-chat-model`
  - 正本: `skills/add-chat-model/SKILL.md`
  - Claude Code: `.claude/skills/add-chat-model/SKILL.md`
  - Codex メタデータ: `skills/add-chat-model/agents/openai.yaml`

`@aituber-onair/chat` に新しい model id を追加する際
（constants/provider/tests/examples/docs/versioning）に使用します。

## 使い方

Codex での依頼例:

- "add a new model"
- "support model claude-sonnet-4-6"
- "add claude model"
- "update supported models"

Claude Code での依頼例:

- "Use $add-chat-model to add claude-sonnet-4-6 for claude."
- "Use $add-chat-model and wire the model through tests/docs/versioning."

入力が足りない場合は、`provider`, `model_id`, `model_const_name`,
`display_name`, `supports_vision`, `bump_version`（省略時 `true`）を確認します。

## 更新フロー

1. まず正本を更新:
   `skills/<skill-name>/SKILL.md`
2. Claude Code 側へ同期:
   `.claude/skills/<skill-name>/SKILL.md`
3. 必要に応じて Codex メタデータ更新:
   `skills/<skill-name>/agents/openai.yaml`
4. 使い方に変更があれば `AGENTS.md` と `CLAUDE.md` も更新

同期確認コマンド:

```bash
diff -u skills/add-chat-model/SKILL.md .claude/skills/add-chat-model/SKILL.md
```

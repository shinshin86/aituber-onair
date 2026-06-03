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
- `add-tts-provider`
  - 正本: `skills/add-tts-provider/SKILL.md`
  - Claude Code: `.claude/skills/add-tts-provider/SKILL.md`
  - Codex メタデータ: `skills/add-tts-provider/agents/openai.yaml`
- `sync-core-after-chat-upgrade`
  - 正本: `skills/sync-core-after-chat-upgrade/SKILL.md`
  - Claude Code: `.claude/skills/sync-core-after-chat-upgrade/SKILL.md`
  - Codex メタデータ:
    `skills/sync-core-after-chat-upgrade/agents/openai.yaml`
- `wrap-tts-as-openai-compatible`
  - 正本: `skills/wrap-tts-as-openai-compatible/SKILL.md`
  - Claude Code: `.claude/skills/wrap-tts-as-openai-compatible/SKILL.md`
  - Codex メタデータ:
    `skills/wrap-tts-as-openai-compatible/agents/openai.yaml`
- `connect-colab-local-tts`
  - 正本: `skills/connect-colab-local-tts/SKILL.md`
  - Claude Code: `.claude/skills/connect-colab-local-tts/SKILL.md`
  - Codex メタデータ:
    `skills/connect-colab-local-tts/agents/openai.yaml`

`@aituber-onair/chat` に新しい model id を追加する際
（constants/provider/tests/examples/docs/versioning）に使用します。
`@aituber-onair/voice` に新しい TTS provider を追加する場合は
`add-tts-provider` を使います。
chat 更新後に `@aituber-onair/core` と core examples へ反映する場合は
`sync-core-after-chat-upgrade` を使います。
ローカルまたはセルフホスト TTS を OpenAI 互換 `/v1/audio/speech` として
包む場合は `wrap-tts-as-openai-compatible` を使います。
`shinshin86/local-tts-on-google-colab` を Colab MCP Go で起動し、
`trycloudflare` URL を発行して `@aituber-onair/voice` から検証する場合は
`connect-colab-local-tts` を使います。

## 使い方

Codex での依頼例:

- "add a new model"
- "support model claude-sonnet-4-6"
- "add claude model"
- "update supported models"
- "add a TTS provider"
- "wrap a TTS engine as OpenAI-compatible"
- "connect Colab local TTS to AITuber OnAir voice"
- "launch local-tts-on-google-colab with Colab MCP Go"
- "Use $connect-colab-local-tts to launch Irodori-TTS from
  local-tts-on-google-colab through Colab MCP Go, expose it with trycloudflare,
  and verify it from @aituber-onair/voice."

Claude Code での依頼例:

- "Use $add-chat-model to add claude-sonnet-4-6 for claude."
- "Use $add-chat-model and wire the model through tests/docs/versioning."
- "Use $sync-core-after-chat-upgrade for chat 0.15.0."
- "Use $connect-colab-local-tts to launch Irodori-TTS through Colab MCP Go."

入力が足りない場合は、`provider`, `model_id`, `model_const_name`,
`display_name`, `supports_vision`, `bump_version`（省略時 `true`）を確認します。

連携ルール:

- `$add-chat-model` 完了後は、
  `$sync-core-after-chat-upgrade` を続けて実行するか確認します。
- ユーザーが最初から chat + core の一括反映を明示している場合は、
  確認を省略して続行します。

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
diff -u skills/add-tts-provider/SKILL.md .claude/skills/add-tts-provider/SKILL.md
diff -u skills/sync-core-after-chat-upgrade/SKILL.md .claude/skills/sync-core-after-chat-upgrade/SKILL.md
diff -u skills/wrap-tts-as-openai-compatible/SKILL.md .claude/skills/wrap-tts-as-openai-compatible/SKILL.md
diff -u skills/connect-colab-local-tts/SKILL.md .claude/skills/connect-colab-local-tts/SKILL.md
```

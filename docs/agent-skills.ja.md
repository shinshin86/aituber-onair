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
- `create-pngtuber-avatar-states`
  - 正本: `skills/create-pngtuber-avatar-states/SKILL.md`
  - Claude Code: `.claude/skills/create-pngtuber-avatar-states/SKILL.md`
  - Codex メタデータ:
    `skills/create-pngtuber-avatar-states/agents/openai.yaml`

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
PNGTuber 向けの目・口開閉4状態画像、2x2状態シート、背景透過、位置合わせ、検証を行う場合は `create-pngtuber-avatar-states` を使います。画像生成フェーズは Codex の ImageGen など画像生成ツールが使える環境を前提にします。Claude Code では新規画像生成は行わず、既存画像の切り出し、適切な場合の背景透過、位置合わせ、検証に限定して使います。

## 使い方

Codex での依頼例:

- "新しいモデルを追加してください"
- "claude-sonnet-4-6 を claude provider で使えるようにしてください"
- "対応モデル一覧を更新してください"
- "新しい TTS provider を追加してください"
- "TTS エンジンを OpenAI 互換 `/v1/audio/speech` として公開してください"
- "Colab のローカル TTS を AITuber OnAir voice に接続してください"
- "このキャラクターでPNGTuber用の4状態画像を作ってください"
- "react-pngtuber-app向けの目口開閉差分を生成してください"
- "Colab MCP Go を使って local-tts-on-google-colab を起動してください"
- "$connect-colab-local-tts を使って、Colab MCP Go 経由で Irodori-TTS を
  local-tts-on-google-colab から起動し、trycloudflare で外部 URL を発行して
  @aituber-onair/voice から検証してください"

Claude Code での依頼例:

- "$add-chat-model を使って claude-sonnet-4-6 を claude に追加してください。"
- "$add-chat-model を使って、tests/docs/versioning まで反映してください。"
- "$sync-core-after-chat-upgrade を使って chat 0.15.0 の更新を core へ反映してください。"
- "$connect-colab-local-tts を使って、Colab MCP Go 経由で Irodori-TTS を起動してください。"

## タスク別プロンプトテンプレート

特定の作業を依頼するときに、そのままコピーして使うテンプレートです。

### PNGTuber アバター素材作成

```text
$create-pngtuber-avatar-states を使って、添付画像のキャラクターからPNGTuber用の4状態画像を作成してください。

条件:
- 出力先は `outputs/pngtuber-avatar/<名前または日付>/`
- 4状態は以下のファイル名で保存
  - `mouth_close_eyes_open.png`
  - `mouth_open_eyes_open.png`
  - `mouth_close_eyes_close.png`
  - `mouth_open_eyes_close.png`
- 元画像のキャラクター、視線、髪型、服装、構図、背景の雰囲気をできるだけ維持
- 口と目以外はできるだけ変えない
- 背景が部屋や屋外など意味のある背景なら維持し、白抜きや単色背景で切り抜き用途なら透過
- 4枚の位置ズレをチェックし、必要なら位置合わせする
- 最後に保存先と検証結果を報告してください
```

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
diff -u skills/create-pngtuber-avatar-states/SKILL.md .claude/skills/create-pngtuber-avatar-states/SKILL.md
```

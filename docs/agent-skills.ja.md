# このリポジトリの Agent Skills

このリポジトリでは、Agent Skills のオープン形式（`SKILL.md`）を採用し、
Codex と Claude Code の運用をそろえています。

参考:

- Agent Skills 紹介:
  https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills
- オープン仕様: https://agentskills.io/specification
- Claude Code Skills ドキュメント: https://code.claude.com/docs/en/skills
- モデル / provider 更新判断ガイド:
  `docs/agent-model-provider-guidelines.md`

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
- `connect-colab-local-llm`
  - 正本: `skills/connect-colab-local-llm/SKILL.md`
  - Claude Code: `.claude/skills/connect-colab-local-llm/SKILL.md`
  - Codex メタデータ:
    `skills/connect-colab-local-llm/agents/openai.yaml`
- `create-pngtuber-avatar-states`
  - 正本: `skills/create-pngtuber-avatar-states/SKILL.md`
  - Claude Code: `.claude/skills/create-pngtuber-avatar-states/SKILL.md`
  - Codex メタデータ:
    `skills/create-pngtuber-avatar-states/agents/openai.yaml`

`add-chat-model` は `@aituber-onair/chat` に新しい model id を追加する際
（constants/provider/tests/examples/docs/versioning）に使用します。
LLM / TTS model や provider を追加・整理する前に、
`docs/agent-model-provider-guidelines.md` を読み、recommended/default,
supported/explicit, deprecated compatibility, candidate-only のどれに該当
するかを判断します。
`@aituber-onair/voice` に新しい TTS provider を追加する場合は
`add-tts-provider` を使います。
chat 更新後に `@aituber-onair/core` と core examples へ反映する場合は
`sync-core-after-chat-upgrade` を使います。
ローカルまたはセルフホスト TTS を OpenAI 互換 `/v1/audio/speech` として
包む場合は `wrap-tts-as-openai-compatible` を使います。
`shinshin86/local-tts-on-google-colab` を Colab MCP Go で起動し、
`trycloudflare` URL を発行して `@aituber-onair/voice` から検証する場合は
`connect-colab-local-tts` を使います。
Colab MCP Go を使って Google Colab 上でローカル LLM を起動し、
cloudflared Quick Tunnel 経由の OpenAI 互換 Chat Completions API として
公開して、chat 互換性プローブと Core React サンプルで検証する場合は
`connect-colab-local-llm` を使います。Hugging Face の通常形式には vLLM、
GGUF 形式には llama.cpp を使用します。API キーはセッションごとに
自動生成され、ngrok は使用しません。
PNGTuber 向けの目・口開閉4状態画像、2x2状態シート、背景透過、位置合わせ、検証を行う場合は `create-pngtuber-avatar-states` を使います。画像生成フェーズは Codex の ImageGen など画像生成ツールが使える環境を前提にします。Claude Code では新規画像生成は行わず、既存画像の切り出し、適切な場合の背景透過、位置合わせ、検証に限定して使います。

## Google Colab ローカル LLM クイックスタート

最初に Google Colab でノートブックを開き、GPU ランタイムを選択して
接続し、Colab MCP Go からノートブックを操作できる状態にします。
その後、検証済みの L4 構成を使う場合は、次の依頼文を Codex に
貼り付けます。

```text
$connect-colab-local-llm を使って、Google Colab の L4 上で次のローカル LLM
を起動し、AITuber OnAir Core の PNGTuber サンプルから利用できる状態まで
セットアップしてください。

- backend: llama.cpp
- model_id: google/gemma-4-12B-it-qat-q4_0-gguf
- gguf_filename: gemma-4-12b-it-qat-q4_0.gguf
- served_model_name: gemma-4-12b-it-qat-q4_0
- context_size: 4096
- core_example: react-pngtuber-app
- exposure: public

API キーは自動生成し、cloudflared Quick Tunnel を使用してください。
公開 SSE、互換性プローブ T1〜T6、Core での逐次表示まで確認してください。
私がブラウザで試すため、確認後もセッションを停止せずに残してください。
```

AI はバックエンドのインストール、モデルのダウンロードと検証、
一時 API キーの生成、cloudflared の起動、公開 API と Core サンプルの
動作確認を行います。完了後、次の3項目が提示されます。

- `/v1/chat/completions` を含む完全な Endpoint URL
- Core に設定する Model 名
- セッション限定の API Key

Core サンプルでは Provider に `OpenAI-Compatible` を選び、上記3項目を
設定します。テキスト生成の確認時は、まず TTS Engine を `None` にします。
URL と API キーは、トンネルまたは Colab ランタイムの終了時に無効に
なります。

任意の GGUF、vLLM、バックエンド自動選択、終了処理の依頼文は
[`skills/connect-colab-local-llm/references/request-examples.md`](../skills/connect-colab-local-llm/references/request-examples.md)
を参照してください。

## 使い方

Codex での依頼例:

- "新しいモデルを追加してください"
- "<provider-model-id> を <provider> provider で使えるようにしてください"
- "対応モデル一覧を更新してください"
- "新しい TTS provider を追加してください"
- "TTS エンジンを OpenAI 互換 `/v1/audio/speech` として公開してください"
- "Colab のローカル TTS を AITuber OnAir voice に接続してください"
- "このキャラクターでPNGTuber用の4状態画像を作ってください"
- "react-pngtuber-app向けの目口開閉差分を生成してください"
- "Colab MCP Go を使って local-tts-on-google-colab を起動してください"
- "$connect-colab-local-tts を使って、Colab MCP Go 経由で <local-tts-engine> を
  local-tts-on-google-colab から起動し、trycloudflare で外部 URL を発行して
  @aituber-onair/voice から検証してください"
- "Colab MCP Go を使って Google Colab 上で vLLM を起動してください"
- "Google Colab 上で GGUF モデルを llama.cpp から起動してください"
- "Colab のローカル LLM を Core PNGTuber サンプルに接続してください"
- "$connect-colab-local-llm を使って、backend vllm、model
  <hugging-face-model-id> を cloudflared で一時公開し、chat 互換性プローブと
  react-pngtuber-app で検証してください"
- "$connect-colab-local-llm を使って、backend llama.cpp、model
  <hugging-face-model-id>、GGUF file <filename> を cloudflared で一時公開し、
  chat 互換性プローブと react-pngtuber-app で検証してください"

Claude Code での依頼例:

- "$add-chat-model を使って <provider-model-id> を <provider> に追加してください。"
- "$add-chat-model を使って、tests/docs/versioning まで反映してください。"
- "$sync-core-after-chat-upgrade を使って chat 0.15.0 の更新を core へ反映してください。"
- "$connect-colab-local-tts を使って、Colab MCP Go 経由で <local-tts-engine> を起動してください。"

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
`display_name`, `supports_vision`, `bump_version`（省略時 `false`、release/version
作業を明示された場合のみ `true`）を確認します。

連携ルール:

- `$add-chat-model` 完了後は、
  `$sync-core-after-chat-upgrade` を続けて実行するか確認します。
- ユーザーが最初から chat + core の一括反映を明示している場合は、
  確認を省略して続行します。
- `$add-tts-provider` で voice の release prep を行う場合、version /
  changelog の変更は `@aituber-onair/voice` に限定します。依存範囲の
  整合だけを理由に `@aituber-onair/core` や `create-aituber-onair` を
  bump してはいけません。同じタスクでそれらの package release を明示
  された場合のみ対象に含めます。
- voice release prep の後に core 反映 / release を行う場合は、事前に
  確認し、明示されていない限り別 follow-up として扱います。

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
diff -u skills/connect-colab-local-llm/SKILL.md .claude/skills/connect-colab-local-llm/SKILL.md
diff -u skills/create-pngtuber-avatar-states/SKILL.md .claude/skills/create-pngtuber-avatar-states/SKILL.md
```

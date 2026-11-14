# Coding Agent Example

[English](./README.md) | 日本語

`@aituber-onair/core` を使った Node.js 向けローカル coding-agent サンプルです。

## アーキテクチャ

- `src/app`: セッション実行・状態遷移・ループガード
- `src/domain`: 型付きエラー・ポリシー・イベント
- `src/infra`: core / fs / process / logging アダプタ
- `src/tools`: コマンド実装とツール登録
- `src/config`: 厳密な env 設定読み込み

## セットアップ

```bash
npm install
cp .env.example .env
```

最低限設定:
- `AGENT_WORKDIR`
- `AGENT_API_KEY`

## 実行

```bash
npm run agent
```

または

```bash
# npm run buildを実施後
node dist/index.js
node dist/index.js <workdir>
node dist/index.js --workdir <workdir>
```

## テスト

```bash
npm test
npm run test:e2e
```

`npm test` では e2e は実行されません。

## E2E

E2E はローカル OpenAI 互換モックサーバーで実行し、
外部 API に依存せず決定的に検証します。

## セキュリティ注意

- コマンド実行は allowlist のみ許可
- ワークスペースサンドボックスを強制
- 機密パス（`.env`, `*.pem`, `id_rsa` など）を遮断
- `-c`, `--command`, `| sh` など危険引数を遮断

### Chat 0.71.0

Core 0.26.30は公開済みのChat 0.71.0とVoice 0.30.0を利用します。
Gemini 4モデル（現在はArgon・Carbon・Hydrogen）は画像入力に対応する明示選択肢で、思考は必須です。
`low`（パッケージの初期値）・`medium`・`high`を選べます。プロバイダーの初期モデルは変わりません。
Hydrogen（`gemini-4-hydrogen`、OpenRouterでは`google/gemini-4-hydrogen`）は、
直接Gemini APIのレート制限付き無料枠で利用できます。OpenRouter版は有料です。
Google側の初期値は`high`です。追加の`xhigh`はGenerateContent RESTの列挙値の表記が公開されていないため選択肢に含めていません。
Argon・Carbonは有料枠が必要で、Google側の初期値は`medium`です。
CarbonはArgonより思考トークンを多く使い、応答時間とトークン使用量が増えます。

思考も出力上限に含まれます。Gemini 4の暗黙の上限はOpenRouter版も含め最低32,768トークンです。
直接Gemini APIで明示した上限はモデル別に制限されます。
Argon・Carbonは非ストリーミング32,768／ストリーミング65,536、Hydrogenは両方式とも65,536です。
それより小さな明示上限は保持します。短い返答はプロンプトでも指定してください。
long decodeと自動継続生成は実装していません。

追加のOpenRouterモデルはテキスト・画像入力、ツール、ストリーミングに対応します。既定モデルは変更していません。

| モデルID | 推論レベル（パッケージ初期値） |
| --- | --- |
| `meta/muse-ember` | max, xhigh, high, medium, low, minimal（`minimal`） |
| `thinkingmachines/inkling-2-small` | max, high, medium, low, minimal（`minimal`） |
| `nex-agi/nex-n2.6` | high, medium（`medium`）。思考は無効化できません |
| `inclusionai/ling-3.2-flash:free` | 推論レベルの選択なし。プロバイダー既定を使用 |

これらのモデルに推論トークン予算は設定できません。Lingは`:free`付きの正確なIDを使い、
`includeReasoning`による表示設定は維持します。音声・動画・ファイル入力は追加していません。
詳しくは[Chatのドキュメント](../../../chat/README.ja.md)を参照してください。

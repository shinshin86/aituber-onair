# ライブ配信を監視するAIスタッフ

[English](./README.md) | 日本語

AITuber OnAir公式キャラクター「Miko」が、ライブ配信の運営を支援するサンプル
です。既存のReactダッシュボードで16件の固定コメントを再生し、loopback限定の
Node.jsサーバーで実際の `@aituber-onair/agent` Agentと
`CodexAppServerBackend` を動かします。

`@aituber-onair/comment-intelligence` はサーバー側で決定的な前処理を行います。
Codexへ渡すのは構造化した観測だけです。中央のブリーフィングカードと配信後
レポートは、すべて実Codexが生成します。外部の配信サービスは操作しません。

## 前提条件

- Node.js 18以上
- ローカルにインストールしたCodex CLI `0.145.0`
- `codex login` の完了

固定バージョンのCLIをインストールしてログインします。

```sh
npm install --global @openai/codex@0.145.0
codex login
```

app-serverプロトコルはバージョン依存のため、backendは異なるCLIバージョンを
拒否します。

## 起動

リポジトリのルートでworkspace packageをbuildし、このexampleをinstallしてから
Nodeサーバーを起動します。

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/stream-operations-staff ci
npm --prefix packages/agent/examples/stream-operations-staff start
```

`http://127.0.0.1:4518` を開いてください。

サーバーは `PATH` 上の `codex` を利用できます。特定の実行ファイルを使う場合は
絶対パスを渡します。

```sh
CODEX_PATH=/absolute/path/to/codex npm --prefix packages/agent/examples/stream-operations-staff start
```

## できること

1. ブラウザ側で、YouTube / Twitchを想定した同じ16件のfixtureを
   `1x / 2x / 4x` で再生します。
2. ブラウザからNodeサーバーへ送るのは、順序付きfixture IDだけです。サーバーが
   対応するfixtureを読み、rules mode、chaos-resistantランキング、最大8件選択、
   日本語AITuber context、高リスクviewer blockの設定で
   `comment-intelligence` を実行します。
3. Codex Turnを作る前に、視聴者本文とauthor情報を取り除きます。Turn contextに
   含めるのはID、ranking reason、host category、attention、無視コメントの集計、
   safety観測だけです。
4. CodexがブリーフィングカードのJSONを返します。サーバーがshape、根拠ID、
   severity、categoryを検証してから、output hookでversion付きAgent Artifactへ
   変換します。
5. 全コメント再生後は、Codexが配信後レポートを生成します。サーバーがローカルの
   JSON Schemaに照合してから `delivery: "local-draft"` のArtifactにします。
6. Agent EventはServer-Sent Eventsで画面へ逐次届きます。一時切断後は
   `Last-Event-ID` によるevent history replayを利用できます。
7. Codexの承認要求には `allow-once` または `deny` だけを選べます。実行中のTurnは
   画面から中断できます。

ブリーフィングTurnは偶数件のbatchと、新しい中・高リスク観測が出た時点で実行
します。全コメントごとにTurnを回さず、再生中にカードが順次届く構成です。表示
されるブリーフィングカードは、すべてCodex Turnの成果物です。

## アーキテクチャと信頼境界

React UI、fixture再生、timeline、Miko avatar、Web Speech、AivisSpeechはbrowser側に
残しています。`src/agentRuntime.ts` はHTTP/SSE clientです。Agent生成、前処理、
Artifact検証、承認、interrupt、resumeは `server/` で行います。

視聴者コメント本文はCodexのinstruction、conversation input、contextのどこにも
コピーしません。この固定scenarioでは、browserからserverへも本文を送りません。
serverが既知のfixture prefixを読み、`comment-intelligence` の結果から本文なしの
構造化contextを作ります。Codex Artifactの根拠IDは、そのcontext内のIDと一致する
必要があります。

Mikoのbriefでは、要求されたJSONだけを返し、command実行、file変更、公開、
moderationを行わないよう指定しています。それでも想定外のcommand/file要求を
人間が判断できるよう、backendは `approvalPolicy: "on-request"` を使用します。

## 承認フロー

- `allow-once` は表示中の1要求だけを許可します。
- `deny` は表示中の1要求だけを拒否します。
- Session全体や恒久的な許可ボタンはありません。
- Session終了、Turn中断、10分のtimeoutで未解決の要求は拒否されます。

許可前に、表示されたtool、risk、reason、sanitized argumentsを確認してください。

## Cold resume

Codex backendのSession IDは、host管理のlifecycle stateとして
`workspace/.agent-session.json` に保存します。再起動時は、そのIDを指定して
`agent.resumeSession(...)` を呼びます。記録がない、不正、または再開できない
場合はfresh Codex threadへfallbackし、記録を置き換えます。

Cold resumeで復元するのはCodex threadです。browser向けevent historyは現在の
HTTP server processが動いている間だけ保持します。Mikoのbriefでは
`.agent-session.json` を読み書きしないよう指定しています。

## 環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `PORT` | `4518` | local HTTP port。必ず `127.0.0.1` にbindします。 |
| `CODEX_PATH` | `PATH` 上の `codex` | 固定バージョンのCodex実行ファイルへの絶対パスです。 |
| `CODEX_SANDBOX` | `read-only` | `workspace-write` と完全一致する場合だけ、隔離workspace内の変更を許可します。 |
| `AGENT_WORKSPACE_DIR` | `./workspace` | 隔離Codex working directoryとSession記録の保存場所です。 |

## 安全性と外部操作

- HTTP serverに認証はなく、loopback専用です。networkへproxy・公開しないで
  ください。
- `AGENT_WORKSPACE_DIR` は隔離してください。home directory、repository rootなど
  広いdirectoryを指定しないでください。
- 既定sandboxはread-onlyです。`workspace-write` はCodexが変更してよい内容だけを
  置いた場所で使ってください。
- POST endpointはcross-origin requestを拒否します。JSON endpointは
  `Content-Type: application/json` が必須で、static配信はpath traversalを
  拒否します。
- 投稿、返信、削除、BAN、timeout、配信設定変更は実行しません。reportはlocal
  draftのままです。
- 攻撃的コメントはdashboardと音声で本文を増幅せず、抑制表示します。
- 既存のlocal Codex loginを利用し、API keyを読み取ったり受け取ったりしません。

## 音声

Web SpeechはOSとbrowserの `speechSynthesis` を使います。日本語話者を優先します
が、利用可能な音声は環境によって異なります。

Local AivisSpeechを使う手順:

1. [AivisSpeech](https://aivis-project.com/) appを起動します。
2. `Mikoの音声` で `AivisSpeech（ローカル）` を選びます。
3. 接続後、取得した一覧からvoiceを選びます。

AivisSpeechへ接続できない場合も選択値は維持され、dashboardにerrorを表示します。
service起動後に `再確認` を押してください。

## 品質確認

自動testは決定的なmock `AgentBackend` を注入します。Codexの起動、network service、
loginは必要ありません。

```sh
npm --prefix packages/agent/examples/stream-operations-staff run fmt:check
npm --prefix packages/agent/examples/stream-operations-staff run lint
npm --prefix packages/agent/examples/stream-operations-staff run test
npm --prefix packages/agent/examples/stream-operations-staff run build
```

server側前処理、生本文を渡さない境界、Codex JSON検証、SSE replay、承認、interrupt、
same-origin検証、cold resume fallbackをtestします。

## Mikoアバターとアクセシビリティ

同梱PuruPuru PNGTuber avatarは、状態に応じて `neutral`、`thinking`、`sad`、
`happy` を表示します。asset条件は [MIKO_ASSET_TERMS.md](./MIKO_ASSET_TERMS.md)
を参照してください。

操作要素はkeyboardで利用できます。選択、安全性、承認、音声状態をtextでも表示し、
live updateには `aria-live`、focus表示、reduced motionを利用します。

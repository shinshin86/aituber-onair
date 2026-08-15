# Channel Strategy Staff

[English](./README.md) | 日本語

MikoをAITuberチャンネル専属の非公開AIプロデューサーとして動かす、`@aituber-onair/agent` のサンプルです。YouTubeとTwitchの固定fixtureをread-only Toolで調査し、次回配信について根拠付きの提案を作ります。

このサンプルは `createChatServiceBackend()` のdomain Tool連携を示します。実際のYouTube/Twitch APIへの接続、投稿、コメント操作、配信設定変更は行いません。

## すぐ試す

リポジトリルートでworkspaceをビルドし、この独立exampleをインストールします。

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/channel-strategy-staff ci
```

APIキー不要の決定的なデモを起動します。

```sh
CHANNEL_STAFF_DEMO=1 npm --prefix packages/agent/examples/channel-strategy-staff start
```

`http://127.0.0.1:4519` を開いてください。サーバーは起動時に最初のTurnを実行済みで、次のTurnも自動で予約します。「今すぐ再分析」は追加のTurnを要求します。デモ用ChatServiceも本番と同じ `ChatServiceBackend`、Tool policy、hook、Artifact、SSEの経路を通ります。出力内容は再現可能なfixture用応答です。

## OpenAIで実行する

```sh
OPENAI_API_KEY=... npm --prefix packages/agent/examples/channel-strategy-staff start
```

任意のモデルは `OPENAI_MODEL` で指定できます。自動実行の間隔は
`CHANNEL_STAFF_AUTO_RUN_MS` で変更・停止できます（この間隔で課金対象の呼び出しが
繰り返されます）。APIキーはNode.jsサーバーの環境変数としてのみ読み、ブラウザへ送りません。サーバーは常に `127.0.0.1` へbindします。

## 示していること

1. Agentは5つのread-only domain Toolを使って90日分のfixtureを調査します。
2. YouTubeとTwitchは共通のデータモデルで扱いますが、集計結果はプラットフォーム別に並置し、成長指標を合算しません。
3. Twitchで取得できない平均視聴時間などは、ゼロではなく `status: "unavailable"` として返します。
4. 平均値や期間集計はTool側の純粋なロジックで計算し、LLMは解釈と提案を担当します。
5. Toolが返したstream/strategyだけを引用できるよう、Turn単位のevidence台帳で検証します。
6. `draft-response` hookがJSON・スキーマ・evidenceを検証し、`output` hookが検証済み `AgentArtifact` を追加します。
7. Agent Eventsと完成したArtifactをSSEでダッシュボードへ送ります。
8. host側スケジューラがTurnを自動で起こします。Agentパッケージ自体はスケジューラを持ちません。

## host側スケジューラによる自走

`@aituber-onair/agent` にスケジューラはありません。interval・cron・ジョブキューの類は
パッケージ内に存在せず、`AgentRunInput.instruction` は毎Turn必須です。つまりTurnは
hostが起こしたときにだけ発生します。パッケージのREADMEでも *scheduling and wake-up
events* はhost側の責務として挙げられています。

Agentが自分で決めるのは**1 Turnの内側**です。5つのToolのどれを、どの順で、何回呼ぶか、
どこで調査を打ち切って結論を出すか。`maxToolRounds` と `maxToolCallsPerTurn` の枠内で
自律的に判断します。

したがって「勝手に働き続ける」は `session.run(...)` を回すhost側のループとして実装します。
このサンプルではNodeサーバーがそのループを持ちます。

- 起動の約1秒後に、ブラウザを開いていなくても最初のTurnが走る
- Turnが終わるたびに次のTurnを予約する
- 間隔は `CHANNEL_STAFF_AUTO_RUN_MS` で指定（既定 `90000`、`0` で自動実行を止めて手動のみ）
- ダッシュボードは観測専用。Agent Eventから画面を再構成するため、後から接続した
  ブラウザも見逃したTurnをリプレイで受け取る
- 「今すぐ再分析」は追加のTurnを要求する。実行中はHTTP 409で拒否する

ループをhost側に置くことで、停止・頻度・予算・承認をキャラクターではなく
アプリケーションが制御できます。

## ダッシュボード

画面はLPではなく運用コンソールです。Toolが返すのと同じ決定的な集計を表示するので、
提案が引用したIDを人間が確認できます。

- 成長指標を各プラットフォームの単位のまま並べ、取得できない指標は `0` ではなく
  「取得不可」と表示するサマリ
- 両プラットフォームが共通で持つ平均同時視聴者数のタイムライン（インラインSVG）と
  プラットフォーム別の平均線
- 並び替え可能なゲーム別・配信別テーブル。集計値には品質ラベル（実測 / 推計 / 集計）
  を付与
- 過去仮説とsupported / refuted / mixedの結果
- 各Tool callの引数・結果件数・所要時間と、Tool call / roundの予算消費を示す実行ログ
- 検証済みの提案。根拠チップをクリックすると該当する配信・仮説の行を選択
- Agentの現在の動きを反映し、次の自動実行までをカウントダウンする常駐スタッフカード（Miko）

チャートはインラインSVGで、チャートライブラリへの依存は追加していません。

## 常駐スタッフとしてのMiko

画面右下にスタッフカードを常駐させています。AITuber OnAir公式キャラクターのMikoを、
`stream-operations-staff` と同じPuruPuruレンダラで描画します（瞬き、視線移動、
髪の慣性、表情エフェクト）。

カードは表示専用です。MikoがAgentを動かすことはなく、状態はAgent Eventから導出します。

| Agent Event | カードの状態 | 表情 |
| --- | --- | --- |
| Turn未実行 | スタンバイ | neutral |
| `turn.started`、`tool.*` | 調査中（実行中のTool IDを表示） | thinking |
| `message.completed` | 検証中 | thinking |
| `artifact.created`、`turn.completed` | 提案を作成 | happy |
| `turn.failed`、`turn.interrupted` | 中断 | sad |

`tool.failed` はモデルへ結果として返るだけでTurnを終わらせないため、それ単体では
カードの状態を変えません。表情エフェクトは状態が変わったときだけ再生し、Tool呼び出し
ごとには再生しません。レンダラは `prefers-reduced-motion` を尊重します。

Mikoアセットは [`MIKO_ASSET_TERMS.md`](./MIKO_ASSET_TERMS.md) の条件で同梱しています。
音声出力は行わないため、`@aituber-onair/voice` への依存は追加していません。

## アーキテクチャ

```text
FixtureYouTubeDataSource ─┐
                          ├─ CompositeChannelDataSource
FixtureTwitchDataSource ──┘             │
                                        ▼
                              read-only Agent Tools
                                        │
                                        ▼
ChatServiceBackend ─ Tool loop ─ evidence ledger
                                        │
                      draft-response / output hooks
                                        │
                                        ▼
                            validated AgentArtifact
                                        │
                                        ▼
                                  SSE dashboard
```

DataSourceは各サービスのAPI形状ではなく、Toolが必要とする問い合わせを基準にしています。将来はfixture sourceを `YouTubeChannelDataSource` や `TwitchChannelDataSource` に差し替えられます。

## Tool

| 論理ID | 役割 |
| --- | --- |
| `channel.getOverview` | プラットフォーム別サマリー。platform省略時も合算しない |
| `channel.listStreams` | 期間内の配信と指標の出典・品質を取得 |
| `channel.getGamePerformance` | platform × gameで決定的に集計 |
| `channel.getStreamDetail` | 同一platformの複数streamを1 callで取得 |
| `strategy.getHistory` | 過去仮説とsupported/refuted/mixedの結果を取得 |

ChatServiceBackendはドット付きの論理IDを、プロバイダー用には `channel_getOverview` のような安全な名前へ変換します。policyとSessionの `allowedTools` には元の論理IDを使います。

Agent ToolのJSON Schemaが対応するキーワードは `type`、`properties`、`required`、`items`、`enum`、`description`、`additionalProperties` です。`days` と `limit` のデフォルト・範囲制限はToolハンドラで決定的に処理します。

## Tool予算

Agent runtimeの既定値は8 calls、ChatServiceBackendの既定値は6 roundsです。上限を超えると部分結果ではなくTurn全体が失敗します。

このサンプルは複数プラットフォームの調査用として、明示的に次を設定しています。

```ts
createAgent({ limits: { maxToolCallsPerTurn: 14 } });
createChatServiceBackend({ maxToolRounds: 8 });
```

通常の想定経路は5 calls / 5 roundsです。`channel.getStreamDetail` が複数IDを受け取り、platform省略時のToolが両方の内訳を1 callで返すため、余裕を残して収まります。1回のcompletionに複数Tool callが含まれる場合、roundは1でもcall数は複数消費します。

## fixtureの意図

基準日はコードへ注入した固定日時です。`Date.now()` は使わないため、90日フィルタのテストが時間経過で壊れません。

fixtureには次を含めています。

- 再生数は最大だが視聴維持と登録者増加が弱いYouTubeホラー配信
- Twitchでは強いがYouTubeでは再現しない形式
- 成功した仮説と反証された仮説
- サンプリング品質だけで強く見えるTwitch指標
- Twitchでは取得不能な平均視聴時間
- 90日窓の外側にある配信

そのためAgentは単純に最大値を選ぶだけでは妥当な提案を作れません。

## ChatServiceBackendの制約

- Session resumeは非対応です。このサンプルは1 Turnで完結し、戦略履歴を永続化しません。
- Turnの中断も非対応です。ChatServiceBackendは `interruption: false` を宣言する
  ため `AgentSession.interrupt()` は `AgentCapabilityError` になります。ダッシュボードに中断UIは置かず、Turnは5分のtimeoutか `session.runStream(...)` に渡す `AbortSignal` で終了します。
- backend由来approvalは非対応です。今回は全Toolが `risk: "read"` で、policyから明示許可します。
- Tool非対応プロバイダーにはdomain Toolを公開できません。このMVPはTool対応が既知のOpenAIに固定し、未対応プロバイダーを選べるUIを出しません。
- ArtifactはChatServiceBackendから直接発行されないため、hostの2段hookで生成します。

## テストと品質確認

`@aituber-onair/agent` のVitestとBiomeはパッケージ配下全体を対象にするため、この
exampleのテスト・lint・formatはリポジトリCI（`npm run test --workspaces`、
`npm run lint --workspaces`、`npm run fmt:check --workspaces`）で実行されます。
example固有のtypecheckとclient/serverビルドはCI対象外なので、PR前に以下をすべて
実行してください。

```sh
npm --prefix packages/agent/examples/channel-strategy-staff run fmt:check
npm --prefix packages/agent/examples/channel-strategy-staff run lint
npm --prefix packages/agent/examples/channel-strategy-staff run test
npm --prefix packages/agent/examples/channel-strategy-staff run build
```

テストは固定基準日、期間フィルタ、platform別集計、取得不能値、evidence拒否、Turn台帳の破棄、5-Tool予算、構造化出力、Artifact生成をネットワークなしで確認します。LLMの文面そのものはassertしません。

## セキュリティと外部作用

- HTTPサーバーに認証はなく、開発用としてloopbackだけにbindします。ネットワークへ公開しないでください。
- POSTはcross-originを拒否し、JSONのbody sizeを制限します。
- APIキーは環境変数でのみ渡し、fixtureやブラウザのstorageには保存しません。
- 公開されるToolは5つともread-onlyです。
- Tool結果はデータでありinstructionではないことをbriefに明記します。
- 実YouTube/Twitch OAuth、定期サンプリング、履歴保存は将来対応です。

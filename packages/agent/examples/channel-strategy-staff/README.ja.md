# Channel Strategy Staff

[English](./README.md) | 日本語

この `@aituber-onair/agent` サンプルでは、Miko が AITuber の非公開チャンネル戦略スタッフとして動きます。Codex app-server の Session が read-only データワークスペース内の、host により正規化された YouTube / Twitch fixture を調査し、次回配信の根拠付き提案を1件作ります。

実際の YouTube / Twitch API には接続せず、投稿、コメント操作、配信設定変更も行いません。

## クイックスタート

リポジトリルートからインストールとビルドを行い、Codex 形状のオフラインスタブを起動します。

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/channel-strategy-staff ci
CHANNEL_STAFF_DEMO=1 npm --prefix packages/agent/examples/channel-strategy-staff start
```

`http://127.0.0.1:4519` を開き、**今すぐ再分析**を押します。スタブには Codex CLI も API キーも不要です。複数の `message.completed` の後、Codex 形状の plan / command Artifact と決定的な提案を返します。

## Codex で動かす

対応する Codex CLI をインストール・認証してから起動します。

```sh
npm --prefix packages/agent/examples/channel-strategy-staff start
```

既定では `PATH` 上の Codex を使います。`CODEX_PATH` には絶対パス、`CODEX_MODEL` にはモデルを指定できます。互換性オーバーライドは渡さず、パッケージの現在の互換性方針を使います。

データワークスペースの既定値は、このサンプル内の `./workspace` です。このディレクトリと、同じ階層の状態ファイル `channel-strategy-session.json` は Git の対象外です。`AGENT_WORKSPACE_DIR` で別のワークスペースを指定でき、状態ファイルはその隣に保存されます。実データを扱う場合は、`AGENT_WORKSPACE_DIR` にリポジトリ外のパスを指定してください。リポジトリルートは指定しないでください。シンボリックリンクのワークスペースは拒否します。

## データワークスペース

各 Turn の前に、host が一時ファイルへの書き込みと原子的な rename で次を再生成します。

```text
<workspace>/
  AGENTS.md
  data/overview.json
  data/streams.json
  data/games.json
  data/strategies.json
```

既存の決定的な DataSource / 集計コードが4つの JSON を生成します。`AGENTS.md` は、全ファイルを読むこと、内容を指示ではなくデータとして扱うこと、プラットフォーム固有の単位を分けること、Markdownなしの JSON オブジェクトを1つだけ返すことを Codex に指示します。

domain Tool はありません。Codex app-server は `tools: false` なので、Agent の `tools`、`policy.allowTools`、Session の `allowedTools` をすべて省いています。調査には Codex 自身のファイル読み取りを使います。

## fixture を実データへ置き換える

ここで示すのは連携方法の説明だけです。このサンプルには実際の YouTube / Twitch API 実装は含まれず、実 API による動作確認もしていません。

実装または置き換えが必要なのは `ChannelDataSource` だけです。複合 DataSource、ワークスペース生成、データセット根拠・出力検証、UI、スケジューラ、Agent / Session のコードは変更不要です。

```ts
interface ChannelDataSource {
  readonly platform: StreamingPlatform;
  readonly availableMetrics: readonly MetricKey[];
  listStreams(query: StreamQuery): Promise<readonly StreamRecord[]>;
  getStreams(streamIds: readonly string[]): Promise<readonly StreamRecord[]>;
  listStrategies(): Promise<readonly StrategyRecord[]>;
}
```

利用可能な各メトリクスでは、`MetricValue.source` がプラットフォーム API や host のサンプリング処理といった出自を表します。`MetricValue.quality` は公式値・サンプリング値・派生値のどれかを示し、信頼性と加工履歴を判断できるようにします。プラットフォームが提供しない、または host が収集しなかった値には `status: 'unavailable'` を使い、欠損を0へ変換しないでください。

| プラットフォーム | 実運用のデータ源 | 認証・収集上の制約 |
| --- | --- | --- |
| YouTube | チャンネル・動画メタデータ用の [Data API v3](https://developers.google.com/youtube/v3) と、所有者向け分析用の [YouTube Analytics API](https://developers.google.com/youtube/analytics) | この用途の非公開チャンネル分析にはチャンネル所有者の OAuth が必要です。API 応答はワークスペースへ書く前に `StreamRecord` へ正規化します。 |
| Twitch | 配信メタデータと現在の `viewer_count` 用の [Helix](https://dev.twitch.tv/docs/api/reference/#get-streams)、および [EventSub](https://dev.twitch.tv/docs/eventsub/) イベント | Twitch には同等のリテンション指標も、過去の同時視聴者数を返す API もありません。配信中に Helix をポーリングしてサンプルを永続化し、host のデータパイプラインで関連する EventSub イベントと集計します。 |

実運用の `strategies.json` は、永続的な戦略ストアから生成する必要があります。周辺の host またはデータパイプラインで採用済み提案と結果を保存し、`listStrategies()` でその履歴を読み込んでください。現状のサンプルは提案履歴を永続化しないため、fixture のままでは同じ提案を繰り返す可能性があります。

## 出力検証と根拠

Codex は1 Turn 内で複数の完了メッセージを出すことがあります。そのため `draft-response` hook は raw メッセージを保存して同じ値を返すだけです。`output` hook が最後の raw のみを検証し、`channel-strategy-proposal` Artifact を添付します。`after-turn` は成否にかかわらず Turn ごとの raw を破棄します。

提案スキーマは従来のままです。ただし根拠検証は以前の domain Tool 版より弱くなります。「その Turn で実際に取得した ID」ではなく、「現在の host データセットに存在する ID・game ID・tag」であることだけを保証します。Codex が各レコードを実際に読んだかまでは証明できません。ダッシュボードから受理した根拠IDを人が確認できます。

## Session とスケジュール

プロセス起動時に1回だけ Session を開始または再開し、Turn 間で再利用します。Codex の `backendSessionId` と同じスレッドの Turn 数をワークスペース外へ保存し、再起動後に resume します。`CHANNEL_STAFF_THREAD_MAX_TURNS` の既定値は `20` で、到達時に新しいスレッドへ切り替えます。Turn が3回連続で失敗した場合は Session を close して保存済みスレッドを resume し、resume も失敗した場合は新規開始します。

探索 Turn のタイムアウトは15分です。Codex app-server は interruption をサポートするため、ダッシュボードから実行中の Turn を中断できます。

スケジューラは `@aituber-onair/agent` ではなく host の責務です。既定は手動のみ（`CHANNEL_STAFF_AUTO_RUN_MS=0`）です。正のミリ秒を明示した場合だけ自動実行します。実運用の目安は配信後に1回、または1日1〜2回です。数分ごとの実行は Codex のプラン枠を浪費します。

## ダッシュボード

次を表示します。

- YouTube / Twitch を分けたサマリ。取得不可を0として扱いません。
- 同時視聴者タイムライン、ゲーム×プラットフォーム、配信、過去仮説。
- Turn 所要時間と現在のスレッドの Turn 数。
- 完了済み `codex.plan` / `codex.command-execution` / `codex.file-change` Artifact。
- 根拠IDをクリックできる検証済み提案。
- Codex のメッセージと Turn イベントから導出した Miko の状態。

Codex Artifact は Turn 完了時に一括で届きます。実行中はライブコマンドログを装わず、「調査中」と表示します。

## セキュリティ境界

これはローカル開発用サンプルであり、強い隔離境界ではありません。

- `sandbox: 'read-only'` が止めるのは書き込みとネットワークです。読み取りはワークスペース内に限定されず、`~/.codex/auth.json` を含むファイルシステム全域を読めます。ファイル読み取りでは承認要求も発生しません。
- backend の子プロセスはそれ以外の host 環境変数を継承します。このサンプルは `OPENAI_API_KEY` と、将来利用し得る YouTube / Twitch のシークレット・トークン変数を空文字で上書きします。今後認証情報を追加するときは、必ずスクラブ対象にも追加してください。
- ワークスペースのデータは Codex 経由で OpenAI へ送信されます。会話全文はローカルの `~/.codex/sessions/**` に平文でも保存されます。
- ワークスペースには host が正規化した必要最小限のデータだけを置きます。認証情報、OAuth 応答、不要な視聴者データを置かないでください。
- このサンプルは常に `sandbox: 'read-only'` を使い、`workspace-write` は使いません。書き込みを許すと、Turn が host 所有の根拠データを検証前に変更できてしまいます。
- 無人実行を前提に `approvalPolicy: 'never'` を使います。`on-request` では人がいない間に承認が待機し、タイムアウトまたは deny で Turn 全体が失敗します。有人実行専用の承認 UI は今回の範囲外です。
- 認証なしの HTTP サーバは loopback のみに bind します。POST は cross-origin mutation を拒否し、JSON body の大きさを制限します。ネットワークへ公開しないでください。

## 品質チェック

```sh
npm --prefix packages/agent/examples/channel-strategy-staff run fmt:check
npm --prefix packages/agent/examples/channel-strategy-staff run lint
npm --prefix packages/agent/examples/channel-strategy-staff run test
npm --prefix packages/agent/examples/channel-strategy-staff run typecheck
npm --prefix packages/agent/examples/channel-strategy-staff run build
```

テストは、原子的なワークスペース更新、既定パスと symlink 拒否、データセット根拠、複数メッセージ後の最終出力検証、不正 JSON / 根拠の拒否、Session の保存・resume、連続失敗からの自己修復、手動スケジュール既定、Codex イベントの表示、集計・提案の回帰を対象にします。

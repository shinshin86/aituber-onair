# Fan Mail Stage

![fan-mail-stage image](./images/fan-mail-stage.png)

[English](README.md)

視聴者からのおたより（ファンメール）を配信で読むための、`@aituber-onair/agent` の
React + Node サンプルです。任意のプログラムがローカルディレクトリへ置いた
メールイベント JSON を読み取り、ミコが返答案を作ります。運営者が内容を確認・編集し、
承認したものだけを別の配信画面で字幕・音声・メッシュアバターとともに表示します。
承認した内容はローカルの outbox にも保存します。

初期設定はモックです。Cursor CLI やモデルの認証情報なしで動作し、星・食べもの・
その他の話題に応じた固定の返答を作ります。運営画面にもモックであることを表示します。
実モデルで返答を作る場合は Cursor ACP に切り替えます。

## 起動

Node.js 20 以上と npm が必要です。リポジトリのルートで実行します。

```sh
npm ci
npm run build
cd packages/agent/examples/fan-mail-stage
npm ci
npm run dev
```

- 運営画面: `http://127.0.0.1:4520/operator`
- 配信画面: `http://127.0.0.1:4520/stage`

OBS には配信画面だけを取り込んでください。サーバーは `127.0.0.1` にバインドし、
異なる Host/Origin のリクエストを拒否します。ポートは `PORT` で変更できます。
`dev` はクライアント・サーバーをビルドして起動するコマンドです。ソースの変更後は
再起動してください。

別のターミナルで、このサンプルのディレクトリからテストメールを送ります。

```sh
npm run send-test-mail
npm run send-test-mail -- --subject 'ミコちゃんへ' --body '好きな料理は？'
npm run send-test-mail -- --preset injection
npm run send-test-mail -- --preset sensitive
```

受信すると返答案が自動生成され、運営画面のミコに表示されます。公開用の件名・
本文抜粋・発話を確認して「承認して配信へ」を押すと、配信画面に反映されます。
拒否したメールは公開されません。

音声は両画面で個別に有効化します。二重再生を避けるため、初期状態はオフです。
運営画面では受信前、配信画面では承認前に音声を有効にしてください。
Browser Speech はブラウザの日本語音声を使います。AivisSpeech を使う場合は
`http://127.0.0.1:10101` で起動し、取得された話者一覧から選びます。
ブラウザの自動再生制限により、配信画面でも操作が必要な場合があります。
音声エラーでも字幕は表示します。音声の設定変更は再生キューを中断し、
有効化前の返答は読み上げ直しません。選んだ音声と話者は画面ごとにブラウザへ
保存され、再読み込みしても保たれます。

OBS では配信画面のブラウザソースで「対話」を開き、画面上にカーソルを乗せると
字幕の下に音声設定ボタンが表示されます。キーボードでフォーカスしても表示できます。
音声を有効にしたら設定を閉じ、カーソルを画面の外へ出してから配信してください。
通常時はボタンを隠し、バックエンド名も運営画面だけに表示します。

## 処理の流れ

```text
inbox の JSON → 検証・重複排除 → Agent Session（untrusted）
             → 運営画面の返答案・ミコのプレビュー
             → 人の承認 → 配信 API → 字幕・音声・メッシュアバター
                       → data/outbox/<hash>.json
```

状態は `received`、`generating`、`ready_for_review`、`approved`、`rejected`、
`invalid`、`quarantined`、`generation_failed` に分けています。認証コードや
パスワードなどを含む疑いがあるメールは、生成前に隔離します。運営者が明示的に
解除すると生成に進みますが、その操作だけでは公開されません。生成失敗時は
再生成できます。

メールごとに新しい Agent Session を作り、ホストの brief と入力本文を分離します。
入力は `untrusted`、domain Tool は空、バックエンドからの承認要求はすべて拒否します。
運営画面の処理履歴には Agent Event の種類だけを残します。

`/api/operator` は非公開の確認用データ、`/api/stage` は承認済みのリアクションだけを
返します。メールは HTML として描画しません。認証付きのサービスではないため、
このローカルサーバーにアクセスできる人は運営 API も開けます。プロキシやトンネルで
外部へ公開しないでください。

## 外部ディレクトリと入力形式

```sh
MAIL_EVENT_INBOX_DIR=/path/to/inbox npm run dev
MAIL_EVENT_INBOX_DIR=/path/to/inbox npm run send-test-mail
```

未指定時はサンプル内の `data/inbox/` を監視します。相対パスは起動時の作業
ディレクトリを基準に解決します。外部プログラムから指定ディレクトリへ直接 JSON を
置けるため、コピー処理は不要です。メール受信をきっかけに動く自動化エージェント
なども、同梱 CLI と同じ形式で連携できます。特定のメールサービスは必要ありません。

必要なキーは次の7つです。余分なキーや未対応のバージョンは拒否します。

```json
{
  "schemaVersion": 1,
  "eventId": "mail-001",
  "source": "example-mailer",
  "receivedAt": "2026-01-01T00:00:00Z",
  "aliasTag": "fan-mail",
  "subject": "ミコちゃんへ",
  "bodyText": "流星群を見てみたいな。ミコちゃんは星を見るの好き？"
}
```

ファイルは32 KiBまでです。文字列の上限は `eventId`・`source`・`aliasTag` が100文字、
ISO形式の `receivedAt` が40文字、`subject` が200文字、`bodyText` が8,000文字です。
空文字は使えません。`eventId` の先頭は半角英数字、以降は半角英数字・`_`・`.`・`-`
に限ります。制御文字、シンボリックリンク、通常ファイル以外は拒否します。
`source` と `aliasTag` は入力側の申告情報であり、送信者の本人確認には使いません。

外部プログラムは同じディレクトリ内の一時ファイルに書き、最後に rename してください。

```js
import { randomUUID } from 'node:crypto';
import { writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const inbox = '/path/to/inbox';
const id = randomUUID();
const event = {
  schemaVersion: 1, eventId: id, source: 'external-program',
  receivedAt: new Date().toISOString(), aliasTag: 'fan-mail',
  subject: 'ミコちゃんへ', bodyText: '今日のご飯は何がいいかな？'
};
const temporary = join(inbox, `.${id}.tmp`);
await writeFile(temporary, JSON.stringify(event), { flag: 'wx', mode: 0o600 });
await rename(temporary, join(inbox, `${id}.json`));
```

起動時の走査、`fs.watch`、500 ms ごとの再走査を併用します。サイズなどが350 ms 以上
変わらないファイルを読み込みます。隠しファイル、JSON 以外、`*.tmp.json`・
`*.part.json`・`*.partial.json` は無視します。ただし長時間停止した書き込みを
安定確認だけで見分けることはできません。入力側は必ず一時ファイルから rename する
方式を使ってください。走査内では更新時刻順、同時刻はファイル名順で受信し、
生成は1件ずつ行います。同じ `eventId` は再起動後も重複として除外します。

## Cursor ACP

[Cursor CLI のインストール手順](https://cursor.com/docs/cli/installation)に従って
準備し、`agent login` でログインしてください。バックエンドはローカルの
`agent acp` を起動し、保存済みのログイン情報を使います。利用分はその Cursor
アカウントへ計上されます。

```sh
MAIL_AGENT_BACKEND=cursor-acp npm run dev
# 実行ファイルやモデルを指定する場合:
CURSOR_AGENT_PATH=/path/to/agent CURSOR_MODEL='default[]' MAIL_AGENT_BACKEND=cursor-acp npm run dev
```

`ask` モードで起動し、リポジトリ外に作った空の一時ワークスペースを使います。
ファイル編集やコマンド実行は許可せず、承認要求も拒否します。ただし Cursor CLI は
外部プロセスであり、read-only モードは OS のサンドボックスではありません。
権限を広げる CLI 設定や、ワークスペースへの秘密ファイル配置は避けてください。
よく使われる秘密情報の環境変数は子プロセスで空にし、認証情報はプロンプトへ
含めません。`CURSOR_MODEL` はインストールした CLI が対応する ID を指定します。

**実メールを使うと、その内容が Cursor 経由のモデルへ送信されます。**
隔離を解除する際も、内容を送信してよいか確認してください。機微情報の検出は
簡易判定であり、安全を保証するものではありません。公開用の3つの欄は必ず人が
確認してください。モックではメールをモデルサービスへ送信しません。

## 保存と対象範囲

`data/state.json` は生メールと確認状態を含みます。`data/outbox/` には、承認済みの
eventId、公開用件名・本文抜粋、発話、バックエンド種別、承認時刻だけを保存します。
保存名は入力パスではなくハッシュです。`data/` 全体を Git の対象外にしています。
受信ファイルを自動で移動・削除する処理はありません。

途中で停止した生成は、再起動後に再生成できます。保存期間の自動管理はないため、
必要に応じてサーバーを止めてテストデータを保管・削除してください。履歴をメモリに
読み込む小規模なローカル用途を想定しています。同じデータディレクトリで複数の
サーバーを同時に起動しないでください。

IMAP/SMTP、メールアカウントへのアクセス、メール返信、投稿、添付ファイル、
HTML メールの描画は実装していません。

## 検証と素材

```sh
npm run fmt
npm run typecheck
npm run build
npm test
npm run lint
```

受信、起動時取り込み、外部ディレクトリ、原子的書き込み、重複排除、形式検証、隔離、
untrusted 入力、生成エラー、公開データの分離、拒否、同時承認、outbox 保存を
テストしています。

メッシュアバターの描画コードとミコのチャイナ服素材は
`packages/core/examples/react-mesh-avatar-app` からコピーしています。
音声フックは `stream-operations-staff` をもとに調整しました。Core パッケージへの
依存はありません。**ミコの素材はリポジトリの MIT ライセンス対象外です。**
[MIKO_ASSET_TERMS.md](MIKO_ASSET_TERMS.md) と
[ミコのキャラクター利用ガイドライン](https://miko.aituberonair.com/#terms)をご確認ください。

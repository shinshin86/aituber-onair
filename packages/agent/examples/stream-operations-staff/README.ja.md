# ライブ配信を監視するAIスタッフ

[English](./README.md) | 日本語

AITuber OnAir公式キャラクター「Miko」が、ライブコメントを監視して運営を支援するブラウザサンプルです。`@aituber-onair/agent` の実ランタイム上でコメント分析、注意喚起、人間への確認依頼、配信後レポート作成までを実行します。

このサンプルは外部の配信サービスを操作しません。コメントは再現可能な固定シナリオで、成果物はブラウザのローカル領域へ下書きとして保存されます。

## 起動

リポジトリのルートで依存パッケージをビルドしてから、サンプルを起動します。

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/stream-operations-staff ci
npm --prefix packages/agent/examples/stream-operations-staff run dev
```

表示されたローカルURLをブラウザで開いてください。通常は `http://127.0.0.1:5173` です。

本番ビルドだけを確認する場合:

```sh
npm --prefix packages/agent/examples/stream-operations-staff run build
```

## できること

1. `再生` を押すと、YouTube / Twitchを想定した16件のコメントが順番に届きます。
2. Mikoは公開コメント用Sessionで、各コメントを未信頼データとして `comments.analyze` Toolへ渡します。
3. `@aituber-onair/comment-intelligence` が質問、建設的フィードバック、安全性注意、話題の変化をローカル分析します。
4. Agentが作成した注意喚起Artifactが、中央の観測カードとして表示されます。観測と提案は別々に表示され、根拠コメントを相互に追跡できます。
5. 確認済み情報が必要な質問は、運営用Sessionの `host.escalate` Toolで人間への確認依頼としてローカル保存されます。
6. 全コメントの再生後に `配信を終了してレポート作成` を押すと、`report.submit` Toolが検証済みの配信後レポートArtifactを作成します。
7. `Agent Event` と `Tool Activity` では、実際のTurnで発生した公開可能なイベント、Tool成功、失敗、再試行を確認できます。

`1x / 2x / 4x` は再生速度だけを変更します。入力、分析結果、成果物は変わりません。

## Agentの構成

Mikoには自然言語のbriefで、役割、態度、目的、制約を与えています。そのうえで、権限の異なる2つのSessionを使います。

- 公開コメント用Session: `audience: "public"`、`inputTrust: "untrusted"`。利用できるToolは `comments.analyze` のみです。
- 運営用Session: `audience: "operator"`、`inputTrust: "trusted"`。ローカルworkspace、レポート下書き、人間への確認依頼だけを扱います。

視聴者コメント本文は運営用Sessionのinstructionへコピーしません。コメント分析から得た構造化情報だけを渡します。また、`host.escalate` は人間へ判断を求める業務上のエスカレーションであり、危険なTool実行を許可するAgent runtimeの承認フローとは分離されています。

初回起動時、Agentは許可されたローカルworkspaceを確認し、必要なら運営メモを作成します。同じブラウザで再起動・リセットした場合は既存状態を再利用し、同じメモを重複作成しません。

## 実行されるものと固定されているもの

実際に動作するもの:

- `@aituber-onair/agent` のbootstrap、Session、Turn、Tool公開範囲、policy、JSON Schema検証、hook、Agent Event、Artifact
- `@aituber-onair/comment-intelligence` のrules分析、chaos-resistantランキング、viewer safety状態
- `@aituber-onair/voice` のWeb Speech / AivisSpeech連携、逐次読み上げ、停止処理
- ブラウザ内の運営メモと下書きArtifactの保存・再開

再現性のために固定しているもの:

- YouTube / Twitchから届く想定コメントと到着順
- Agent backendによるTool選択と応答文。LLMやCodex app-serverには接続せず、決定的なbackendを使います。
- 配信後レポートの内容と、1回だけ発生する分析エラー

このため、Agentの権限管理と実行ライフサイクルを実際に試せますが、モデルごとの判断品質を比較するサンプルではありません。

## 安全性と外部操作

- APIキーは使用しません。
- 投稿、返信、削除、BAN、タイムアウト、配信設定変更は実行しません。
- レポートと確認依頼は `local-draft` としてブラウザに保存され、外部送信されません。
- 攻撃的コメントは画面と音声で本文を増幅せず、抑制した説明だけを扱います。
- viewer safetyの継続状態は `comment-intelligence` が管理します。

音声が `OFF` またはWeb Speechの場合、サンプルから外部の音声サーバーへ接続しません。AivisSpeechを選択した場合だけ、既定で `http://localhost:10101` へ接続します。

## 音声

### ブラウザ標準（Web Speech）

OSとブラウザが提供する `speechSynthesis` を使用します。日本語話者を優先しますが、実際の声は環境によって異なります。

### AivisSpeech（ローカル）

1. [AivisSpeech](https://aivis-project.com/) アプリを起動します。
2. 画面の `Mikoの音声` で `AivisSpeech（ローカル）` を選択します。
3. 接続後、取得した話者一覧から音声を選択します。

未起動、到達不能、CORS不許可の場合も選択値は保持され、接続エラーが表示されます。起動後は `再確認` を押してください。初回のモデル読み込みで1件の生成が30秒を超えた場合、その読み上げだけをスキップして次へ進みます。

## 品質確認

ルートの `npm run build` を実行した後、次のコマンドを利用できます。

```sh
npm --prefix packages/agent/examples/stream-operations-staff run fmt:check
npm --prefix packages/agent/examples/stream-operations-staff run lint
npm --prefix packages/agent/examples/stream-operations-staff run test
npm --prefix packages/agent/examples/stream-operations-staff run build
```

テストでは実LLMを使用せず、同じ入力から同じAgent Event、Tool結果、Artifactが得られることを確認します。

## Mikoアバター

同梱したPuruPuru PNGTuberアバターは、状態に応じて `neutral`、`thinking`、`sad`、`happy` を表示します。`prefers-reduced-motion: reduce` では継続アニメーションを停止します。

アセットの利用条件は [MIKO_ASSET_TERMS.md](./MIKO_ASSET_TERMS.md) を参照してください。正式な条件は、同ファイルからリンクしている日本語のMikoキャラクター利用ガイドラインが優先されます。

## アクセシビリティ

操作要素はキーボードで利用でき、選択状態、安全状態、音声状態をテキストでも表示します。ライブ更新には `aria-live` を使用し、フォーカス表示とモーション軽減に対応しています。

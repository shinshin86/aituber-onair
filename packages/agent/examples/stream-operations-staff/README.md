# Stream Operations Staff

AITuber OnAir公式キャラクターのAI配信運営スタッフ「Miko」がライブコメントを監視する、ブラウザ完結の運営コンソール例です。実配信の操作画面ではなく、固定フィクスチャで Agent UI の情報設計を確認するためのデモです。

## 起動

リポジトリのルートでworkspace依存をインストールし、公開package exportが参照する`dist`を先に生成します。その後、このexampleの依存をインストールして起動します。

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/stream-operations-staff ci
npm --prefix packages/agent/examples/stream-operations-staff run dev
```

本番ビルドの確認:

```sh
npm --prefix packages/agent/examples/stream-operations-staff run build
```

`@aituber-onair/agent`、`@aituber-onair/voice`、`@aituber-onair/comment-intelligence`はビルド済みの公開エントリを利用します。そのため、新規チェックアウトではルートの`npm run build`を省略できません。

## デモ操作

1. `再生` を押すと、コメントが固定順序・固定時刻で流れます。
2. `1x / 2x / 4x` で再生速度を変更できます。速度を変えてもコメント、分析カード、集計結果は同じです。
3. コメントを選ぶと、そのコメントを根拠に含む中央の観測カードが強調されます。
4. 観測カードの `根拠を表示` を押すと、引用元コメントが左列で強調されます。
5. 固定コメント16件の再生が完了すると`配信を終了してレポート作成`が有効になります。押すと、処理中状態を経て配信後レポートが表示されます。
6. `リセット` は再生件数、確認済み状態、根拠選択、分析メモリをすべて初期化します。何度実行しても同じシナリオを再現します。
7. `Mikoの音声` は初期状態が `OFF`、AivisSpeechは`未確認`です。`ブラウザ標準（Web Speech）` または、`再確認`でローカル接続を確認できた`AivisSpeech`を選ぶと、その後に新しく作成された観測カードだけを「観測→提案」の順で読み上げます。

一時停止、リセット、配信終了、音声エンジン変更、`OFF` への変更では、再生中の音声と待機キューを停止します。安全性注意カードも抑制済みの観測・提案だけを読み上げ、元コメントの攻撃的な本文は音声へ渡しません。

フィクスチャには、挨拶、同じ質問の繰り返し、音量と話す速さへの建設的フィードバック、攻撃的コメントの短い集中、トピックへの肯定的反応、未回答の重要質問を含みます。攻撃的コメントは本文をそのまま増幅せず、抑制した説明を表示します。

## 実処理とモックの境界

### 実処理

- `@aituber-onair/comment-intelligence` の `createCommentIntelligence()` をブラウザで実行しています。
- `@aituber-onair/voice` の `VoiceEngineAdapter` と話者一覧APIをブラウザで実行し、音声の逐次再生と停止を行います。モック音声や独自の読み上げ実装には置き換えていません。
- `analysis.mode: 'rules'`、`chaos-resistant` ランキング、viewer safety を使い、現在までに到着した固定コメントを毎回ローカル分析します。
- ヘッダーの要注意件数は、rules mode の `safetyReports` が利用可能になった後はその実結果を表示します。
- APIキーとLLM providerは使いません。音声が `OFF` または Web Speech の場合はネットワーク接続を行いません。AivisSpeechを再確認・利用するときだけ `http://localhost:10101` へ接続します。

このexampleの `package.json` は `@aituber-onair/voice` を `file:../../../voice` の実ランタイム依存として指定しています。モノレポ内の公開パッケージ境界を使い、Viteは `@aituber-onair/voice` のpackage export（ビルド済み `dist`）を解決します。別exampleのソースや非公開ファイルはimportしません。

### 固定フィクスチャ / モック

- YouTube / Twitch のコメント受信、再生タイマー、コメントのUIラベル、Mikoの観測・提案、Agent Event、Tool Activity、配信後レポートは決定的な固定フィクスチャです。
- `@aituber-onair/agent` は `CharacterProfile`、`AgentBackendEvent`、`AgentArtifact` などの型だけを `import type` で参照します。Agent runtime を起動・模倣しているとは主張しません。
- `message.delta`、`tool.requested`、`artifact.created` などのイベント行は、UI表示確認用の公開可能なサンプルです。chain-of-thought や内部推論は含みません。
- 分析エラーと自動復旧も、状態表示を確認するための固定シナリオです。
- `report.submit` は画面内にローカル成果物を作る演出だけで、外部投稿・モデレーション・削除・BAN・タイムアウトは一切実行しません。

## 品質確認

ルートのworkspaceをビルドした後、このexampleに対して次を実行できます。

```sh
npm --prefix packages/agent/examples/stream-operations-staff run fmt:check
npm --prefix packages/agent/examples/stream-operations-staff run lint
npm --prefix packages/agent/examples/stream-operations-staff run test
npm --prefix packages/agent/examples/stream-operations-staff run build
```

## Mikoアバター

- `public/avatar/miko.purupuru` は、`packages/core/examples/character-support-bot` と同じPuruPuru PNGTuberパッケージをこの例の中へ同梱したものです。
- `src/components/AvatarCanvas.tsx` と `src/lib/purupuru*.ts` は、同例のローダー・Canvasレンダラーをこの例だけで完結するようコピーして使用しています。別exampleへのランタイムimportはありません。
- ヘッダーの小さな顔画像 `public/avatar/thumbnail.png` は、同梱した `.purupuru` パッケージ内のthumbnailです。
- 状態対応は、コメント監視中=`neutral`、コメント分析中=`thinking`、安全性注意発生=`sad`（利用可能な表現の中で懸念に最も近いもの）、配信終了処理中/配信後レポート完成=`happy` です。パッケージに存在しない「concerned」表情を捏造せず、実装済みの効果だけを使います。
- `prefers-reduced-motion: reduce` ではアイドル視線、呼吸、瞬きバウンス、髪揺れ、反応エフェクトの時間ループを止め、状態効果を静止描画にします。読み込みに失敗した場合はテキストで状態を示します。

Mikoアセットの利用条件は同梱の [MIKO_ASSET_TERMS.md](./MIKO_ASSET_TERMS.md) を参照してください。正式な条件は、同ファイルからリンクしている日本語のMikoキャラクター利用ガイドラインが優先されます。

## 音声エンジン

### ブラウザ標準（Web Speech）

OSとブラウザが提供する `speechSynthesis` を使います。利用可能な話者一覧から日本語話者を優先し、見つからない場合も `ja-JP` を指定してブラウザ既定音声へ委ねます。音声の種類と実際の聞こえ方はOS・ブラウザ環境に依存します。

### AivisSpeech（ローカル）

1. [AivisSpeech](https://aivis-project.com/) アプリをインストールして起動します。
2. AivisSpeech Engine が既定の `http://localhost:10101` で待ち受けていることを確認します。
3. この画面の `再確認` を押します。
4. `AivisSpeech: 接続済み` になったら音声エンジンと話者を選びます。

画面はブラウザから `/version` へ短時間の疎通確認を行い、続けて `@aituber-onair/voice` の話者一覧APIで `/speakers` を取得します。両方に成功した場合だけ選択肢を有効にするため、ViteのオリジンからのCORS許可もこの手順で検証されます。未起動・到達不能・CORS不許可の場合は `起動していません` と表示し、AivisSpeechの選択肢を無効にします。

AivisSpeechアプリ起動後の初回合成では、モデル読み込みに時間がかかる場合があります。1件の音声生成と再生が30秒を超えた場合、この例はそのカードの読み上げをスキップして通知を表示し、次のカードへ進みます。モデル読み込み後は通常どおり読み上げを継続します。

## アクセシビリティ

操作要素はキーボードで利用でき、選択状態と安全状態にはラベルや記号を併記しています。音声状態はMikoの近くへテキスト表示し、`aria-live="polite"` で通知します。フォーカス表示を備え、`prefers-reduced-motion` ではメーターと口の時間変化を抑制します。

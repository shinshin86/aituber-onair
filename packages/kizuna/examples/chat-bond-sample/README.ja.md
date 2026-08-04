# Kizuna 1対1チャットサンプル

`@aituber-onair/kizuna` を1対1チャットへ組み込む方法を確認できるブラウザ
サンプルです。メッセージを入力すると、キャラクターが感情付きの定型文で返答し、
1往復を `message` と感情付き `reaction` の接触として記録します。

関係性パネルには、ポイント、温かさ、関係ステージ、正規化した親密度を表示します。
親密度バーは変更前から変更後まで滑らかに伸び、SVGグラフには会話ごとの推移が
残ります。LLM、TTS、APIキー、ネットワークサービス、実行時依存は不要です。

リポジトリルートから:

```sh
npm -w @aituber-onair/kizuna run example:chat-bond-sample
```

このディレクトリから:

```sh
npm run dev
```

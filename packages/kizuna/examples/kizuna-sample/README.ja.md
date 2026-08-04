# Kizuna モックライブ配信シミュレーター

架空のライブ配信を、`@aituber-onair/kizuna` の応用例の一つとして体験する
ブラウザサンプルです。Kizuna 本体はプラットフォーム非依存であり、このサンプルが
配信風コメントを汎用的な `Interaction` へ変換します。

4人の架空視聴者が、それぞれ異なる頻度と口調で自動投稿します。

- Aki: 質問を交えながら頻繁にコメントする新しい視聴者
- Mio: 絵文字やリアクションが多く、ときどきギフトを送るムードメーカー
- Ren: ゆっくりした間隔で短文を投稿する静かな常連
- Sora: キャラクターの相棒として配信を支えるモデレーター

各コメントは `message`、`reaction`、`gift` のいずれかとして記録されます。
AIの返答と感情タグは定型文で生成するため、LLM、APIキー、ネットワークサービスは
不要です。自動再生を一時停止したり、視聴者を選んで手動投稿したりできます。

視聴者ごとのポイント、ステージ、warmth、絆capitalのsparklineはリアルタイムに
更新されます。シミュレーション時計を1時間、1日、1週間進めると、待ち時間なしで
warmthの減衰を確認できます。選択中の視聴者に対する `getBondContext()` 出力と
Kizunaイベントも配信画面の横で確認できます。

## 起動

リポジトリルートから:

```sh
npm -w @aituber-onair/kizuna run example:kizuna-sample
```

このディレクトリから:

```sh
npm run dev
```

配信風ではなく1対1会話へ統合する例は
[`packages/core/examples/react-basic`](../../../core/examples/react-basic) を参照してください。

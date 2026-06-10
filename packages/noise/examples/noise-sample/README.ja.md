# AITuber OnAir Noise Sample

`@aituber-onair/noise` をブラウザで試すためのサンプルです。

AIが無難にまとめすぎた返答を入力し、意味やキャラクターを保ったまま、
配信で使いやすい言葉に書き換える流れを確認できます。書き換え後には、
無難さが下がったか、キャラクターや文脈が崩れていないかをレポートで
確認できます。

```sh
npm -w @aituber-onair/noise run example:noise-sample
```

サンプルディレクトリ上から起動することもできます。

```sh
cd packages/noise/examples/noise-sample
npm run dev
```

AIサービスの設定は画面上部の「AIを設定」から行います。外部APIを使う場合は
APIキーとモデルを設定し、ローカルLLMを使う場合はEndpointを設定します。

詳細設定の「書き換えモード」では、控えめ、キャラクター重視、大胆、逆張り、
強めに崩す、の順に振り幅を広げられます。

同じ表現を避けるための記録は、ブラウザ保存またはこの画面だけの保存を
詳細設定から選べます。

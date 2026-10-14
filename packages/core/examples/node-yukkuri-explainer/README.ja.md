# ゆっくり解説動画サンプル (Node)

JSON台本と2枚の透過画像から、1920×1080・30fpsのMP4を生成します。
人物ごとに音声と字幕の色を設定でき、話している人物は音量に合わせて跳ね、
聞いている人物は呼吸するように小さく動きます。各人物に使う画像は1枚で、
口の開閉は行いません。

[English](./README.md)

## 実行

Node.js 22以上、PATHの通ったffmpeg、日本語フォントが必要です。
日本語フォントがない環境では、Noto Sans JPなどのフォントファイルを
`YUKKURI_FONT_PATH` で指定してください。

リポジトリのルートで、依存するCoreを先にビルドします。

```bash
npm ci
npm run build
cd packages/core/examples/node-yukkuri-explainer
npm ci
npm run build
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4
```

サイン波サンプルは人物ごとに高さの異なるテスト音を鳴らします。
日本語の読み上げは行わず、音声サーバーやAPIキーは不要です。
MP4とともに、結合済みWAV、せりふの開始・終了時刻、描画設定を保存します。
出力先の `work/` はGit管理外です。

## aqtpserverでAquesTalkPlayerを使う

インストール済みのAquesTalkPlayerと
[aqtpserver](https://github.com/shinshin86/aqtpserver)を起動してから実行します。

```bash
npm run gen -- samples/yukkuri-hello-aqtp.json --out work/aqtp.mp4
```

各人物の `voice.engine` を `aituber-voice` にすると、`voice.options` が
Coreの `VoiceEngineAdapter` に渡されます。

```json
{
  "engineType": "openaiCompatible",
  "openAiCompatibleApiUrl": "http://127.0.0.1:20203/v1/audio/speech",
  "openAiCompatibleModel": "aquestalkplayer",
  "speaker": "れいむ",
  "openAiCompatibleResponseFormat": "wav"
}
```

サンプルでは、だんごに「れいむ」、ぼぶに「まりさ」を指定しています。
別のアドレスで起動している場合は、両者の `openAiCompatibleApiUrl` を
音声生成エンドポイントの完全なURLに変更してください。
プリセット名はAquesTalkPlayerに登録されているものを使います。
速度とピッチはプリセットに従い、Instructionsは使えません。
導入手順と利用条件は [Local TTS](../../../../docs/local-tts.md#aquestalkplayer-aqtpserver)
を参照してください。接続に失敗した場合は処理を止め、対象の行と話者を表示します。

## 台本の形式

`speakers` に2人を登録し、`position` をそれぞれ `left` と `right` にします。
各人物には `name`、`image`、`position`、`subtitleColor` (`#rrggbb`)、
`voice` (`engine` と任意の `options`) が必要です。
`mirror: true` で画像を左右反転できます。

各行には `speaker` (`speakers` のキー) と `text` を指定します。
未登録の話者がある台本は、音声生成前にエラーになります。
任意で次の項目も指定できます。

- `reading`: 読み上げに使う文字列。省略すると `text` を読みます。
- `chapter`、`point`: 中央パネルの見出しと説明。次の指定まで表示を保ちます。
  章が変わると前の説明とスライドを消します。
- `keywords`: 短いラベルを3つまで指定します。
- `slide`: `{ "text": "短い説明" }` または `{ "image": "../assets/slide.png" }`。
- `emotion`: `neutral`、`happy`、`surprised`、`sad`、`angry`、`relaxed`。
  ジャンプの強さに反映します。
- `pauseAfter`: その行の後に入れる無音の秒数。
- `spoken: false` と正の `duration`: 指定した秒数だけ、音声なしで字幕を表示します。

台本全体には `show` (`title`、`subtitle`)、`seed`、`leadIn`、`leadOut`、
`defaultPauseAfter`、`output` を設定できます。
画像・スライド・台本内の出力先はJSONファイルからの相対パスです。
`--out` / `--output` と `--png` は、コマンドを実行したディレクトリからの相対パスです。
8行の会話例は [サイン波サンプル](./samples/yukkuri-hello-sine.json) を参照してください。
字幕は1行の台本につき100文字までで、字幕欄に収まるように折り返し・縮小します。

## プレビューと確認

```bash
# 動画を出力せず、音声と時刻情報を生成する
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4 --dry-run
# 生成済み音声・設定を使い、30番目のフレームを保存する (0始まり・30fps)
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4 --render-only --frame 30 --png work/frame.png
# 音声を再生成せずに動画を書き出す
npm run gen -- samples/yukkuri-hello-sine.json --out work/hello.mp4 --render-only
npm run fmt
npm run build
npm run test
npm run lint
```

`--render-only` は保存済みの設定を使います。台本を変更した場合は、このフラグを
付けずに再生成してください。`--keep-temp` を付けると各行のWAVも残せます。
動きは固定の時間刻みとシードで計算するため、途中のフレームを取り出しても、
最初から生成しても同じ姿勢になります。画素単位で同じ画像を得るには、
フォントと描画ライブラリのバージョンもそろえる必要があります。
LLMによる台本生成や、ほかのアバター形式は含みません。

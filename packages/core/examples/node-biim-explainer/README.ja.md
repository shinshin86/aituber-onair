# biim形式の解説動画（Node）

| 2人で話す | 1人で話す |
| --- | --- |
| ![2人で話すbiim形式のフレーム](./images/biim-duo.png) | ![1人で話すbiim形式のフレーム](./images/biim-solo.png) |

JSON台本から、映像・画像、右側の情報欄、キャラクター、吹き出し字幕を配置した
MP4を生成します。黒背景と白い枠で画面を区切る、biimシステムと呼ばれる構成を
使っています。操作説明、旅行、スライド、ゲーム解説などに利用できます。
特定の制作者の口調や決まり文句を再現するサンプルではありません。

[English](./README.md)

AIエージェントで作る場合は、[作成ガイド](./docs/authoring-guide.ja.md)と
[生成リファレンス](./docs/reference.ja.md)を先に読んでください。
[全機能のsineサンプル](./samples/biim-all-features.json)に時刻指定をまとめています。
排他関係のある下段パネル・右下時計は別サンプルで示しています。

## 使い方

Node.js 22以上、PATHにある`ffmpeg`と`ffprobe`、日本語を表示できるフォントが
必要です。適切なシステムフォントがない場合は、`BIIM_FONT_PATH`にフォント
ファイルを指定してください。

```bash
# リポジトリのルートで、ローカルのCoreを先にビルドします。
npm ci
npm run build
cd packages/core/examples/node-biim-explainer
npm ci
npm run build
npm run validate -- samples/biim-hello-sine.json
npm run plan -- samples/biim-hello-sine.json --estimate
npm run preview -- samples/biim-hello-sine.json --at 0 --at @speed --out work/preview
npm run gen -- samples/biim-hello-sine.json --out work/hello.mp4
```

ビルド時にオリジナルのテストパターン動画（4秒）と図形の画像を`work/`へ生成します。
ゲーム映像などの素材は同梱していません。sineサンプルは日本語の読み上げではなく
電子音で、APIキーや音声サーバーは不要です。出力は`hello.mp4`、`hello.mixed.wav`、
`hello.timeline.json`です。`work/`はGit管理外です。

## コマンド

いずれも`npm run <コマンド> -- ...`で実行します。

| コマンド | 内容 |
| --- | --- |
| `validate script.json` | Schema、話者・アンカー参照、時刻の循環、確定できる数値時刻の重複、表示欄の競合、ファイルの存在を検証。音声合成と描画は行いません。 |
| `plan script.json` | 音声合成し、発話・字幕ページ・メイン素材・情報欄・時計・カウンターの開始と終了を秒で表示。 |
| `plan script.json --estimate` | 音声合成せず、空白を除く毎秒8文字で概算。`--chars-per-second 6`などで変更できます。 |
| `plan script.json --json --out work/plan.json` | JSONを表示し、指定があればファイルにも保存。概算は`estimated: true`です。 |
| `preview script.json --at 12.5 --at @intro-2:end --out work/preview` | 指定時刻のPNGを保存。`--at`は複数指定でき、秒数とアンカーに対応。`--estimate`を付けると音声合成を省略します。 |
| `gen script.json --out work/out.mp4` | H.264/AACのMP4、48kHz・モノラルの合成WAV、時刻表JSONを生成。 |

JSONだけを標準出力に出す場合は、`node dist/gen.js plan samples/biim-hello-sine.json --estimate --json`
を使ってください。台本内のパスは台本ファイルからの相対パス、`--out`は実行
ディレクトリからの相対パスです。プレビュー時刻は0以上、動画の終了時刻未満です。

`validate`では、未合成の音声の長さまでは分かりません。音声の長さに依存する
重複は`plan`と`gen`で確定します。概算では実際と異なる重複判定になる場合が
あるため、発話に合わせる変更には固定秒数よりアンカーを使ってください。
動画の長さは概算モードでもffprobeで確認します。

音声は、読み上げ文とエンジン設定のハッシュをキーに`work/voice-cache/`へ保存し、
plan・preview・genで再利用します。サーバー側のプリセットを変えた場合は、この
ディレクトリを削除して再生成してください。時刻表には話者の音声設定や認証情報を
保存しません。合成に失敗した場合は発話番号と話者を表示します。

## 台本の項目

全項目と制約は、実際の検証に使う[JSON Schema](./schema/biim-script.schema.json)
で確認できます。サンプルの`$schema`からも参照しています。未定義の項目はエラーです。
全項目の型・条件・既定値・例は[生成リファレンス](./docs/reference.ja.md)に記載しています。
Schemaを変えたら`npm run docs:reference`で更新してください。
`npm run docs:reference:check`とテストで資料の更新漏れを検出します。

| 項目 | 内容・既定値 |
| --- | --- |
| `canvas`, `fps`, `seed` | `"16:9"`（1920×1080）または`"4:3"`（1440×1080）。既定は16:9、30fps、乱数シード1。 |
| `output` | MP4の保存先。`--out`で上書き。 |
| `speakers` | 1〜2人。記述順が左からの並び順。`name`, `image`, `voice`は必須。任意の`mirror`で左右反転、`textColor`で字幕色（`#rrggbb`、既定は白）を指定。 |
| `speakers.*.image` | 4状態のPNGディレクトリ、または`mouth_close_eyes_open`, `mouth_open_eyes_open`, `mouth_close_eyes_close`, `mouth_open_eyes_close`をキーとするパス。全状態の寸法をそろえてください。 |
| `speakers.*.voice` | `engine: "sine"`または`"aituber-voice"`と`options`。sineは`frequency`（440Hz）、`secondsPerChar`（0.08秒）、`minDuration`（0.5秒）、`amplitude`（0.22、0〜1）。Coreは必須の`engineType`を含む既存の`VoiceServiceOptions`。 |
| `mouthMode`, `flapInterval`, `mouthThreshold`, `motion` | 全体または話者別に指定。`"flap"`/`"rms"`、0.12秒（1/30〜1）、0.08（0超〜1）、`"subtle"`/`"bounce"`/`"none"`。無音中と聞き手は口を閉じます。まばたきは独立します。 |
| `defaults` | `pauseAfter: 0.3`秒、`mainAudioVolume: 0.25`（0〜1）。 |
| `lines[]` | 必須は`speaker`, `text`。任意で一意の`id`, `reading`, `at`, `pauseAfter`, `emotion`。無音字幕は`spoken: false`と正数の`duration`を指定。発話の長さは音声から決まります。 |
| `main[]` | 時刻順の`at`、任意の`until`、`video`/`image`/`color: "#rrggbb"`のいずれか1つ。`until`省略時は次の素材または動画全体の終わりまで。素材のない時間は黒です。 |
| `main[].video` | 元映像の秒数で`from`（0）、`to`（素材の終わり）。正数の`speed`（1）、`audio`（false）、`speedBadge`（true）。再生後は最後のコマを保持し、素材音声は繰り返しません。 |
| `main[].fit` | 映像・画像を枠内に収める`"contain"`（既定）か、枠を埋める`"cover"`。 |
| `panels[]` | `at`, `box: "top" / "main" / "bottom"`と、`text`/`items`/`image`/`clear: true`のいずれか1つ。itemsは`text`と任意の`color: "yellow" / "white"`。同じ欄の次の更新まで保持。 |
| `timer` | 必須の`start`、任意の`stop`（動画の終わり）、0以上の`offset`（0）、`format: "H:MM:SS.cc"`、`position: "main-bottom-right" / "right-bottom"`。開始前は非表示、stop以降は停止。 |
| `counter` | 任意の`label`と時刻順の`events: [{at, value}]`。右下の欄を使うため、bottomパネルやright-bottom時計とは併用できません。 |

`emotion`は`neutral`, `happy`, `surprised`, `sad`, `angry`, `relaxed`から選び、
体の動きの強さだけに使います。キャラクターには枠を付けません。字幕は通常の
太さの42pxで、1ページ2行まで。長い字幕は文字数に応じて表示時間を配分します。
日本語の単語境界を優先し、枠に収まらない長い語は分割します。情報欄は文字数に
応じて縮小するので、読みやすさのため短く書いてください。
描画寸法は`src/layout.ts`にまとめています。動画は一時ディレクトリへフレームを
展開し、処理後に削除します。長い動画では作業用ディスク容量が必要です。

## 時刻アンカー

```json
{ "id": "intro-2", "speaker": "dango", "text": "説明します。" }
```

- `12.5`：絶対秒数。
- `"@intro-2"`：発話の開始。`"@intro-2:end"`：音声または無音字幕の終了。
- `"@intro-2+1.5"`, `"@intro-2-0.5"`, `"@intro-2:end+0.3"`：前後の秒数。

IDの完全一致をオフセットの解釈より優先します。`@intro-2`は、そのIDを参照します。
別のIDとオフセットに見える名前は避けてください。時刻を持つ全項目で同じ形式を
使えます。linesは通常、直前の音声とpauseAfterの後に続きます。`at`の明示指定は
直前の音声終了以降に置けます。循環、不明なID、負の解決時刻、逆順、重複は
JSON上の位置を付けてエラー表示します。

## AquesTalkPlayer / aqtpserver

インストール済みのAquesTalkPlayerと
[aqtpserver](https://github.com/shinshin86/aqtpserver)を起動して実行します。

```bash
npm run gen -- samples/biim-duo-aqtp.json --out work/duo.mp4
```

Coreの`VoiceEngineAdapter`を通し、だんごに`れいむ`、ぼぶに`まりさ`を割り当てます。
接続先は`http://127.0.0.1:20203/v1/audio/speech`、モデルは`aquestalkplayer`、
`engineType`は`openaiCompatible`、応答形式はWAVです。接続先を変える場合は
両話者の設定を更新してください。プリセット名はAquesTalkPlayer側に必要です。
速度とピッチはプリセットに従い、instructionsは使いません。
設定方法と利用条件は[Local TTS](../../../../docs/local-tts.md#aquestalkplayer-aqtpserver)
を参照してください。だんご・ぼぶの画像は、このリポジトリのNode yukkuri
サンプルからコピーしています。音声合成ソフトの利用条件は別途確認してください。

## AIエージェントに台本を書かせる

次の依頼文の話題と確認時刻を変更して使えます。

```text
node-biim-explainerで使う、<話題>の汎用解説台本JSONを作成してください。
先にschema/biim-script.schema.json、docs/reference.ja.md、
docs/authoring-guide.ja.mdを読んでください。実例はsamples/biim-all-features.jsonを使えます。
既存の1〜2話者、短い要点、自然な字幕、一意の発話IDを使ってください。
映像・情報欄の切替は@id / @id:endで指定し、時計・カウンターは必要時だけ使います。
素材は提供済みか自作のものを使い、特定の制作者の口調を模倣しないでください。
samples/my-script.jsonへ保存して、次を実行してください。
  npm run validate -- samples/my-script.json
  npm run plan -- samples/my-script.json --estimate --json --out work/plan.json
validateとplanが成功するまでエラーを直してください。
genの前に、開始・情報欄切替・後半の字幕ページを必ずプレビューしてください。
  npm run preview -- samples/my-script.json --at 0 --at @chosen-id --out work/preview
PNGを見て、はみ出し、吹き出しの向き、文字、キャラクターの位置を確認してください。
  npm run gen -- samples/my-script.json --out work/my-video.mp4
生成MP4から抽出したフレームと合成WAVを確認してから完了報告してください。
```

## 開発時の確認

```bash
npm ci
npm run fmt
npm run build
npm run test
npm run lint
```

検証、時刻解決、字幕分割、描画ピクセル、短いsine動画の生成をテストします。
MP4生成テストのスキップ条件はffmpegがない場合だけです。
ライブ配信用のReactサンプルとは独立しています。

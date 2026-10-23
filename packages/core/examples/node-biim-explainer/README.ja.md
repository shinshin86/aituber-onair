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
録画の実況には autoscript と入力メモを使い、debug ファイルを確認してください。
右上は場面、右中は理由、右下は数値、字幕は反応を担当し、同じ事実を繰り返さないでください。
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

## 録画から台本を生成する

`autoscript` は録画からフレームを抜き出し、観察、右枠の編集、実況の生成を経て、
通常の biim JSON 台本と `*.debug.json` を出力します。人が内容を確認・編集してから
`gen` に渡してください。`npm run build` で75秒の自作ダンジョン動画も生成します。

```bash
npm run autoscript -- work/dungeon-demo.mp4 --profile game \
  --memo samples/dungeon-memo.md --out work/auto.json \
  --replay fixtures/dungeon-replay
npm run validate -- work/auto.json
npm run gen -- work/auto.json --out work/auto.mp4
```

デモでは宝箱を通り過ぎ、鍵を取り、罠で失敗した後、点滅を待って進みます。
敵を避ける道を通り、ボスの攻撃をかわして出口を開きます。画像はすべて canvas で
描画し、動画などのバイナリは同梱していません。HUD は場所の名前だけを表示し、
攻略の理由は[メモ](./samples/dungeon-memo.md)で補います。
[生成済み台本](./samples/biim-auto-dungeon.json)の音声は sine 音です。
日本語で話させる場合は、前述の `voice` 設定に差し替えてください。
`--speakers 2` は採用したセリフをだんご・ぼぶに交互に割り当てます。

同梱キャッシュは**手書きのテスト用応答**で、実 LLM の出力や画像認識精度の検証結果では
ありません。応答は `src/autoscript/demo-cache.ts` に定義しています。
`npm run demo:dungeon` と `npm run demo:cache` で、映像、リクエストハッシュに対応する
キャッシュ、台本を再生成できます。この操作は API を呼びません。
ffmpeg / canvas の版の違いでピクセルが変わり replay が一致しない場合も、
`demo:cache` でローカルの映像に合わせて作り直せます。
キャッシュがない場合はエラーで停止し、ネットワークには接続しません。
別の動画には専用のキャッシュが必要です。

実 LLM を使う場合は、このサンプルの git 管理外の `.env` に `OPENAI_API_KEY=...` を
書くか、環境変数に設定します。環境変数が優先されます。`--env-file <file>` で別の
ファイルも指定できます。接続先は OpenAI のみで、既存の Core / Chat 経由で呼び出します。
モデルや SDK は追加していません。3役の既定モデルは画像対応の `gpt-4.1-mini` です。
役ごとに `--observer-model` / `--panels-model` / `--commentary-model`、または
`BIIM_OBSERVER_MODEL` / `BIIM_PANELS_MODEL` / `BIIM_COMMENTARY_MODEL` で変更できます。
CLI 指定が優先されます。このデモで実 LLM の応答は未検証です。

```bash
npm run autoscript -- input.mp4 --profile game --memo memo.md \
  --out work/recorded.json --record work/my-cache
npm run autoscript -- input.mp4 --profile game --memo memo.md \
  --out work/replayed.json --replay work/my-cache
```

`--record` は有料 API を呼びます。キャッシュはハッシュと応答だけを保存し、キーや
リクエスト全文は保存しません。debug ファイルには観察、候補文、採否の理由、重複スコア、
予定時刻が入ります。元の映像やメモを含む資料として取り扱ってください。

| 役割 | 表示内容 | 制約 |
| --- | --- | --- |
| 右上 | 広い区間の場面・場所・目標 | 1行16文字以内、最低30秒表示 |
| 右中 | 理由・コツ・背景 | 20文字以内を2項目まで、最低8秒表示 |
| 右下 | 指定メトリクスの数値 | 観察結果から通常のコードで更新 |
| 字幕・キャラ | 反応・予想・感情 | 50文字以内、右枠の言い換えや数字の読み上げを避ける |

時計は LLM を使いません。メモ由来の事実にはメモの引用を求め、不確かなものは除きます。
右中の項目は事実の番号を参照します。文字数超過は一度だけ書き直し、収まらなければ
不採用にします。単語の途中では切りません。実況には現在の右枠と直近5行を渡します。
文字3-gram の重複スコアが0.35以上なら一度だけ再生成し、再び重複すれば不採用にします。
この方法では意味の重複を完全には検出できません。

`--interval 2` は1秒単位の解析から定期フレームを選びます。
`--scene-threshold 0.12` 以上の画素差分も候補にします。`--max-frames 48` で全編に
わたって均等に間引くため、短い出来事を見落とす場合があります。
`--max-vision-calls 48` は再試行も含む観察呼び出しの上限で、超過時は停止します。
場面転換、重要度3の出来事、`--silence 10` の沈黙で発話し、`--stale 5` を超えて
待機したセリフを捨てます。秒数は動画内の時刻です。毎秒5文字で時刻を見積もり、
発話終了アンカーで音声の重なりを防ぎます。実音声が長いと後の行がずれるため、
最終的な声で `plan` を実行し、時刻を確認してください。全セリフが不採用なら
`lines: []` にし、発話を作り足しません。

汎用用途は `--profile generic`、独自設定は `--profile path/to/profile.json` を使います。
[profiles/generic.json](./profiles/generic.json)をコピーし、4役の説明、口調、数値のキーと
ラベルを編集してください。文字数の上限は上表以内です。数値がない場合は右下を表示しません。
確認手順は[執筆ガイド](./docs/authoring-guide.ja.md#autoscript-の確認)にあります。

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

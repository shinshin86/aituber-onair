# AIエージェント向けの台本作成ガイド

このガイド、[生成リファレンス](./reference.ja.md)、[JSON Schema](../schema/biim-script.schema.json)
を使ってください。Schemaで項目を定義し、CLIで参照先・ファイル・時刻の関係も
検証します。ここでいうbiimシステムは、左にメイン映像、右に情報欄、下に
キャラクターと字幕を置く画面構成を指します。

[English](./authoring-guide.md)

## 最初の動画を作る

リポジトリのルートで`npm ci`と`npm run build`を実行してCoreを用意し、続けて
次を実行します。

```bash
cd packages/core/examples/node-biim-explainer
npm ci
npm run build
```

Node.js 22以上、PATHにあるffmpeg・ffprobe、日本語フォントが必要です。
必要に応じて`BIIM_FONT_PATH`にフォントファイルを指定してください。
ビルド時にオリジナルの動画と図形画像を`work/`へ生成します。
同梱サンプルで使うため、この素材を残してください。

次の台本を、そのまま`work/my-video.json`へ保存します。

```json
{
  "$schema": "../schema/biim-script.schema.json",
  "speakers": {
    "dango": {
      "name": "だんご",
      "image": "../assets/yukkuri/dango",
      "mirror": true,
      "voice": { "engine": "sine" }
    }
  },
  "lines": [
    { "id": "intro", "speaker": "dango", "text": "画面の見方を説明します。" },
    { "id": "detail", "speaker": "dango", "text": "右の欄に要点を表示します。" }
  ],
  "main": [{ "at": 0, "color": "#14283d" }],
  "panels": [{ "at": "@detail", "box": "main", "text": "操作のポイント" }]
}
```

次の順に検証・プレビュー・生成を行います。

```bash
npm run validate -- work/my-video.json
npm run plan -- work/my-video.json --estimate --json --out work/my-plan.json
npm run preview -- work/my-video.json --at 0 --at @detail --out work/my-preview
npm run gen -- work/my-video.json --out work/my-video.mp4
```

| 手順 | 確認する内容と出力 |
| --- | --- |
| `validate` | Schema、ID、話者キー、時刻の依存関係、読めるファイル、確定できる重複、表示欄の競合を確認します。成功時は`Valid schema, references, and files.`で始まる文を表示します。音声合成・素材のデコード・文字描画は行いません。 |
| `plan --estimate` | 空白を除く毎秒8文字、発話の最短0.5秒で概算します。`--chars-per-second`で変更できます。無音字幕は指定のdurationを使います。動画の長さと範囲も確認し、各イベントの絶対秒数を`estimated: true`のJSONへ保存します。音声合成は行いません。 |
| `preview --at` | 既定では実際の合成音声またはキャッシュを使い、`01-0.000.png`などのPNGを保存します。開始、パネル切替、後半の字幕ページ、各話者を確認してください。`--at`は複数回指定でき、アンカーも使えます。 |
| `gen` | 実音声の長さで重複を確認し、MP4、`.mixed.wav`、`.timeline.json`を出力します。コンソールに秒数を表示します。MP4の抽出フレームとWAVの再生結果を確認してください。 |

通常の`plan`は実音声を使い、`AUDIO ...s`と表示します。`--json`なしの
`plan --estimate`は`ESTIMATE ...s`と読みやすい時刻一覧を表示します。
JSONだけを標準出力に出す場合は`node dist/gen.js plan work/my-video.json --estimate --json`
を使ってください。npm経由ではコマンド見出しも出ます。`plan --out`は`--json`が
なくてもJSONファイルを保存します。

`preview --estimate`を使うと音声合成なしで配置を確認できます。ただし時計・字幕・
切替時刻は概算で、口を動かす合成音声もありません。音声確認の代わりにはなりません。
プレビュー時刻は0以上、終了時刻未満です。終了直前は`@detail:end-0.1`などで指定します。
アンカー指定はその時刻以降の最初のフレーム（最終フレームを上限）、数値の秒数は
その時刻以前のフレームを選びます。画像ファイル名は指定した秒数です。

台本内のパスは`work/my-video.json`からの相対パスです。CLIの`--out`は実行
ディレクトリ、台本の`output`は台本ファイルからの相対パスになります。
両方省略したgenの出力先は、台本から見た`../work/out.mp4`です。
音声は読みとエンジン設定のハッシュをキーに`work/voice-cache/`へ保存します。
サーバー側のプリセット変更後は、このディレクトリを削除して再生成してください。
時刻表JSONには話者の音声設定や認証情報を保存しません。

## 時刻の決め方

- `at`省略時、先頭の行は0秒、それ以降は「直前の音声・字幕の終了＋直前のpauseAfter」
  に続きます。無音時間は行ごとの指定、`defaults.pauseAfter`、0.3秒の順に決まります。
  最終行の後の無音時間も動画の長さに含みます。
- 表示するのは`text`です。`reading`は音声合成へ送る読みだけを置き換えます。
  実際の発話の長さは返された音声から決まります。概算モードはsineの
  `secondsPerChar`・`minDuration`を使わず、独自の文字数換算を使います。
- 時刻は`12.5`、`"@intro"`、`"@intro+1.5"`、`"@intro-0.5"`、
  `"@intro:end"`、`"@intro:end+0.3"`で指定できます。
  `:end`は音声・字幕の終了で、その後の無音時間を含みません。
- IDの完全一致をオフセットより優先します。別IDのオフセットに見える名前は
  避け、英字で始まる一意IDを使ってください。独立した未来の時刻への参照は
  使えますが、依存関係が循環するとエラーです。
- 次の行の`at`を明示すると無音時間を短くできますが、直前の音声・字幕終了より
  前には置けません。発話の長さに依存する重複は実音声で確定します。
  概算は短すぎる場合も長すぎる場合もあります。
- メイン素材は`until`、省略時は次のmainの`at`、最後は動画全体の終了まで表示します。
  時刻順・重複なしで並べ、隙間は黒になります。素材動画の再生時間は
  `(to - from) / speed`を表示枠の時間で切った長さです。先に再生が終わる場合は
  最後のコマを保持し、素材音声は終了します。
- パネルは同じboxの次の更新まで保持します。`clear: true`は内容だけを消し、
  枠は残します。カウンターの数値も次の更新まで保持します。
- 動画全体の長さは、最終行＋無音時間、明示したmainの終了、イベント時刻、
  時計のstopなどの最大値です。終了時刻ちょうどに置いたイベントは表示時間が
  ないため、必要ならmainのuntilを伸ばすか、最後に無音字幕を加えてください。

## JSONの書き方

以下は、最初の完成台本へ組み込む断片です。配列や項目を置き換え、同じJSONキーを
二重に作らないでください。素材パスは、台本をこのサンプルの`work/`か`samples/`に
保存する前提です。

### 二人の話者

speakersのだんごの後へ次のメンバーを追加し、その下の行をlinesへ追加します。

```json
{
  "bob": {
    "name": "ぼぶ",
    "image": "../assets/yukkuri/bob",
    "mirror": true,
    "voice": { "engine": "sine", "options": { "frequency": 660 } }
  }
}
```

```json
{ "id": "reply", "speaker": "bob", "text": "二人目の話者です。" }
```

記述順が左右の配置を決めます。mirrorは画像の反転で、配置位置は変えません。
吹き出しの尾はspeakerに従い、聞き手の口は閉じます。

### 自分の録画の一部を使う

利用できる録画を`work/local/gameplay.mp4`へ置き、mainを次へ置き換えます。
from・toは素材の実際の長さに合わせて変更してください。

```json
[{ "at": "@intro", "video": "local/gameplay.mp4", "from": 30, "to": 75, "speed": 1, "audio": true, "fit": "contain" }]
```

速度変更前の素材の秒数で範囲を指定します。素材の確認には
`ffprobe -v error -show_format -show_streams work/local/gameplay.mp4`を使えます。
生成済みのデモで試す場合は、パスを`../work/demo.mp4`、fromを0、toを4へ変えます。
素材音声のaudioは既定でfalse、有効時の`defaults.mainAudioVolume`は0.25です。

### 通常再生から倍速へ切り替える

```json
[
  { "at": "@intro", "until": "@detail", "video": "../work/demo.mp4", "from": 0, "to": 4, "audio": true },
  { "at": "@detail", "video": "../work/demo.mp4", "from": 1, "to": 3, "speed": 2, "speedBadge": true, "audio": false }
]
```

後半の素材は1秒で再生し、表示枠が長い場合は最後のコマを保持します。
`speedBadge: false`で×2表示を隠せます。0より大きく1未満のspeedは低速再生です。
有効な素材音声もピッチを保って速度を変えます。

### 画像や単色へ切り替える

```json
[
  { "at": "@intro", "image": "../work/demo-slide.png", "fit": "contain" },
  { "at": "@detail", "color": "#182a20" }
]
```

containは全体を収めて黒帯を付け、coverは枠を埋めて切り抜きます。
mainの各項目ではvideo・image・colorのいずれか1つだけを使います。

### 右側の情報欄を更新する

```json
[
  { "at": 0, "box": "top", "text": "操作手順" },
  { "at": "@intro", "box": "main", "items": [{ "text": "最初の確認", "color": "yellow" }, { "text": "補足説明", "color": "white" }] },
  { "at": "@detail", "box": "main", "image": "../work/demo-slide.png" },
  { "at": "@detail:end", "box": "main", "clear": true }
]
```

下段は`box: "bottom"`です。使う場合はcounterを削除し、時計をright-bottom以外へ
置いてください。この欄は台本全体で排他です。パネルはtext・items・image・clearの
いずれか1つを選びます。itemsの色はyellow・whiteという色名です。
話者のtextColorとメインのcolorは、代わりに`#rrggbb`で指定します。

### 無音字幕を加える

linesへ次の行を追加します。quietは以降の時刻参照に使えます。

```json
{ "id": "quiet", "speaker": "dango", "text": "ここで画面を確認してください。", "spoken": false, "duration": 2, "pauseAfter": 0.3 }
```

発話する行にはdurationを指定しないでください。長い字幕は2行ずつのページに分け、
文字数に応じて時間を配分します。ページ分割はdurationを延ばさないため、
全ページを読める長さを指定してください。無音字幕では音声合成を行いません。

### 時計・カウンター・4:3

必要なメンバーを台本へ加えます。次の配置なら時計とカウンターを併用できます。

```json
{
  "canvas": "4:3",
  "timer": { "start": "@intro", "stop": "@detail:end", "offset": 60, "format": "H:MM:SS.cc", "position": "main-bottom-right" },
  "counter": { "label": "確認数", "events": [{ "at": "@intro", "value": 0 }, { "at": "@detail", "value": 1 }] }
}
```

時計はstart前は非表示、offset秒から進み、stop以降は停止します。
時計をright-bottomに置く場合は、時刻範囲が異なっていてもcounterと全bottomパネルを
削除してください。カウンターは負数や小数にも対応します。

## 素材の配置と形式

寸法とキャラクターの位置をそろえた透過PNGを4枚用意します。

```text
mouth_close_eyes_open.png
mouth_open_eyes_open.png
mouth_close_eyes_close.png
mouth_open_eyes_close.png
```

1024×1024などの正方形が扱いやすいですが、必須寸法ではありません。
描画時は各アバターを250×250pxの領域へ収めます。4状態の寸法が違うと描画時に
エラーになります。validateが確認するのはファイルで、寸法やコーデックではありません。
顔の周りに四角い背景が出ないよう透過にしてください。背景除去は行いません。
ローカル素材はGit管理外の`work/local/`へ置き、パスはリポジトリのルートからではなく
台本ファイルから指定します。

一枚絵の場合は、4状態すべてに同じファイルを指定します。文字列のimageに
PNGファイル名を渡すと、ディレクトリとして扱われるため失敗します。

```json
{
  "image": {
    "mouth_close_eyes_open": "local/avatar.png",
    "mouth_open_eyes_open": "local/avatar.png",
    "mouth_close_eyes_close": "local/avatar.png",
    "mouth_open_eyes_close": "local/avatar.png"
  },
  "motion": "none"
}
```

既存の状態選択を使うため、専用のアバターモードは不要です。motionをnoneに
しなければ一枚絵でも体は動きます。完成した例は
[下段パネルのサンプル](../samples/biim-bottom-panel.json)を参照してください。

動画はH.264映像・AAC音声のMP4を確認しています。それ以外の形式は、インストール
済みのffmpeg・ffprobeが読めて有限の長さを返せる場合に使えます。拡張子の制限は
設けていません。静止画は@napi-rs/canvasでPNG（透過を含む）とJPEGを確認しています。
ほかの形式はデコーダーに依存するため、先にpreviewで試してください。
動画は一時PNGへ展開し、合成WAVはメモリへ置くので、長い素材ではディスク容量と
メモリが必要です。

## 音声を選ぶ

sineはサーバー不要です。frequency（440Hz）、secondsPerChar（0.08秒）、
minDuration（0.5秒）、amplitude（0.22、範囲0〜1）を指定できます。
日本語の発音ではなく電子音です。通信なしで配置や時刻を確認する用途に使います。

aqtpserverは、このサンプルでCoreのVoiceEngineAdapterを通して、れいむ・まりさの
両方の音声取得を確認しています。インストール済みのAquesTalkPlayerとaqtpserverを
先に起動してください。手順と利用条件は
[Local TTS](../../../../../docs/local-tts.md#aquestalkplayer-aqtpserver)に記載しています。
話者のvoiceを次のように指定し、ぼぶ側はspeakerをまりさへ変えます。

```json
{
  "engine": "aituber-voice",
  "options": {
    "engineType": "openaiCompatible",
    "openAiCompatibleApiUrl": "http://127.0.0.1:20203/v1/audio/speech",
    "openAiCompatibleModel": "aquestalkplayer",
    "speaker": "れいむ",
    "openAiCompatibleResponseFormat": "wav"
  }
}
```

`npm run gen -- samples/biim-duo-aqtp.json --out work/aqtp.mp4`で実行します。
指定するプリセットはAquesTalkPlayer側に必要です。速度・ピッチはプリセットの
設定を使い、非対応のinstructionsは加えません。接続失敗はSchemaの不正とは別です。

ほかのエンジンもvoice.optionsをCoreのVoiceServiceOptionsへ直接渡します。
onPlayは描画側で上書きして音声を取得し、48kHz・モノラルのWAVへ変換します。
たとえば`{"engine":"aituber-voice","options":{"engineType":"voicevox","voicevoxApiUrl":"http://127.0.0.1:50021","speaker":"1"}}`
は既存のCoreのVOICEVOX設定に対応します。ただし、このサンプルでの実接続は
未検証です。必要な設定はCore・Voiceの資料を確認してください。Schemaは
engineTypeが空でないことだけを確認し、提供元ごとの設定が動くかまでは確認しません。
取得可能な音声バッファを返さないエンジンは使えません。

## よくあるエラー

以下は実際の検証・CLIメッセージです。番号・ID・秒数は台本によって変わります。

| メッセージ | 直し方 |
| --- | --- |
| `lines[1].speaker: unknown speaker missing` | nameではなくspeakersのキーを使います。 |
| `lines[1].id: duplicate ID intro` | IDを一意にします。 |
| `main[0].at: unknown line anchor @missing` | 参照する行IDを定義するか、綴りを直します。 |
| `lines[0].at: cyclic line timing dependency` | その行に依存する未来の行への参照を外します。 |
| `lines[0].duration: must have required property 'duration'` | spoken=falseに正数のdurationを加えます。発話する行ではdurationを外します。 |
| `main[0]: must match exactly one schema in oneOf` | video・image・colorを1つに絞ります。 |
| `main[0].image: file does not exist or is not readable (missing.png)` | 台本を置いたディレクトリからのパスへ直します。 |
| `lines[1].at: must be >= previous line end (at least 2s)` | atを後ろへ動かすか、順次開始・アンカーを使います。実音声で必要時刻が延びる場合があります。 |
| `main[1].at: overlaps previous main slot` | 直前の素材の終了を今回の開始以前へ置きます。 |
| `counter: cannot share bottom with panels` | counterか、すべてのbottomパネルを削除します。 |
| `timer.position: right-bottom cannot share bottom with panels/counter` | 時計をmain-bottom-rightへ動かすか、下段を空けます。 |
| `--at 999: outside timeline [0, ...` | 動画の終了時刻未満を指定します。 |

CLIは、形のエラーをまとめて表示し、形が正しい場合に意味・ファイルを検証します。
失敗時の終了コードは0以外です。validate成功だけではフォント、画像寸法、
動画コーデック、外部TTSまで動作確認できたことにはなりません。

## 全機能の例と制限

[biim-all-features.json](../samples/biim-all-features.json)は、2話者のsine音声、
画像ディレクトリと明示パス、全体・話者別の動作設定、行の全項目と感情指定、
長い無音字幕、範囲・速度・素材音声・倍率・配置、動画・画像・単色、情報欄の
文字・項目・画像・消去、オフセット時計とカウンターをまとめた例です。
排他関係がある下段の表示は1つの台本へまとめられないため、
[biim-bottom-panel.json](../samples/biim-bottom-panel.json)で下段パネルと一枚絵、
[biim-timer-right.json](../samples/biim-timer-right.json)で右下時計を確認できます。
もう一方の音声エンジンはaqtpサンプルで示しています。

自作または利用できる素材を使い、商用ゲーム映像・ロゴ・第三者のスクリーンショットを
リポジトリへ追加しないでください。ミームの決まり文句や特定の制作者の口調の模倣を
避け、画面構成を中立に説明します。対応する話者は1〜2人で、各話者の4状態画像セットは
動画全体で固定です。独立したBGM・SEトラックはありません。素材動画の音声は合成できます。
途中でのアバター・表情セット切替と3人以上の話者には対応していません。

Schemaを編集したら`npm run docs:reference`を実行してください。
生成資料の更新漏れ、説明の欠落・仮文言・異なる意味の項目への説明の使い回しは
テストで検出します。
## Autoscript の確認

`npm run autoscript -- recording.mp4 --profile game --memo memo.md --out work/auto.json
--record work/cache` で台本の下書きを作れます。`--record` は OpenAI API を呼びます。
キー、replay、呼び出し上限、モデルの設定は [README](../README.ja.md#録画から台本を生成する)を
参照してください。ダンジョンのキャッシュは手書きのテストデータで、画像認識結果ではありません。

1. 録画と `auto.debug.json` を見比べ、観察内容と数値の更新を確認します。
   メモの引用があっても、画面由来の観察が正しいかは人が確認してください。
2. 右上は場所・段階、右中は理由、右下は数値、字幕は反応になっているか確認します。
   文字の重複検出では拾えない言い換えも削除します。右上は現在の場所を表示します。`sceneChanged` が新しい場所を示したら即時に更新し、
   同じ場所での言い換えは `map.minDisplaySeconds`（8秒）待ちます。右中は最低8秒表示します。
3. 不採用の候補と理由を確認します。文字数超過は一度だけ書き直し、再び超過すれば
   不採用にします。右枠との重複も一度だけ再生成します。期限を過ぎたセリフを戻す場合は、
   対応する出来事がまだ映っているか確認してください。
4. 最終的な声を設定して `validate`、実 TTS の `plan --json --out work/plan.json` を
   実行します。終了アンカーで音声は重なりませんが、毎秒5文字の見積もりと実際の声の
   長さが異なると後の行がずれます。録画と合うように時刻を調整してください。
5. 各場面・右枠の変更時点をプレビューし、完成 MP4 からもフレームを抜き出します。
   読みやすさと4領域の役割を確認し、WAV を再生します。sine 音で確認できるのは
   タイミングと口の動きで、発音や話し方は確認できません。

独自プロファイルは `profiles/generic.json` をコピーして作ります。
`map` / `textbook` / `scoreboard` / `friend` の4つのキーを残し、説明、口調、
数値のキーとラベル（例：`progress` / `手順`）を編集します。`maxChars` は
右上は各行16、右中20、実況50以下、`maxItems` は1か2です。`map.maxLines` は1か2です。
通常の発話間隔は `friend.targetCadenceSeconds`、発話後の沈黙時間は
`friend.silenceSeconds` で設定します。待機によって予定より遅れる場合もあるため、
実際のタイムラインを確認してください。`scoreboard.rules` は最初に一致した数値ルールを使い、
`{value}` を数値に置き換えたり、クリア状態を表示したりできます。
`--profile my-profile.json` で読み込みます。数値がなければ右下は表示されません。
映像にもメモにもない事実は補わないでください。採用する実況がなければ `lines: []` に
できます。その場合もメインクリップの `until` で動画の長さを指定してください。

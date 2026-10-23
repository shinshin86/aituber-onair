# 台本の全項目リファレンス

<!-- schema/biim-script.schema.jsonから生成。npm run docs:referenceで更新してください。 -->

NodeでMP4を生成する台本です。1〜2人の固定アバター、順番に続く発話・無音字幕、映像・画像・単色の切替、保持される右側の情報欄、任意の時計・カウンターを指定します。素材と出力のパスは台本ファイルからの相対パス、CLIの--outは実行ディレクトリからの相対パスです。未定義の項目はエラーです。defaultは描画時の動作を表し、検証時には値を挿入しません。

`*`は話者キー、`[]`は配列の要素です。「条件付き」は発話・素材の選択に依存し、詳細は説明に記載しています。継承・素材長などから決まる既定値は数値で挿入せず、説明に記載しています。

音声オプションはエンジンごとに分けています。sineは記載したキーだけ、aituber-voiceはCoreの追加キーを受け付けます。SchemaはCore提供元ごとの設定までは検証しません。

| パス | 型・値 | 必須 | 既定値 | 説明・制約・例 |
| --- | --- | --- | --- | --- |
| `$schema` | string | 任意 | — | エディタ用のSchema参照です。台本からの相対パスで指定します。CLIはこの値にかかわらず同梱Schemaを使います。 minLength: 1. 例: `"../schema/biim-script.schema.json"`. |
| `canvas` | "16:9" / "4:3" | 任意 | `"16:9"` | 出力の縦横比です。16:9は1920×1080、4:3は1440×1080です。 例: `"16:9"`, `"4:3"`. |
| `fps` | integer | 任意 | `30` | 出力の毎秒フレーム数です。1〜60の整数を指定します。 minimum: 1; maximum: 60. 例: `30`. |
| `seed` | integer | 任意 | `1` | まばたきと体の動きを再現するための0以上の整数シードです。 minimum: 0. 例: `42`. |
| `output` | string | 任意 | `"../work/out.mp4"` | 台本ファイルからの相対パスで指定するMP4の保存先です。genの--outが優先されます。 minLength: 1. 例: `"../work/explainer.mp4"`. |
| `speakers` | object | 必須 | — | 1〜2人の話者を左から順に記述します。キーはlinesのspeakerから参照します。英字で始め、英数字・下線・ハイフンを使えます。 minProperties: 1; maxProperties: 2. |
| `speakers.*.name` | string | 必須 | — | 必須の話者名です。メタデータとして保持し、画面には名前ラベルを描画しません。 minLength: 1. 例: `"だんご"`. |
| `speakers.*.image` | string or object | 必須 | — | 台本ファイルからの相対パスで、4状態の画像ディレクトリか4パスのオブジェクトを指定します。文字列は単一画像ではなく常にディレクトリです。 例: `"../assets/yukkuri/dango"`. |
| `speakers.*.image.mouth_close_eyes_open` | string | 必須 | — | 口を閉じ、目を開いた状態の画像を、台本ファイルからの相対パスで指定します。全状態に同じ画像を指定すると静止アバターになります。 minLength: 1. 例: `"../assets/yukkuri/dango/mouth_close_eyes_open.png"`. |
| `speakers.*.image.mouth_open_eyes_open` | string | 必須 | — | 口と目を開いた状態の画像を、台本ファイルからの相対パスで指定します。全状態に同じ画像を指定すると静止アバターになります。 minLength: 1. 例: `"../assets/yukkuri/dango/mouth_open_eyes_open.png"`. |
| `speakers.*.image.mouth_close_eyes_close` | string | 必須 | — | 口と目を閉じた状態の画像を、台本ファイルからの相対パスで指定します。全状態に同じ画像を指定すると静止アバターになります。 minLength: 1. 例: `"../assets/yukkuri/dango/mouth_close_eyes_close.png"`. |
| `speakers.*.image.mouth_open_eyes_close` | string | 必須 | — | 口を開き、目を閉じた状態の画像を、台本ファイルからの相対パスで指定します。全状態に同じ画像を指定すると静止アバターになります。 minLength: 1. 例: `"../assets/yukkuri/dango/mouth_open_eyes_close.png"`. |
| `speakers.*.mirror` | boolean | 任意 | `false` | この話者の画像を左右反転します。画面下部の配置位置は変わりません。 例: `true`. |
| `speakers.*.voice` | object | 必須 | — | この話者の音声エンジンと設定です。無音字幕では音声合成を呼びません。 |
| `speakers.*.voice.engine` | "sine" / "aituber-voice" | 必須 | — | sineはサーバー不要の電子音、aituber-voiceはCoreのVoiceEngineAdapterから取得する音声です。 例: `"sine"`, `"aituber-voice"`. |
| `speakers.*.voice.options` | object | 条件付き | — | エンジン固有の設定です。sineでは任意、aituber-voiceではengineTypeを含めて必須です。Coreの設定はそのまま渡し、このSchemaでは提供元固有の検証を行いません。 |
| `speakers.*.voice.options` (engine="sine") | object | 任意 | — | engineがsineのときの設定です。ここにある電子音の数値設定だけを受け付けます。 |
| `speakers.*.voice.options.secondsPerChar` (engine="sine") | number | 任意 | `0.08` | 空白を除いたUnicode文字1文字あたりの電子音の秒数です。全体の長さはminDuration以上になります。 exclusiveMinimum: 0. 例: `0.07`. |
| `speakers.*.voice.options.frequency` (engine="sine") | number | 任意 | `440` | 長さとは独立した、正数の正弦波周波数（Hz）です。 exclusiveMinimum: 0. 例: `660`. |
| `speakers.*.voice.options.minDuration` (engine="sine") | number | 任意 | `0.5` | 電子音の最短秒数です。正数で指定します。 exclusiveMinimum: 0. 例: `0.5`. |
| `speakers.*.voice.options.amplitude` (engine="sine") | number | 任意 | `0.22` | ゲート・フェード処理前の電子音の振幅です。0（無音）〜1で指定し、合成音声は必要時にピークを正規化します。 minimum: 0; maximum: 1. 例: `0.18`. |
| `speakers.*.voice.options` (engine="aituber-voice") | object | 必須 | — | engineがaituber-voiceのときの必須設定です。追加キーはCoreのVoiceServiceOptionsへ直接渡し、onPlayは描画側が設定します。 |
| `speakers.*.voice.options.engineType` (engine="aituber-voice") | string | 必須 | — | 必須のCore音声エンジン名です。Schemaは空でない文字列だけを確認します。合成時にCoreがエンジンを選び、提供元の設定によってはその時点で失敗する場合があります。 minLength: 1. 例: `"openaiCompatible"`. |
| `speakers.*.textColor` | string | 任意 | `"#ffffff"` | この話者の字幕色を6桁のRGBで指定します。字幕の文字だけに適用します。 例: `"#ffffff"`. |
| `speakers.*.mouthMode` | "flap" / "rms" | 任意 | — | 話者別の上書きです。口の動作方式です。flapはflapIntervalごとに開閉し、rmsは音量がしきい値を超えると開きます。どちらも無音では閉じます。 省略時は全体のmouthMode（未指定時flap）を使います。 例: `"flap"`. |
| `speakers.*.flapInterval` | number | 任意 | — | 話者別の上書きです。flapで1つの口の状態を保つ秒数です。1/30〜1秒で指定します。 省略時は全体のflapInterval（未指定時0.12）を使います。 minimum: 0.03333333333333333; maximum: 1. 例: `0.12`. |
| `speakers.*.mouthThreshold` | number | 任意 | — | 話者別の上書きです。口を開く正規化RMSのしきい値です。0超〜1を指定し、音声RMSを0.12で割って1を上限にした値と比較します。 省略時は全体のmouthThreshold（未指定時0.08）を使います。 exclusiveMinimum: 0; maximum: 1. 例: `0.08`. |
| `speakers.*.motion` | "subtle" / "bounce" / "none" | 任意 | — | 話者別の上書きです。体の動きです。subtleは小さな跳ねと呼吸、bounceは大きめの動き、noneは体だけを止め、口とまばたきは動かします。 省略時は全体のmotion（未指定時subtle）を使います。 例: `"subtle"`. |
| `defaults` | object | 任意 | — | 発話間の無音時間と素材動画の音量の既定値を指定します。 |
| `defaults.pauseAfter` | number | 任意 | `0.3` | 各行の後（最終行を含む）の無音時間の既定秒数です。行ごとのpauseAfterが優先されます。 minimum: 0. 例: `0.3`. |
| `defaults.mainAudioVolume` | number | 任意 | `0.25` | audio=trueの素材動画へ適用する0〜1の線形音量です。独立したBGMトラックではありません。 minimum: 0; maximum: 1. 例: `0.15`. |
| `lines` | array<object> | 必須 | — | 発話・字幕を順に記述します。実況がない動画では空配列にできます。発話の長さは音声、無音字幕の長さはdurationで決まります。at省略時は直前の行に続きます。 minItems: 0. |
| `lines[].id` | string | 任意 | — | アンカーに使う任意の一意IDです。英字で始め、英数字・下線・ハイフンを使えます。 pattern: "^[A-Za-z][A-Za-z0-9_-]*$". 例: `"intro"`. |
| `lines[].speaker` | string | 必須 | — | speakersに存在するキーです。表示名のnameではありません。 minLength: 1. 例: `"dango"`. |
| `lines[].text` | string | 必須 | — | 表示する空でない字幕です。折り返しとページ分割を行い、各ページを2行以内にします。 minLength: 1. 例: `"操作手順を説明します。"`. |
| `lines[].reading` | string | 任意 | — | textに代えて音声合成へ送る読みです。省略時はtextを使い、字幕は引き続きtextを表示します。 minLength: 1. 例: `"そうさてじゅんをせつめいします。"`. |
| `lines[].pauseAfter` | number | 任意 | — | この行の後の無音秒数です。省略時はdefaults.pauseAfter（未指定時0.3秒）を使います。次の行のatを明示した場合は音声終了以降へ置けます。 minimum: 0. 例: `0.5`. |
| `lines[].at` | number or string | 任意 | — | 発話の開始を秒数かアンカーで指定します。省略時は先頭が0秒、それ以降は直前の音声・字幕と無音時間の後です。明示する場合も直前の音声・字幕終了より前には置けません。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `lines[].spoken` | boolean | 任意 | `true` | この行を音声合成するかどうかです。falseでは正数のdurationが必須となり口を閉じます。trueではdurationを指定できません。 例: `false`. |
| `lines[].duration` | number | 条件付き | — | 無音字幕の表示秒数です。spoken=falseのときだけ必須で、spoken=trueまたはspoken省略時は指定できません。 exclusiveMinimum: 0. 例: `2`. |
| `lines[].emotion` | "neutral" / "happy" / "surprised" / "sad" / "angry" / "relaxed" | 任意 | `"neutral"` | 体の動きの強さの指定です。happy・surprisedは1.1、sad・relaxedは0.8、neutral・angryは1です。画像セットやTTSの感情は変えません。 例: `"happy"`. |
| `main` | array<any> | 任意 | — | メイン領域の素材を時刻順・重複なしで並べます。各項目はvideo・image・colorのいずれか1つです。素材のない時間と配列省略時は黒になります。 |
| `main[].at` | number or string | 必須 | — | メイン素材の開始を秒数かアンカーで指定します。時刻順で、範囲が重複しないように並べます。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `main[].until` | number or string | 任意 | — | メイン素材の終了を秒数かアンカーで指定し、開始より後へ置きます。省略時は次の素材の開始か動画全体の終了です。素材の再生が先に終わる場合は最後のコマを保持します。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `main[].video` | string | 条件付き | — | 台本ファイルからの相対パスで指定する動画です。ffmpeg・ffprobeが読める、長さの確定した映像ストリームが必要です。 minLength: 1. 例: `"../work/demo.mp4"`. |
| `main[].image` | string | 条件付き | — | 台本ファイルからの相対パスで指定するメイン領域の静止画です。@napi-rs/canvasで読み込みます。 minLength: 1. 例: `"../work/demo-slide.png"`. |
| `main[].color` | string | 条件付き | — | メイン領域を塗る6桁のRGBです。video・imageとは同時に指定できません。 例: `"#14283d"`. |
| `main[].from` | number | 任意 | `0` | 動画専用の範囲開始位置です。速度変更前の素材の秒数で、素材の範囲内に指定します。 minimum: 0. 例: `1`. |
| `main[].to` | number | 任意 | — | 動画専用の範囲終了位置です。素材の秒数でfromより後、素材終了以内（計測誤差0.02秒）に指定します。省略時は素材の終了です。 exclusiveMinimum: 0. 例: `3`. |
| `main[].speed` | number | 任意 | `1` | 動画専用の正数の再生倍率です。2は2倍速、0.5は半速です。素材音声もピッチを保って速度を変えます。 exclusiveMinimum: 0. 例: `2`, `0.5`. |
| `main[].audio` | boolean | 任意 | `false` | 動画専用の素材音声を合成するスイッチです。defaults.mainAudioVolumeの音量で発話へ加え、音声のない素材は無音のままです。 例: `true`. |
| `main[].speedBadge` | boolean | 任意 | `true` | 動画専用の倍率表示です。speedが1以外のときに小さな倍率ラベルを表示します。 例: `false`. |
| `main[].fit` | "contain" / "cover" | 任意 | `"contain"` | 映像・画像の配置方法です。containは全体を収めて黒帯を付け、coverは枠を埋めて切り抜きます。colorでは効果がありません。 例: `"contain"`, `"cover"`. |
| `panels` | array<any> | 任意 | — | 右側の表示内容をboxごとに時刻順で更新します。text・items・image・clearのいずれか1つを指定し、次の更新まで保持します。 |
| `panels[].at` | number or string | 必須 | — | パネルの更新時刻を秒数かアンカーで指定します。同じboxの中で時刻順に並べます。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `panels[].box` | "top" / "main" / "bottom" | 必須 | — | 右側の表示先です。topは上段、mainは中央、bottomは下段で、内容は欄ごとに独立して保持します。 例: `"top"`, `"main"`, `"bottom"`. |
| `panels[].text` | string | 条件付き | — | この情報欄の中央に置く通常の文字列です。items・image・clearとは同時に指定できません。 minLength: 1. 例: `"操作のポイント"`. |
| `panels[].items` | array<object> | 条件付き | — | 中央に配置する1件以上の項目です。必要に応じて折り返し、白か黄色で表示します。 minItems: 1. |
| `panels[].items[].text` | string | 必須 | — | この情報項目に表示する文字列です。複数の中央揃え行に折り返すことがあります。 minLength: 1. 例: `"要点を確認"`. |
| `panels[].items[].color` | "yellow" / "white" | 任意 | `"white"` | この情報項目の色名です。yellow（#ffff00）かwhite（#ffffff）を選び、任意のRGBは指定できません。 例: `"yellow"`. |
| `panels[].image` | string | 条件付き | — | この情報欄に置く静止画の、台本ファイルからの相対パスです。切り抜かず枠内へ収めます。 minLength: 1. 例: `"../work/demo-slide.png"`. |
| `panels[].clear` | true | 条件付き | — | trueを指定するとat以降、次の更新までこの欄の内容を消します。白い枠は残ります。 例: `true`. |
| `timer` | object | 任意 | — | 任意の時計です。start前は非表示、stopまでは進み、その後は停止した値を表示します。 |
| `timer.start` | number or string | 必須 | — | 時計の表示と計時を開始する秒数かアンカーです。この時刻より前は非表示です。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `timer.stop` | number or string | 任意 | — | 時計を停止する秒数かアンカーです。start以降へ置き、省略時は動画全体の終了で停止します。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `timer.offset` | number | 任意 | `0` | 計時開始時に表示する0以上の秒数です。startからの経過時間へ加えます。 minimum: 0. 例: `60`. |
| `timer.format` | "H:MM:SS.cc" | 任意 | `"H:MM:SS.cc"` | 対応する時計形式は時:分:秒.百分の一秒だけです。例は0:01:02.34です。 例: `"H:MM:SS.cc"`. |
| `timer.position` | "main-bottom-right" / "right-bottom" | 任意 | `"main-bottom-right"` | 時計をメイン領域に重ねるか、右下の欄へ置きます。right-bottomはcounter・bottomパネルとは併用できません。 例: `"main-bottom-right"`, `"right-bottom"`. |
| `counter` | object | 任意 | — | 右下の欄に数値を表示します。表示時刻が異なる場合も、bottomパネルやright-bottom時計とは併用できません。 |
| `counter.label` | string | 必須 | — | 右下の欄で現在の数値の前に表示する文字列です。 minLength: 1. 例: `"確認数"`. |
| `counter.events` | array<object> | 必須 | — | 時刻順の1件以上の数値更新です。最初のイベントまでは非表示で、値は次の更新か動画全体の終了まで保持します。 minItems: 1. |
| `counter.events[].at` | number or string | 必須 | — | カウンター値の更新時刻を秒数かアンカーで指定し、時刻順に並べます。 例: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `counter.events[].value` | number | 必須 | — | カウンターに表示する数値です。負数・小数も受け付け、整数の回数に限定しません。 例: `3`. |
| `counter.events[].text` | string | 任意 | — | このイベントでラベルと数値の代わりに表示する全文です。取得数の合計やクリア状態に使えます。数値はタイムラインに保持します。 minLength: 1. 例: `"鍵 1/1"`, `"クリア！"`. |
| `mouthMode` | "flap" / "rms" | 任意 | `"flap"` | 全体設定です。口の動作方式です。flapはflapIntervalごとに開閉し、rmsは音量がしきい値を超えると開きます。どちらも無音では閉じます。 例: `"flap"`. |
| `flapInterval` | number | 任意 | `0.12` | 全体設定です。flapで1つの口の状態を保つ秒数です。1/30〜1秒で指定します。 minimum: 0.03333333333333333; maximum: 1. 例: `0.12`. |
| `mouthThreshold` | number | 任意 | `0.08` | 全体設定です。口を開く正規化RMSのしきい値です。0超〜1を指定し、音声RMSを0.12で割って1を上限にした値と比較します。 exclusiveMinimum: 0; maximum: 1. 例: `0.08`. |
| `motion` | "subtle" / "bounce" / "none" | 任意 | `"subtle"` | 全体設定です。体の動きです。subtleは小さな跳ねと呼吸、bounceは大きめの動き、noneは体だけを止め、口とまばたきは動かします。 例: `"subtle"`. |

## 共有型

- `time`: 0以上の絶対秒数、または@行ID[:end][+/-秒数]です。IDの完全一致をオフセットの解釈より優先します。不明なIDと負の解決時刻はエラーです。 (number or string)
- `color`: #に続けた6桁のRGB文字列です。ここでは透過値と色名を受け付けません。 (string)

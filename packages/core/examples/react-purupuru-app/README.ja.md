# PuruPuru PNGTuber Chat

`@aituber-onair/core` のチャット/TTS と、`.purupuru` アバターパッケージ用
PNGTuber レンダラーを組み合わせた React example です。

## 機能

- Settings の Visual セクションから `.purupuru` パッケージを読み込み
- 目 2 状態 x 口 3 状態の 6 face PNG を描画
- back hair、face、front hair、任意の item layer を Canvas で合成
- `settings.json` の breath/roll 設定に基づく待機モーション
- front/back hair に spring-driven な遅れと bounce を適用
- 待機中に左右へ軽く視線/向きを変える idle gaze と layer parallax
- 読み込み済み avatar のドラッグ移動と mouse wheel zoom
- `SPEECH_START` の emotion tag に応じたリアクション
- 2-6 秒間隔のランダム blink
- TTS 音声の lip-sync による closed/half/open の口パク
- チャット、TTS 設定、配信コメント、Screen Vision、broadcast 表示を維持

## 起動

```bash
cd packages/core/examples/react-purupuru-app
npm install
npm run dev
```

起動後、Settings を開き、Visual セクションで `.purupuru` ファイルを選択して
ください。読み込み前は組み込みの placeholder avatar を表示します。

パッケージ読み込み後は、canvas 上で avatar をドラッグして位置を調整し、mouse
wheel で拡大/縮小できます。canvas をダブルクリックするか、Visual セクションの
`アバター位置をリセット` ボタンを押すと初期位置に戻ります。ドラッグ位置と zoom
倍率は reload 後も保持されます。

## 検証

```bash
npm run build
npm run lint
```

## 対応フォーマット

この example は format version 1 の uncompressed ZIP (`ZIP_STORED`) のみを
読み込みます。圧縮 ZIP、過大サイズ、危険なパス、CRC32 不一致は拒否します。

`hairSpring` が `0` の場合、hair physics は無効になり、髪は頭部に固定され
ます。Hair slot の item layer は `followStrength` (0-200) に応じて spring
transform に追従します。

item layer slot は PuruPuruPNGTuber の描画順に合わせ、`stageBack`,
`characterBack`, `faceBack`, `faceFront`, `frontHairFront`, `stageFront` に対応
します。未知の slot は将来の package export でも描画されるよう
`frontHairFront` として扱います。

この example は face tracking、mesh deformation、OBS preset export には対応して
いません。

## Emotion reactions

Core は `[happy]` などの emotion tag を `screenplay = { emotion, text }` に
変換し、`SPEECH_START` で通知します。この example はその時点で reaction
draft を保持し、TTS 音声が実際に再生開始したタイミングで適用します。

| Emotion | Reaction |
| --- | --- |
| `happy` | 強めの hair bounce、少し上向き、軽い scale pop |
| `surprised` | 素早い tilt impulse、bounce、scale pop |
| `sad` | うつむき気味の sustain と柔らかい idle |
| `angry` | 短い shake impulse と速めの idle |
| `relaxed` | ゆっくり柔らかい idle と小さな bounce |
| `neutral` | 追加 reaction なし |

Mapping は `src/lib/purupuruReactions.ts`、renderer 側の sustain/impulse 処理は
`src/lib/purupuruRenderer.ts` で調整できます。

## Idle gaze

読み込み済み avatar は待機中にときどき左右へ軽く向きを変えます。この動きは
breath/roll と同じ target pose に入るため、既存の pose easing と hair spring
で髪が自然に揺れます。描画時には face、front hair、back hair に異なる水平
parallax をかけ、face が最も大きく、back hair が最も小さく動きます。

Scheduler は `src/lib/idleGaze.ts`、turn/parallax の比率は
`src/lib/purupuruRenderer.ts` で調整できます。

## Motion tuning

`src/lib/purupuruRenderer.ts` の renderer constants:

| Value | Default | 大きくすると |
| --- | ---: | --- |
| `GAZE_TURN_OFFSET_RATIO` | `0.014` | idle gaze 中の頭/face の横移動が大きくなる |
| `GAZE_TURN_TILT` | `0.026` | idle gaze 中の頭の傾きが大きくなる |
| `FACE_PARALLAX_RATIO` | `0.034` | face layer の gaze parallax が大きくなる |
| `FRONT_HAIR_PARALLAX_RATIO` | `0.01` | front hair が gaze parallax に強く追従する |
| `BACK_HAIR_PARALLAX_RATIO` | `0.006` | back hair が gaze parallax に強く追従する |

奥行きが自然に見えるよう、parallax は `face > frontHair > backHair` の順に
してください。

`src/lib/idleGaze.ts` の scheduler constants:

| Value | Default | 大きくすると |
| --- | ---: | --- |
| `MIN_WAIT_SECONDS` / `MAX_WAIT_SECONDS` | `5` / `14` | idle gaze の発生頻度が下がる |
| `MIN_HOLD_SECONDS` / `MAX_HOLD_SECONDS` | `0.6` / `1.8` | 視線を向けたまま保持する時間が長くなる |
| `FULL_TURN_MIN` / `FULL_TURN_MAX` | `0.65` / `1` | full turn が左右へ大きく振れる |
| `SMALL_TURN_MAX` / `SMALL_TURN_CHANCE` | `0.3` / `0.3` | small turn の幅が広がる / 発生しやすくなる |

package `settings.json` の値:

| Value | 大きくすると |
| --- | --- |
| `breathStrength` | 縦方向の呼吸モーションが強くなる |
| `rollStrength` | 横揺れと頭の roll が強くなる |
| `hairSpring` | hair の spring lag と bounce が目立つ |
| `avatarSize` | avatar が大きく描画される |
| `avatarX` | avatar が右へ移動する |
| `avatarY` | avatar が下へ移動する |
| `idleMotionEnabled` | runtime では無視され、app-level の Visual 設定が優先される。camera tracking 前提の package は `false` で出力されることが多いため |

表示中の `itemLayers` は `followStrength` (`0`-`200`) で hair spring transform
への追従度を決めます。

## Attribution

`.purupuru` フォーマットとレンダラー挙動は Apache-2.0 ライセンスの
PuruPuruPNGTuber を参考にしています。この example は package loading、
face-state selection、idle motion、hair physics、emotion reactions、item
layers、drag/zoom placement、blink、audio mouth-state behavior に対応して
います。

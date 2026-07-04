# ぷるぷるPNGTuber Chat

![react-purupuru-app image](./images/react-purupuru-app.png)

`@aituber-onair/core` のチャット/TTS 機能と、`.purupuru` アバター
パッケージ向けの PNGTuber レンダラーを組み合わせた React サンプルアプリです。

## 機能

- 公式キャラクター「ミコ」の `.purupuru` パッケージをデフォルトで表示
- Settings の Visual セクションから任意の `.purupuru` パッケージに切り替え
- 目 2 状態 x 口 3 状態の 6 種類の表情 PNG を描画
- 後ろ髪、顔、前髪、任意のアイテムレイヤーを Canvas 上で合成
- `settings.json` の `breathStrength` / `rollStrength` に基づく待機モーション
- 前髪と後ろ髪に、ばねのような遅れと揺れを追加
- 待機中に左右へ軽く向きを変える視線移動とレイヤーのパララックス
- アバターのドラッグ移動とマウスホイールでの拡大・縮小
- `SPEECH_START` の emotion tag に合わせたリアクション
- 2-6 秒間隔のランダムなまばたき
- TTS 音声の lip-sync による closed / half / open の口パク
- チャット、TTS 設定、配信コメント、Screen Vision、ソロ配信表示に対応

## 起動

```bash
cd packages/core/examples/react-purupuru-app
npm install
npm run dev
```

起動すると、同梱のミコアバターが自動で読み込まれます。別の
`.purupuru` ファイルを使う場合は、Settings を開き、Visual セクションから
ファイルを選択してください。読み込みに失敗した場合は、アバターパッケージが
読み込まれるまで Canvas には何も描画されません。

自分で `.purupuru` アバターを作ってみたい場合は、ぷるぷるPNGTuber 用の
ImageGen ベースの[アセット制作キット](https://github.com/shinshin86/PuruPuruPNGTuber/tree/codex/add-imagegen-asset-production-kit/asset-production)も参考になるかもしれません。

アバターは Canvas 上でドラッグして位置を調整できます。マウスホイールで拡大・
縮小し、Canvas をダブルクリックするか Visual セクションの
`アバター位置をリセット` ボタンを押すと初期位置に戻ります。ドラッグ位置と
ズーム倍率は再読み込み後も保持されます。

## 同梱デフォルトアバター

このサンプルアプリには、AITuber OnAir 公式キャラクター「ミコ」の
`public/avatar/miko.purupuru` が含まれています。ミコは起動時にデフォルト
アバターとして自動で読み込まれます。

Settings > Visual から別の `.purupuru` パッケージを選ぶと、表示中のミコと
入れ替わります。ユーザーが選択したパッケージを表示しているときに
`クリア` を押すと、同梱のミコに戻ります。ミコを表示している間は
`クリア` ボタンは表示されません。

同梱のミコアバターの著作権は AITuber OnAir / shinshin86 に帰属します。この
アバターは、このサンプルアプリで使用するために含まれています。アバター画像を
抽出して再配布したり、自分のキャラクターとして再利用したり、AI やモデルの
学習に使用したりしないでください。

## 検証

```bash
npm run build
npm run lint
```

## 対応フォーマット

このサンプルアプリは、format version 1 の uncompressed ZIP (`ZIP_STORED`) の
`.purupuru` パッケージを読み込みます。圧縮 ZIP、過大なファイル、危険なパス、
CRC32 が一致しないファイルは拒否します。

`hairSpring` が `0` の場合、髪の物理表現は無効になり、髪は頭部に固定されます。
髪スロットに配置されたアイテムレイヤーは、`followStrength` (`0`-`200`) に
応じて髪の揺れに追従します。

アイテムレイヤーのスロットは、ぷるぷるPNGTuber の描画順に合わせて
`stageBack`, `characterBack`, `faceBack`, `faceFront`, `frontHairFront`,
`stageFront` に対応しています。未知のスロットは、将来のパッケージ出力でも
表示できるように `frontHairFront` として扱います。

このサンプルアプリは、face tracking、mesh deformation、OBS preset export には
対応していません。

## Emotion reactions

Core は `[happy]` などの emotion tag を `screenplay = { emotion, text }` に
変換し、`SPEECH_START` で通知します。このサンプルアプリはその時点で
リアクションの内容を保持し、TTS 音声が実際に再生を始めるタイミングで
アバターへ適用します。

| Emotion | Reaction |
| --- | --- |
| `happy` | 髪が大きめに弾み、少し上向きになり、軽く拡大する |
| `surprised` | 素早く傾き、髪が弾み、軽く拡大する |
| `sad` | うつむき気味の姿勢になり、待機モーションが柔らかくなる |
| `angry` | 短く揺れ、待機モーションが速くなる |
| `relaxed` | ゆっくり柔らかい待機モーションと小さな揺れを追加する |
| `neutral` | 追加のリアクションなし |

対応関係は `src/lib/purupuruReactions.ts` で調整できます。持続姿勢や瞬間的な
動きの処理は `src/lib/purupuruRenderer.ts` にあります。

## Idle gaze

読み込まれたアバターは、待機中にときどき左右へ軽く向きを変えます。この動きは
呼吸や揺れと同じ目標姿勢に入るため、既存の pose easing と髪の spring によって
自然な揺れになります。描画時には顔、前髪、後ろ髪に異なる水平パララックスを
かけ、顔が最も大きく、後ろ髪が最も小さく動きます。

視線移動のスケジュールは `src/lib/idleGaze.ts`、向きやパララックスの比率は
`src/lib/purupuruRenderer.ts` で調整できます。

## Motion tuning

`src/lib/purupuruRenderer.ts` のレンダラー定数:

| Value | Default | 大きくすると |
| --- | ---: | --- |
| `GAZE_TURN_OFFSET_RATIO` | `0.014` | 待機中の視線移動で頭と顔の横移動が大きくなる |
| `GAZE_TURN_TILT` | `0.026` | 待機中の視線移動で頭の傾きが大きくなる |
| `FACE_PARALLAX_RATIO` | `0.034` | 顔レイヤーのパララックスが大きくなる |
| `FRONT_HAIR_PARALLAX_RATIO` | `0.01` | 前髪が視線移動により強く追従する |
| `BACK_HAIR_PARALLAX_RATIO` | `0.006` | 後ろ髪が視線移動により強く追従する |

奥行きが自然に見えるよう、パララックスは `face > frontHair > backHair` の順に
するのがおすすめです。

`src/lib/idleGaze.ts` のスケジューラー定数:

| Value | Default | 大きくすると |
| --- | ---: | --- |
| `MIN_WAIT_SECONDS` / `MAX_WAIT_SECONDS` | `5` / `14` | 視線移動の発生頻度が下がる |
| `MIN_HOLD_SECONDS` / `MAX_HOLD_SECONDS` | `0.6` / `1.8` | 視線を向けたまま保持する時間が長くなる |
| `FULL_TURN_MIN` / `FULL_TURN_MAX` | `0.65` / `1` | 大きな視線移動が左右へ広がる |
| `SMALL_TURN_MAX` / `SMALL_TURN_CHANCE` | `0.3` / `0.3` | 小さな視線移動の幅が広がる / 発生しやすくなる |

パッケージの `settings.json` で使われる値:

| Value | 大きくすると |
| --- | --- |
| `breathStrength` | 縦方向の呼吸モーションが強くなる |
| `rollStrength` | 横揺れと頭の roll が強くなる |
| `hairSpring` | 髪の遅れと弾みが目立つ |
| `avatarSize` | アバターが大きく描画される |
| `avatarX` | アバターが右へ移動する |
| `avatarY` | アバターが下へ移動する |
| `idleMotionEnabled` | 実行時は Visual 設定が優先されます。camera tracking 前提のパッケージでは `false` で出力されることがあります |
| `faceParallaxRatio` | このアバターの `FACE_PARALLAX_RATIO` を上書きする。有効範囲は `0`-`0.1` |
| `frontHairParallaxRatio` | このアバターの `FRONT_HAIR_PARALLAX_RATIO` を上書きする。有効範囲は `0`-`0.1` |
| `backHairParallaxRatio` | このアバターの `BACK_HAIR_PARALLAX_RATIO` を上書きする。有効範囲は `0`-`0.1` |

表示中の `itemLayers` は `followStrength` (`0`-`200`) に応じて髪の spring
transform に追従します。

## Attribution

`.purupuru` パッケージ形式とレンダラーの挙動は、rotejin さんが開発された
[ぷるぷるPNGTuber](https://github.com/rotejin/PuruPuruPNGTuber)
（Apache-2.0）によるものです。表情差分 PNG に前髪・後ろ髪のレイヤーを
組み合わせてリッチな PNGTuber を作れるローカル Web アプリで、このサンプルは
それを AITuber 用途向け（カメラトラッキングなし）に移植・再実装したものです。
素晴らしい本家プロジェクトに感謝します。このサンプルアプリは、パッケージ読み込み、
表情選択、待機モーション、髪の物理表現、emotion reactions、アイテムレイヤー、
ドラッグとズームによる配置調整、まばたき、音声に合わせた口パクに対応しています。

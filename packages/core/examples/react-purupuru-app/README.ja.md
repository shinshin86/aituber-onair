# PuruPuru PNGTuber Chat

`@aituber-onair/core` のチャット/TTS と、`.purupuru` アバターパッケージ用
PNGTuber レンダラーを組み合わせた React example です。

## 機能

- Settings の Visual セクションから `.purupuru` パッケージを読み込み
- 目 2 状態 x 口 3 状態の 6 face PNG を描画
- back hair、face、front hair、任意の item layer を Canvas で合成
- `settings.json` の breath/roll 設定に基づく待機モーション
- front/back hair に spring-driven な遅れと bounce を適用
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

## 検証

```bash
npm run build
npm run lint
```

## 対応フォーマット

この example は format version 1 の uncompressed ZIP (`ZIP_STORED`) のみを
読み込みます。圧縮 ZIP、過大サイズ、危険なパス、CRC32 不一致は拒否します。

`hairSpring` が `0` の場合、hair physics は無効になり、髪は頭部に固定され
ます。Hair slot の item layer は `followStrength` (0-100) に応じて spring
transform に追従します。

現フェーズでは face tracking、mesh deformation、OBS preset export は対象外です。

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

## Attribution

`.purupuru` フォーマットとレンダラー挙動は Apache-2.0 ライセンスの
PuruPuruPNGTuber を参考にしています。この example では Phase 1 に必要な
package loading、face-state selection、idle motion、blink、audio mouth-state
behavior のみを移植しています。

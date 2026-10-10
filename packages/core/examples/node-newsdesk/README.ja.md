# Node Newsdesk

JSON台本から縦型ニュース動画を生成します。元の記事やメモから、AITuber OnAir Coreで台本を作ることもできます。同じ台本のまま、`--avatar`でPNGTuber・Purupuru・Mesh・VRM・Live2D・Inochi2Dを切り替えられます。

[English](README.md)

## セットアップと動画生成

Node.js 22以降と、PATH上の`ffmpeg`が必要です。

```bash
npm install
npm run build
npm run gen -- --script samples/hello-sine.json --output work/pngtuber.mp4
npm run gen -- --script samples/hello-sine.json --avatar purupuru --output work/purupuru.mp4
npx playwright install chromium
npm run gen -- --script samples/hello-sine.json --avatar mesh --output work/mesh.mp4
npm run gen -- --script samples/hello-sine.json --avatar vrm --output work/vrm.mp4
npm run gen -- --script samples/hello-sine.json --avatar inochi2d --output work/inochi2d.mp4
```

サンプルの音声は決定的なサイン波で、APIキーは不要です。出力は1080 × 1920、30 fpsです。MP4と同じ場所に、ナレーションWAV・時刻情報JSON・描画設定JSONを保存します。アバターの初期値はPNGTuberです。

PNGTuberとPurupuruはNodeのネイティブCanvas2Dで描画し、Playwrightの読み込みやChromiumの起動を行いません。MeshはWebGLアバターと共通のCanvas2D画面をヘッドレスChromium内で描画します。上記のChromiumインストールはMesh・VRM・Live2D・Inochi2Dを使う場合に必要です。VRMは隣接する`react-vrm-app/public/avatar/miko.vrm`と`idle_loop.vrma`を初期アセットとして使います。Live2Dは利用者がモデルとCubism Coreのパスを指定します（下記参照）。Inochi2Dは隣接する`react-inochi2d-app/public/inochi2d`のruntime・Akaモデル・モーションを使います。ブラウザアダプターは共通画面をページ内で描画します。

画面にはニュースパネル、章の進行表示、キーワード、感情に合わせた効果、カラオケ字幕、ティッカー、開始・終了タイトルが表示されます。PNGTuberは口・目の4状態と呼吸・傾き、Purupuruは口の3状態と瞬き・呼吸・傾き・髪の揺れに対応します。この2種類の表情画像は元のままで、台詞の感情は画面効果に反映されます。

Meshは表情と予定された動作にも対応します。隣接する`react-mesh-avatar-app`のフレームワーク非依存エンジンとqipaoアセットを読み取り専用で利用するため、そのディレクトリが必要です。VRMは音声RMSによる口パク、seedに基づく瞬き、VRMAアニメーション、モデルが持つ感情表情に対応します。未対応の感情は通常の表情で表示し、画面の名前付き動作は選択したVRMAループを置き換えません。

Live2Dは音声RMSによる口パク、seedに基づく瞬き、固定したIdleモーションに対応し、撮影前にモデルを安定させます。台詞の感情と名前付き動作は共通画面に反映し、モデルは選択したIdleを続けます。Inochi2Dは未改変のWASMブリッジで、音声RMSの口パク、seedに基づく瞬き、idleループを描画します。台詞の感情と名前付き動作は共通画面に反映します。

## アバター設定

設定は台本とは別のJSONに書き、`--avatar-config avatar.json`で指定します。台本にはアバター設定を含めません。

```json
{
  "model": "assets/my-avatar",
  "scale": 1,
  "x": 0.5,
  "y": 0.5,
  "intensity": 1
}
```

`model`は設定ファイルからの相対パスです。PNGTuberでは4枚のPNGを持つディレクトリ、Purupuruでは`.purupuru`ファイル、Meshでは`manifest.json`を持つアセットディレクトリ、VRMでは`.vrm`、Live2Dでは`.model3.json`、Inochi2Dでは`.inx`を指定します。PNGTuber・Purupuru・Mesh・VRMでは省略すると初期のMikoアセットを使います。Live2DはモデルとCoreのパスを明示する必要があります。Inochi2Dは隣接する`react-inochi2d-app/public/inochi2d`のAkaモデル・モーション・runtimeを初期値として参照します。

`scale`は0.1〜3、`x`と`y`は660 × 700のアバター枠内の位置（0〜1）、`intensity`は0〜3です。不明な項目や不正な値はエラーになります。検証と初期値は各アダプターで定義しています。Meshは`intensity`の代わりに`padTop`・`padSide`・`talkGain`を受け取ります。

| アバター | 初期配置 | 固有設定 |
| --- | --- | --- |
| PNGTuber | `scale: 1`, `x: 0.5`, `y: 0.5` | `intensity: 1`（0〜3） |
| Purupuru | `scale: 1.5`, `x: 0.5`, `y: 0.65` | `intensity: 1`（0〜3） |
| VRM | `scale: 1`, `x: 0.5`, `y: 0.5` | `animation`、`intensity: 1`（0〜3）、`framing`、`lighting`（下記参照） |
| Live2D | `scale: 1`, `x: 0.5`, `y: 0.5` | `cubismCore`、`intensity: 1`（0〜3）、`framing`、`idleMotionGroup`、`warmupSeconds: 3`（0〜30） |
| Inochi2D | `scale: 1`, `x: 0.5`, `y: 0.5` | `runtime`・`motion`・`idleAnimation`・`intensity: 1`（0〜3）・`framing`（下記参照） |
| Mesh | `scale: 1`, `x: 0.5`, `y: 0.5` | `padTop: -0.07`（-0.5〜1）、`padSide: -0.18`（-0.45〜1）、`talkGain: 0.55`（0〜3） |

Purupuruは上半身を大きく表示します。Meshのpaddingは元画像の切り取り範囲、`talkGain`は音声に伴う体の動きの強さを調整します。

```json
{ "padTop": -0.07, "padSide": -0.18, "talkGain": 0.55 }
```

### VRM設定

```json
{
  "model": "avatar/miko.vrm",
  "animation": "avatar/idle_loop.vrma",
  "intensity": 1,
  "framing": { "visibleHeightRatio": 0.32, "lookAtHeightRatio": 0.84 },
  "lighting": { "ambientIntensity": 1.4, "directionalIntensity": 2.35 }
}
```

`animation`は設定ファイルからの相対パスです。省略すると初期のidleループを使い、`null`にするとアニメーションを読み込みません。`intensity`はアニメーションと物理演算の時計を0〜3倍に調整します。0ではポーズを固定し、口パクと瞬きは続けます。

`framing.visibleHeightRatio`はズーム（0.05〜2、小さいほど寄る）、`lookAtHeightRatio`はカメラが向く高さ（0〜1.5、小さいほどモデルが上へ移動）を指定します。カメラ設定の後に、アバター枠内のscaleと位置を適用します。環境光・指向性ライトの強さはそれぞれ0〜10です。

初期の構図は、頭部と上半身が共通のアバター枠を満たすように調整しています。光量単位、腰の移動を除く処理、固定時間刻みは旧VRMレンダラーを引き継いでいます。描画ライブラリはthree.js `0.182.0`、`@pixiv/three-vrm` `3.4.5`、`@pixiv/three-vrm-animation` `3.4.5`に固定しています。

### Live2D設定と必要ファイル

利用許諾を確認したCubism 4の`.model3.json`と参照先一式、ローカルの`live2dcubismcore.min.js`が必要です。このサンプルはCoreもLive2Dモデルも同梱・ダウンロードしません。[Live2D公式ダウンロードページ](https://www.live2d.com/sdk/download/web/)から、使用許諾を確認・同意したうえでCubism SDK for Webを取得し、`Core/live2dcubismcore.min.js`を使います。Coreを直リンクしないでください。

台本とは別に設定を保存します。例えば`work/live2d.json`に次を書き、手元のファイルパスへ置き換えます。

```json
{
  "model": "/path/to/model/runtime/model.model3.json",
  "cubismCore": "/path/to/CubismSdkForWeb/Core/live2dcubismcore.min.js",
  "framing": { "scale": 2.5, "x": 0.5, "y": 0.4 },
  "idleMotionGroup": "Idle",
  "warmupSeconds": 3,
  "intensity": 1
}
```

```bash
npm run gen -- --script samples/hello-sine.json --avatar live2d \
  --avatar-config work/live2d.json --output work/live2d.mp4
```

パスは設定ファイル相対、絶対パス、`~/`始まりを使えます。隣接する`react-live2d-app/public/scripts/`に既存のCoreがある場合は、明示的なパスで参照できます。そのドロップはgitignore済みです。必要なファイルはこのサンプルの外に保管し、設定から参照してください。Coreまたはモデルがなければ、Chromiumを起動する前にエラーを返します。

`framing`は共通のscale・位置を適用する前のモデル変換です。バストアップの初期値は`scale: 2.5`・`x: 0.5`・`y: 0.4`で、scaleは0.1〜5、xとyは0〜1を受け付けます。`idleMotionGroup`は初回と再開時のモーションをindex 0に固定します。省略または`null`では、存在する`Idle`を使います。

`warmupSeconds`はフレーム0より前に撮影せずモデルを更新する時間です。動画のフレーム数は増やしません。`intensity`は撮影開始後のアニメーション速度を0〜3倍にし、0では安定したポーズを固定します。口パクとseedに基づく瞬きは続けます。

ページは利用者指定のCoreを先に読み、Cubism 4レンダラーを読み込みます。PixiJSと表示プラグインはLive2D選択時だけ読み込みます。依存は旧Live2Dサンプルと同じPixiJS `^7.4.3`と、`pixi-live2d-display-lipsyncpatch`の`release/v0.5.0-ls-7-noMaskFix`です。ループバックサーバーはハーネス、指定Core、モデルの親ディレクトリ以下を配信し、パストラバーサルとシンボリックリンクによる脱出を拒否します。

Live2D公式サンプルモデルで作った動画を公開する場合は、[無償提供マテリアルの使用許諾契約書](https://www.live2d.com/eula/live2d-free-material-license-agreement.html)と[Live2D Cubismサンプルデータ利用条件](https://www.live2d.com/eula/live2d-sample-model-terms.html)の両方を確認し、利用者・事業者区分の条件や必要な著作権表示に従ってください。

### Inochi2D設定

初期値は`react-inochi2d-app/public/inochi2d`のruntime、`Aka.original-rig.inx`、`Aka.original.motion.json`を読み取り専用で参照します。モデルやruntimeはコピー・ダウンロードしません。隣接するディレクトリを保持するか、設定ファイル相対・絶対パス・`~/`始まりのパスを指定してください。

```json
{
  "model": "models/avatar.inx",
  "runtime": "runtime",
  "motion": "models/avatar.motion.json",
  "idleAnimation": "original_idle_calm_breath",
  "intensity": 1,
  "framing": { "scale": 0.4, "x": 0, "y": 1800 }
}
```

`runtime`には`inochi_bridge.js`・`inochi2d.js`・`inochi2d_bg.wasm`・`secondary_motion.js`が必要です。runtime・モデル・モーションがなければChromium起動前にエラーを返します。`motion: null`で外部モーションを読み込まず、`idleAnimation: null`でidleループの開始を省略します。`intensity`は旧レンダラーと同じidleの重み（0〜3）で、速度は変えません。0でもブリッジの二次物理演算は続きます。

`framing`は共通のscale・位置を適用する前のカメラ変換です。scaleは0.05〜2、xとyはモデル空間のピクセル単位（-10000〜10000）です。初期値は`scale: 0.4`・`x: 0`・`y: 1800`で、耳を含む頭部と上半身が共通枠に収まる構図です。旧版の全画面表示は0.65・0・1450でした。

ブリッジをimportする前に、rAFキュー・`performance.now()`・`Date.now()`・`Math.random()`をseedに基づく仮想時計へ置き換えます。各フレームで`1 / 30`秒だけ進め、ブリッジを1回更新して次フレームの予約が1件であることを確認します。更新中に予約されたrAFは次フレームまで待ちます。口は`Mouth:: Shape`のvec2、瞬きは`setEyeBlinkValue`を優先し、終了時には元の時計APIへ戻します。

## 台本生成

```bash
npm run script-gen -- notes.md --output work/script.json --dry-run
npm run script-gen -- notes.md --output work/script.json
npm run gen -- --script work/script.json --avatar purupuru --output work/news.mp4
```

初期プロバイダーはCoreの`codex-sdk`で、ローカルのCodexログインを使います。APIプロバイダーの`openai`・`claude`・`gemini`は、それぞれ`OPENAI_API_KEY`・`ANTHROPIC_API_KEY`・`GEMINI_API_KEY`環境変数を使います。生成時には台本のスキーマと、数値の主張が原文にあるかを検証します。[台本形式](docs/script-format.md)も参照してください。

音声エンジンは`sine`、macOSの`say`、`aituber-voice`です。`aituber-voice`は`voice.options`をCoreの`VoiceEngineAdapter`へ渡します。認証情報は台本に保存しないでください。

## フレーム確認とフォント

```bash
npm run gen -- --script samples/hello-sine.json --dry-run --output work/news.mp4
npm run gen -- --script samples/hello-sine.json --render-only --output work/news.mp4
npm run gen -- --script samples/hello-sine.json --frame 60 --png work/frame60.png
```

`--dry-run`は音声と時刻情報だけを生成します。`--render-only`はそれらを再利用し、`--avatar`と`--avatar-config`で今回の描画方法を選びます。ネイティブアダプターは指定フレームへ直接移動できます。ブラウザアダプターはフレーム0から再生して指定フレームを保存します。共通画面には音声履歴を明示的に渡し、Purupuruの物理演算は仮想時計で事前計算するため、フレームの描画順に結果が左右されません。

ネイティブCanvas2Dはシステムフォントを使います。macOSではヒラギノを利用できます。LinuxではNoto Sans JPまたはNoto Sans CJK JPをインストールし、認識されない場合は`NEWSDESK_FONT_PATH=/path/to/NotoSansJP.ttf`を指定してください。Chromiumにも日本語対応のシステムフォントが必要です。`NEWSDESK_FONT_PATH`はネイティブCanvas2Dにのみ適用されます。

## アセットと利用条件

| アバター | アセット | 利用条件 | クレジット |
| --- | --- | --- | --- |
| PNGTuber | 同梱のMiko 4状態PNG | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Purupuru | 同梱の`miko.purupuru` | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| VRM | 隣接する`react-vrm-app/public/avatar/miko.vrm` | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Mesh | 隣接する`react-mesh-avatar-app/public/avatar/qipao` | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Inochi2D | 隣接する派生Akaモデル・モーション | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Aka / seagetch（下記参照） |

MikoはAITuber OnAirの公式キャラクターです。[Mikoキャラクター利用ガイドライン](https://miko.aituberonair.com/#terms)の日本語版を正式な利用条件として参照してください。PSDは、このサンプルではまだ利用できません。初期VRMAループは`react-vrm-app`が[`pixiv/ChatVRM`](https://github.com/pixiv/ChatVRM)のアセットから流用したものです。アニメーション自体を再配布する場合は、そのライセンスを確認してください。隣接するモデルとアニメーションは、このサンプル内には複製していません。

## Aka のクレジット

この例は `react-inochi2d-app` に同梱された派生 Aka ファイルを参照します。

- Title: Aka
- Author: seagetch
- Source: https://github.com/Inochi2D/example-models
- License: Creative Commons Attribution 4.0 International
- License URL: https://creativecommons.org/licenses/by/4.0/

参照ファイルは `Aka.original-rig.inx` と `Aka.original.motion.json` です。
この同梱版は AITuber OnAir Inochi2D 例向けに調整されています。変更点は、
ブラウザ描画向け rig 調整、アバター動作用 helper rig、idle motion の調整、
`public/inochi2d/manifest.json` による motion metadata 設定です。元モデルの
クレジットとライセンスは sibling の `Aka.ATTRIBUTION.md` に保持されています。

## 開発時の確認

```bash
npm run fmt
npm run lint
npm run typecheck
npm run test
npm run build
```

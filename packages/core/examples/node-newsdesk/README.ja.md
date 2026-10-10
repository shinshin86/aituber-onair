# Node Newsdesk

JSON台本から縦型ニュース動画を生成します。元の記事やメモから、AITuber OnAir Coreで台本を作ることもできます。同じ台本のまま、`--avatar`でPNGTuber・Purupuru・Meshを切り替えられます。

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
```

サンプルの音声は決定的なサイン波で、APIキーは不要です。出力は1080 × 1920、30 fpsです。MP4と同じ場所に、ナレーションWAV・時刻情報JSON・描画設定JSONを保存します。アバターの初期値はPNGTuberです。

PNGTuberとPurupuruはNodeのネイティブCanvas2Dで描画し、Playwrightの読み込みやChromiumの起動を行いません。MeshはWebGLアバターと共通のCanvas2D画面をヘッドレスChromium内で描画します。上記のChromiumインストールはMeshを使う場合に必要です。

画面にはニュースパネル、章の進行表示、キーワード、感情に合わせた効果、カラオケ字幕、ティッカー、開始・終了タイトルが表示されます。PNGTuberは口・目の4状態と呼吸・傾き、Purupuruは口の3状態と瞬き・呼吸・傾き・髪の揺れに対応します。この2種類の表情画像は元のままで、台詞の感情は画面効果に反映されます。

Meshは表情と予定された動作にも対応します。隣接する`react-mesh-avatar-app`のフレームワーク非依存エンジンとqipaoアセットを読み取り専用で利用するため、そのディレクトリが必要です。

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

`model`は設定ファイルからの相対パスです。PNGTuberでは4枚のPNGを持つディレクトリ、Purupuruでは`.purupuru`ファイル、Meshでは`manifest.json`を持つアセットディレクトリを指定します。省略すると各アダプターのMikoアセットを使います。

`scale`は0.1〜3、`x`と`y`は660 × 700のアバター枠内の位置（0〜1）、`intensity`は0〜3です。不明な項目や不正な値はエラーになります。検証と初期値は各アダプターで定義しています。Meshは`intensity`の代わりに`padTop`・`padSide`・`talkGain`を受け取ります。

| アバター | 初期配置 | 固有設定 |
| --- | --- | --- |
| PNGTuber | `scale: 1`, `x: 0.5`, `y: 0.5` | `intensity: 1`（0〜3） |
| Purupuru | `scale: 1.5`, `x: 0.5`, `y: 0.65` | `intensity: 1`（0〜3） |
| Mesh | `scale: 1`, `x: 0.5`, `y: 0.5` | `padTop: -0.07`（-0.5〜1）、`padSide: -0.18`（-0.45〜1）、`talkGain: 0.55`（0〜3） |

Purupuruは上半身を大きく表示します。Meshのpaddingは元画像の切り取り範囲、`talkGain`は音声に伴う体の動きの強さを調整します。

```json
{ "padTop": -0.07, "padSide": -0.18, "talkGain": 0.55 }
```

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

`--dry-run`は音声と時刻情報だけを生成します。`--render-only`はそれらを再利用し、`--avatar`と`--avatar-config`で今回の描画方法を選びます。ネイティブアダプターは指定フレームへ直接移動できます。Meshはフレーム0から再生して指定フレームを保存します。共通画面には音声履歴を明示的に渡し、Purupuruの物理演算は仮想時計で事前計算するため、フレームの描画順に結果が左右されません。

ネイティブCanvas2Dはシステムフォントを使います。macOSではヒラギノを利用できます。LinuxではNoto Sans JPまたはNoto Sans CJK JPをインストールし、認識されない場合は`NEWSDESK_FONT_PATH=/path/to/NotoSansJP.ttf`を指定してください。Chromiumにも日本語対応のシステムフォントが必要です。`NEWSDESK_FONT_PATH`はネイティブCanvas2Dにのみ適用されます。

## アセットと利用条件

| アバター | アセット | 利用条件 | クレジット |
| --- | --- | --- | --- |
| PNGTuber | 同梱のMiko 4状態PNG | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Purupuru | 同梱の`miko.purupuru` | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |
| Mesh | 隣接する`react-mesh-avatar-app/public/avatar/qipao` | [Miko利用条件](MIKO_ASSET_TERMS.md) | © Yuki Shindo (AITuber OnAir) |

MikoはAITuber OnAirの公式キャラクターです。[Mikoキャラクター利用ガイドライン](https://miko.aituberonair.com/#terms)の日本語版を正式な利用条件として参照してください。他のアバター形式は、このサンプルではまだ利用できません。

## 開発時の確認

```bash
npm run fmt
npm run lint
npm run typecheck
npm run test
npm run build
```

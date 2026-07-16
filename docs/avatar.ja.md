# アバターガイド

[English version](./avatar.md)

AITuber OnAir は、チャットや音声の裏側だけを扱うツールキットではありません。
PNG / ぷるぷるPNGTuber / VRM / Live2D / Pet などのアバター表現を
組み合わせて、より豊かな AI キャラクター体験を作るための入口にもなります。

このガイドでは、どのアバター方式から始めるとよいか、表現力を増やしたい
場合にどこを拡張するとよいかをまとめます。

## アバター方式

### PNGTuber

軽量な 2D アバターを最短で動かしたい場合に向いています。
PNGTuber サンプルでは、次の4状態画像を使います。

- 目開き / 口閉じ
- 目開き / 口開き
- 目閉じ / 口閉じ
- 目閉じ / 口開き

まずは
[`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app)
を参照してください。

### ぷるぷるPNGTuber

トラッキングや 3D アセットを用意せずに、よく動く 2D アバターを使いたい場合に
向いています。6状態の表情画像と前髪・後ろ髪レイヤーを 1 つの `.purupuru`
パッケージにまとめ、サンプルがアイドルモーション・まばたき・音声リップシンク・
髪のバネ物理・振り向き・感情リアクションを駆動します。AITuber OnAir 公式
キャラクター「ミコ」をデフォルトアバターとして同梱しています。アバター形式と
モーション表現は rotejin さんが開発された
[ぷるぷるPNGTuber](https://github.com/rotejin/PuruPuruPNGTuber) によるものです。

まずは
[`packages/core/examples/react-purupuru-app`](../packages/core/examples/react-purupuru-app)
を参照してください。

自分で `.purupuru` アバターを作ってみたい場合は、後述する ImageGen ベースの
素材制作キットも利用できます。

### VRM

3D アバター、カメラ操作、待機モーション、リップシンク、表情プリセットを
使いたい場合に向いています。VRM サンプルはローカルの `.vrm` モデルを
表示し、応答の感情タグに応じて利用可能な表情を適用できます。

まずは
[`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)
を参照してください。

### Live2D

すでに Cubism のモデルフォルダを持っていて、モデル側の動きを活かした
2D キャラクターを表示したい場合に向いています。このサンプルでは、
利用条件を確認済みの `.model3.json` を含むモデルフォルダを自分で用意して
読み込みます。

まずは
[`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app)
を参照してください。

### Pet

人型アバターではなく、小さな相棒キャラクターを使いたい場合に向いています。
Codex Pet 互換のスプライトシートを使い、チャット状態、応答の雰囲気、
音声ボリュームに応じてアニメーションを切り替えます。

まずは
[`packages/core/examples/react-pet-app`](../packages/core/examples/react-pet-app)
を参照してください。

## アバター表現の拡張

AITuber OnAir のサンプルは、チャットや音声のパイプラインを大きく変えずに、
より表現力のあるアバターアセットへ差し替えられるようにしています。

## 関連ツール: ぷるぷるPNGTuber 素材制作キット

[ぷるぷるPNGTuber 素材制作キット](https://github.com/shinshin86/PuruPuruPNGTuber/tree/codex/add-imagegen-asset-production-kit/asset-production)
は、ImageGen や手作業で作ったキャラクター画像を、ぷるぷるPNGTuber が
期待するレイヤー構成へそろえるための制作フローです。

キャラクター仕様書、ImageGen 用プロンプト雛形、アセットチェックリスト、
レイアウトガイドを使って、目 2 状態 x 口 3 状態の表情差分、前髪、後ろ髪の
必須8枚を制作します。必要に応じて髪飾り、帽子、メガネ、ボディなどを
`items/` レイヤーとして追加するための雛形も含まれています。

完成した素材は、透過 PNG、同一キャンバス、同一座標へそろえます。検査
ハーネスでは、必須ファイル、PNG 形式、キャンバスサイズ、透過、表情差分の
境界ずれなどを確認し、全レイヤーを並べたコンタクトシートとレビュー JSON を
生成できます。Codex と ImageGen に、キャラクター設計から素材制作、検査、
`.purupuru` パッケージ作成までを依頼するためのプロンプト例も用意されています。

自動検査だけでは、前髪と後ろ髪が意味どおりに分離されているか、表情ごとの
絵柄が揃っているか、変形時に自然に見えるかまでは判断できません。最終的には
ぷるぷるPNGTuber のブラウザ画面で確認・調整してください。完成した
`.purupuru` パッケージは、AITuber OnAir のぷるぷるPNGTuber サンプルを起動し、
Settings の Visual セクションから選択できます。

生成画像、元画像、参照画像、小物素材の権利や利用条件は、制作キットの
ライセンスとは別に確認してください。

VRM アバターの場合、同梱サンプルは読み込んだ VRM が提供していれば
`happy`, `sad`, `surprised`, `relaxed`, `mouthSmileLeft`,
`mouthSmileRight`, `browInnerUp` や目まわりの表情を利用できます。
未対応の表情は無視してフォールバックするため、基本的な VRM でも動きますが、
表情が豊かな VRM を用意すると、応答時のリアクションがより自然になります。

## 関連ツール: VRM Expression Agent Harness

[VRM Expression Agent Harness](https://github.com/shinshin86/vrm-expression-agent-harness)
は、Codex や Claude Code を使って VRM の表情をモデルごとに拡張するための
関連リポジトリです。

VRM ファイルの内部を検査し、利用可能な morph target を確認し、
コードから扱いやすい表情プリセットを作成し、ローカル WebUI で検証し、
変更内容をドキュメント化する用途に向いています。

たとえば次のような表情を持つ VRM を用意したい場合に利用できます。

- `happy`, `angry`, `sad`, `relaxed`, `surprised` などの感情プリセット
- `aa`, `ih`, `ou`, `ee`, `oh` などの viseme
- まばたき用の表情
- `jawOpen`, `mouthSmileLeft`, `mouthFrownRight`, `eyeWideLeft`,
  `browInnerUp` などの ARKit 風パーツ

この harness は汎用の一括変換ツールではありません。表情の品質は、
VRM モデルごとの mesh 構造、morph target 名、既存の expression clip、
ライセンス条件に依存します。そのため、モデルごとに検査・計画・生成・検証する
workflow を前提にしています。

拡張済み VRM を用意したら、VRM サンプルの `public/avatar/` に配置し、
必要に応じて読み込みパスを変更してください。

## 関連ツール: Live2D モーション追加サンプル WebUI

[live2d-add-motion-sample-web-ui](https://github.com/shinshin86/live2d-add-motion-sample-web-ui)
は、Cubism Editor を使わずに、既存の Live2D モデルが持つパラメータの
範囲内で `.motion3.json` モーションを生成・登録し、ブラウザで再生確認する
ための関連リポジトリです。

モデルのパラメータ、安全な値域、物理演算が管理する出力を分析し、モデルごとの
定義からモーションを生成します。生成結果は独立したバリデータで検証でき、
ヘッドレス Chrome でピーク時のポーズを撮影して見た目も確認できます。
Codex や Claude Code などの AI エージェント向け作業ガイドも含まれており、
モデルの配置からモーション設計、生成、検証までを依頼できます。

このツールは、モデルに新しいパラメータ、リグ、メッシュを追加するものでは
ありません。作成できる動きとその品質は、モデルがすでに持つパラメータや
既存モーションに依存し、モデルごとにモーション定義を用意する必要があります。

モーションを生成・検証したら、生成済みの `.model3.json` と参照先アセットを
含むモデルフォルダ一式を
[`packages/core/examples/react-live2d-app/models/`](../packages/core/examples/react-live2d-app/models/)
配下へ配置してください。モデルデータや参照素材を移動、改変、公開、再配布する
前に、それぞれの利用条件も確認してください。

## 関連リソースと利用条件の確認

各アバター方式の背景にある形式、ツール、関連プロジェクトです。
アバター素材を利用、改変、公開、再配布する前に、使用するツール、モデル、
サンプルデータ、元画像それぞれの条件を確認してください。

| アバター方式 | 関連リソース | 補足 |
|---|---|---|
| PNGTuber | [Easy PNGTuber](https://github.com/rotejin/EasyPNGTuber) | PNGTuber 用の4状態画像を用意できる MIT ライセンスのツールです。ツールのライセンスと、元画像や生成・加工後のアバター素材の権利は別なので、それぞれ確認してください。 |
| ぷるぷるPNGTuber | [ぷるぷるPNGTuber](https://github.com/rotejin/PuruPuruPNGTuber) | rotejin さんが開発された Apache-2.0 のローカル Web アプリで、表情差分 PNG と前髪・後ろ髪レイヤーからリッチな PNGTuber を作れます。AITuber OnAir のサンプルは、その形式とモーションの AITuber 向け移植です。ツールのライセンスと、元画像や生成・加工後のアバター素材の権利は別なので、それぞれ確認してください。 |
| VRM | [vrm.dev](https://vrm.dev/) | glTF ベースの 3D 人型アバターフォーマットである VRM の公式情報です。個別の `.vrm` モデルには、モデル固有のライセンス情報や外部の利用条件がある場合があります。 |
| Live2D | [Live2D](https://www.live2d.com/) | Cubism ツールと SDK の公式サイトです。モデル素材、サンプルデータ、Cubism Editor、Cubism SDK は条件が分かれるため、[サンプルデータ利用条件](https://www.live2d.com/learn/sample/model-terms/) や [SDK Release License](https://www.live2d.com/sdk/license/) も確認してください。 |
| Pet | [Codex Pets](https://developers.openai.com/codex/app/settings#codex-pets) | Codex Pets は Codex app の任意アニメーション相棒キャラクターです。AITuber OnAir の Pet サンプルは Codex Pet 互換のスプライトシート形式を使います。作成・加工・配布するスプライトシート素材の権利は別途確認してください。 |

## すぐ使える Miko 素材

AITuber OnAir を試したいが、まだアバター素材を持っていない場合は、
AITuber OnAir のイメージキャラクターである Miko の素材を利用できます。

[ミコ キャラクター利用ガイドラインとダウンロード](https://miko.aituberonair.com/)

このページでは、VRM モデル、PNGTuber 表情セット、三面図などを配布しています。
また、ぷるぷるPNGTuber サンプルには、すぐに使えるミコの `.purupuru`
パッケージがデフォルトアバターとして同梱されています。
リンク先のガイドラインページに、現在の許可範囲、禁止事項、クレジット表記、
再配布条件が記載されています。利用・改変・共有・再配布の前に、必ず最新の
ページ内容を確認してください。

## ライセンス上の注意

生成・変更したアバターアセットは、元モデル・元画像・利用したツール・
サンプルデータ・参照素材のライセンスや利用条件の対象になる場合があります。
拡張済み VRM、Live2D モデル、PNG アバター、スプライトシートを共有する前に、
関連するライセンスとクレジット表記条件を確認してください。

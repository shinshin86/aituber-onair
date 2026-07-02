# アバターガイド

[English version](./avatar.md)

AITuber OnAir は、チャットや音声の裏側だけを扱うツールキットではありません。
PNG / VRM / Live2D / Pet などのアバター表現を組み合わせて、より豊かな
AI キャラクター体験を作るための入口にもなります。

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

### VRM

3D アバター、カメラ操作、待機モーション、リップシンク、表情プリセットを
使いたい場合に向いています。VRM サンプルはローカルの `.vrm` モデルを
表示し、応答の感情タグに応じて利用可能な表情を適用できます。

まずは
[`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)
を参照してください。

### Live2D

すでに Cubism のモデルフォルダを持っていて、モデル側の動きを活かした
2D キャラクターを表示したい場合に向いています。Live2D サンプルは
ローカルの `.model3.json` を含むモデルフォルダを読み込みます。
Live2D アセット自体は同梱していません。

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

## ライセンス上の注意

生成・変更したアバターアセットには、元モデルのライセンス条件が引き継がれます。
拡張済み VRM、Live2D モデル、PNG アバター、スプライトシートを共有する前に、
元アセットのライセンスとクレジット表記条件を確認してください。

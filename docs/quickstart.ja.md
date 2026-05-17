# クイックスタート

[English version](./quickstart.md)

![PC に向かう AITuber OnAir 公式キャラクターのミコ](./images/aituber-onair-quickstart-miko.png)

このガイドでは、約10分でローカルの AI VTuber アプリを起動します。
パッケージごとの詳しいドキュメントを読む前に、まず動く状態を作りたい場合に
使ってください。

## 1. 新しいアプリを作成する

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

CLI がプロジェクト名、スターターテンプレート、セットアップ中に依存関係を
インストールするかどうかを確認します。

## 2. テンプレートを選ぶ

最初に作りたいアバター形式に合わせてテンプレートを選びます。

- `pngtuber`: スターター画像アセット同梱の 2D PNG アバターアプリ。
- `vrm`: `miko.vrm` とアイドルアニメーションアセット同梱の 3D VRM
  アバターアプリ。
- `live2d`: 自分の Live2D モデルアセットを持っているユーザー向けの
  Live2D アバターアプリ。

初めて使う場合は `pngtuber` から始めるのがおすすめです。扱うアセットが
少なく、チャット・音声・リップシンクが動くことを最短で確認できます。

テンプレートを直接指定することもできます。

```bash
npm create aituber-onair@latest my-pngtuber -- --template pngtuber
npm create aituber-onair@latest my-vrm-aituber -- --template vrm
npm create aituber-onair@latest my-live2d-aituber -- --template live2d
```

## 3. プロバイダーを設定する

生成されたアプリを開き、**Settings** から使いたいサービスを設定します。

最低限、次の項目を設定します。

- OpenAI、Claude、Gemini、OpenRouter などの LLM プロバイダーと API キー。
- VOICEVOX、AIVIS Speech、OpenAI TTS、MiniMax などの TTS プロバイダーと
  音声設定。
- キャラクタープロンプトとアバター設定。

スターターアプリはサンプル認証情報をブラウザの `localStorage` に保存します。
共有端末や公開オリジンでは、本番用の権限を持つ API キーを使わないでください。

## 4. AI VTuber を動かす

開発サーバーが表示したローカル URL を開きます。通常は次の URL です。

```txt
http://localhost:5173
```

アプリ内でメッセージを入力し、キャラクターが応答することを確認します。
音声を有効にしている場合は、選択したアバターテンプレートで音声再生と
リップシンクが動くことも確認してください。

## 次のステップ

- キャラクタープロンプトと話し方を調整する。
- アバターアセットを自分の PNG / VRM / Live2D モデルに差し替える。
- YouTube、Twitch、WebSocket などの配信コメントを接続する。
- 別の音声プロバイダーを試す。
- より深い組み込みが必要な場合は `@aituber-onair/core` を直接使う。

ほかの開始地点は [サンプル一覧](./examples.ja.md) を参照してください。

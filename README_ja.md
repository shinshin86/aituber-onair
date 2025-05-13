# AITuber OnAir
[![CI](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml/badge.svg)](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shinshin86/aituber-onair)

![AITuber OnAir Toolkit - logo](./images/AITuber_OnAir_Toolkit.png)

[Click here for the English README](./README.md)

**AITuber OnAir** モノレポへようこそ！  
このリポジトリには、AIを活用したバーチャルストリーミングやその他関連機能を実現するための各種パッケージやツールが含まれています。

現在、提供中の主要なパッケージは以下の通りです：

- [**@aituber-onair/core**](./packages/core/README_ja.md)
  AIチューバーのストリーミングシナリオにおいて、テキストや音声の応答を生成するための TypeScript ライブラリです。  
  各種AIおよび音声APIとのシームレスな連携、さらに会話の文脈管理やメモリ機能を提供します。
  ```
  npm install @aituber-onair/core
  ```

## はじめに

1. **リポジトリをクローンする**  
   ```bash
   git clone https://github.com/shinshin86/aituber-onair.git
   cd aituber-onair
   ```

2. **依存関係をインストールする**  
   このモノレポは **npm workspaces** を使用しています。以下のコマンドでインストールしてください：
   ```bash
   npm install
   ```

3. **すべてのパッケージをビルドする**  
   ```bash
   npm run build
   ```
   - このコマンドは、`packages/` ディレクトリ内の各パッケージのビルドスクリプトを実行します。

4. **すべてのパッケージのテストを実行する**  
   ```bash
   npm run test
   ```
   - 各パッケージのテストスイートを実行します。

5. **すべてのパッケージのフォーマット修正を実行する**
   ```bash
   npm run fmt
   ```
   - 各パッケージのフォーマット修正を実行します。

## プロジェクト構成

```
aituber-onair/
├── packages/
│   └── core/
│       ├── src/
│       ├── test/
│       └── package.json
├── package.json
├── README.md
└── ...
```

- **packages/core**: AIによる会話および音声機能を提供する主要ライブラリ（`@aituber-onair/core`）です。

## ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## Special Thanks

このプロジェクトは、[この投稿内で取り上げさせていただいた方々の知識・コード](https://x.com/shinshin86/status/1862806042603847905) を参考にして作成されました。  
このような先駆者たちの貢献がなければ、このプロジェクトは実現できなかったでしょう。

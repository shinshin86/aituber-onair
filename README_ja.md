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

- [**@aituber-onair/voice**](./packages/voice/README_ja.md)
  複数のTTSエンジン（VOICEVOX、VoicePeak、OpenAI TTS、NijiVoice、MiniMax、AIVIS Speech等）をサポートする独立した音声合成ライブラリです。単体での使用も、coreパッケージとの統合によるフルAITuber機能の実現も可能です。
  ```
  npm install @aituber-onair/voice
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
│   ├── core/
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   └── voice/
│       ├── src/
│       ├── test/
│       └── package.json
├── package.json
├── README.md
└── ...
```

- **packages/core**: AIによる会話およびチャット処理機能を提供する主要ライブラリ（`@aituber-onair/core`）です。
- **packages/voice**: 複数のTTSエンジンをサポートする音声合成ライブラリ（`@aituber-onair/voice`）です。

## リリース手順

このプロジェクトでは [Changesets](https://github.com/changesets/changesets) を使用してバージョン管理と自動リリースを行っています。

### リリースの作成方法

#### 自動リリース（推奨）

1. **変更内容に対してChangesetを作成**
   ```bash
   npm run changeset
   ```
   - 変更したパッケージを選択
   - 適切なバージョンアップ種別を選択 (patch/minor/major)
   - 変更内容の説明を記載

2. **Changesetファイルをコミット**
   ```bash
   git add .changeset/
   git commit -m "Add changeset for [機能名]"
   ```

3. **GitHubにプッシュしてPRを作成**
   - mainブランチにマージ後、GitHub Actionが自動的に「Version Packages」PRを作成
   - このPRには保留中のすべてのChangesetが含まれます

4. **Version PRをマージ**
   - 「Version Packages」PRをレビューしてマージ
   - 以下が自動的に実行されます：
     - パッケージバージョンの更新
     - CHANGELOG.mdファイルの更新
     - Gitタグの作成
     - npmへのパッケージ公開

#### 手動リリース（必要な場合）

完全な手動リリースワークフローの手順：

**方法1: Changesetsを使用**
1. **変更内容に対してChangesetを作成**
   ```bash
   npm run changeset
   ```

2. **パッケージバージョンを更新**
   ```bash
   npm run changeset:version
   ```

3. **リリース実行（ビルド、テスト、公開）**
   ```bash
   npm run release
   ```

**方法2: 手動バージョン管理**
Changesetのインタラクティブモードが失敗する場合：

1. **CHANGELOG.mdを更新**: `packages/[package]/CHANGELOG.md`にエントリを追加
   ```markdown
   ## 0.x.x
   
   ### Patch Changes
   
   - 変更内容の説明をここに記載
   ```

2. **package.jsonを更新**: `packages/[package]/package.json`のバージョンを増加

3. **変更をコミット**: CHANGELOG.mdとpackage.jsonの両方の更新をコミット

4. **ビルドとテスト**: `npm run build && npm run test`

5. **公開**: `npm run changeset:publish` または `cd packages/[package] && npm publish`

個別操作の代替方法：
```bash
# 公開される内容を確認
npm run changeset:publish -- --dry-run

# 手動でパッケージを公開（changeset:version実行後）
npm run changeset:publish
```

**注意**: `npm run release`は `ビルド → テスト → 公開` を順番に実行します。いずれかの手順が失敗した場合、処理が停止してパッケージは公開されません。

## ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## Special Thanks

このプロジェクトは、[この投稿内で取り上げさせていただいた方々の知識・コード](https://x.com/shinshin86/status/1862806042603847905) を参考にして作成されました。  
このような先駆者たちの貢献がなければ、このプロジェクトは実現できなかったでしょう。

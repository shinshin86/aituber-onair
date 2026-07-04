# AITuber OnAir

[![CI](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml/badge.svg)](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shinshin86/aituber-onair)

![AITuber OnAir Toolkit - logo](./images/aituber-onair-toolkit.png)

[Click here for the English README](./README.md)

> **TypeScript で配信向け AI VTuber を作るためのツールキット**
>
> AITuber OnAir は、会話し、音声で話し、視聴者に反応し、
> メモリを使い、PNG / VRM / Live2D アバターで動く AI VTuber を
> 作るためのオープンソースツールキットです。ホスティング済みの
> Web アプリ、スターターアプリ、セルフホスト可能なサンプル、
> モジュール化された TypeScript パッケージのどこからでも始められます。

<p align="center">
  <a href="https://aituberonair.com">Web アプリを試す</a> ・
  <a href="./docs/quickstart.ja.md">クイックスタート</a> ・
  <a href="./docs/examples.ja.md">サンプル一覧</a> ・
  <a href="#パッケージ">パッケージ</a>
</p>

![AITuber OnAir Demo](./images/aituber-onair-demo.png)

## 作れるもの

- ライブ視聴者と会話し、話しかける AI VTuber
- YouTube / Twitch のコメントにリアルタイムに反応する配信アシスタント
- テキスト・音声・Vision・長期記憶を備えた AI キャラクターアプリ
- ポイント・レベル・実績を持つ視聴者との関係性システム
- 独立した npm パッケージを組み合わせたブラウザ / Node.js 向けの統合

## 10分で始める

ローカルで AI VTuber を動かす最短ルートは次の通りです。

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

起動後、アプリの **Settings** から LLM / TTS プロバイダーを設定します。
詳しい手順は [クイックスタート](./docs/quickstart.ja.md) を参照してください。

## 使い始め方

### 1. ホスティング済みの Web アプリを試す

[AITuber OnAir](https://aituberonair.com) は `@aituber-onair/core` を使って作られた、独立した AITuber 配信 Web アプリです。ツールキット全体の雰囲気をいちばん早く掴めると同時に、このライブラリで実際にどこまで作れるかを示す実践的なリファレンスにもなっています。セットアップ不要。

### 2. スターターアプリを作成する

`create-aituber-onair` を使うと、公式の PNGTuber / VRM / Live2D スターター
テンプレートから自分の AITuber OnAir アプリを作成できます。

```bash
npm create aituber-onair@latest
```

CLI がプロジェクト名、テンプレート、依存関係をインストールするかどうかを
対話形式で確認します。プロジェクト名を先に指定することもできます。

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

手順ごとのセットアップとテンプレート選択については
[クイックスタート](./docs/quickstart.ja.md) を参照してください。

### 3. サンプルアプリをローカルで動かす

`@aituber-onair/core` をベースにしたフル機能の React サンプルを4種類用意しています。プロジェクトに合うアバター方式を選んでください。LLM / TTS プロバイダー対応範囲と **Settings** UI はどれも共通です。

#### PNGTuber Chat — 2D PNG アバター

![PNGTuber サンプルアプリ](./packages/core/examples/react-pngtuber-app/images/react-pngtuber-app.png)

4状態の PNG（口・目の開閉）を差し替えるだけで、実際の音声出力ボリュームから駆動されるリアルタイムリップシンクが動きます。詳細は [`packages/core/examples/react-pngtuber-app`](./packages/core/examples/react-pngtuber-app) を参照。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-pngtuber-app
npm install
npm run dev
```

#### PuruPuru PNGTuber Chat — 髪が揺れる 2D アバター

![PuruPuru PNGTuber サンプルアプリ](./packages/core/examples/react-purupuru-app/images/react-purupuru-app.png)

`.purupuru` 形式のアバターパッケージ（1ファイル）を読み込むだけで、アイドルモーション・まばたき・音声駆動リップシンク・髪のバネ物理・振り向き（疑似奥行きパララックス付き）・感情タグによるリアクションが動きます。カメラやトラッキングは不要です。AITuber OnAir 公式キャラクター「ミコ」をデフォルトアバターとして同梱しています。アバター形式とモーション表現は rotejin さんが開発された [PuruPuruPNGTuber](https://github.com/rotejin/PuruPuruPNGTuber) によるもので、このサンプルはその AITuber 向け移植です。詳細は [`packages/core/examples/react-purupuru-app`](./packages/core/examples/react-purupuru-app) を参照。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-purupuru-app
npm install
npm run dev
```

#### VRM Chat — 3D VRM アバター

![VRM サンプルアプリ](./packages/core/examples/react-vrm-app/images/react-vrm-app.png)

3D VRM アバター（`miko.vrm`）、任意のアイドル VRMA アニメーション、発話に合わせた口元のリアルタイムリップシンク、カメラ操作（ドラッグで回転 / ホイールでズーム）に対応。詳細は [`packages/core/examples/react-vrm-app`](./packages/core/examples/react-vrm-app) を参照。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-vrm-app
npm install
npm run dev
```

#### Live2D Chat — ローカル Live2D フォルダ読み込み

![桃瀬ひよりを使用した Live2D サンプルアプリ](./packages/core/examples/react-live2d-app/images/react-live2d-app-hiyori.png)

<p align="center">
  <small>
    Live2D サンプルモデル: 桃瀬ひより。イラスト: かにビーム、
    モデリング: Live2D Inc. このコンテンツは Live2D Inc. が著作権を
    有するサンプルデータを使用しています。詳細:
    <a href="https://www.live2d.com/learn/sample/">Live2D サンプルデータ集</a>。
  </small>
</p>

`.model3.json` を含むローカルの Live2D モデルフォルダをブラウザで読み込み、実際の音声出力ボリュームに合わせて口元を動かします。このサンプルは Live2D アセット自体は同梱しません。詳細は [`packages/core/examples/react-live2d-app`](./packages/core/examples/react-live2d-app) を参照。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-live2d-app
npm install
npm run dev
```

#### Pet Chat — アニメーションする Codex Pet 風スプライト

![Pet サンプルアプリ](./packages/core/examples/react-pet-app/images/react-pet-app.jpg)

Codex Pet 互換のスプライトシートを描画し、ステージ内を動き回らせながら、チャット状態、応答の雰囲気、実際の音声出力ボリュームに応じてアニメーションを切り替えます。詳細は [`packages/core/examples/react-pet-app`](./packages/core/examples/react-pet-app) を参照。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair/packages/core/examples/react-pet-app
npm install
npm run dev
```

いずれの場合もブラウザで `http://localhost:5173` を開き、**Settings** から API キーとプロバイダー設定を入力してください。

サンプル全体の一覧とおすすめの始め方は
[サンプル一覧](./docs/examples.ja.md) を参照してください。

### 4. パッケージを使って自分のアプリに組み込む

必要なものだけをインストールして、自分のアプリに差し込めます。

```bash
npm install @aituber-onair/chat
```

```ts
import { ChatServiceFactory } from '@aituber-onair/chat';

const chat = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

await chat.processChat(
  [{ role: 'user', content: 'こんにちは！' }],
  (partial) => process.stdout.write(partial),
  async (full) => console.log('\nDone:', full),
);
```

プロバイダーの設定や詳しい使い方は、各パッケージの README を参照してください。

## ドキュメント

- [クイックスタート](./docs/quickstart.ja.md): スターターアプリの作成、
  テンプレート選択、プロバイダー設定、ローカル起動まで。
- [サンプル一覧](./docs/examples.ja.md): フル機能の AI VTuber アプリ、
  パッケージ別サンプル、Bot サンプル、ローカル実行例の選び方。

## パッケージ

### [create-aituber-onair](./packages/create-aituber-onair/README.ja.md)

<p align="center">
  <img src="./packages/create-aituber-onair/images/create-aituber-onair.png" alt="create-aituber-onair ロゴ" width="360" />
</p>

公式スターターテンプレートから AITuber OnAir アプリを作成する CLI。
現時点では PNGTuber / VRM / Live2D / Pet テンプレートに対応しています。
PNGTuber / VRM / Pet はスターターアセット同梱、Live2D は Live2D モデルアセット非同梱です。
```bash
npm create aituber-onair@latest
```

### [@aituber-onair/core](./packages/core/README_ja.md)

<p align="center">
  <img src="./packages/core/images/aituber-onair-core.png" alt="AITuber OnAir Core ロゴ" width="360" />
</p>

チャット・音声・メモリ・会話コンテキストをまとめて、フル機能の AITuber 体験を組み立てるためのコアランタイム。
```bash
npm install @aituber-onair/core
```

### [@aituber-onair/chat](./packages/chat/README.ja.md)

<p align="center">
  <img src="./packages/chat/images/aituber-onair-chat.png" alt="AITuber OnAir Chat ロゴ" width="360" />
</p>

OpenAI、Claude、Gemini、Z.ai、Kimi、DeepSeek、Mistral、OpenRouter を共通インターフェースで扱える LLM レイヤー。ストリーミング、ツール / 関数呼び出し、Vision、MCP に対応。
```bash
npm install @aituber-onair/chat
```

### [@aituber-onair/voice](./packages/voice/README_ja.md)

<p align="center">
  <img src="./packages/voice/images/aituber-onair-voice.png" alt="AITuber OnAir Voice ロゴ" width="360" />
</p>

VOICEVOX、VoicePeak、OpenAI TTS、MiniMax、AIVIS Speech などをサポートする独立した TTS ライブラリ。感情に応じた合成にも対応。
```bash
npm install @aituber-onair/voice
```

### [@aituber-onair/manneri](./packages/manneri/README.ja.md)

<p align="center">
  <img src="./packages/manneri/images/aituber-onair-manneri.png" alt="AITuber OnAir Manneri ロゴ" width="360" />
</p>

会話の繰り返しパターンを検出し、話題を切り替えるためのプロンプトを差し込むことで、対話を飽きさせないようにします。
```bash
npm install @aituber-onair/manneri
```

### [@aituber-onair/noise](./packages/noise/README.ja.md)

<p align="center">
  <img src="./packages/noise/images/aituber-onair-noise.png" alt="AITuber OnAir Noise ロゴ" width="360" />
</p>

AI の返答が無難な着地に寄りすぎたときに使う、生成後の書き換えエンジン。予定調和な言い回しを検出し、構造化された介入方針から LLM に複数候補を作らせ、キャラクターと文脈を保ったまま最も安全な非定型の返答を選びます。
```bash
npm install @aituber-onair/noise
```

### [@aituber-onair/comment-intelligence](./packages/comment-intelligence/README.ja.md)

<p align="center">
  <img src="./packages/comment-intelligence/images/aituber-onair-comment-intelligence.png" alt="AITuber OnAir Comment Intelligence ロゴ" width="360" />
</p>

ライブコメントを AI キャラクターへ渡す前に整理するフィルタリングライブラリ。返答対象コメントの選択、危険コメントのブロック、未選択コメントの要約、LLM向けコンテキスト生成に対応します。ルールベースを基本に、任意で LLM アシスト分析も利用できます。
```bash
npm install @aituber-onair/comment-intelligence
```

### [@aituber-onair/bushitsu-client](./packages/bushitsu-client/README_ja.md)

<p align="center">
  <img src="./packages/bushitsu-client/images/aituber-onair-bushitsu-client.png" alt="AITuber OnAir Bushitsu Client ロゴ" width="360" />
</p>

React hooks 対応の WebSocket チャットクライアント。自動再接続・レート制限・メンション・音声合成統合つき。ブラウザと Node.js の両方で動作します。
```bash
npm install @aituber-onair/bushitsu-client
```

### [@aituber-onair/kizuna](./packages/kizuna/README.ja.md)

<p align="center">
  <img src="./packages/kizuna/images/aituber-onair-kizuna.png" alt="AITuber OnAir Kizuna ロゴ" width="360" />
</p>

AI キャラクターと視聴者のための絆システム。ポイント、実績、感情ボーナス、レベル進行、永続ストレージに対応。
```bash
npm install @aituber-onair/kizuna
```

## なぜ AITuber OnAir か

- 実運用で揉まれている — ライブ運用中の AITuber 配信 Web アプリ [AITuber OnAir](https://aituberonair.com) の裏側で動いているので、実際のプロダクトが依存しているのと同じコードの上に構築できます
- 好きな入口から始められる: ホスト済み Web アプリ / スターター CLI / セルフホストのサンプル / モジュール化された npm パッケージ
- AITuber を作る人が実際に使うプロバイダーを第一級でサポート: チャットは OpenAI / Claude / Gemini、音声は VOICEVOX / OpenAI TTS / AIVIS Speech ほか
- チャット・音声・配信（YouTube / Twitch / WebSocket）・視聴者関係を、ひとつの一貫したスタックでまとめて扱える
- MIT ライセンスの TypeScript なので、ホスティング・データ・連携先を自分でコントロールできる

## プロジェクト構成

```txt
aituber-onair/
└── packages/
    ├── create-aituber-onair/ # スターターテンプレート同梱の npm create CLI
    ├── core/             # AITuberOnAirCore、メモリ、オーケストレーション
    ├── chat/             # LLM プロバイダー、ストリーミング、ツール、MCP
    ├── voice/            # TTS エンジン、感情、再生
    ├── manneri/          # 会話パターン検出
    ├── noise/            # 生成後の返答書き換え
    ├── comment-intelligence/ # ライブコメントのフィルタリングと文脈生成
    ├── bushitsu-client/  # WebSocket チャットクライアント + React hooks
    └── kizuna/           # 視聴者との関係性 / 絆システム
```

## ライセンス

MIT — 詳細は [LICENSE](./LICENSE) を参照してください。

## Special Thanks

このプロジェクトは、[この投稿内で取り上げさせていただいた方々の知識・コード](https://x.com/shinshin86/status/1862806042603847905) を参考にして作成されました。
このような先駆者たちの貢献がなければ、このプロジェクトは実現できなかったでしょう。

---

## コントリビューター向け

モノレポ自体に手を入れる場合は以下の手順で始めてください。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair
npm install
npm run build
npm run test
npm run fmt
```

### Agent Skills

Codex と Claude Code の両方で同じ手順を使えるよう、共通の Agent Skills を管理しています。詳しくは [`docs/agent-skills.ja.md`](./docs/agent-skills.ja.md) を参照してください。正本は `skills/` 以下、Claude Code 用の配置は `.claude/skills/` 以下にあります。

### リリース

リリースは、手動のバージョン更新 + パッケージごとの `CHANGELOG.md` を起点に、`main` へのマージ時に GitHub Actions で自動公開されます。直接 `npm publish` を実行してはいけません。

- **Patch**: バグ修正、依存更新などの後方互換の変更
- **Minor**: 新機能の追加（後方互換あり）
- **Major**: 破壊的変更

`release.yml` は Changesets を使って npm への公開、タグ作成（`@aituber-onair/<pkg>@x.y.z`）、およびその実行で公開されたパッケージの GitHub Release 作成までを行います。リリース CI が途中で失敗した場合、再実行では未公開パッケージのみが公開され、既に公開済みのパッケージの GitHub Release は補完されません。その場合はタグ（既に存在します）を使って、パッケージの CHANGELOG から手動で Release を作成してください。`prerelease-next.yml` は `next` のプレリリースタグのみを更新します。

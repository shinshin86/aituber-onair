# Node メッシュアバター ニュースデスク

[English](./README.md)

この AITuber OnAir Core サンプルは、ソーステキストを縦型 1080x1920 のニュース
番組動画に変換します。隣の `react-mesh-avatar-app` の1枚絵メッシュアバターが
キャスターとして読み上げ、ニュースパネル・キーワードのポップアップ・感情
エフェクト・カラオケ字幕・ティッカーを重ねた画面を作ります。

```text
ファイル、標準入力、URL
  -> Core chat / Core Agent SDK
  -> script.json + analysis.json（確認）
  -> Core voice / sine / macOS say
  -> ディレクター（場面ごとのモーションと演出の予定表）
  -> headless Chromium で1フレームずつ描画（メッシュアバター + 画面演出）
  -> ffmpeg -> 1080x1920 MP4（確認）
```

2つの確認工程は意図的です。レンダリング前に事実と数値を確認し、公開前に
完成動画を最後まで確認してください。X や YouTube への自動投稿は行いません。

## 画面

- **ヘッダー**: LIVE 表示（点滅）、番組名、進む時計、光が流れる金のライン
- **ニュースパネル**: 話題の見出し（タイプライター表示とマーカー）、読んでいる
  行の要点（スライドイン、読み上げ中はハイライト）、番組の話題一覧（RUNDOWN）
  と進行バー
- **アバター枠**: 枠の中でキャスターが読み上げる。背景の光、ゆっくり回る光線、
  強い感情の行ではカメラが寄る
- **キーワード**: 行の数字や固有名詞を、アバターの横に大きくポップアップ
- **ボイスメーター**: 話している間は声に合わせて動く
- **感情エフェクト**: happy はキラキラ、surprised は画面の揺れと「！」、sad は
  青い色と雨、angry は赤い脈動と怒りマーク、relaxed はボケ玉
- **話題の切り替え**: 「NEXT TOPIC」のカットインと、パネルのスライド
- **字幕**: 読んでいる位置まで色が変わるカラオケ字幕
- **ティッカー**: 話題の一覧が流れる
- **オープニング / エンディング**: タイトルカード

## アバターの動き（ディレクター）

`src/shared/schedule.ts` が、台本の行とタイミングからモーションの予定表を作り
ます。モーションはランダムに選びますが、場面に合う候補の中からだけ選びます。

| 場面 | 候補 |
|---|---|
| 冒頭 | ごあいさつ |
| 行の始まり | 感情ごと（happy: うなずき・くすっと笑う、surprised: びっくり、sad: ひと息 など） |
| 行と行の間 | 原稿を見る、ふと横を見る、うなずき、ふんふん |
| 話題の切り替え | ひと息、首かしげ、原稿を見る |
| 締め | うなずき、ごあいさつ |

読み上げ中は、チャット用より控えめに声に合わせてうなずきます。口パクは音声の
音量から作り、あいうえおの口の絵を切り替えます。まばたきや髪・髪飾りの揺れは
常に動きます。乱数は台本の `seed` で決まるので、同じ台本と音声からは同じ動画に
なります。

## 必要環境

- Node.js 22 以降と npm
- `PATH` 上の `ffmpeg` と `ffprobe`
- Playwright からインストールした Chromium
- 隣の `react-mesh-avatar-app`（アバターのエンジンと画像を読み取り専用で使います）
- 既定の `codex-sdk` 用の ChatGPT サインイン、または API プロバイダー用の
  API キー
- 任意: AivisSpeech などの Core 音声エンジン

決定論的な `sine` エンジンには音声サービスが不要です。`say` は macOS 専用で、
口パクの確認用のサンプルに使っています。

## セットアップ

```sh
npm install
npx playwright install chromium
npm run build
```

## 台本を生成する

```sh
npm run script-gen -- article.txt \
  --focus "料金を中心に" \
  --output work/article.json
```

入力はローカルファイル、標準入力を表す `-`、HTTP(S) URL に対応します。台本と
隣接する `<名前>.analysis.json` が出力されます。両方を確認してから
レンダリングしてください。API キーを使うプロバイダーや `--dry-run` の使い方は
他のニュースデスクのサンプルと同じです。

## 動画を生成する

台本は同梱していません。上の `script-gen` で作るか、
[`script.json` フォーマット](./docs/script-format.md)の例をもとに手で書きます。
`work/` は gitignore 済みなので、台本と動画はそこに置いてください。

```sh
npm run script-gen -- article.txt --output work/news.json
npm run gen -- --script work/news.json --output work/news.mp4

# 音声と timing/config ファイルだけを作成
npm run gen -- --script work/news.json --output work/news.mp4 --dry-run

# 既存 WAV と解決済み config から再レンダリング
npm run gen -- --script work/news.json --output work/news.mp4 --render-only

# 1フレームだけ PNG 出力（そのフレームまで順に描画します）
npm run gen -- --script work/news.json --frame 150 --png work/frame150.png
```

`script-gen` の台本は、外部サービスなしで描画できるよう `sine`（ビープ音）の声に
なっています。実際の声で読ませるには、台本の `voice` を書き換えます。
AivisSpeech（`http://127.0.0.1:10101`）の「まお」の例:

```json
{
  "voice": {
    "engine": "aituber-voice",
    "options": { "engineType": "aivisSpeech", "speaker": "888753760" }
  }
}
```

macOS の `say` を使う場合は `{ "engine": "say", "options": { "voice": "Kyoko", "rate": 210 } }`
です。描画は1フレームあたり約0.25秒かかります（30秒の動画で約4分）。

## 検証

```sh
npm run typecheck
npm test
```

## 制限

- アバターのリグは同梱の1枚絵に合わせて作っています。別の画像を使うには、
  `react-mesh-avatar-app` 側でレイヤーとリグを作り直す必要があります。
- 口パクは音量からの推定です。母音は実際の発音ではなく、音節ごとに選んでいます。
- 第三者の音声モデルを使う場合は、公開・収益化の前に利用規約を確認してください。

## 素材利用条件とクレジット

この example は、隣の `react-mesh-avatar-app` のアバターのエンジンと画像を
read-only で参照し、コピーしません。参照するミコ由来のアバター画像の著作権表記は
© Yuki Shindo (AITuber OnAir) です。このアバター画像はリポジトリの MIT License
対象外です。作品・コンテンツの一部として一体で再配布できますが、素材単体・
素材集としての再配布は禁止です。正式な日本語ガイドラインへのリンクは
[Miko Asset Terms](./MIKO_ASSET_TERMS.md)を参照してください。

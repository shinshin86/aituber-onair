# Mesh Avatar Chat

![react-mesh-avatar-app image](./images/react-mesh-avatar-app.png)

`@aituber-onair/core` を使った、1枚絵をメッシュ変形で Live2D 風に動かすアバター付きチャットサンプルです。
`react-single-image-avatar-app` と同じ LLM、TTS、ライブコメント、配信表示を使い、アバター部分だけを WebGL2 のメッシュアバターに置き換えています。

## 特徴

- 1枚絵を「素体・手・房飾り・目のパーツ」に分けたレイヤーを、WebGL2 のメッシュで変形
- 顔の向き・傾き、呼吸、まばたき、視線、眉、毛束ごとの髪の揺れ、房飾りの振り子
- 待機中はアイドルモーション（12種）とリアクション（9種）をランダム再生
- TTS 音声の音量で口パクし、話している間はアイドルを止めて声に合わせて軽くうなずく
- 返答の感情タグ（`[happy]` `[sad]` `[angry]` `[surprised]` `[relaxed]` `[neutral]`）に合わせて表情とモーションを切り替え。悲しみ・驚き・怒りでは、描き分けた目や口に切り替わる（`mesh-avatar` 0.2.0 以降）
- Settings の「アバター・モーション」から、揺れやすさの調整、モーションの再生、API キーなしでの話し方プレビューが可能
- Settings の「アバター・モーション」から `.mavatar` ファイルを読み込み、アバターを差し替えられる

## 音声入力

入力欄の左にあるマイクボタンで音声入力を始め、もう一度押すと止まります。
隣の `⌃` から聞き取り方と使うサービスを選べます。設定はブラウザに保存されます。

- 聞き取り方: **一回だけ** は一度話すと送信して終わります。**継続して会話**
  は返答の生成と読み上げが終わると、また聞き取ります
- 使うサービス: **ブラウザ**（Web Speech API）、**OpenAI**、**Gemini**。
  `@aituber-onair/transcription` を使い、話し終えて確定した文をそのまま送信します
- OpenAI と Gemini は LLM 設定と同じ API キーを使い、メニューからも入力できます。
  キーはブラウザから各サービスへ直接送られるため、共有端末では使わないでください。
  聞き取り中は利用料金がかかります
- OpenAI と Gemini は接続が済むまで声を受け付けません。マイクを押した直後は
  「接続しています」と表示され、話せる状態になると表示とボタンが切り替わります

## セットアップ

`openai-compatible` では、ローカルサーバーのプリセットを選ぶか、origin、
`/v1` ベース URL、`/chat/completions` の完全 URL を入力できます。モデル一覧を
取得してモデルを選び、チャット前に **Test connection** を実行してください。
詳しくは [ローカル LLM セットアップガイド](https://github.com/shinshin86/aituber-onair/blob/main/docs/local-llm.ja.md) を参照してください。

```bash
# リポジトリのルートで、ローカルパッケージを先にビルド
npm install
npm run build

cd packages/core/examples/react-mesh-avatar-app
npm install
npm run dev
```

`OpenAI-Compatible TTS` では、origin、`/v1` ベース URL、`/audio/speech` の
完全 URL を入力できます。**Detect server** でサーバーが提供するモデルと voice の
一覧を取得し、**Test speech** で短い音声を再生して確認できます。
詳しくは [ローカル TTS セットアップガイド](https://github.com/shinshin86/aituber-onair/blob/main/docs/local-tts.ja.md) を参照してください。

## アバターの API

描画には、React に依存しない [`mesh-avatar`](https://www.npmjs.com/package/mesh-avatar) パッケージを使っています。

```ts
import { loadMeshAvatar } from 'mesh-avatar';

const avatar = await loadMeshAvatar(canvas, '/avatar/miko-qipao.mavatar');
avatar.setSpeaking(true);       // TTS 再生中
avatar.setVoiceLevel(0.6);      // 0〜1 の音量（RMS を正規化した値）
avatar.setEmotion('happy');     // 感情タグ
avatar.play('nod');             // モーション / アイドルモーションの再生
avatar.setAutoIdle(false);      // ランダム再生の切り替え
avatar.setSwayGain(1.5);        // 髪・髪飾りの揺れやすさ
avatar.destroy();
```

React からは `src/components/MeshAvatarCanvas.tsx` を使います。
`useAudioMotion` の `voiceLevel` / `isSpeaking` と、`onSpeechStart` で受け取った感情タグを渡すだけで動きます。

モーションボタンは読み込んだアバターの一覧から作り、日本語の表示名はアプリ側で付けています。

## 別のアバターを使う

[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio) で `.mavatar` を
エクスポートします。ランタイムが対応する形式で出力されたアバターなら、そのファイル内のリグと画像で動きます。

### 画面から読み込む

Settings →「アバター・モーション」→「アバター」の **ファイルを選択** で `.mavatar` を選ぶと、
その場でアバターが切り替わります。モーションボタンは読み込んだアバターのモーション一覧に置き換わります。

- ファイルはブラウザ内で読み込むだけで、外部に送信しません
- 読み込んだアバターは保存しないため、ページを再読み込みすると付属アバターに戻ります
- **付属アバターに戻す** で付属アバターに戻せます
- 読み込みに失敗した場合はエラーを表示し、付属アバターに戻ります
- 感情表現エフェクトのアンカーは、ファイル名ごとに別々に保存されます

### 既定のアバターを置き換える

起動時から別のアバターを表示したい場合は、`public/avatar/miko-qipao.mavatar` と置き換えてください。
別のファイル名を使う場合は `public/avatar/` に置き、`src/components/MeshAvatarCanvas.tsx` の
`DEFAULT_MESH_AVATAR_SOURCE` を `'/avatar/my-avatar.mavatar'` のように変更します。
ファイルはアプリと同じオリジンから読み込みます。

## 同梱画像

`public/avatar/miko-qipao.mavatar` には、チャイナドレス姿のミコのリグ、元の1枚絵、
レイヤー画像（素体・手・房飾り・目のパーツ・髪のマスク）、閉じ目や口の差分画像、
表情の差分画像（悲しみ・驚きの目、怒り・悲しみの閉じた口）、マニフェストを同梱しています。
元の1枚絵はミコの画像を元に ChatGPT で生成し、閉じ目・口・表情の差分はその絵に合わせて
画像生成で描き足しました。

## 素材利用条件とクレジット

同梱のミコ由来のアバター画像の著作権表記は © Yuki Shindo (AITuber OnAir) です。
このアバター画像はリポジトリの MIT License 対象外です。作品・コンテンツの一部として
一体で再配布できますが、素材単体・素材集としての再配布は禁止です。正式な日本語
ガイドラインへのリンクは [Miko Asset Terms](./MIKO_ASSET_TERMS.md) を参照してください。

## 制限

- 口の中や閉じた目は元の絵にないため、計算で作っています。大きく口を開けると違和感が出ることがあります。
- ブラウザ内蔵の Web Speech API は音声バッファを公開しないため、口パクには対応しません（プレビューは使えます）。
- 感情エフェクト（キラキラなど）の表示位置は、同梱画像に合わせた調整がまだです。
- 同梱画像は上端でお団子の頭頂部が切れているため、初期表示では画像の上端を表示範囲の外に出しています。

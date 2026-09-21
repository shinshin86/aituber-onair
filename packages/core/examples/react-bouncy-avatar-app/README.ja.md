# Bouncy Avatar Chat

![Bouncy Avatar Chat](./images/react-bouncy-avatar-app.png)

`@aituber-onair/core` を使った、1枚画像のバウンスアバター付きReactチャット
サンプルです。口の差分画像は使わず、TTSの実音声から取得した音量に合わせて
アバター全体が跳ね、左右に傾き、着地時に少し潰れます。

## 特徴

- 透過PNGまたはJPGを1枚だけ使用
- TTS音声のRMSを0〜1へ正規化し、音の山をジャンプへ変換
- ジャンプごとに左右の傾きを交互に変更
- 着地時のスクワッシュと、無音時の自然な静止
- Settingsから画像の差し替えと「動きをプレビュー」が可能
- PNGTuberサンプルと同じLLM、TTS、配信、感情エフェクト設定を利用可能

## セットアップ

```bash
cd packages/core/examples/react-bouncy-avatar-app
npm install
npm run dev
```

起動後に **Settings** を開き、LLMとTTSを設定してください。見た目の設定では
アバター画像を1枚だけ選択できます。「動きをプレビュー」はAPIキーやTTS設定なしで
バウンス動作を確認できます。

設定値は `localStorage` の `react-bouncy-avatar-app-settings` に保存されます。
アップロードした画像はメモリ上だけに保持され、リロードすると同梱画像へ戻ります。

## 音声連動

`src/hooks/useAudioMotion.ts` がTTS音声をWeb Audio APIで再生し、RMS音量を
毎フレーム計測します。`src/hooks/useBouncyAvatarMotion.ts` はその音量から
一定間隔のインパルスを生成し、`src/lib/bouncyAvatarMotion.ts` の物理計算で
上下移動、回転、スクワッシュを求めます。

ブラウザ内蔵のWeb Speech APIは音声バッファを公開しないため、実音声に同期した
動きには対応しません。このエンジンを選んだ場合でも、Settingsのプレビュー機能は
利用できます。

## 同梱画像

デフォルト画像は `public/avatar/bouncy-avatar.png` です。元画像をPNGとして
再エンコードし、埋め込みメタデータを除去しています。この画像はミコの画像を元に、
Serio_ai（[@Multi_Serio_Ai](https://x.com/Multi_Serio_Ai) / APG）さんが
[公開したプロンプト](https://x.com/Multi_Serio_Ai/status/2100800237619347535)
を参考にChatGPTで生成しました。プロンプトを公開してくださったことに感謝します。

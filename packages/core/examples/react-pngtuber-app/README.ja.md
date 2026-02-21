# PNGTuber Chat

![react-pngtuber-app image](./images/react-pngtuber-app.png)

`@aituber-onair/core` を使った PNGTuber 風チャットアプリです。  
音声入力は Web Speech API、口パクは実際の音声出力音量を解析してリアルタイムで動かします。

## このアプリでできること

- LLM プロバイダ切り替え: `openai`, `openrouter`, `gemini`, `claude`, `zai`
- TTS エンジン切り替え: `openai`, `voicevox`, `voicepeak`, `aivisSpeech`, `aivisCloud`, `minimax`, `none`
- スピーカー一覧の動的取得と選択:
  - `voicevox` / `aivisSpeech`: `/speakers` から取得
  - `minimax`: APIキー入力後に `query/tts_speakers` から取得
- Aivis Cloud は CORS 回避のため固定プリセット選択:
  - `コハク`（`22e8ed77-94fe-4ef2-871f-a86f94e9a579`）
  - `まお`（`a59cb814-0083-4369-8542-f51a29e72af7`）
- リアルタイム口パク + ランダムまばたき
- Settings 画面から見た目をその場で設定:
  - 背景画像（1枚）
  - アバター画像（4状態: 口開閉/目開閉）
- 画像設定はメモリ保持のみ（リロードで初期化）

## セットアップ

```bash
npm install
npm run dev
```

起動後に **Settings** を開き、APIキーや各種設定を入力してください。  
設定値は `localStorage`（`react-pngtuber-app-settings`）に保存されます。

## 設定の保存仕様

- LLM/TTS/APIキー設定は `localStorage` に保存されます
- Visual のアップロード画像はメモリ保持のみで、リロード時に初期化されます

## アバターのベース画像（`public/avatar`）

`public/avatar/` に以下のファイルを配置してください。

| ファイル | 説明 |
|---|---|
| `mouth_close_eyes_open.png` | 口閉じ + 目開き |
| `mouth_close_eyes_close.png` | 口閉じ + 目閉じ |
| `mouth_open_eyes_open.png` | 口開き + 目開き |
| `mouth_open_eyes_close.png` | 口開き + 目閉じ |

画像が未配置の場合は SVG フォールバックアバターを表示します。  
Settings からアップロードした画像は、そのセッション中のみ優先して使われます。

なお、今回サンプルのために用意したPNGTuberの素材作成は[Easy PNGTuber](https://github.com/rotejin/EasyPNGTuber)を利用して作成しています。

## 口パクの調整パラメータ

`src/hooks/useAudioLipsync.ts` の先頭定数で調整できます。

| 定数 | デフォルト | 説明 |
|---|---|---|
| `SMOOTH_FACTOR` | `0.5` | 平滑化係数。大きいほどなめらか（0.0–1.0） |
| `RMS_CEILING` | `0.12` | RMS の正規化上限。小さいほど敏感に口が開く |
| `MOUTH_LEVELS` | `5` | 口パク段階数（画像枚数と合わせる） |

## Web Speech API について

- **Chrome / Edge** で動作（推奨: Chrome）
- Firefox, Safari は未対応
- 未対応ブラウザではマイクボタンが無効化
- HTTPS または localhost 環境が必要

## 技術スタック

- Vite + React + TypeScript
- `@aituber-onair/core`（LLM + TTS）
- Web Speech API（音声入力）
- Web Audio API + `AnalyserNode`（口パク解析）
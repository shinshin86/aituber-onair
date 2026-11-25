# Media Avatar Chat

### Chat 0.73.0・Voice 0.31.0

Core 0.26.33は公開済みのChat 0.73.0とVoice 0.31.0を利用します。
Gemini 4 Neonは画像入力・ストリーミング・ツールに対応する有料の明示選択肢で、2つの経路で使えます。
Gemini公式（`gemini-4-neon`、`MODEL_GEMINI_4_NEON`）は`low`（パッケージの初期値）・`medium`・`high`、
OpenRouter（`google/gemini-4-neon`、`MODEL_GOOGLE_GEMINI_4_NEON`）はこれに加えて`xhigh`を選べます。
Gemini 4の公式経路では、GenerateContent RESTでの`xhigh`の列挙値が公開されていないモデルは`xhigh`を出しません。現在はHydrogenとNeonが該当します。
Neonは署名付きのモデル履歴を返します。Coreは1回のツール呼び出しループの中ではこれをそのまま送り返しますが、
チャットログには表示テキストだけを残すため、次のターン以降や保存したログには署名が含まれません。
ターンをまたいで署名付き履歴を保つには、Chatを直接呼び出し、返された`assistant_message`を履歴に追加してください。
OpenRouterには、画像入力・ツール・ストリーミングに対応する5つの明示選択肢も追加しました。
`tencent/hy4-flash`（推論の制御なし）、`qwen/qwen4-max`（初期値`none`）、
`openai/gpt-6.2-sol`と`openai/gpt-6.2-astra`（初期値`low`）、`thinkingmachines/inkling-2-mini`（初期値`none`）です。
プロバイダーの初期モデルは変わりません。
OpenRouter TTSにQwen3 TTS 1.7B（`qwen/qwen3-tts-1.7b`）を明示選択肢として追加しました。
公開されているプリセット音声だけを使う一括生成のMP3で、日本語には`ono_anna`を選べます。
速度・指示文・参照音声は設定できません。
OpenRouter TTSのモデル欄から選べます。音声一覧の取得後、保存済みの音声が一覧にない場合は`ono_anna`を自動で選びます。

OpenAI公式のGPT-6.2 Sol（`gpt-6.2-sol`）とGPT-6.2 Astra（`gpt-6.2-astra`）は画像入力に対応する明示選択肢です。
推論は`low`から始まり、選べるのは`low`と`medium`のみです。保存済みのそれ以外のレベルはこの範囲に丸めます。
Responses APIが既定で、ツールとMCPを使う場合は必須です。ツールなしならChat Completionsも使えますが、
ツール付きでカスタムエンドポイントを指定すると送信前にエラーになります。
Mistral経由のDeepSeek V4.1 Flash 1017（`deepseek-v4-1-flash-1017`）は、画像入力・ストリーミング・ツールに対応するパブリックプレビューの明示選択肢です。
推論の制御は公開ドキュメントがないため送信しません。Mistralのツール呼び出しは後続リクエストでも継続できるよう修正しました。
プロバイダーの初期モデルは変わりません。

Gemini 4モデル（現在はArgon・Carbon・Hydrogen・Neon）は画像入力に対応する明示選択肢で、思考は必須です。
`low`（パッケージの初期値）・`medium`・`high`を選べます。プロバイダーの初期モデルは変わりません。
Hydrogen（`gemini-4-hydrogen`、OpenRouterでは`google/gemini-4-hydrogen`）は、
直接Gemini APIのレート制限付き無料枠で利用できます。OpenRouter版は有料です。
Google側の初期値は`high`です。追加の`xhigh`はGenerateContent RESTの列挙値の表記が公開されていないため選択肢に含めていません。
Argon・Carbonは有料枠が必要で、Google側の初期値は`medium`です。
CarbonはArgonより思考トークンを多く使い、応答時間とトークン使用量が増えます。

思考も出力上限に含まれます。Gemini 4の暗黙の上限はOpenRouter版も含め最低32,768トークンです。
直接Gemini APIで明示した上限はモデル別に制限されます。
Argon・Carbonは非ストリーミング32,768／ストリーミング65,536、HydrogenとNeonは両方式とも65,536です。
それより小さな明示上限は保持します。短い返答はプロンプトでも指定してください。
long decodeと自動継続生成は実装していません。

追加のOpenRouterモデルはテキスト・画像入力、ツール、ストリーミングに対応します。既定モデルは変更していません。

| モデルID | 推論レベル（パッケージ初期値） |
| --- | --- |
| `meta/muse-ember` | max, xhigh, high, medium, low, minimal（`minimal`） |
| `thinkingmachines/inkling-2-small` | max, high, medium, low, minimal（`minimal`） |
| `nex-agi/nex-n2.6` | high, medium（`medium`）。思考は無効化できません |
| `inclusionai/ling-3.2-flash:free` | 推論レベルの選択なし。プロバイダー既定を使用 |

これらのモデルに推論トークン予算は設定できません。Lingは`:free`付きの正確なIDを使い、
`includeReasoning`による表示設定は維持します。音声・動画・ファイル入力は追加していません。
詳しくは[Chatのドキュメント](../../../chat/README.ja.md)を参照してください。

Claude Fable 5.2（`claude-fable-5-2`、OpenRouterでは`anthropic/claude-fable-5.2`）、
Gemini 4 Argon（`gemini-4-argon`、OpenRouterでは`google/gemini-4-argon`）、
Mistral版GLM-5.3 Flash（`zai-glm-5-3-flash`）を明示選択できます。いずれも画像入力に対応し、
effort初期値は会話の応答時間を抑えるため`low`です。Fableはlow/medium/high/xhigh/max、
Argonはlow/medium/high、Mistral版GLM Flashはlow/high/maxに対応します。
Fableではツールを自動選択し、返された署名付きthinkingとその前の履歴を変更せず保持してください。
Gemini 4の出力上限は、上記のモデル別の制限に従います。

OpenRouterには有料・画像対応の`~openai/gpt-luna-latest`、`~openai/gpt-terra-latest`、
`~deepseek/deepseek-flash-latest`、`~z-ai/glm-flash-latest`、`xiaomi/mimo-v2.6-pro`、
`tencent/hy4`、`cohere/command-a-plus`、`bytedance-seed/seed-2-1-turbo`、
`nvidia/nemotron-3.5-super-vl`、`sakana/sakana-namazu`も追加されました。
Nemotronの無料版は別の選択肢として残ります。Namazuには出力トークン上限を送らないため、
responseLengthは厳密な上限になりません。未対応の推論レベルは選択肢に出しません。

新規設定には現在の対応モデル一覧を使い、DeepSeekのテキスト・画像モデルは`deepseek-flash`から始めます。
新たに非推奨となったOpenAI GPT-4o/GPT-4.1、Gemini 2.5 Pro/Flash、DeepSeek V4 Flash/Vision Exp、
Mistral Medium 3.5、OpenRouter Mercury 2.5/3・Kimi K2.5・GPT Latestは新規選択肢から除外します。
互換用の定数と保存済みIDは保持します。OpenRouterのカタログでも非推奨の行を隠し、保存済みの選択は保持します。
ほかのプロバイダーの既定モデルは変更しません。


![Media Avatar Chat](./images/react-media-avatar-app.png)

このブラウザ例から API を直接呼び出せないプロバイダーは、選択を無効にしています。
現在は Sakana AI と Sarashina が該当します。Sarashina の API キーは保護された
バックエンドで管理し、Node.js などのサーバー環境から利用してください。

Core 0.26.33、Chat 0.73.0、Voice 0.31.0 を使用します。

`@aituber-onair/core` を使い、返答の感情に合わせて画像・GIF・動画を
切り替えるReactチャットサンプルです。

## 特徴

- PNG・JPG・JPEG・WebP・GIF・MP4・WebMに対応（各100 MBまで）
- neutral・happy・angry・sad・relaxed・surprisedに1ファイルずつ設定
- neutral・happy・angry・sadのGIFを同梱。relaxed・surprisedはneutralで代替
- GIF・ミュート動画をそのままループ再生
- アップロードをIndexedDBに保存し、再読み込み後に復元
- Single Image Avatarサンプルと同じLLM・TTS・配信・音声入力・Kizuna・感情エフェクト

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

`OpenAI-Compatible TTS` では、origin、`/v1` ベース URL、`/audio/speech` の
完全 URL を入力できます。**Detect server** でサーバーが提供するモデルと voice の
一覧を取得し、**Test speech** で短い音声を再生して確認できます。
詳しくは [ローカル TTS セットアップガイド](https://github.com/shinshin86/aituber-onair/blob/main/docs/local-tts.ja.md) を参照してください。

```bash
cd packages/core/examples/react-media-avatar-app
npm install
npm run dev
```

起動後に **Settings → アバター** を開き、感情ごとにファイルを選択します。
動画はミュートでループ再生します。再生可能なコーデックはブラウザによって異なります。
各行には実際に表示されるメディアと「付属」「アップロード」の区別が表示されます。
「クリア」でその感情のアップロードを削除し、「すべてデフォルトに戻す」で全件削除します。

表示の優先順は、感情別のアップロード → アップロードしたneutral → 感情別の付属GIF →
付属のneutralです。アップロードがない場合は付属セットを使います。
未知の感情はneutralとして扱い、発話終了時もneutralに戻ります。
切り替え先の読み込み中は直前のメディアを表示し、再生できない場合はエラーを表示して
付属のneutralに戻ります。

ファイルはブラウザのIndexedDB（`react-media-avatar-app-media`）に保存し、再読み込み後に復元します。
その他の設定はlocalStorage（`react-media-avatar-app-settings`）に保存します。
ブラウザのサイトデータを削除すると、どちらも消えます。保存に失敗した場合はアバター設定に
エラーを表示し、直前の選択を維持します。アバター設定からファイルをサーバーへ送信することはありません。

LLM・TTS・配信の設定は「AI・音声・配信」タブにあります。
感情エフェクトを手動にすると、画面のボタンで感情を
プレビューでき、2.6秒後にneutralへ戻ります。感情エフェクトの重ね表示も引き続き使えます。
顔・目のエフェクト位置は「アンカー調整」でメディアの構図に合わせてください。

## マウス操作

アバター表示エリアでホイールを回すと、カーソル位置を中心に40〜300%で拡大・縮小できます。
ドラッグで移動し、ダブルクリックでサイズと位置を初期値に戻します。
画像・GIF・動画と感情エフェクトは一緒に拡大・移動します。サイズと位置は
localStorage（`react-media-avatar-app-view`）に保存し、再読み込み後に復元します。
チャットの操作部や設定画面では拡大・移動しません。
「アンカー調整」を閉じてから拡大・移動してください。

## 音声再生

TTSはCore標準の再生経路を使います。発話イベントに合わせて感情別のメディアを
表示し、発話終了時にneutralへ戻ります。画像は固定表示し、GIF・ミュート動画は
ファイル自体のアニメーションをループ再生します。

## 同梱メディア

`public/avatar/media/` の4種類のGIFは、AI画像生成（ChatGPT）で作成したものです。
このサンプルで使用するために同梱しています。

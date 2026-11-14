# @aituber-onair/chat

![@aituber-onair/chat ロゴ](./images/aituber-onair-chat.png)

AITuber OnAirのチャット・LLM API統合ライブラリです。このパッケージは、OpenAI、ローカルLLM含むOpenAI互換プロバイダー、Claude、Gemini、Gemini Nano（Chromeブラウザ内蔵AI）、OpenRouter、Z.ai、xAI、Kimi、DeepSeek、Mistral、Sakana AI、Sarashina、PLaMo、Agent SDKプロバイダー等の様々なAIチャットプロバイダーとやり取りするための統一されたインターフェースを提供します。

## 機能

- 🤖 **複数のAIプロバイダー対応**: OpenAI、ローカルLLM含むOpenAI互換プロバイダー、Claude (Anthropic)、Google Gemini、Gemini Nano（Chromeブラウザ内蔵AI）、OpenRouter、Z.ai、xAI、Kimi、DeepSeek、Mistral、Sakana AI、Sarashina、PLaMo、Agent SDKプロバイダー
- 🔄 **統一されたインターフェース**: 異なるプロバイダー間での一貫したAPI
- 🛠️ **ツール・関数呼び出し**: AI関数呼び出しの自動反復処理をサポート
- 💬 **ストリーミングレスポンス**: リアルタイムストリーミングチャット応答
- 🖼️ **ビジョン対応**: ビジョン対応モデルでの画像処理
- 📝 **感情検出**: AI応答からの感情抽出
- 🎯 **応答長制御**: プリセットまたはカスタムトークン制限での応答長設定
- 🔌 **Model Context Protocol (MCP)**: MCP サーバーサポート
- 🧩 **Agent SDKプロバイダー**: エージェントSDKパッケージを標準インストールに含めず、任意で `@aituber-onair/chat/agent` から利用可能

## インストール

```bash
npm install @aituber-onair/chat
```

## UMDビルド（ブラウザ/GAS）

本パッケージは既定で ESM/CJS を提供します。バンドラ無し環境（`<script>`読み込みのブラウザ、Google Apps Script）向けに UMD/IIFE バンドルも利用できます。

- グローバル名: `AITuberOnAirChat`
- 出力: `dist/umd/aituber-onair-chat.js`, `dist/umd/aituber-onair-chat.min.js`

モノレポ直下でUMDをビルド:

```bash
# 依存をインストール
npm ci

# chatパッケージをビルド
npm -w @aituber-onair/chat run build
```

### ブラウザ（UMD）

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="/dist/umd/aituber-onair-chat.min.js"></script>
  </head>
  <body>
    <script>
      const chat = AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {
        apiKey: 'your-api-key'
      });
      // ブラウザではストリーミング利用可
    </script>
  </body>
  </html>
```

### Google Apps Script（GAS）

GASはストリーミング不可・Fetch API非対応です。提供アダプターと非ストリーミングヘルパーを使用してください。

手順:
- UMDをビルドし、`dist/umd/aituber-onair-chat.min.js` をGASプロジェクトにスクリプトとして追加（例: `lib.gs`）。claspを使う場合はプロジェクト配下に配置してプッシュ。
- 別ファイル（例: `main.js`）で以下を利用:

```javascript
async function testChat() {
  // UrlFetchAppを使うfetchを注入
  AITuberOnAirChat.installGASFetch();

  const chat = AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {
    apiKey: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')
  });

  const text = await AITuberOnAirChat.runOnceText(chat, [
    { role: 'user', content: 'Hello!' }
  ]);

  Logger.log(text);
}
```

注意:
- 実行ランタイムはV8。ストリーミング不可のため `chatOnce(..., false)`/`runOnceText` を使用。
- スクリプトプロパティに `OPENAI_API_KEY` を設定。
- 実例は `packages/chat/examples/gas-basic` を参照。`appsscript.json` は任意（近年のGASは既定でV8ランタイム）。タイムゾーン等をカスタムしたい場合のみ追加してください。

## Agent SDKプロバイダー

Codex SDK、Claude Agent SDK、Copilot SDK、Cursor SDK のような
エージェントSDKを使う場合は、専用の `@aituber-onair/chat/agent` エントリを
使用します。

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';
```

このエントリはブラウザ/GAS向けUMDビルドには含まれません。エージェントSDKパッケージは
動的に読み込むため、利用する SDK だけを JavaScript ランタイムアプリ側に追加してください。

```bash
npm install @aituber-onair/chat @openai/codex-sdk
# または
npm install @aituber-onair/chat @anthropic-ai/claude-agent-sdk
# または
npm install @aituber-onair/chat @github/copilot-sdk
# または（Node.js 22.13以上が必要）
npm install @aituber-onair/chat @cursor/sdk
```

Codex SDK を使う最短例:

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const chatService = createAgentChatService('codex-sdk', {
  workingDirectory: process.cwd(),
  skipGitRepoCheck: true,
});

const messages = [
  {
    role: 'system',
    content:
      'あなたはライブ配信中のAIアバターです。親しみやすく短めに返答してください。',
  },
  { role: 'user', content: '今日はTypeScriptのライブラリを作っています。' },
  {
    role: 'assistant',
    content: 'いいですね。作業の合間に、会話で少し気分転換しましょう。',
  },
  { role: 'user', content: '夜の作業に合う飲み物をおすすめして。' },
];

const response = await chatService.chatOnce(messages, false);

console.log(response);
```

Claude Agent SDK を使う場合:

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const chatService = createAgentChatService('claude-agent-sdk', {
  workingDirectory: process.cwd(),
  maxTurns: 1,
});

const messages = [
  {
    role: 'system',
    content:
      'あなたはライブ配信中のAIアバターです。親しみやすく短めに返答してください。',
  },
  { role: 'user', content: '今日はTypeScriptのライブラリを作っています。' },
  {
    role: 'assistant',
    content: 'いいですね。作業の合間に、会話で少し気分転換しましょう。',
  },
  { role: 'user', content: '夜の作業に合う飲み物をおすすめして。' },
];

const response = await chatService.chatOnce(messages, false);

console.log(response);
```

このプロバイダーでは、Claude Agent SDK を通常のチャット応答生成にだけ使います。
既定では Claude Code のファイル操作やコマンド実行などのツール機能は使いません。
2026年6月15日以降、対象の有料 Claude プランでは Agent SDK 用の月間クレジットを
利用できます。APIキーを使う Developer Platform の利用は従来通り従量課金です。

Copilot SDK を使う場合:

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const chatService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
});

const messages = [
  {
    role: 'system',
    content:
      'あなたはライブ配信中のAIアバターです。親しみやすく短めに返答してください。',
  },
  { role: 'user', content: '今日はTypeScriptのライブラリを作っています。' },
  {
    role: 'assistant',
    content: 'いいですね。作業の合間に、会話で少し気分転換しましょう。',
  },
  { role: 'user', content: '夜の作業に合う飲み物をおすすめして。' },
];

const response = await chatService.chatOnce(messages, false);

console.log(response);
```

Copilot SDK はセッション作成時に権限リクエスト用ハンドラが必須です。
このパッケージでは安全側に倒すため、未指定時は SDK が管理するツール実行を
拒否します。ツール実行を許可したい場合は、利用側で `onPermissionRequest` を
明示してください。

```typescript
const chatService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
  onPermissionRequest: () => ({ kind: 'approve-once' }),
});
```

Cursor SDK を使う場合は、Node.js 22.13以上が必要です。

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const chatService = createAgentChatService('cursor-sdk', {
  apiKey: process.env.CURSOR_API_KEY,
  workingDirectory: process.cwd(),
});

const response = await chatService.chatOnce(
  [{ role: 'user', content: '一文で挨拶して。' }],
  false,
);

console.log(response);
```

認証には、セットアップ時に `Cursor.auth.login()` を一度実行する方法、
`CURSOR_API_KEY` を設定する方法、`apiKey` を渡す方法があります。Cursor CLI の
`agent login` では SDK の認証情報は作成されません。利用分は Cursor プランに
請求されます。このプロバイダーは `tools: []` と `settingSources: []` を指定し、
tools、vision、MCP は使用しません。既定のモデルIDは、
`Cursor.models.list()` で Cursor の Auto として返される `default` です。
別のモデルを使う場合は、`Cursor.models.list()` が返すIDを `model` に指定します。

利用前に、各 SDK のローカル認証を済ませておく必要があります。SDK パッケージが
未インストール、または認証が未完了の場合は、実行時に元の SDK エラー詳細を含む
エラーを投げます。

## 使用方法

### 基本的なチャット

```typescript
import { ChatServiceFactory, ChatServiceOptions } from '@aituber-onair/chat';

// チャットサービスを作成
const options: ChatServiceOptions = {
  apiKey: 'your-api-key',
  model: 'gpt-4' // オプション、指定がない場合はプロバイダーのデフォルトを使用
};

const chatService = ChatServiceFactory.createChatService('openai', options);

// シンプルなチャット処理
const messages = [
  { role: 'system', content: 'あなたは親切なアシスタントです。' },
  { role: 'user', content: 'こんにちは！元気ですか？' }
];

await chatService.processChat(
  messages,
  (partialText) => {
    // ストリーミング応答を処理
    console.log('部分:', partialText);
  },
  async (completeText) => {
    // 完全な応答を処理
    console.log('完了:', completeText);
  }
);
```

### プロバイダー別の使用方法

#### OpenAI

ツール呼び出しにResponsesが必要なモデルは、ツール設定時に同APIを使用します。
`gpt-6.1-sol`（`MODEL_GPT_6_1_SOL`）は画像入力とストリーミングに対応する
明示選択モデルです。factoryはResponsesを既定とし、ツールなしの場合は
`gpt5EndpointPreference: 'chat'`でChat Completionsを選べます。
関数ツールとMCPは、`OpenAIChatService`を直接使う場合も標準OpenAI
エンドポイントではResponsesに送信します。カスタムエンドポイントは
Chat Completions形式を維持し、認証情報を別URLへ転送せず、このモデルの
ツール付きリクエストを拒否します。推論レベルは`low`、`medium`、`high`、
`xhigh`、`max`で、`none`/`minimal`は`low`へ補正します。チャットの応答速度を
優先し、API既定の`medium`ではなく`low`をパッケージ既定にします。
プロバイダーの既定モデルは変更しません。
[Model API reference](https://developers.openai.com/api/docs/models/gpt-6.1-sol)、
[API guide](https://developers.openai.com/api/docs/guides/latest-model)。

画像入力・ストリーミングに対応し、ツール利用にResponses APIが必要なモデルは、既定でResponsesを使います。`gpt-6.1-terra`（`MODEL_GPT_6_1_TERRA`）もこのグループの明示選択モデルです。`reasoning_effort`は `none`、`low`、`medium`、`high`、`xhigh`、`max` に対応します。API既定は `medium`、パッケージ既定は `none` です。ツールを使わない場合はChat Completionsも選べます。標準エンドポイントでのツール・MCP利用はResponsesへ切り替え、カスタムエンドポイントでのツール利用は送信前にエラーにします。

このパッケージは `temperature`、`top_p`、`logprobs` などのサンプリング項目を送信しません。OpenRouter版の `openai/gpt-6.1-terra` はChat Completionsを使い、推論設定のパッケージ既定は `none` です。プロバイダーの既定モデルは変更しません。

[公式Terraモデル仕様](https://developers.openai.com/api/docs/models/gpt-6.1-terra)、[APIパラメーターの移行ガイド](https://developers.openai.com/api/docs/guides/latest-model#gpt-6-astra-update-api-and-model-parameters)、[OpenRouterモデルカタログ](https://openrouter.ai/api/v1/models)で対応範囲を確認できます。

`gpt-6-astra`（`MODEL_GPT_6_ASTRA`）を明示選択できます。ツール呼び出しに必要なResponses APIへ自動ルーティングし、画像入力とストリーミングに対応します。推論レベルは`low`（package既定）、`medium`、`high`、`xhigh`、`max`です。`none`/`minimal`は`low`へ補正します。既存の`gpt5Preset`と`gpt5EndpointPreference`は互換性のため名前を維持しますが、Astraの標準エンドポイントはResponsesに固定されます。 [API guide](https://developers.openai.com/api/docs/guides/latest-model).

`gpt-6-sol`（`MODEL_GPT_6_SOL`）も画像入力とストリーミングに対応します。
既定ではResponses APIを使い、`none`、`low`、`medium`、`high`、`xhigh`、`max`を
指定できます。パッケージ既定は`none`です。
`gpt5EndpointPreference: 'chat'`でChat Completionsを選べます。
`none`より高い推論レベルを明示指定した場合はResponsesを使います。

`gpt-6-luna`（`MODEL_GPT_6_LUNA`）は画像入力、ストリーミング、関数呼び出しに
対応します。既定ではResponses APIを使い、`none`、`low`、`medium`、`high`、
`xhigh`、`max`を指定できます。応答速度を優先し、パッケージ既定は`none`です。
`gpt5EndpointPreference: 'chat'`でChat Completionsを選ぶと、
この既定値で関数呼び出しも使えます。`none`より高い推論レベルを
明示指定した場合はResponsesを使います。[Model API reference](https://developers.openai.com/api/docs/models/gpt-6-luna).

```typescript
const openaiService = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5.4-pro',
  gpt5EndpointPreference: 'responses', // GPT-5.4 Pro では必須
  reasoning_effort: 'medium',
  verbosity: 'medium'
});
```

Chat Completionsを使う場合:

```typescript
endpoint: 'https://api.openai.com/v1/chat/completions';
```

##### OpenAI互換API（ローカルLLM向け）最短手順

```typescript
const localCompatibleService = ChatServiceFactory.createChatService(
  'openai-compatible',
  {
    apiKey: process.env.OPENAI_COMPAT_API_KEY || 'dummy-key',
    model: process.env.OPENAI_COMPAT_MODEL || 'your-local-model',
    endpoint:
      process.env.OPENAI_COMPAT_ENDPOINT ||
      'http://127.0.0.1:18080/v1/chat/completions',
  },
);
```

注意:
- `endpoint` は省略記法ではなく、完全URLで指定してください。
- 接続先サーバーは OpenAI互換API 契約を満たす必要があります。
- 本パッケージは特定のローカルLLM製品に依存しません。

#### Agent SDKプロバイダー

`@aituber-onair/chat/agent` は、Codex SDK、Claude Agent SDK、Copilot SDK、
Cursor SDK のようなエージェントSDK向けの実験的なプロバイダーを公開します。
ブラウザ/GAS向けUMDエントリには含まれません。Cursor SDK では任意で APIキーを
指定でき、ほかの Agent SDK プロバイダーは各 SDK のローカル認証を使用します。

利用するエージェントSDKパッケージだけを、利用側の JavaScript ランタイムアプリに追加してください。

```bash
npm install @aituber-onair/chat @openai/codex-sdk
# または
npm install @aituber-onair/chat @anthropic-ai/claude-agent-sdk
# または
npm install @aituber-onair/chat @github/copilot-sdk
# または（Node.js 22.13以上が必要）
npm install @aituber-onair/chat @cursor/sdk
```

`@openai/codex-sdk`、`@anthropic-ai/claude-agent-sdk`、
`@github/copilot-sdk`、`@cursor/sdk` は `@aituber-onair/chat` の依存関係には
含めていません。SDK は動的に読み込むため、通常の API プロバイダーだけを使う
ユーザーはこれらのエージェントSDKパッケージをインストールする必要がありません。

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const codexService = createAgentChatService('codex-sdk', {
  workingDirectory: process.cwd(),
  skipGitRepoCheck: true,
});

const messages = [
  {
    role: 'system',
    content:
      'あなたはライブ配信中のAIアバターです。視聴者との自然な会話を続けてください。',
  },
  { role: 'user', content: '最近、個人開発の進め方で悩んでいます。' },
  {
    role: 'assistant',
    content: '無理なく続けられる形を一緒に考えましょう。',
  },
  { role: 'user', content: '今日は何から手をつけるのが良さそう？' },
];

const result = await codexService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

Claude Agent SDK を使う場合は `claude-agent-sdk` を指定します。

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const claudeService = createAgentChatService('claude-agent-sdk', {
  workingDirectory: process.cwd(),
  maxTurns: 1,
});

const messages = [
  {
    role: 'system',
    content:
      'あなたはライブ配信中のAIアバターです。視聴者との自然な会話を続けてください。',
  },
  { role: 'user', content: '最近、個人開発の進め方で悩んでいます。' },
  {
    role: 'assistant',
    content: '無理なく続けられる形を一緒に考えましょう。',
  },
  { role: 'user', content: '今日は何から手をつけるのが良さそう？' },
];

const result = await claudeService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

Claude Agent SDK は既定で `tools: []`、`permissionMode: 'dontAsk'`、
`settingSources: []` を指定し、Claude Code のファイル操作・コマンド実行や
プロジェクト/ユーザー設定を使わずにチャット応答を生成します。

Copilot SDK を使う場合は `copilot-sdk` を指定します。

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const copilotService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
});

const messages = [
  {
    role: 'system',
    content:
      'あなたはライブ配信中のAIアバターです。視聴者との自然な会話を続けてください。',
  },
  { role: 'user', content: '最近、個人開発の進め方で悩んでいます。' },
  {
    role: 'assistant',
    content: '無理なく続けられる形を一緒に考えましょう。',
  },
  { role: 'user', content: '今日は何から手をつけるのが良さそう？' },
];

const result = await copilotService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

Copilot SDK はセッション作成時に権限リクエスト用ハンドラが必須です。
このパッケージでは安全側に倒すため、未指定時は SDK が管理するツール実行を
拒否します。ツール実行を許可する場合は、利用側で `onPermissionRequest` を
渡してください。たとえば、すべて許可する場合は次のように指定できます。

```typescript
const copilotService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
  onPermissionRequest: () => ({ kind: 'approve-once' }),
});
```

Cursor SDK を使う場合は `cursor-sdk` を指定します。Node.js 22.13以上が必要です。

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const cursorService = createAgentChatService('cursor-sdk', {
  apiKey: process.env.CURSOR_API_KEY,
  workingDirectory: process.cwd(),
});

const result = await cursorService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

認証には、セットアップ時に `Cursor.auth.login()` を一度実行する方法、
`CURSOR_API_KEY` を設定する方法、`apiKey` を渡す方法があります。Cursor CLI の
`agent login` では SDK の認証情報は作成されません。利用分は Cursor プランに
請求されます。このプロバイダーはローカルエージェントに `tools: []` と
`settingSources: []` を渡すため、tools、vision、MCP は使用できません。
`DEFAULT_CURSOR_SDK_MODEL` は `default` です。`Cursor.models.list()` では
Cursor の Auto として返されます。別のモデルを使う場合は、
`Cursor.models.list()` が返すIDを `model` に指定します。

利用可能なプロバイダー:
- `codex-sdk`: `@openai/codex-sdk` と Codex 認証が必要です。
- `claude-agent-sdk`: `@anthropic-ai/claude-agent-sdk` と Claude Agent SDK 認証が必要です。
- `copilot-sdk`: `@github/copilot-sdk` と GitHub Copilot 認証が必要です。
- `cursor-sdk`: `@cursor/sdk`、Node.js 22.13以上、Cursor SDK の認証またはAPIキーが必要です。

現時点の制限:
- テキストチャットのみ対応します。
- Vision chat、tools、MCP servers は意図的に未対応です。
- エージェントSDKパッケージが未インストール、またはローカル認証が未完了の場合は、
  実行時に元のSDKエラー詳細を含むエラーを投げます。

#### OpenAI互換（ローカル/セルフホスト）

公式OpenAI利用と互換エンドポイント利用を明確に分離したい場合は、
`openai-compatible` を使用してください。

```typescript
const compatibleService = ChatServiceFactory.createChatService(
  'openai-compatible',
  {
    apiKey: process.env.OPENAI_COMPAT_API_KEY || 'dummy-key',
    endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
    model: 'your-local-model',
  },
);
```

注意:
- `openai-compatible` は `endpoint` と `model` の指定が必須です。
- `openai-compatible` では `apiKey` は任意です。
- `openai-compatible` では `mcpServers` は利用できません。
- `openai-compatible` の vision 対応可否は `unknown` として扱われます。
  画像リクエスト自体は許可されますが、未対応の endpoint / model の
  場合は実行時エラーになります。
- 既存の `openai` プロバイダーの挙動は変更されません。

エンドポイント用ヘルパーは、サーバーの Origin、API のベース URL、完全な Chat Completions URL を受け付けます。クエリとフラグメントを含む URL は受け付けません。プロバイダー本体には引き続き完全な URL を渡してください。

```typescript
import {
  listOpenAICompatibleModels,
  resolveOpenAICompatibleEndpoint,
  testOpenAICompatibleConnection,
} from '@aituber-onair/chat';

const endpoint = resolveOpenAICompatibleEndpoint('http://localhost:11434/v1');
const models = await listOpenAICompatibleModels({ endpoint: endpoint.baseUrl });
const connection = await testOpenAICompatibleConnection({
  endpoint: endpoint.baseUrl,
  model: models[0],
});
// Pass endpoint.chatCompletionsUrl to the openai-compatible provider.
```

`OPENAI_COMPATIBLE_LOCAL_PRESETS` には Ollama、LM Studio、llama.cpp、vLLM の標準 URL が入っています。モデル一覧は文章を生成せず `GET /models` で取得します。起動方法と CORS 設定は[ローカル LLM ガイド](../../docs/local-llm.ja.md)を参照してください。

`reasoning_effort` の選択肢はモデルによって異なります。
- `gpt-5.6` / `gpt-5.6-sol` / `gpt-5.6-terra` / `gpt-5.6-luna`:
  `'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'`
- `gpt-5.4-pro`: `'medium' | 'high' | 'xhigh'`（Responses API 専用）
- `gpt-5.5`: `'none' | 'low' | 'medium' | 'high' | 'xhigh'`
- `gpt-5.4`: `'none' | 'low' | 'medium' | 'high' | 'xhigh'`
- `gpt-5.4-mini` / `gpt-5.4-nano`: `'none' | 'low' | 'medium' | 'high' | 'xhigh'`
- `gpt-5.1`: `'none' | 'low' | 'medium' | 'high'`
- `gpt-5` / `gpt-5-mini` / `gpt-5-nano`: `'minimal' | 'low' | 'medium' | 'high'`

このパッケージでのデフォルト値と正規化:
- `'none'` に対応するモデル（`gpt-5.1`, `gpt-5.4`, `gpt-5.4-mini`,
  `gpt-5.4-nano`, `gpt-5.5`, GPT-5.6 family）は、高速なチャット応答を
  優先してデフォルトが `'none'` になります。OpenAI 公式のデフォルトが `'medium'` のモデルも
  ありますが、このパッケージでは意図的に低遅延を優先しています。
- 旧 GPT-5 系モデル（`gpt-5`, `gpt-5-mini`, `gpt-5-nano`）は、
  高速なチャット応答向けに `reasoning_effort` のデフォルトが
  `'minimal'` です。
- `gpt-5.4-pro` は対応する最低 reasoning effort が `'medium'` のため、
  デフォルトも `'medium'` です。
- モデルが対応していない値はリセットされず、最も近い対応値に丸められます
  （例: `gpt-5.4-nano` の `'minimal'` は `'none'` に、`gpt-5-nano` の
  `'none'` は `'minimal'` に、`gpt-5.1` の `'xhigh'` は `'high'` に
  解決されます）。

##### GPT-5 プリセットと低遅延チャット（AITuber 向け）

モデルごとに `reasoning_effort` と `verbosity` を調整する代わりに、
`gpt5Preset` を指定できます。

- `casual` – 最速の応答（`reasoning_effort: 'minimal'`,
  `verbosity: 'low'`）。`'minimal'` 非対応モデルでは、そのモデルで使える
  最小の effort に解決されます（GPT-5.1 / 5.4 / 5.5 / 5.6 系では `'none'`、
  `gpt-5.4-pro` では `'medium'`）。
- `balanced` – `reasoning_effort: 'medium'`, `verbosity: 'medium'`。
- `expert` – `reasoning_effort: 'high'`, `verbosity: 'high'`。

深い推論よりも最初の応答までの速さが重要なリアルタイムのキャラクター
チャット(AITuber 向け)には、次の設定を推奨します。

```typescript
const aituberChatService = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5.6-luna',
  gpt5Preset: 'casual', // このモデルでは reasoning_effort 'none' に解決
  responseLength: 'veryShort', // 少し長めの応答なら 'short'
});
```

注意点:
- 低い reasoning effort は、速度と引き換えに複雑な質問への回答品質が
  低下する可能性があります。ツール/関数呼び出しや MCP を多用する場合は
  `balanced` 以上を推奨します。
- 一部の GPT-5.4 系モデルでは、Chat Completions API で function tools と
  `reasoning_effort` の併用がサポートされていません。ツールと reasoning
  設定を併用する場合は `gpt5EndpointPreference: 'responses'` を指定して
  ください。

**GPT-5ファミリーの概要**

- `gpt-5.6` / `gpt-5.6-sol` – 複雑なプロフェッショナル用途向けの GPT-5.6 フラッグシップ tier。`gpt-5.6` は Sol にルーティングされる alias です。
- `gpt-5.6-terra` – GPT-5.6 の知能とコストのバランスを重視したモデル。
- `gpt-5.6-luna` – コスト重視の高頻度ワークロード向け GPT-5.6 モデル。
- `gpt-5.5` – 一世代前のフロンティアモデル。テキスト/画像入力に対応し、Chat Completions API と Responses API の両方で利用できます。
- `gpt-5.4-pro` – GPT-5.4 の上位モデル。Responses API でのみ利用可能。
- `gpt-5.4` – コーディング、指示追従、長い文脈を伴うエージェント用途を強化した一世代前の GPT-5 系モデル。
- `gpt-5.4-mini` – コーディング、ツール利用、マルチモーダル用途向けの高速な GPT-5.4 系小型モデル。

プロバイダーのデフォルトは `gpt-5.6-luna` です。OpenAI が `gpt-5-nano` の
後継として案内しているモデルで、応答速度を優先して
`reasoning_effort: 'none'` をデフォルトにしています。

OpenAI が非推奨にした、または提供を終了したモデルは、既存コードがコンパイル
できるよう定数として残しています（`OPENAI_DEPRECATED_MODELS`）。ただし
supported models からは外しています。提供終了済みのモデルへのリクエストは
OpenAI API 側でエラーになります。

| モデル | 状態 | 後継 |
| --- | --- | --- |
| `o1`, `o3-mini` | 2026-10-23 に提供終了 | `gpt-5.6-sol` |
| `gpt-4.1-nano` | 2026-10-23 に提供終了 | `gpt-5.6-luna` |
| `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini` | 日付付きスナップショットは2026-10-14に非推奨化、2027-01-14に提供終了予定 | `gpt-6-luna` |
| `o1-mini` | 2025 年に提供終了 | `gpt-5.6-sol` |
| `gpt-5`, `gpt-5-mini`, `gpt-5-nano` | 2026-12-11 に提供終了予定 | `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` |
| `gpt-5.1`, `gpt-5.4-nano` | 2027-04-01 に提供終了予定 | `gpt-6-sol`, `gpt-6-luna` |

詳しくは [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) を参照してください。

`gpt-5.5-pro` は OpenAI のドキュメント上でストリーミング非対応のため、
ストリーミング前提の通常チャットフローを持つこのパッケージの supported
models には含めていません。

### OpenAI互換対応範囲

必須:
- 非ストリーム応答（`stream: false`）
- ストリーム応答（`stream: true` / SSE）
- 会話履歴の継続参照（`messages`）
- エラー処理（特に4xxとタイムアウト）

ベストエフォート:
- tools/function calling
- vision入力（`openai-compatible` では実行時検証）
- JSONモードの厳密互換

### OpenAI互換APIトラブルシューティング

- CORS: ブラウザ環境では互換サーバーが
  `Access-Control-Allow-Origin` と
  `Access-Control-Allow-Headers` を返す必要があります。
- Authorization: `apiKey` を指定した場合は
  `Authorization: Bearer <apiKey>` を送信します。
  `apiKey` 未指定時は Authorization ヘッダーを送信しません。
  サーバー側が期待するトークン形式を確認してください。
- model名: 互換サーバーごとに利用可能なモデルIDが異なります。
  エンドポイントが受け付ける正確なモデル名を指定してください。
- Vision: `openai-compatible` では画像対応を事前検証しません。
  画像付きリクエストが失敗する場合は、endpoint と model の双方が
  vision入力に対応しているか確認してください。
- ストリーム互換: `stream: true` では OpenAI互換のSSE形式
  （`data: {...}` + `data: [DONE]`）を想定しています。
  形式が異なる場合、ストリーム解析に失敗する可能性があります。

### 互換プローブ（自動検証）

`examples/compat-probe` で互換性を自動検証できます:

```bash
npm -w @aituber-onair/chat run openai-compatible:probe
```

CI/ローカルで再現性を高める場合は
`examples/mock-openai-server` を併用してください。

#### Claude (Anthropic)

`claude-fable-5-1`（`MODEL_CLAUDE_5_1_FABLE`）をMessages API経由の明示選択として追加しています。画像・ストリーミング・自動ツール選択に対応し、常時adaptive thinkingのまま`low`/`medium`/`high`/`xhigh`/`max`で深度を調整できます。強制ツール指定は使いません。会話を継続するときは返された`assistant_message`を履歴に保持してください。署名付きthinkingの前にあるsystem・tools・履歴を変更するとAPIで拒否される場合があります。このモデルには30日間のデータ保持設定が必要です。 [Migration guide](https://platform.claude.com/docs/en/models/fable-5-1/migration-guide).

`claude-fable-5-2`（`MODEL_CLAUDE_5_2_FABLE`）もMessages API経由で明示選択できます。Fable 5.1も引き続き利用できます。テキスト・画像入力に対応し、コンテキストは100万トークン、最大出力は128Kトークンです。会話の応答時間を抑えるため、パッケージのeffort初期値は`low`にしています。APIの既定値は`high`で、上記5段階を指定できます。`thinking`・`temperature`・`top_p`・`top_k`は送らず、ツールは自動選択にします。署名付きthinkingを保持し、その前にあるsystem・tools・履歴を変更しないでください。この制約はすべてのアカウントに適用されます。30日間のデータ保持が必要です。標準料金は100万トークンあたり入力8ドル・出力40ドルです。OpenRouterでは`anthropic/claude-fable-5.2`を選択でき、既存のFable 5.1と同様にeffort初期値を`low`、`tool_choice`を省略します。 [モデル概要](https://platform.claude.com/docs/en/models/fable-5-2/overview)、[Messages APIの制約](https://platform.claude.com/docs/en/models/fable-5-2/whats-new-fable-5-2)。

```typescript
const claudeService = ChatServiceFactory.createChatService('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-opus-5',
  reasoning_effort: 'low'
});
```

`claude-opus-5` と `claude-opus-5-5` は高性能用途向けの明示的な選択肢として利用でき、パッケージの
既定値にはしていません。Claude Opus 5 は adaptive thinking が既定で有効です。
Opus 5.5 は画像入力と5段階の effort に対応します。effort を省略した場合、
パッケージは `low` を送信します。API 自体の既定値は `medium` です。
Opus 5.5 の adaptive thinking は常時有効で、この実装は thinking モードを上書きしません。
[Effort リファレンス](https://platform.claude.com/docs/en/build-with-claude/effort)。
`claude-sonnet-5-5`（`MODEL_CLAUDE_5_5_SONNET`）は Messages API の明示的な選択肢として、
画像入力、streaming、自動ツール選択に対応します。既定で adaptive thinking が有効で、
effortは5段階すべてに対応します。強制ツール選択はAPIで拒否されますが、このパッケージは
送信しません。継続時は返された `assistant_message` を会話履歴に保持してください。
[Migration guide](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide)。
`claude-haiku-5-5`（`MODEL_CLAUDE_5_5_HAIKU`）は
`https://api.anthropic.com/v1/messages` 経由の明示的な選択肢として、
テキスト・画像入力、streaming、通常の自動ツール呼び出しに対応します。
プロバイダーの既定モデルは Haiku 4.5 のままです。
低レイテンシーの会話向けに、パッケージと React の選択時の effort は `low` とします。
API 自体の既定値は `medium` です。5段階すべてに対応し、明示した値を維持します。
adaptive thinking は暗黙に有効なままで、thinking モード切り替えは公開せず、
手動の thinking budget や sampling パラメーターも送信しません。
Sonnet 5.5 の `between_tools` を指定する必要はありません。
[Effort guidance](https://platform.claude.com/docs/en/build-with-claude/effort#recommended-effort-levels-for-claude-haiku-55)。

署名付き thinking を保持するモデルでは system、tools、過去の履歴を変更せず、
返された `assistant_message` とツール結果を末尾に追加してください。
Haiku 5.5 は表示用テキストの前に、thinking 本文が空で署名だけを含むブロックを
返す場合があります。同じアカウントで履歴を再送し、assistant prefill ではなく
user ターンでリクエストを終えてください。thinking は `max_tokens` に含まれ、
短い `responseLength` では表示用の回答に達する前に上限で終了する場合があります。
必要に応じて `chatOnce(..., maxTokens)` の上限を増やしてください。
[Migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide)。

対応するClaudeモデルでは `reasoning_effort` を指定でき、Anthropic APIの
`output_config.effort` に変換されます。リアルタイムの会話向けに、調整可能なすべてのモデルで
パッケージ既定値を `low` とし、指定がないときも `low` を送信します。Claude API 自体の既定値は
`high`（Opus 5.5 と Haiku 5.5 では `medium`）です。別のレベルを使う場合は `reasoning_effort` を指定してください。
モデルが対応していない `xhigh` や `max` を指定した場合は `high` を使います。

- Claude Haiku 5.5、Opus 5.5、Fable 5、Opus 5、Sonnet 5.5、Sonnet 5、Opus 4.8、Opus 4.7:
  `low`、`medium`、`high`、`xhigh`、`max`
- Claude Opus 4.6、Sonnet 4.6:
  `low`、`medium`、`high`、`max`
- Claude Opus 4.5: `low`、`medium`、`high`

effortを下げるとレイテンシーとトークン効率を優先できますが、表示される回答の
短さは保証されません。短い回答が必要な場合は、回答長の指示も併用してください。
複数ターンのツール呼び出しでは provider 固有の thinking / tool-use ブロックを
保持するため、返された `completion.assistant_message` を会話履歴へ追加してください。
Claudeのrefusalはtool errorではなく終端completionとして扱います。Anthropicから
返された場合は、streamingの`processChat` callbackを含めて
`finish_reason: 'refusal'`と`stop_details`を保持します。

`claude-sonnet-4-5-20250929` は Anthropic が非推奨にしており、2026-11-30 に
提供終了します。`CLAUDE_DEPRECATED_MODELS` として定数は残していますが、
supported models からは外しています。代わりに `claude-sonnet-5-5` を使ってください。
[Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)

#### Google Gemini

Gemini 4のモデル（現在はArgon・Carbon・Hydrogen）は、`v1beta`のGenerateContent REST経由で
テキスト・画像入力、ストリーミング、関数呼び出しに対応する安定版の明示選択肢です。
思考は必須で、このパッケージでは`low`（応答速度を考慮した初期値）・`medium`・`high`を選べます。
プロバイダーのデフォルトは`gemini-3.1-flash-lite`のままです。

- Gemini 4 Argon（`gemini-4-argon`、`MODEL_GEMINI_4_ARGON`）とCarbon
  （`gemini-4-carbon`、`MODEL_GEMINI_4_CARBON`）は有料枠が必要です。
  Google側の初期値は`medium`です。CarbonはArgonより思考トークンが多く、応答時間と消費量が増えます。
- Gemini 4 Hydrogen（`gemini-4-hydrogen`、`MODEL_GEMINI_4_HYDROGEN`）は、レート制限付きの無料枠でも利用できます。
  Google側の初期値は`high`です。追加の`xhigh`はGenerateContent RESTの列挙値の表記が公開されていないため、選択肢に含めていません。
  有料枠は100万トークンあたり入力$1.50・出力$7.50で、思考も出力料金に含まれます。

思考用トークンも出力上限に含まれるため、短い`responseLength`でも、暗黙の上限は最低32,768トークンです。
短い回答が必要な場合はプロンプトでも指示してください。
`chatOnce`・`visionChatOnce`の明示上限は、次の1リクエストあたりの上限まで反映します。
小さな上限を明示すると、思考だけで上限に達する場合があります。

| 直接Gemini APIのモデル | 非ストリーミング上限 | ストリーミング上限 |
| --- | --- | --- |
| Argon・Carbon | 32,768 | 65,536 |
| Hydrogen | 65,536 | 65,536 |

関数呼び出しの思考署名は保持します。サンプリング設定や明示的キャッシュは送信せず、
long decodeや複数リクエストにまたがる自動継続生成には対応していません。
[Googleの移行ガイド](https://aistudio.google.com/docs/latest-model?generate-content=true)、
[Hydrogenの移行ガイド](https://aistudio.google.com/docs/whats-new-gemini-4-hydrogen)、
[思考の仕様](https://aistudio.google.com/docs/thinking?generate-content=true)、
[料金表](https://aistudio.google.com/docs/pricing)を参照してください。

```typescript
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-3.1-flash-lite',
  reasoning_effort: 'minimal'
});
```

`gemini-3.1-flash-lite` は既定の Flash-Lite モデルとして維持します。
最新の安定版・低遅延 Flash-Lite として `gemini-3.5-flash-lite` を利用できます。
低遅延のコーディング・エージェント・マルチモーダル用途向けの最新安定版として
`gemini-3.8-flash` を明示的に選択できます。`gemini-3.6-flash` も引き続き
利用できます。`gemini-3.7-flash` と `gemini-3.5-flash` は 2026-10-08 に
Google が非推奨にし、リクエストはそれぞれ `gemini-3.8-flash` と
`gemini-3.6-flash` に転送されます。
`gemini-3.7-flash`、`gemini-3.5-flash`、
`gemini-3.1-flash-lite-preview`、`gemini-3-pro-preview`、
`gemini-2.5-flash-lite-preview-06-17` などの preview / deprecated
モデルは後方互換のため明示的な model string では利用できますが、本番用途では
新しいモデルへ移行してください。

Gemini 3 モデルでは `reasoning_effort` を指定できます。この値は Gemini の
`thinkingConfig.thinkingLevel` に変換され、`includeThoughts: false` を維持します。

- Gemini 3 モデルは、低遅延なチャット向けに利用可能な最小の effort を既定値にします。
- `minimal` 対応の Flash / Flash-Lite は `minimal`, `low`, `medium`, `high`
  を公開し、既定値は `minimal` です。
- `minimal` 非対応モデルは `low`, `medium`, `high` を公開し、既定値は `low`
  です。現在該当するのは Gemini 3.8 Flash、Gemini 3.7 Flash、
  Gemini 3 Pro です。

これにより各モデルで利用可能な最小の thinking level を使い、短い出力上限を
hidden thinking が使い切るリスクを抑えます。Gemini 2.5 は
`thinkingBudget` を使うため、`reasoning_effort` は送信しません。
generateContent の [ThinkingConfig リファレンス](https://ai.google.dev/api/generate-content#ThinkingConfig)
では `thinkingLevel` は Gemini 3 以降に対応し、それ以前のモデルではエラーになります。
Interactions API の Gemini 2.5 の表を、この実装には適用していません。

Gemini 2.5 ProとFlashは2026-11-02に非推奨となりました。定数は
`GEMINI_DEPRECATED_MODELS`に残し、推奨一覧と選択UIから除外しています。
2026-12-01以降は、それぞれ`gemini-3.8-flash`と`gemini-3.5-flash-lite`へ
転送されます。Gemini 2.5 Flash-Liteは引き続き対応しています。
[Googleの変更履歴](https://aistudio.google.com/docs/changelog)を参照してください。

#### OpenRouter

次の追加モデルは、画像入力・ツール・ストリーミングに対応する有料の明示選択肢です。
プロバイダーのデフォルトは`google/gemma-4-31b-it:free`のままです。
カタログに推論レベルが記載されているモデルだけにレベル設定を表示します。
記載がないモデルでは推論の表示切り替えのみを提供し、推論レベルや推論トークン予算は送りません。

| モデルID | 推論レベル（パッケージ初期値） |
| --- | --- |
| `~openai/gpt-luna-latest` | none, low, medium, high, xhigh, max (none) |
| `~openai/gpt-terra-latest` | none, low, medium, high, xhigh, max (none) |
| `~deepseek/deepseek-flash-latest` | none, low, high, max (none) |
| `~z-ai/glm-flash-latest` | low, high, max (low) |
| `xiaomi/mimo-v2.6-pro` | 表示切り替えのみ。レベル・トークン予算は未対応 |
| `tencent/hy4` | none, low, high (none) |
| `cohere/command-a-plus` | 表示切り替えのみ。レベル・トークン予算は未対応 |
| `bytedance-seed/seed-2-1-turbo` | 表示切り替えのみ。レベル・トークン予算は未対応 |
| `nvidia/nemotron-3.5-super-vl` | 表示切り替えのみ。レベル・トークン予算は未対応 |
| `sakana/sakana-namazu` | none, high (none) |

`~`で始まるIDは各系統の最新モデルへ転送されるため、転送先は変わる場合があります。
削除済みの`~openai/gpt-latest`は非推奨の互換性用エクスポートとして残しています。
代わりに`~openai/gpt-luna-latest`または`~openai/gpt-terra-latest`を使用してください。
`~z-ai/glm-flash-latest`は思考が必須です。カタログ上の初期値は`max`ですが、
パッケージでは応答速度を考慮して`low`にしています。ほかの追加モデルで推論レベルを指定できるものは、
`none`を初期値とし、対応する明示値を指定した場合はその値を送ります。

有料の`nvidia/nemotron-3.5-super-vl`と、既存の`:free`版は別の選択肢です。
カタログにファイル・音声・動画入力が記載されていても、このパッケージの対応はテキスト・画像入力に限ります。
Namazuでは非対応の`max_tokens`を明示上限も含めて省略します。そのため、応答長プリセットでは
出力トークン数を制限できません。短い回答が必要な場合はプロンプトで指示してください。
推論トークン予算も送信しません。[OpenRouterのパラメーター処理](https://openrouter.ai/docs/guides/routing/provider-selection#requiring-providers-to-support-all-parameters)では、
標準設定で非対応パラメーターが無視されることを確認しています。
提供状況・入力形式・パラメーター・価格は[現行モデルカタログ](https://openrouter.ai/api/v1/models)で確認しました。

`google/gemini-4-argon`（`MODEL_GOOGLE_GEMINI_4_ARGON`）は、OpenRouterのChat Completions経由で
明示選択できます。有料で、画像入力・ツール・ストリーミングに対応します。思考は必須で、初期値は`low`、
ほかに`medium`・`high`を選べます。プロバイダーのデフォルトは変更していません。
思考を含む暗黙の`max_tokens`は最低32,768で、呼び出し時の明示上限も利用できます。
このモデルの推論トークン予算は公開していません。提供元カタログにはほかの入力形式もありますが、
このパッケージの対応はテキスト・画像入力に限ります。
`google/gemini-4-carbon`（`MODEL_GOOGLE_GEMINI_4_CARBON`）も有料の明示選択肢で、
推論設定・トークン下限・入力形式の対応はArgonと同じです。
`google/gemini-4-hydrogen`（`MODEL_GOOGLE_GEMINI_4_HYDROGEN`）も有料の明示選択肢で、
同じ推論設定と32,768トークンの下限を使います。直接Google APIの無料枠は、このOpenRouter IDには適用されません。

OpenRouterのカタログから削除された`inception/mercury-2.5`と
`inception/mercury-3`、2026-11-18に終了予定の`moonshotai/kimi-k2.5`は、
`OPENROUTER_DEPRECATED_MODELS`に残し、対応一覧と選択UIから除外しています。
代わりに`google/gemma-4-31b-it:free`または`moonshotai/kimi-k3.1-pro`を使用してください。
OpenRouter版のGPT-4系IDは現行カタログに存在するため、対応を継続しています。

次のモデルは既定を変更せず、OpenRouterのChat Completions経由で明示選択できます。テキスト専用の選択肢はNemotron 3.5 Lightning、Solar Mini4、Solar Pro 4、Ling 3.1 Flashで、それ以外は画像入力にも対応します。ファイル・音声・動画入力の対応を意味するものではありません。

| Model ID | 推論レベル（package既定） |
| --- | --- |
| `mistralai/mistral-large-4-0` | `none`（パッケージ既定）、`high`（上流既定）。推論トークン予算なし |
| `unbiased/pareto-26.9` | 推論レベル選択なし（プロバイダー既定） |
| `anthropic/claude-haiku-5.5` | none, low, medium, high, xhigh, max (none) |
| `deepseek/deepseek-v4.1-flash-1017` | none, low, high, max (none) |
| `moonshotai/kimi-k3.1-pro` | none, low, high, max (none) |
| `minimax/minimax-m3.1-flash` | low, medium, high, xhigh, max (low) |
| `unbiased/pareto-26.10` | 推論レベル選択なし。推論トークン予算なし |
| `inclusionai/ling-3.0-flash-vl` | 推論レベル選択なし。推論トークン予算なし |
| `nex-agi/nex-n2.5-pro` | none, medium, high (none) |
| `openai/gpt-6.1-sol` | max, xhigh, high, medium, low (low) |
| `openai/gpt-6.1-terra` | none, low, medium, high, xhigh, max (none) |
| `openai/gpt-6-sol` | max, xhigh, high, medium, low, none (none) |
| `openai/gpt-6-luna` | max, xhigh, high, medium, low, none (none) |
| `anthropic/claude-sonnet-5.5` | max, xhigh, high, medium, low (low) |
| `anthropic/claude-opus-5.5` | max, xhigh, high, medium, low (low) |
| `x-ai/grok-4.7` | xhigh, high, medium, low (low) |
| `z-ai/glm-5.3-flashx` | max, high, low (low) |
| `openai/gpt-6-astra` | max, xhigh, high, medium, low (low) |
| `openai/gpt-6-astra-pro` | max, xhigh, high, medium, low (low) |
| `anthropic/claude-fable-5.1` | max, xhigh, high, medium, low (low) |
| `anthropic/claude-fable-5.2` | max, xhigh, high, medium, low (low) |
| `deepseek/deepseek-v4.1-flash` | max, high, low, none (none) |
| `google/gemini-3.8-flash` | high, medium, low (low) |
| `google/gemini-4-argon` | high, medium, low (low)。思考必須、推論トークン予算は未対応 |
| `google/gemini-4-carbon` | high, medium, low (low)。思考必須、推論トークン予算は未対応 |
| `google/gemini-4-hydrogen` | high, medium, low (low)。思考必須、推論トークン予算は未対応 |
| `meta/muse-ember` | max, xhigh, high, medium, low, minimal (minimal)。思考必須、推論トークン予算は未対応 |
| `thinkingmachines/inkling-2-small` | max, high, medium, low, minimal (minimal)。思考必須、推論トークン予算は未対応 |
| `nex-agi/nex-n2.6` | high, medium (medium)。思考必須、推論トークン予算は未対応 |
| `inclusionai/ling-3.2-flash:free` | 推論レベル・トークン予算の選択なし（プロバイダー既定） |
| `qwen/qwen3.8-max-0902` | xhigh, high, medium, low, minimal (minimal) |
| `meta/muse-spark-1.3` | max, xhigh, high, medium, low, minimal (minimal) |
| `inclusionai/ling-3.1-flash` | 推論レベルの選択なし（プロバイダー既定） |
| `upstage/solar-pro4` | none, minimal, low, medium, high, xhigh, max (none) |
| `upstage/solar-mini4` | none, minimal, low, medium, high, xhigh, max (none) |
| `xiaomi/mimo-v2.6-flash` | No effort selector (provider default) |
| `nvidia/nemotron-3.5-lightning` | No effort selector (provider default) |
| `qwen/qwen3.8-27b` | No effort selector (provider default) |
| `qwen/qwen3.8-omni-flash` | No effort selector (provider default) |
| `google/gemma-4-31b-it:free` | 推論レベル選択なし（プロバイダー既定） |
| `nvidia/nemotron-3.5-super-vl:free` | 推論レベル選択なし（プロバイダー既定） |

追加の明示選択モデルは上の表のとおりです。追加モデルは画像入力に対応します。すべてツールとストリーミングに対応します。MiniMax M3.1 Flashの推論は無効化できず、非対応の設定は `low` に戻します。Pareto 26.10には推論パラメーターを送りません。Ling 3.0 Flash VLは推論の表示切り替えのみで、推論レベルやトークン予算は送信しません。LingとNex Proは有料IDです。

仕様は[OpenRouterモデルカタログ](https://openrouter.ai/api/v1/models)と[Chat Completions仕様](https://openrouter.ai/docs/api-reference/overview)で確認しています。

追加のMuse Ember・Inkling 2 Small・Nex N2.6・Ling 3.2 Flash Freeは、画像入力・ツール・ストリーミングに対応し、
既存の`/api/v1/chat/completions`を使用します。無料モデルとして掲載するのはLingの`:free`付きIDだけです。
必須の思考で最小の対応レベルを使うため、Muse EmberとInklingの初期値は`minimal`、Nex N2.6は`medium`です。
Nex N2.5 Proと異なり、N2.6は思考を無効化できません。Lingでは推論レベルとトークン予算を送信せず、
`includeReasoning`による表示設定を維持します。ファイル・音声・動画入力は追加していません。
公式API使用例: [Muse Ember](https://openrouter.ai/meta/muse-ember?view=api)、
[Inkling 2 Small](https://openrouter.ai/thinkingmachines/inkling-2-small?view=api)、
[Nex N2.6](https://openrouter.ai/nex-agi/nex-n2.6?view=api)、
[Ling 3.2 Flash Free](https://openrouter.ai/inclusionai/ling-3.2-flash:free?view=api)。

モデル別の推論レベル・トークン予算が公開されていない場合、その制御値は送信しません。現在該当する明示選択モデルは`nvidia/nemotron-3.5-lightning`、`qwen/qwen3.8-27b`、`qwen/qwen3.8-omni-flash`、`xiaomi/mimo-v2.6-flash`、`inclusionai/ling-3.1-flash`、`inclusionai/ling-3.2-flash:free`、`google/gemma-4-31b-it:free`、`nvidia/nemotron-3.5-super-vl:free`です。既存設定の`reasoning_effort`と`reasoningMaxTokens`もこれらのモデルでは省略します。`includeReasoning`による推論出力の表示設定は維持します。[推論設定の仕様](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)を参照してください。

Solar Pro 4（`upstage/solar-pro4`）はテキスト専用の明示選択肢です。
Reactサンプルで **OpenRouter → Solar Pro 4** を選び、OpenRouter APIキーを入力します。
`POST https://openrouter.ai/api/v1/chat/completions` を使用します。
応答速度を優先して推論は既定で `none` とし、`minimal` を含む対応レベルは変更せず送信します。
未文書化の推論トークン予算は送信しません。テキストストリーミングと通常の推論無効時の
ツール呼び出しは既存パーサーを使用します。ツール呼び出し間での推論状態の保持には対応しません。
開発・プレビュー・静的配信のすべてでOpenRouterへの直接通信を使用します。
認証付きブラウザー通信のCORSは実APIでは未検証であり、モックテストはCORSの保証ではありません。
本番ではAPIキーを保護するアプリケーションバックエンドを用意してください。サンプルには含まれません。
[モデル別エンドポイント情報](https://openrouter.ai/api/v1/models/upstage/solar-pro4/endpoints)と
[OpenRouter APIリファレンス](https://openrouter.ai/docs/api_reference/overview)を参照してください。

Solar Mini4はテキスト会話向けの明示選択肢です。推論は既定で無効にし、
`minimal`を含む対応レベルをそのまま送信します。推論トークン予算は省略します。
MiMo V2.6 Flashはテキスト・画像入力に対応し、音声・動画入力は本パッケージの
対応範囲外です。MiMoでは推論レベルや予算を送らず、
プロバイダーの既定動作を使います。`includeReasoning`は上流レスポンスに
推論を含めるかを制御し、推論計算の無効化や本パッケージへの推論表示の追加を
意味しません。
[Solar Mini4](https://openrouter.ai/upstage/solar-mini4)、
[MiMo V2.6 Flash](https://openrouter.ai/xiaomi/mimo-v2.6-flash)を参照してください。

プロバイダーのデフォルトは `google/gemma-4-31b-it:free` です。テキスト・画像入力と
ツール呼び出しに対応した無料モデルで、OpenRouter のカタログから
`openai/gpt-oss-20b:free` が消えたため置き換えました。`getFreeModels()` は
`google/gemma-4-31b-it:free` と `nvidia/nemotron-3.5-super-vl:free` を返します。
無料モデルは入れ替わりが多いため、そのとき使える `:free` モデルは後述の
`refreshOpenRouterFreeModels` で取得してください。

OpenRouter のカタログから消えた ID は `OPENROUTER_DEPRECATED_MODELS` として
定数を残していますが、supported models からは外しています。対象は
`openai/gpt-oss-20b:free`、`~openai/gpt-latest`、`anthropic/claude-opus-4`、
`anthropic/claude-sonnet-4`、`google/gemini-2.5-flash-lite-preview-09-2025`、
`kwaipilot/kat-coder-air-v2.5`、`kwaipilot/kat-coder-pro-v2.5`、
`unbiased/pareto-26.10-preview`、`apodex/apodex-1.1-mini:free`、
`inclusionai/ling-3.0-flash-vl:free`、`nex-agi/nex-n2.5-mini:free`、
`nex-agi/nex-n2.5-pro:free` です。Pareto のプレビュー版の代わりには
`unbiased/pareto-26.9` を使ってください。

Mistral Large 4（`mistralai/mistral-large-4-0`）は、テキスト・画像入力、
テキスト出力、ストリーミング、ツール呼び出しに対応する明示選択の公開プレビューです。
コンテキスト長は512Kで、プレビューの動作は変更される可能性があります。
既存の既定モデルと選択順は維持します。OpenRouterのAPIキーを入力して
**OpenRouter → Mistral Large 4**を選ぶか、`ChatServiceFactory`で
`provider: 'openrouter'`と`model: MODEL_OPENROUTER_MISTRAL_LARGE_4_0`を設定します。
Bearer認証付きJSONを`https://openrouter.ai/api/v1/chat/completions`へ直接送信し、
`choices[].message`またはSSEの`choices[].delta`を読み取ります。
画像とツールはOpenAI互換形式です。推論レベルは`none`と`high`に対応します。
上流の既定は`high`ですが、本パッケージではリアルタイム会話の応答性を優先して
`none`を既定とし、明示した`high`は維持します。未対応の引き継ぎ値は`none`に
正規化します。推論無効時の通常のツール継続に対応しますが、推論有効時の
ツールターン間で`reasoning_details`を保持する機能はありません。
推論トークン予算は公開されていないため、UIで隠し、送信しません。
ファイル・音声・動画入力と構造化出力の強制は対応範囲外です。
[ブラウザ認証ガイド](https://openrouter.ai/docs/guides/overview/auth/oauth)には
ブラウザへのキー保存と直接fetchする構成が説明されています。
モック通信とDOMテストはパッケージの経路・動作を確認するもので、上流の認証付き
CORSや実API生成を検証するものではありません。実APIでの生成は実施していません。
[モデル一覧](https://openrouter.ai/api/v1/models)、
[モデルページ](https://openrouter.ai/mistralai/mistral-large-4-0)、
[Chat Completions仕様](https://openrouter.ai/docs/api/reference/overview)を参照してください。

Pareto 26.9（`unbiased/pareto-26.9`）はテキスト・画像入力、ストリーミング、
自動ツール選択に対応する安定版の明示選択肢です。**OpenRouter → Pareto 26.9**
を選びOpenRouterのAPIキーを入力するか、`ChatServiceFactory`で`openrouter`と
このモデルIDを指定します。既存の既定モデルと並び順は維持します。
Bearer認証付きJSONを`https://openrouter.ai/api/v1/chat/completions`へ送り、
`choices[].message`またはSSEの`choices[].delta`を処理します。出力トークン上限に
対応します。推論制御は公開されていないため、推論レベル・予算・`includeReasoning`
を無視し推論オブジェクト全体を省略します。サンプルは推論レベル・予算欄を隠します。
ツールはパッケージAPIで利用できますが、サンプルUIにはツール設定がありません。
構造化出力の強制とファイル・音声・動画入力は対応範囲外です。
[モデルページ](https://openrouter.ai/unbiased/pareto-26.9)と
[Chat Completionsクイックスタート](https://openrouter.ai/docs/quickstart)でモデルと
API経路を確認しています。[ブラウザ認証ガイド](https://openrouter.ai/docs/guides/overview/auth/oauth)
はブラウザから直接送信する構成を説明しています。プロキシは追加しません。
モック通信・DOMテストはパッケージ動作の確認であり、実API生成・認証付きCORSの
検証ではありません。実API生成やCORSプローブは実施していません。

Ling 3.1 Flash（`inclusionai/ling-3.1-flash`）はテキスト専用の明示選択肢です。
OpenRouterのAPIキーとともに`openrouter`プロバイダーおよびこのモデルIDを指定するか、
Reactサンプルで **OpenRouter → Ling 3.1 Flash** を選択します。
送信先は`POST https://openrouter.ai/api/v1/chat/completions`で、Bearer認証、
JSON形式のメッセージ、`choices[].delta.content`のストリーミングを使用します。
ツール定義と返されるツール呼び出しはOpenAI互換形式です。`:free`接尾辞はなく、
本パッケージでは無料枠モデルとして分類しません。
プロバイダー側では推論が既定で有効ですが、モデル固有の推論レベルと推論トークン
予算は公開されていないため、別モデルから引き継いだ設定も含めて送信しません。
`includeReasoning`は上流の推論出力のみを制御し、推論計算を無効化しません。
現在のOpenRouterパーサーは`reasoning_details`を保持しないため、推論状態の保持が
必要な複数ターンのツール継続処理は対応範囲外です。モック通信と描画済みDOMの
テストで選択・設定・ストリーミング・ツール・エラー処理を確認しており、
実APIでの生成とブラウザのCORSは未検証です。
[モデルのAPI使用例](https://openrouter.ai/inclusionai/ling-3.1-flash?view=api)、
[エンドポイント情報](https://openrouter.ai/api/v1/models/inclusionai/ling-3.1-flash/endpoints)、
[Chat Completions仕様](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)、
[推論状態の再送要件](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)を参照してください。

GPT-6.1 Sol、GPT-6 Sol/Luna、Claude 5.5、Grok 4.7、GLM-5.3 FlashXでは
チャットの応答速度を優先し、利用可能な最小の推論レベルを既定にします。
OpenRouterのカタログ既定はこれらのGPTモデルが`medium`、
Claude 5.5/Grok 4.7が`high`、GLM-5.3 FlashXが`max`ですが、
明示指定した対応レベルは維持します。
これらのOpenRouter IDはツールを含めて`/api/v1/chat/completions`を使用し、
OpenAI直結のエンドポイント制約は適用しません。Claude 5.5の経路ではツール
選択は自動または無効のみ対応し、強制呼び出しには対応しません。
本パッケージは自動選択を使います。

常時推論モデルでは`none`を送らず、無効な設定を表の既定値へ補正します。`openai/gpt-6-astra-pro`はOpenRouterがProモードへ変換するIDであり、OpenAI直結のIDではありません。Fable 5.1/5.2では`tool_choice`を省略します。`:free`モデルには無料枠のレート制限があります。 [Catalog](https://openrouter.ai/api/v1/models), [API schema](https://openrouter.ai/docs/api_reference/overview).

公式カタログで effort の許容値を確認できるモデルでは、指定がないときに利用可能な最小値を
送信します。より重いレベルは明示して選べます。次の OpenRouter モデルにも適用します。
エイリアスの許容値は、確認時点のカタログに基づきます。

| パッケージの effort | モデル ID |
| --- | --- |
| `none` | `~openai/gpt-mini-latest`, `openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`, `openai/gpt-5.5`, `~anthropic/claude-haiku-latest`, `anthropic/claude-opus-5`, `anthropic/claude-opus-4.8`, `~moonshotai/kimi-latest`, `moonshotai/kimi-k3` |
| `minimal` | `openai/gpt-5-mini`, `openai/gpt-5-nano`, `google/gemini-3.6-flash`, `google/gemini-3.5-flash-lite` |
| `low` | `openai/gpt-5.1-codex`, `~anthropic/claude-sonnet-latest`, `anthropic/claude-fable-5`, `~google/gemini-pro-latest`, `~google/gemini-flash-latest`, `google/gemini-3.7-flash`, `~x-ai/grok-latest`, `x-ai/grok-4.6`, `x-ai/grok-4.5` |
| `medium` | `openai/gpt-5.5-pro` |

最小 effort が `medium` 以上のモデルは、プロバイダーの既定モデルにはしません。
現在は `openai/gpt-5.5-pro` が該当し、最小値は `medium` です。
動的ルーター、推論非対応モデル、effort の段階指定が文書化されていないモデルには、
今回自動設定を追加していません。OpenRouter の Gemini 2.5、Claude Haiku 4.5、
GLM-4.x、Kimi K2.5/K2.7 Code はカタログに effort の許容値がなく、上流の thinking
既定動作を維持します。[モデルカタログ](https://openrouter.ai/api/v1/models)、
[推論設定](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens#discovering-per-model-reasoning-options)。

```typescript
const openRouterService = ChatServiceFactory.createChatService('openrouter', {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'deepseek/deepseek-v4-flash-0731',
  reasoning_effort: 'none', // チャット向けの最速設定
  // オプション: 分析用アプリ情報を追加
  appName: 'あなたのアプリ名',
  appUrl: 'https://your-app-url.com'
});
```

**OpenRouterの重要な注意事項:**
- `openrouter/auto` と `openrouter/auto-beta` では、ルーティング先のreasoningモデルが可視テキストの生成前に出力予算を使い切ることを避けるため、`responseLength` 由来のトークン制限を自動的に無効化します。明示的に指定した `maxTokens` はそのまま使用します。
- `gpt-oss-20b:free`、`z-ai/glm-5.2`、`z-ai/glm-5.3`、`z-ai/glm-5.3-flash` では、すべてのトークン制限を無効化します。これらのモデルと動的Routerでは、応答の長さをプロンプトで指示してください（例:「40文字以内で回答してください」）。
- 無料階層にはレート制限があります（20リクエスト/分）
- 無料モデル判定はモデルID末尾の `:free` で行います（動的取得した `:free` も同様にレート制限対象）
- `openrouter/auto-beta` はタスクを判定するBetaルーターです。リクエストごとにモデルを選択し、そのモデルの料金が適用されます。選択結果はレスポンスの `model` またはOpenRouter Activityで確認できます。
- `openrouter/fusion` は複数モデルのパネルとジャッジモデルを実行します。単一モデルの固定単価ではなく、内部で使われた各モデル呼び出しと web search/fetch 利用分の合算で課金されます。
- `z-ai/glm-5.2` は OpenRouter reasoning も `none` にします。
- `z-ai/glm-5.3` と `z-ai/glm-5.3-flash` はreasoning必須です。packageは最小の`low`を選び、reasoning本文を除外してチャット応答性を優先します。
- 新たに追加した `qwen/qwen3.8-flash`、`moonshotai/kimi-k2.6`、`anthropic/claude-sonnet-5`、`deepseek/deepseek-v4-flash-vision-exp` は、任意reasoningを`none`で開始します。
- OpenRouterのreasoning無効化には `reasoning.effort: 'none'` を送ります。`exclude: true` はreasoning内容を返すかどうかだけを制御し、reasoning自体は無効化しません。
- DeepSeek V4モデルは、再現可能なバージョンを選べるようOpenRouterのデフォルトではなく明示的な選択肢にしています。すべて応答性重視で`none`がデフォルトです:
  - `deepseek/deepseek-v4-flash-0731`: 現行の固定0731スナップショット。`none`, `low`, `high`, `max`に対応。
  - `deepseek/deepseek-v4-flash`: 旧無印0423スナップショット。`none`, `high`, `xhigh`に対応。
  - `deepseek/deepseek-v4-pro-0813`: 固定Proスナップショット。`none`, `high`, `xhigh`に対応。
  - `deepseek/deepseek-v4-flash-vision-exp`: 画像対応の実験モデル。`none`, `low`, `high`, `max`に対応。
- `moonshotai/kimi-k3` の可用性は上流キャパシティに依存し、混雑時はOpenRouterから429レスポンスが返る場合があります。
- `x-ai/grok-4.5` には現在のEU制限を含む地域別の可用性制限があります。`~x-ai/grok-latest` がGrok 4.5へ解決される場合も同じ制限を受けます。
- サポート対象モデル（キュレーション済み）:
  - `openrouter/auto`, `openrouter/auto-beta`
  - `openrouter/fusion`
  - `google/gemma-4-31b-it:free`, `nvidia/nemotron-3.5-super-vl:free`
  - `~openai/gpt-mini-latest`
  - `openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`
  - `openai/gpt-5.5-pro`, `openai/gpt-5.5`
  - `openai/gpt-5.1-codex`, `openai/gpt-5-mini`, `openai/gpt-5-nano`
  - `openai/gpt-4o`, `openai/gpt-4.1-mini`, `openai/gpt-4.1-nano`
  - `~anthropic/claude-sonnet-latest`, `~anthropic/claude-haiku-latest`
  - `anthropic/claude-fable-5`, `anthropic/claude-sonnet-5`, `anthropic/claude-opus-5`, `anthropic/claude-opus-4.8`
  - `anthropic/claude-haiku-4.5`
  - `~google/gemini-pro-latest`, `~google/gemini-flash-latest`
  - `google/gemini-3.7-flash`, `google/gemini-3.6-flash`, `google/gemini-3.5-flash-lite`
  - `google/gemini-2.5-pro`, `google/gemini-2.5-flash`
  - `z-ai/glm-5.3`, `z-ai/glm-5.3-flash`, `z-ai/glm-5.2`, `z-ai/glm-4.7-flash`, `z-ai/glm-4.5-air`
  - `~x-ai/grok-latest`, `x-ai/grok-4.6`, `x-ai/grok-4.5`
  - `deepseek/deepseek-v4-flash-0731`, `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro-0813`, `deepseek/deepseek-v4-flash-vision-exp`
  - `qwen/qwen3.8-flash`
  - `~moonshotai/kimi-latest`, `moonshotai/kimi-k3`, `moonshotai/kimi-k2.7-code`, `moonshotai/kimi-k2.6`

**OpenRouter freeモデルの動的リフレッシュ**

利用可能な `:free` モデルを取得し、利用前に疎通確認できます。

```typescript
import { refreshOpenRouterFreeModels } from '@aituber-onair/chat';

const result = await refreshOpenRouterFreeModels({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  concurrency: 2, // デフォルト: 2
  timeoutMs: 12000, // デフォルト: 12000
  maxCandidates: 1, // デフォルト: 1
  maxWorking: 10, // デフォルト: 10
});

console.log(result.working); // 例: ['google/gemma-4-31b-it:free']
console.log(result.failed); // [{ id, reason }, ...]
console.log(result.fetchedAt); // Date.now() のタイムスタンプ
```

注意:
- モデル一覧は `https://openrouter.ai/api/v1/models` から取得します
- 候補はモデルID末尾が `:free` のものに絞り込みます
- `maxCandidates` は「疎通確認する候補の最大件数」です
  （例: `10` は「最大10候補を試す」意味で、動作モデルが10件見つかるまで継続はしません）
- 疎通確認は OpenRouter chat completions の最小 one-shot リクエスト（`stream: false`）を使います
- `fetch` を利用しているため、ブラウザとNodeの両方で動作します

#### Z.ai（GLM）

```typescript
const zaiService = ChatServiceFactory.createChatService('zai', {
  apiKey: process.env.ZAI_API_KEY,
  model: 'glm-5.3',
  reasoning_effort: 'low', // package既定値: 最小のthinking
  responseLength: 'short',
  visionModel: 'glm-5.3-flash', // 任意: ビジョン対応モデル
  responseFormat: { type: 'json_object' } // 任意: JSONモード
});
```

注意:
- Z.aiはOpenAI互換のChat Completionsを利用します。
- テキスト対応モデル: `glm-5.3`, `glm-5.2`, `glm-5.1`, `glm-5`, `glm-5-turbo`, `glm-4.7`, `glm-4.7-FlashX`, `glm-4.7-Flash`, `glm-4.6`
- `glm-5.3-flashx`（`MODEL_GLM_5_3_FLASHX`）は公開Model API（`https://api.z.ai/api/paas/v4/chat/completions`）で画像入力・ストリーミング・ツールに対応する明示選択モデルです。Coding Planエンドポイントではなく、Model APIキーを使用してください。[Model guide](https://docs.z.ai/guides/vlm/glm-5.3-flash)。
- ビジョン対応モデル: `glm-5.3-flashx`, `glm-5.3-flash`, `glm-5v-turbo`, `glm-4.6V`, `glm-4.6V-FlashX`, `glm-4.6V-Flash`
- GLM-5.3系列（GLM-5.3、GLM-5.3 Flash、GLM-5.3 FlashX）はthinking常時有効で、`low`, `high`, `max`のみ対応します。packageは`low`を既定値とし、`thinking.type: 'disabled'`が指定されても有効状態を維持します。また、チャットの遅延とコストを抑えるため、過去ターンのthinkingはデフォルトでクリアします。
- GLM-5.2では`reasoning_effort: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'`を公開します。package既定値は低遅延チャット向けの`none`で、thinkingを無効化します。
- Z.ai側の実効tierは3段階です。`none`/`minimal`は`none`、`low`/`medium`/`high`は`high`、`xhigh`/`max`は`max`へpackage側で正規化して送信します。
- `reasoning_effort`を省略した場合は、従来の明示的な`thinking`設定も利用できます。両方を指定した場合は`reasoning_effort`を優先します。

#### xAI（Grok）

```typescript
const xaiService = ChatServiceFactory.createChatService('xai', {
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-4.6',
  reasoning_effort: 'low', // 任意: low, medium, high, xhigh
  visionModel: 'grok-4.6', // 任意: ビジョン対応の xAI モデルを指定
});
```

注意:
- xAIはOpenAI互換のChat Completionsを利用します。
- 対応モデル: `grok-4.7`, `grok-4.6`, `grok-4.5`, `grok-4.3`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`
- packageのデフォルトは`reasoning_effort: 'none'`の`grok-4.3`です。廃止済みGrok 4.1 Fastの定数はソース互換のためexportを残しますが、対応一覧には表示しません。
- `reasoning_effort` は対応モデルにのみ送信されます。Grok 4.7と4.6は `low`, `medium`, `high`, `xhigh`、Grok 4.5は `low`, `medium`, `high` に対応します。応答を速めるため、この3モデルのパッケージ既定値は `low` です。`grok-4.3` は `none`, `low`, `medium`, `high` に対応し、デフォルトは `none` です。
- 対応 xAI モデルではビジョンとツール・関数呼び出しを利用できます。Grok 4.6 も React basic サンプルで画像チャットを直接検証できるようにビジョン対応として有効化しています。

#### Kimi（Moonshot）

K3.1 ProとHighspeedのAPI仕様は[公式クイックスタート](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart.md)と[モデル一覧](https://platform.kimi.ai/docs/models.md)で確認できます。両モデルとも画像入力・ツール・ストリーミングに対応します。

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  model: 'kimi-k3',
  // Optional: エンドポイント/ベースURLの上書き
  // endpoint: 'https://api.moonshot.ai/v1/chat/completions',
  // baseUrl: 'https://api.moonshot.ai/v1',
  reasoning_effort: 'low'
});
```

注意:
- KimiはOpenAI互換のChat Completionsを利用します。
- 対応モデル: `kimi-k3.1-pro`（デフォルト）, `kimi-k3.1-pro-highspeed`, `kimi-k3`
- デフォルトモデルは、KimiのK2系列提供終了の告知で移行先として案内されている`kimi-k3.1-pro`です。常に推論するモデルで推論を無効化できないため、チャットの応答速度を優先してこのパッケージではデフォルトで`reasoning_effort: 'low'`を送ります（Kimi APIのデフォルトは`max`）。`high`と`max`は明示指定で利用できます。K3系はK2.x向けの`thinking`オプションを受け付けません。アカウントでK2系列をまだ利用できる間は`model: 'kimi-k2.6'`を明示してください。
- Kimiは2026-10-31から新規登録ユーザーへのK2系列の提供を停止し、2026年12月末までにK2系列全体を提供終了する予定です。`kimi-k2.6`、`kimi-k2.7-code`、`kimi-k2.7-code-highspeed`は`KIMI_DEPRECATED_MODELS`として定数を残しますが、supported modelsからは外しています。
- `kimi-k2.5` は 2026-08-31 に Kimi が提供を終了しました。`KIMI_DEPRECATED_MODELS` として定数は残していますが、supported models からは外しています。
- Kimi K3とK3.1 Pro（Highspeedを含む）は明示的に選択するReasoningモデルです。`reasoning_effort: 'low' | 'high' | 'max'` に対応し、このパッケージのデフォルトは `low` です（Kimi APIのデフォルトは `max`）。Reasoning自体は無効化できず、K2系の `thinking` オプションも利用できません。`none`、`minimal`、`medium` は非対応です。
- Kimi K3系の出力上限には `max_completion_tokens` を使用します。
- Kimi K3系の複数ターン・ツール呼び出しでは、`reasoning_content` と `tool_calls` を保持するため、返された `completion.assistant_message` を会話履歴へ追加してください。
- Kimi K2.7 Code 系モデルはコーディング寄りで、thinking mode が必須のため、ツール使用時も `thinking` を有効のままにします。
- Kimi K2.7 Code 系モデルで `thinking: { type: 'disabled' }` を明示指定すると、リクエスト送信前にエラーになります。
- thinkingを無効化できるK2系モデルは、応答速度を優先して`thinking: { type: 'disabled' }`を既定にします。`KimiChatService`を直接生成する場合も同じです。有効にする場合は`thinking: { type: 'enabled' }`を指定してください。ツール使用時は引き続きthinkingを無効にします。

自前ホスティング例:

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  model: 'kimi-k2.6', // Explicit legacy model with optional thinking
  baseUrl: 'http://localhost:8000/v1',
  thinking: { type: 'disabled' }
});
```

注意:
- 自前ホスティングではthinking制御に`chat_template_kwargs`を使用します。

#### DeepSeek

提供元が更新するモデルIDは、同じIDのまま新しいモデルへ切り替わります。
`deepseek-flash`（`MODEL_DEEPSEEK_FLASH`）は、2026年10月17日現在、
既存のChat Completions APIで
[DeepSeek-V4.1-Flash-1017](https://api-docs.deepseek.com/zh-cn/news/news261017/)
を利用するためのIDです。APIには引き続き`deepseek-flash`を指定します。
今後の提供元の更新によって、同じIDで使われるモデルが変わる場合があります。
テキスト・画像入力とストリーミングに対応しています。
詳細は[公式APIガイド](https://api-docs.deepseek.com/)を参照してください。

```typescript
const deepSeekService = ChatServiceFactory.createChatService('deepseek', {
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-flash',
  reasoning_effort: 'none', // デフォルト: 応答性重視でthinkingを無効化
});
```

注意:
- DeepSeekはOpenAI互換のChat Completions（`https://api.deepseek.com/chat/completions`）を利用します。
- 現行のテキスト・画像モデルには`deepseek-flash`、テキスト専用のProには`deepseek-v4-pro`を指定します。テキストと画像のデフォルトは`deepseek-flash`です。
- 旧Flash IDの`deepseek-v4-flash`と`deepseek-v4-flash-vision-exp`は、`DEEPSEEK_DEPRECATED_MODELS`に移し、対応一覧と選択UIから除外しています。明示指定した場合は、提供元でDeepSeek-V4.1-Flash-1017へ転送されます。元のモデルは提供を終了しているため、これらのIDで旧版を固定することはできません。
- legacy alias の`deepseek-chat`と`deepseek-reasoner`は互換用にexportしていますが、DeepSeek側で非推奨かつ2026-07-24廃止予定です。
- `openai-compatible`にendpoint/modelを直接指定して使うこともできますが、`deepseek` providerならendpointとデフォルトモデル指定が簡単です。
- `deepseek-flash`は`reasoning_effort: 'none' | 'low' | 'high' | 'max'`に対応します。DeepSeek側のデフォルトはthinking有効・`high`です。このパッケージは応答性を重視し、デフォルトの`none`を`thinking: { type: 'disabled' }`へ変換します。それ以外はthinkingを有効化し、DeepSeekの`reasoning_effort`として送信します。
- `deepseek-v4-pro`では`none`, `high`, `max`を公開します。DeepSeek側で`low`が`high`へ変換されるため、packageでも明示的に正規化します。
- `deepseek-flash`はOpenAI互換の`image_url`メッセージ形式で画像を受け付けます。既存の画像入力設定向けに、旧IDの`deepseek-v4-flash-vision-exp`も引き続き利用できます。
- ThinkingとTool Callingの併用は、DeepSeekがtool turn間での`reasoning_content`再送を要求し、thinking時に通常の`tool_choice`形式を受け付けないため、現時点では明示的に拒否します。デフォルトの`none`ではTool Callingを利用できます。
- DeepSeekのSearch/Fetchは別のAPIであり、このチャット統合では提供していません。

#### Mistral

```typescript
const mistralService = ChatServiceFactory.createChatService('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-small-latest',
});

await mistralService.processChat(
  [{ role: 'user', content: '短くストリーミングで返答してください。' }],
  (partial) => process.stdout.write(partial),
  async (complete) => console.log('\nDone:', complete),
);
```

注意:
- Mistralは`https://api.mistral.ai/v1/chat/completions`のChat Completionsを利用します。
- デフォルトモデルは`mistral-small-latest`です。低コスト、汎用チャット品質、vision対応、adjustable reasoning対応のバランスがよいためサンプル向けの既定値にしています。
- `mistral-medium-3-5`は2026-10-31に非推奨となり、2027-04-30に提供終了予定です。定数は`MISTRAL_DEPRECATED_MODELS`に残し、対応一覧と選択UIから除外しています。代わりに`mistral-large-4-0`を使用してください。[Mistralのモデル一覧](https://docs.mistral.ai/models)を参照してください。
- 対応モデル: `mistral-small-latest`, `ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`, `mistral-large-latest`, `mistral-large-4-0`, `mistral-small-2603`, `zai-glm-5-3`, `zai-glm-5-3-flash`
- Mistral Large 4（`mistral-large-4-0`）は、テキスト・画像入力に対応する公開プレビューの明示選択モデルです（Mistral公式の[モデルページ](https://docs.mistral.ai/models/mistral-large-4-0.md)）。推論レベルは`low` / `medium` / `high`のみで、このパッケージではまだ指定できないため`reasoning_effort`は送信しません。応答中のthinkingチャンクは読み飛ばし、回答テキストだけを返します。
- `mistral-large-2512`（Mistral Large 3）は2026-10-31にMistralで非推奨となり、2027-04-30に提供終了します。ソース互換用に`MISTRAL_DEPRECATED_MODELS`としてexportを残しますが、対応一覧には表示しません。
- 廃止済みの`mistral-medium-2508`はソース互換用にのみexportを残します。
- Ministral 3系は同じChat Completions endpointでtext、vision、streaming、function callingに対応します。
- MistralのChat Completions経路で確認できた機能と推論設定だけを有効にしています。`zai-glm-5-3-flash`（`MODEL_MISTRAL_ZAI_GLM_5_3_FLASH`、GLM-5.3 Flash）は、テキスト・画像入力、ストリーミング、関数呼び出しに対応する明示選択モデルです。推論レベルは`low`・`high`・`max`で、`none`は利用できません。応答速度を考慮し、パッケージの初期値は`low`です。対応する明示値はそのまま送信し、未確認の思考設定は送りません。思考チャンクは回答に表示しません。プロバイダーのデフォルトは`mistral-small-latest`のままです。[モデルの仕様](https://docs.mistral.ai/models/zai-glm-5-3-flash.md)、[画像入力形式](https://docs.mistral.ai/inference/conversations/vision)、[推論の仕様](https://docs.mistral.ai/inference/conversations/reasoning)を参照してください。
- テキスト専用の明示選択モデルとして`zai-glm-5-3`（GLM-5.3）を利用できます。streamingとfunction callingに対応し、visionや推論レベル指定は有効にしません。利用可否はMistralのサブスクリプションtierによって異なり、利用できないアカウントではHTTP 403（`tier_not_allowed`）が返ります。
- `reasoning_effort`はモデルごとに異なります。`mistral-small-latest`と互換性用IDの`mistral-medium-3-5`は`none`（初期値）・`high`、`zai-glm-5-3-flash`は`low`（初期値）・`high`・`max`に対応します。非対応の値は各モデルの初期値に戻します。Mistral Large 4や既存の`zai-glm-5-3`を含む、それ以外のモデルでは送信しません。

reasoning例:

```typescript
const mistralReasoningService = ChatServiceFactory.createChatService(
  'mistral',
  {
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
    reasoning_effort: 'high',
  },
);
```

#### Sakana AI

```typescript
const sakanaService = ChatServiceFactory.createChatService('sakana', {
  apiKey: process.env.SAKANA_API_KEY,
  model: 'sakana-namazu',
  thinking: { type: 'disabled' }, // Namazuのpackageデフォルト
});
```

注意:
- Sakana AI Fuguは`https://api.sakana.ai/v1/chat/completions`のOpenAI互換Chat Completionsを利用します。
- 対応モデル: `fugu`（デフォルト）、`fugu-ultra-v1.1`、日本語特化の`sakana-namazu`。`fugu-ultra` aliasと旧日付IDは互換用にexportを残します。
- Sakana Namazuは同じChat Completions endpointで画像入力に対応します。応答性重視で`chat_template_kwargs`経由のthinkingをデフォルト無効とし、`thinking: { type: 'enabled' }`で有効化できます。
- Sakanaは新しいChat Completions連携では`max_completion_tokens`を推奨していますが、legacyな`max_tokens`も受け付けます。このproviderでは既存OpenAI互換providerの挙動に合わせて`max_tokens`を使います。
- Sakanaは最高性能にはResponses APIを推奨していますが、このproviderはpackageのOpenAI互換chat経路に合わせてChat Completionsを利用します。
- ブラウザから直接呼ぶ場合、Sakana側がoriginに対してCORSを許可していないと失敗します。ブラウザ単体ではなく、Node.js、backend/serverless proxy、または`examples/node-basic/sakana-example.js`を利用してください。

#### Sarashina（ベータ・バックエンド専用）

このブラウザ例から直接呼び出せないプロバイダーは、選択を無効にしています。
現在は Sakana AI と Sarashina が該当します。Sarashina は保護されたバックエンドから
呼び出し、API キーをブラウザやモバイルアプリに露出させないよう公式に案内されています。
[認証とセキュリティ](https://docs.sarashina.ai/introduction)。

```typescript
const service = ChatServiceFactory.createChatService('sarashina', {
  apiKey: process.env.SARASHINA_API_KEY,
  model: 'sarashina3.2-mini-thinking', // Explicit; default is sarashina3-nano
  reasoning_effort: 'low', // Thinking model only; package default
});
const history: Message[] = [{ role: 'user', content: 'Say hello in Japanese.' }];
const completion = await service.chatOnce(history, true, (text) => console.log(text));
if (completion.assistant_message) history.push(completion.assistant_message);
history.push({ role: 'user', content: 'Continue.' });
// Keep assistant_message.reasoning unchanged; never display or decode it.
await service.chatOnce(history, false, () => {});
```

対話モデルはテキスト専用で、軽量な対話用の `sarashina3-nano` を既定値にします。
`sarashina3-mini` と `sarashina3.2-mini-thinking` は明示して選べます。
いずれもコンテキスト長は 128k です。モデレーション専用の `sarashina3-guard` は
対話モデルに含めません。[モデル一覧](https://docs.sarashina.ai/models)。

Bearer 認証で `https://api.sarashina.ai/v1/chat/completions` を呼び出し、streaming と
自動 function tool 呼び出しに対応します。`responseLength` は `max_completion_tokens` に変換し、
`chatOnce(..., maxTokens)` の明示値は 1〜8000 に収めます。応答長未指定時は共通の 5000 を使います。
`reasoning_effort` は thinking モデルだけで `low` / `medium` / `high` を指定でき、
省略時は `low` です。他のモデルで指定すると、送信前にエラーになります。
返された `assistant_message` を履歴に追加すると、テキスト・ツールの各ターンで
暗号化された `reasoning` を変更せず再送できます。表示や復号はしないでください。
`[DONE]` が届く前に SSE が終了した場合はエラーにします。出力上限が小さいと、
thinking 中に上限へ達し、回答が得られない場合があります。画像入力と構造化出力の設定は
公開していません。[API リファレンス](https://docs.sarashina.ai/api-reference/chat-completions)。

[サービス](https://sarashina.ai/)は無償ベータ版です。
[利用規約](https://sarashina.ai/terms)では利用対象を日本国内居住者または国内に本店を持つ法人に限定し、
入出力をモデル学習やサービス開発に利用できるとしています。学習利用の拒否は有償プラン向けの規定です。
データを送信する前に現在の規約を確認してください。実際の推論やアカウント・地域のアクセス確認は
行っていません。Node の例は `examples/node-basic/sarashina-example.js` にあり、
オプションで暗号化状態を保持した会話継続も試せます。

#### PLaMo

```typescript
const plamoService = ChatServiceFactory.createChatService('plamo', {
  apiKey: process.env.PLAMO_API_KEY,
  model: 'plamo-3.0-prime',
});
```

注意:
- PLaMoは`https://api.platform.preferredai.jp/v1/chat/completions`のOpenAI互換Chat Completionsを利用します。
- 対応モデル: `plamo-3.0-prime`（デフォルト）, `plamo-3.1-prime`
- PLaMo 3.1 Prime（`plamo-3.1-prime`）は3.0 Primeと同じendpoint、コンテキスト長（262,144トークン）、`reasoning_effort`の値で利用できます。PLaMoのWeb検索オプション（`web_search_options`）と、Responses APIで提供される別モデルのDeep Researchはこのproviderには組み込んでいません。
- `plamo-2.2-prime`はソース互換用にexportを残しますが、PLaMO公式docsで2026-09-30の提供終了と`plamo-3.0-prime`への移行が案内されているため、対応一覧には表示しません。
- reasoning対応モデルでは`reasoning_effort`に`none`または`medium`を指定できます。応答速度を優先し、省略時は`none`を明示送信します。`PlamoChatService`を直接生成する場合も同じです。推論を有効にする場合は`medium`を指定してください。
- このproviderではvision対応はサポート対象として扱いません。
- PLaMoは`openai-compatible`にendpointとmodelを直接指定して使うこともできます。

#### Gemini Nano（Chromeブラウザ内蔵AI）

```typescript
const geminiNanoService = ChatServiceFactory.createChatService('gemini-nano', {
  responseLength: 'short',
  sessionMode: 'persistent',
  initialPrompts: [
    {
      role: 'system',
      content: 'あなたは明るく自然な話し方をするキャラクターです。'
    },
    { role: 'user', content: '今日はどんな気分？' },
    { role: 'assistant', content: '元気いっぱいで、お話しするのが楽しみだよ！' },
    { role: 'user', content: '準備できた？' },
    { role: 'assistant', content: 'うん、いつでも始められるよ！' }
  ]
});
```

注意:
- APIキー不要 — ChromeのLanguageModel API（Prompt API）を使用します。
- システム指示、設定した会話例、直近の会話履歴は、roleを維持した
  `initialPrompts`として渡されます。
- 設定した`initialPrompts`にsystemメッセージがある場合は、必ず先頭へ
  正規化されます。会話例はオンデバイスモデルのコンテキストを消費するため、
  短い例を使用してください。
- Gemini Nanoでは、トークン数の目安に加えて、`veryShort`は最大1文、
  `short`は最大2文、`medium`は最大3文、`long`は最大5文、
  `veryLong`は最大10文となるよう具体的に指示します。`deep`は約5000
  トークンの目安だけを残し、文数は制限しません。ただし、出力長は厳密保証
  ではありません。
- 構造化された履歴として、直近20件までのuser/assistantメッセージを渡します。
- Webページでは、対応するデスクトップ端末上の**Chrome 148以降**が必要です。
  Prompt APIは標準で有効なため、Chromeフラグの設定は不要です。
  Chrome拡張ではChrome 138以降から利用できます。
- モデルはすべてデバイス上で実行され、推論時にネットワーク通信は発生しません。
- Chromeの `promptStreaming()` が利用できる場合はストリーミングし、利用できない場合は
  `prompt()` にフォールバックします。完了時には常に完全なレスポンスを返します。
- `sessionMode`のデフォルトは`'stateless'`です。`'persistent'`にするとターン間で
  オンデバイスセッションを再利用できます。永続セッションは生存中メモリを保持するため、
  不要になったら`dispose()`を呼び出してください。
- persistentモードでは、古い履歴を末尾の連続した範囲に絞っても再利用できます。
  履歴を編集または空にするとliveセッションを再構築します。
- ビジョン（画像入力）は非対応です。
- EN／JAの言語選択とフロントエンドだけでのモデル準備は、
  [ブラウザ完結Gemini Nanoカスタマーサポート例](./examples/gemini-nano-customer-support-bot/)
  を参照してください。
- 初回のモデルダウンロードにはユーザー操作が必要で、数分かかる場合があります。

##### Tips: 会話例で応答長の安定性を高める

`responseLength`を設定すると、Gemini Nano向けの文数、書式、トークン数の
目安が自動的に指示へ追加されます。さらに、短いuser/assistantの会話例を
2〜3組ほど`initialPrompts`で渡すと、指示をより強く補強できます。

```typescript
import {
  ChatServiceFactory,
  type GeminiNanoInitialPrompt
} from '@aituber-onair/chat';

const veryShortExamples: GeminiNanoInitialPrompt[] = [
  { role: 'user', content: '今日はどんな気分？' },
  { role: 'assistant', content: 'みんなと話せて元気いっぱいだよ！' },
  { role: 'user', content: '好きな食べ物は？' },
  { role: 'assistant', content: '特にサーモンのお寿司が好き！' }
];

const service = ChatServiceFactory.createChatService('gemini-nano', {
  responseLength: 'veryShort',
  initialPrompts: veryShortExamples
});
```

会話例は任意です。`initialPrompts`を省略しても、パッケージ側の応答長指示は
適用されます。会話例を加えることで、期待する文章量、口調、リアクション、
会話のテンポをオンデバイスモデルへ具体的に伝えられます。

- assistantの例文は選択したプリセットに合わせてください。`veryShort`なら
  1文、`short`なら最大2文にします。
- 例文は対象キャラクターの口調で記述してください。汎用的な固定例文は
  キャラクター性を変える可能性があるため、パッケージからは自動追加しません。
- 明確に長い回答が必要な`medium`以上へ1文の例を流用すると、短い回答へ
  偏る可能性があります。
- 例文はシステムプロンプトや会話履歴と同じコンテキストを消費するため、
  少数かつ短く保ってください。
- `responseLength`または`initialPrompts`を変更した場合は、チャットサービスを
  作り直してください。React Basic Exampleではこれを自動的に行い、短い例文は
  `veryShort`と`short`だけに適用しています。
- これは応答長の安定性を高める制御であり、厳密な出力上限ではありません。
  ChromeのLanguageModel APIにはmax output tokens相当の設定がないため、
  指定した文数を超える場合があります。


### ビジョンチャット

組み込み provider のうち、対応モデル一覧を持つものは vision 対応を
事前判定します。一方 `openai-compatible` は endpoint / model ごとの差が
大きいため、原則 `unknown` として扱います。この場合でも画像リクエストは
許可され、非互換は接続先 endpoint の実行時エラーとして表面化します。

```typescript
const visionMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'この画像に何が見えますか？' },
    {
      type: 'image_url',
      image_url: {
        url: 'data:image/jpeg;base64,...', // または https:// URL
        detail: 'low' // 'low', 'high', または 'auto'
      }
    }
  ]
};

await chatService.processVisionChat(
  [visionMessage],
  (partial) => console.log(partial),
  async (complete) => console.log(complete)
);
```

`ChatServiceFactory` から事前判定の状態を参照できます。

```typescript
const level = ChatServiceFactory.getVisionSupportLevelForModel(
  'openai-compatible',
  'your-local-model',
);

console.log(level); // 'unknown'
```

### ツール・関数呼び出し

```typescript
import { ToolDefinition } from '@aituber-onair/chat';

const tools: ToolDefinition[] = [{
  name: 'get_weather',
  description: '指定された場所の現在の天気を取得',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: '都市名' }
    },
    required: ['location']
  }
}];

// ツール呼び出しはチャットサービスによって自動的に処理されます
// サービス作成時にツールハンドラーを設定してください
```

アプリケーション側でToolを実行する場合は、backend helperを使ってprovider互換の
assistant messageとTool結果messageを追加できます。OpenAIやClaudeなどの
provider固有の継続データも保持します。

```typescript
import { buildToolContinuationMessages } from '@aituber-onair/chat/backend';

const nextMessages = buildToolContinuationMessages({
  provider: chatService.provider,
  messages,
  completion,
  toolResults,
});
```

### 応答長制御

プリセットの基準トークン値は次の通りです。
- `veryShort`: 40
- `short`: 100
- `medium`: 200
- `long`: 300
- `veryLong`: 1000
- `deep`: 5000

ただし OpenAI の GPT-5 family
（`gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5.1`, `gpt-5.4`,
`gpt-5.5`, `gpt-5.6`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`,
`gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.4-pro`）では、これらは基準値として
扱われます。途中終了を減らすため、実際に送信される
`max_completion_tokens` / `max_output_tokens` は、model と
`reasoning_effort` に応じて自動的に引き上げられることがあります。

厳密な token 上限を指定したい場合は `maxTokens` を使ってください。

```typescript
// プリセット応答長を使用
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  responseLength: 'medium' // 'veryShort', 'short', 'medium', 'long', 'veryLong', 'deep'
});

// カスタムトークン制限を使用
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  maxTokens: 500 // 直接トークン制限
});
```

### Model Context Protocol (MCP)

チャットパッケージは全てのプロバイダーでMCP（Model Context Protocol）サーバーをサポートしており、異なる実装アプローチを採用しています：

#### プロバイダー別MCP実装

**OpenAI & Claude**: 直接MCP統合
- プロバイダーのネイティブMCPサポートを使用（OpenAIのResponses API）
- サーバー間通信（CORSの問題なし）
- MCPサーバーへの直接接続

**Gemini**: 関数呼び出し統合
- MCPツールがGeminiの関数宣言として登録
- ToolExecutorがMCPサーバー通信を処理
- ブラウザ環境ではCORS設定が必要

#### 基本的な使用方法

```typescript
// MCPサーバーは全てのプロバイダー（OpenAI、Claude、Gemini）で動作
const mcpServers = [{
  type: 'url',
  url: 'http://localhost:3000',
  name: 'local-server',
  authorization_token: 'optional-token'
}];

// OpenAI/Claude - 直接MCP統合
const openaiService = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  mcpServers // Responses API経由で直接統合
});

// Gemini - 関数呼び出し経由でMCP
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: 'your-key',
  mcpServers // 関数宣言として統合
});

// MCPツールは自動的に利用可能になり、ToolExecutorによって処理されます
```

#### Gemini固有のCORS設定

ブラウザ環境でGeminiをMCPと一緒に使用する場合、CORSの問題を回避するためにプロキシを設定する必要があります：

**Vite開発設定** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api/mcp': {
        target: 'https://mcp.deepwiki.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp/, ''),
      }
    }
  }
})
```

**動的MCPサーバー設定**:
```typescript
// プロバイダー別MCPサーバー設定
const getMcpServers = (provider: string): MCPServerConfig[] => {
  const baseUrl = provider === 'gemini' 
    ? '/api/mcp/sse'  // Gemini用プロキシURL（ブラウザ）
    : 'https://mcp.deepwiki.com/sse';  // OpenAI/Claude用直接URL

  return [{
    type: 'url',
    url: baseUrl,
    name: 'deepwiki',
  }];
};

// チャットサービス作成で使用
const mcpServers = getMcpServers(chatProvider);
const chatService = ChatServiceFactory.createChatService(chatProvider, {
  apiKey: 'your-api-key',
  mcpServers
});
```

#### エラーハンドリング・タイムアウト

Gemini MCP実装には堅牢なエラーハンドリングが含まれています：
- MCPスキーマ取得に5秒のタイムアウト
- MCPサーバーが利用できない場合の基本検索ツールへの自動フォールバック
- MCP初期化が失敗した場合の優雅な劣化

### 感情検出

```typescript
import { textToScreenplay } from '@aituber-onair/chat';

const text = "[happy] お会いできて嬉しいです！";
const screenplay = textToScreenplay(text);
console.log(screenplay); // { emotion: 'happy', text: "お会いできて嬉しいです！" }
```

## API リファレンス

### ChatService インターフェース

```typescript
interface ChatService {
  getModel(): string;
  getVisionModel(): string;
  
  processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>
  ): Promise<void>;
  
  processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>
  ): Promise<void>;
  
  chatOnce(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number
  ): Promise<ToolChatCompletion>;
  
  visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number
  ): Promise<ToolChatCompletion>;
}
```

### 型定義

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
}

interface MessageWithVision {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | VisionBlock[];
}

type ChatResponseLength = 'veryShort' | 'short' | 'medium' | 'long' | 'veryLong';
type VisionSupportLevel = 'supported' | 'unsupported' | 'unknown';
```

### Vision対応判定

```typescript
const providerLevel = ChatServiceFactory.getVisionSupportLevel(
  'openai-compatible',
);
const modelLevel = ChatServiceFactory.getVisionSupportLevelForModel(
  'openai-compatible',
  'your-local-model',
);

console.log(providerLevel); // 'unknown'
console.log(modelLevel); // 'unknown'
```

意味:
- `supported`: リクエスト送信前に vision 対応と分かっている
- `unsupported`: リクエスト送信前に非対応と分かっている
- `unknown`: 事前判定できないが、実際には成功する可能性がある

### プロバイダー機能の事前判定

UI やエージェント実行環境は、チャットサービスを作成する前にプロバイダーの
機能を確認できます。

```typescript
const capabilities = ChatServiceFactory.getProviderCapabilities(
  'openai',
  'gpt-5.4-mini',
);

if (capabilities?.jsonMode) {
  // JSON mode のトグル表示や responseFormat の指定が安全にできます。
}

if (!capabilities?.mcp) {
  // このプロバイダーでは MCP server 設定を無効化できます。
}
```

`getProviderCapabilities(provider, model?)` は `models`, `defaultModel`,
`vision`, `tools`, `mcp`, `jsonMode`, `responseLength`, 対応する
`reasoningEffort` などの機械可読な metadata を返します。プロバイダー選択 UI
やダッシュボードを作る場合は `getAllProviderCapabilities()` も利用できます。

capability object は実行前の判断に使う静的 metadata です。API key、endpoint、
base URL、MCP server 定義、その他のユーザー設定は含みません。これにより、UI
では非対応の設定を実行前に非表示/無効化でき、エージェント側では tools、MCP、
vision、JSON mode、reasoning 設定を使うべきかを provider 固有ロジックの
ベタ書きなしで判断できます。

## 利用可能なプロバイダー

現在、以下のAIプロバイダーが組み込まれています：

- **OpenAI**: GPT-6.1 Terra (`gpt-6.1-terra`, 明示選択、ツールはResponses経由), GPT-6.1 Sol (`gpt-6.1-sol`, ツールはResponses経由)、GPT-6 Astra (`gpt-6-astra`)、GPT-6 Sol (`gpt-6-sol`)、GPT-6 Luna (`gpt-6-luna`, 既定でResponses API); GPT-5.6（Sol/Terra/Luna）、GPT-5.5、GPT-5.4 Pro、GPT-5.4、GPT-5.4 Miniのモデルをサポート
- **OpenAI-Compatible**: OpenAI互換 endpoint 経由で任意のローカル/セルフホスト model ID を利用できます。vision 対応可否は endpoint ごとに差があるため、原則 `unknown` 扱いです
- **Gemini**: Gemini 4 Hydrogen（`gemini-4-hydrogen`、レート制限付き無料枠ありの明示選択肢）、Gemini 4 Carbon（`gemini-4-carbon`）とGemini 4 Argon（`gemini-4-argon`）に対応。Argon・Carbonは有料枠が必要です。Gemini 4はいずれも思考必須・初期値`low`です。Gemini 3.8 Flash、Gemini 3.6 Flash、Gemini 3.5 Flash-Lite、Gemini 3.1 Flash-Lite、Gemini 3.1 Pro Preview、Gemini 3 Flash Preview、Gemini 2.5 Flash Lite、Gemma 4 31B IT、Gemma 4 26B A4B IT などの推奨モデルをサポート。Gemini 3 はチャット用途向けに利用可能な最小の thinking を既定値にします。`minimal` 非対応の Gemini 3.8 Flash、Gemini 3.7 Flash、Gemini 3 Pro は `low`、その他の Gemini 3 Flash は `minimal` を使います。Gemini 3.7 Flash、Gemini 3.5 Flash、Gemini 3.1 Flash-Lite Preview、Gemini 3 Pro Preview、Gemini 2.5 Flash Lite Preview などの lifecycle 上 deprecated なモデルは明示指定用に export を残しています
- **Claude**: Claude Haiku 5.5 (`claude-haiku-5-5`、明示選択)、Claude Opus 5.5 (`claude-opus-5-5`)、Claude Sonnet 5.5 (`claude-sonnet-5-5`)、Claude Fable 5.1 (`claude-fable-5-1`)、Claude Fable 5.2 (`claude-fable-5-2`、明示選択); Claude Fable 5, Claude Opus 5, Claude Sonnet 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 4.6, Claude Haiku 4.5 をサポート。調整可能な`reasoning_effort`は対応モデルに限り`output_config.effort`として送信し、refusal metadataは終端completionとして保持します
- **OpenRouter**: Gemini 4 Hydrogen（`google/gemini-4-hydrogen`）・Muse Ember・Inkling 2 Small・Nex N2.6・Ling 3.2 Flash Freeを画像入力対応の明示選択肢として利用できます。追加の明示選択肢としてGPT Luna/Terra、DeepSeek/GLM Flashの各エイリアス、MiMo V2.6 Pro、Hy4、Command A+、Seed 2.1 Turbo、Nemotron 3.5 Super VL（有料）、Sakana Namazuに対応。Gemini 4 Carbon（`google/gemini-4-carbon`）とGemini 4 Argon（`google/gemini-4-argon`）（いずれも有料の明示選択肢、思考必須・初期値`low`）、Pareto 26.9 (`unbiased/pareto-26.9`), Mistral Large 4 (`mistralai/mistral-large-4-0`, 明示選択の公開プレビュー), Ling 3.1 Flash（テキスト専用・明示選択）、Solar Mini4、Solar Pro 4、MiMo V2.6 Flash、GPT-6.1 Sol, GPT-6 Sol/Luna/Astra/Pro, Claude Sonnet 5.5/Opus 5.5, Grok 4.7, Claude Fable 5.1/5.2, DeepSeek V4.1 Flash, Gemini 3.8 Flash, Qwen3.8 Max, Muse Spark 1.3; OpenAI/Claude/Gemini/Z.ai/xAI/Kimi/DeepSeek/Qwenのキュレーション済み一覧をサポート。GLM-5.3/FlashX、Qwen3.8 Flash、DeepSeek V4 Flash Vision Exp、Claude Sonnet 5/Opus 4.8、Kimi K2.6も含みます。 明示選択として`nvidia/nemotron-3.5-lightning`（テキスト専用）、`qwen/qwen3.8-27b`と`qwen/qwen3.8-omni-flash`（画像入力対応）も利用できます。デフォルトは`google/gemma-4-31b-it:free`で、`nvidia/nemotron-3.5-super-vl:free`も無料モデルとして掲載しています。 追加モデル: `anthropic/claude-haiku-5.5`, `deepseek/deepseek-v4.1-flash-1017`, `moonshotai/kimi-k3.1-pro`, `minimax/minimax-m3.1-flash`, `unbiased/pareto-26.10`, `inclusionai/ling-3.0-flash-vl`, `nex-agi/nex-n2.5-pro`. `openai/gpt-6.1-terra`も明示選択で利用できます。
- **Z.ai**: GLM-5.3/GLM-5.2/GLM-5.1/GLM-5/GLM-5-TurboとGLM-4.7/4.6のテキストモデル、GLM-5.3-FlashX/GLM-5.3-Flash/GLM-5V-Turbo/GLM-4.6V系のビジョンモデルをサポート。GLM-5.3はthinking必須で`low`、GLM-5.2は`none`を既定値にします
- **xAI**: Grok 4.7、Grok 4.6、Grok 4.5、Grok 4.3、Grok 4.20 Reasoning/Non-Reasoningをvision対応でサポート。Grok 4.7/4.6/4.5のpackage既定は低遅延向けの`reasoning_effort: 'low'`、Grok 4.3は`none`です
- **Kimi**: Kimi K3.1 Pro（`kimi-k3.1-pro`、デフォルト）とHighspeed（`kimi-k3.1-pro-highspeed`）は画像・ツール・ストリーミングに対応し、推論設定はK3と共通です。Kimi K3（`kimi-k3`、`low` / `high` / `max` reasoning、パッケージのデフォルトは `low`）もサポートし、いずれもビジョン対応です。K2系列（`kimi-k2.6`、`kimi-k2.7-code`、`kimi-k2.7-code-highspeed`）は2026年12月の提供終了に先立ち非推奨にしています
- **DeepSeek**: 更新に追従する`deepseek-flash` IDでDeepSeek V4.1 Flash 1017を利用できます。テキスト専用のV4 Pro（`deepseek-v4-pro`）にもOpenAI互換Chat Completions経由で対応し、旧Flash IDは互換用に維持しています。低遅延チャット向けにthinkingはデフォルト無効です。
- **Mistral**: Ministral 3系（`ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`）と現行generalist modelをサポートし、streamingとvisionにも対応。adjustable `reasoning_effort`は対応モデルにだけ送信します。GLM-5.3 (`zai-glm-5-3`) はテキスト専用の明示選択モデルです。GLM-5.3 Flash（`zai-glm-5-3-flash`）は画像入力にも対応し、推論レベルは`low`（初期値）・`high`・`max`です。Mistral Large 4（`mistral-large-4-0`）は公開プレビューの明示選択モデルで、非推奨の`mistral-large-2512`は対応一覧に表示しません。
- **Sakana AI**: Fugu、Fugu Ultra、日本語特化・ビジョン対応のSakana Namazu（`sakana-namazu`）をOpenAI互換Chat Completions経由でサポート。Namazuのthinkingはデフォルト無効です
- **Sarashina**: ベータのバックエンド専用 API。テキスト、streaming、tools、暗号化 reasoning の再送に対応します。既定モデルは Nano で、Mini と Mini Thinking は明示選択です。認証、データ利用規約、出力上限は Sarashina の節を参照してください。
- **PLaMo**: PLaMo 3.0 Prime（`plamo-3.0-prime`, デフォルト）とPLaMo 3.1 Prime（`plamo-3.1-prime`）をOpenAI互換Chat Completions経由でサポートし、廃止予定の2.2定数は互換用にexportを残します
- **Gemini Nano**: Chromeブラウザ内蔵AI（LanguageModel API）。デバイス上で動作し、APIキー不要。Webページでは対応するデスクトップ端末上のChrome 148以降が必要で、Chromeフラグの設定は不要。`promptStreaming()` が利用できる場合はストリーミングし、ビジョン非対応

## ライセンス

MIT

## 貢献

貢献を歓迎します！プルリクエストをお気軽にご提出ください。

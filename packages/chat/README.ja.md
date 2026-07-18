# @aituber-onair/chat

![@aituber-onair/chat ロゴ](./images/aituber-onair-chat.png)

AITuber OnAirのチャット・LLM API統合ライブラリです。このパッケージは、OpenAI、ローカルLLM含むOpenAI互換プロバイダー、Claude、Gemini、Gemini Nano（Chromeブラウザ内蔵AI）、OpenRouter、Z.ai、xAI、Kimi、DeepSeek、Mistral、Sakana AI、PLaMo、Agent SDKプロバイダー等の様々なAIチャットプロバイダーとやり取りするための統一されたインターフェースを提供します。

## 機能

- 🤖 **複数のAIプロバイダー対応**: OpenAI、ローカルLLM含むOpenAI互換プロバイダー、Claude (Anthropic)、Google Gemini、Gemini Nano（Chromeブラウザ内蔵AI）、OpenRouter、Z.ai、xAI、Kimi、DeepSeek、Mistral、Sakana AI、PLaMo、Agent SDKプロバイダー
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

Codex SDK、Claude Agent SDK、Copilot SDK のようなエージェントSDKを使う場合は、
専用の `@aituber-onair/chat/agent` エントリを使用します。

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

`@aituber-onair/chat/agent` は、Codex SDK、Claude Agent SDK、Copilot SDK のような
エージェントSDK向けの実験的なプロバイダーを公開します。ブラウザ/GAS向けUMDエントリには
含まれず、APIキーも使用しません。

利用するエージェントSDKパッケージだけを、利用側の JavaScript ランタイムアプリに追加してください。

```bash
npm install @aituber-onair/chat @openai/codex-sdk
# または
npm install @aituber-onair/chat @anthropic-ai/claude-agent-sdk
# または
npm install @aituber-onair/chat @github/copilot-sdk
```

`@openai/codex-sdk`、`@anthropic-ai/claude-agent-sdk`、`@github/copilot-sdk` は
`@aituber-onair/chat` の依存関係には含めていません。SDK は動的に読み込むため、通常の API
プロバイダーだけを使うユーザーはこれらのエージェントSDKパッケージをインストールする
必要がありません。

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

利用可能なプロバイダー:
- `codex-sdk`: `@openai/codex-sdk` と Codex 認証が必要です。
- `claude-agent-sdk`: `@anthropic-ai/claude-agent-sdk` と Claude Agent SDK 認証が必要です。
- `copilot-sdk`: `@github/copilot-sdk` と GitHub Copilot 認証が必要です。

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
  model: 'gpt-5.4-nano',
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
- `gpt-5.4-nano` – 単純な高頻度タスクや軽量サブエージェント向けの最廉価な GPT-5.4 系モデル。
- `gpt-5.1` – 複雑な推論、広範な世界知識、コードやマルチステップのエージェントタスク向け。
- `gpt-5` – 旧フラッグシップ（後方互換目的で提供されるが、現在は 5.1 が推奨）。
- `gpt-5-mini` – コスト最適化された推論/チャットモデル。速度と能力のバランスが良い。
- `gpt-5-nano` – 指示追従や分類などの高スループット処理に向いた軽量モデル。

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

```typescript
const claudeService = ChatServiceFactory.createChatService('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-5'
});
```

#### Google Gemini

```typescript
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-3.1-flash-lite'
});
```

`gemini-3.1-flash-lite` が推奨の安定版 Flash-Lite モデルです。
現在の安定版 Flash モデルとして `gemini-3.5-flash` も利用できます。
`gemini-3.1-flash-lite-preview`、`gemini-3-pro-preview`、
`gemini-2.5-flash-lite-preview-06-17` などの preview / deprecated
モデルは後方互換のため明示的な model string では利用できますが、本番用途では
新しいモデルへ移行してください。

チャット用途では、`gemini-3.5-flash` に対して Gemini の
`thinkingConfig`（`thinkingLevel: 'MINIMAL'`、`includeThoughts: false`）を
自動で送信します。利用者側で追加オプションを指定する必要はなく、既定で高速な
チャット応答と hidden thinking token の抑制を優先します。

#### OpenRouter

```typescript
const openRouterService = ChatServiceFactory.createChatService('openrouter', {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'openai/gpt-oss-20b:free', // 無料利用枠モデル
  // オプション: 分析用アプリ情報を追加
  appName: 'あなたのアプリ名',
  appUrl: 'https://your-app-url.com'
});
```

**OpenRouterの重要な注意事項:**
- `gpt-oss-20b:free`モデルでは、技術的制限によりトークン制限が自動的に無効化されます
- 応答の長さを制御するには、プロンプト内で指示してください（例：「40文字以内で返答してください」）
- 無料階層にはレート制限があります（20リクエスト/分）
- 無料モデル判定はモデルID末尾の `:free` で行います（動的取得した `:free` も同様にレート制限対象）
- `openrouter/fusion` は複数モデルのパネルとジャッジモデルを実行します。単一モデルの固定単価ではなく、内部で使われた各モデル呼び出しと web search/fetch 利用分の合算で課金されます。
- `z-ai/glm-5.2` は OpenRouter reasoning を `none` にし、reasoning token が出力上限を使い切って可視テキストが空になることを避けるため、トークン制限も自動的に無効化します。
- サポート対象モデル（キュレーション済み）:
  - `openrouter/auto`
  - `openrouter/fusion`
  - `openai/gpt-oss-20b:free`
  - `~openai/gpt-latest`, `~openai/gpt-mini-latest`, `openai/gpt-5.5-pro`, `openai/gpt-5.5`
  - `openai/gpt-5.1-chat`, `openai/gpt-5.1-codex`, `openai/gpt-5-mini`, `openai/gpt-5-nano`
  - `openai/gpt-4o`, `openai/gpt-4.1-mini`, `openai/gpt-4.1-nano`
  - `~anthropic/claude-sonnet-latest`, `~anthropic/claude-haiku-latest`
  - `anthropic/claude-opus-4`, `anthropic/claude-sonnet-4`
  - `anthropic/claude-3.7-sonnet`, `anthropic/claude-3.5-sonnet`, `anthropic/claude-haiku-4.5`
  - `~google/gemini-pro-latest`, `~google/gemini-flash-latest`
  - `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite-preview-09-2025`
  - `z-ai/glm-5.2`, `z-ai/glm-4.7-flash`, `z-ai/glm-4.5-air`, `z-ai/glm-4.5-air:free`
  - `~moonshotai/kimi-latest`, `moonshotai/kimi-k2.7-code`, `moonshotai/kimi-k2.5`

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

console.log(result.working); // 例: ['openai/gpt-oss-20b:free']
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
  model: 'glm-5.2',
  visionModel: 'glm-4.6V-Flash', // 任意: ビジョン対応モデル
  responseFormat: { type: 'json_object' } // 任意: JSONモード
});
```

注意:
- Z.aiはOpenAI互換のChat Completionsを利用します。
- テキスト対応モデル: `glm-5.2`, `glm-5.1`, `glm-5`, `glm-5-turbo`, `glm-4.7`, `glm-4.7-FlashX`, `glm-4.7-Flash`, `glm-4.6`
- ビジョン対応モデル: `glm-5v-turbo`, `glm-4.6V`, `glm-4.6V-FlashX`, `glm-4.6V-Flash`
- `thinking` はデフォルトで無効化しています。

#### xAI（Grok）

```typescript
const xaiService = ChatServiceFactory.createChatService('xai', {
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-4.5',
  reasoning_effort: 'low', // 任意（Grok 4.5）: low, medium, high
  visionModel: 'grok-4.3', // 任意: ビジョン対応の xAI モデルを指定
});
```

注意:
- xAIはOpenAI互換のChat Completionsを利用します。
- 対応モデル: `grok-4.5`, `grok-4.3`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`, `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `reasoning_effort` は対応モデルにのみ送信されます。`grok-4.5` は `low`, `medium`, `high` に対応し、チャット用途向けにデフォルトは `low` です。`grok-4.3` は `none`, `low`, `medium`, `high` に対応し、デフォルトは `none` です。
- 対応 xAI モデルではビジョンとツール・関数呼び出しを利用できます。Grok 4.5 も React basic サンプルで画像チャットを直接検証できるようにビジョン対応として有効化しています。

#### Kimi（Moonshot）

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  model: 'kimi-k3',
  // Optional: エンドポイント/ベースURLの上書き
  // endpoint: 'https://api.moonshot.ai/v1/chat/completions',
  // baseUrl: 'https://api.moonshot.ai/v1',
  reasoning_effort: 'max'
});
```

注意:
- KimiはOpenAI互換のChat Completionsを利用します。
- 対応モデル: `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, `kimi-k2.5`
- チャット用途向けのデフォルトモデルは引き続き `kimi-k2.6` です。
- Kimi K3は高Reasoning用途向けの明示的な選択肢です。現在は `reasoning_effort: 'max'` のみ対応し、K2系の `thinking` オプションは利用できません。
- Kimi K3の出力上限には `max_completion_tokens` を使用します。
- Kimi K3の複数ターン・ツール呼び出しでは、`reasoning_content` と `tool_calls` を保持するため、返された `completion.assistant_message` を会話履歴へ追加してください。
- Kimi K2.7 Code 系モデルはコーディング寄りで、thinking mode が必須のため、ツール使用時も `thinking` を有効のままにします。
- Kimi K2.7 Code 系モデルで `thinking: { type: 'disabled' }` を明示指定すると、リクエスト送信前にエラーになります。
- 旧 Kimi モデルでは、ツール使用時に `thinking` を `{ type: 'disabled' }` に強制します。

自前ホスティング例:

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  baseUrl: 'http://localhost:8000/v1',
  thinking: { type: 'disabled' }
});
```

注意:
- 自前ホスティングではthinking制御に`chat_template_kwargs`を使用します。

#### DeepSeek

```typescript
const deepSeekService = ChatServiceFactory.createChatService('deepseek', {
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-v4-flash',
});
```

注意:
- DeepSeekはOpenAI互換のChat Completions（`https://api.deepseek.com/chat/completions`）を利用します。
- 推奨モデルは`deepseek-v4-flash`（デフォルト）と`deepseek-v4-pro`です。
- legacy alias の`deepseek-chat`と`deepseek-reasoner`は互換用にexportしていますが、DeepSeek側で非推奨かつ2026-07-24廃止予定です。
- `openai-compatible`にendpoint/modelを直接指定して使うこともできますが、`deepseek` providerならendpointとデフォルトモデル指定が簡単です。
- DeepSeek固有のthinking/reasoning制御は公式docsにありますが、このpackageはデフォルトでは独自パラメータを追加せず、標準chat/streamingを優先します。

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
- 対応モデル: `mistral-small-latest`, `ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`, `mistral-medium-3-5`, `mistral-large-latest`, `mistral-large-2512`, `mistral-small-2603`, `mistral-medium-2508`
- Ministral 3系は同じChat Completions endpointでtext、vision、streaming、function callingに対応します。
- `reasoning_effort`は`'none' | 'high'`に対応し、Mistral公式docsに合わせて`mistral-small-latest`と`mistral-medium-3-5`にだけ送信します。それ以外のモデルでは省略します。

reasoning例:

```typescript
const mistralReasoningService = ChatServiceFactory.createChatService(
  'mistral',
  {
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'mistral-medium-3-5',
    reasoning_effort: 'high',
  },
);
```

#### Sakana AI

```typescript
const sakanaService = ChatServiceFactory.createChatService('sakana', {
  apiKey: process.env.FUGU_API_KEY,
  model: 'fugu',
});
```

注意:
- Sakana AI Fuguは`https://api.sakana.ai/v1/chat/completions`のOpenAI互換Chat Completionsを利用します。
- 対応モデル: `fugu`（デフォルト）, `fugu-ultra`, `fugu-ultra-20260615`
- Sakanaは新しいChat Completions連携では`max_completion_tokens`を推奨していますが、legacyな`max_tokens`も受け付けます。このproviderでは既存OpenAI互換providerの挙動に合わせて`max_tokens`を使います。
- Sakanaは最高性能にはResponses APIを推奨していますが、このproviderはpackageのOpenAI互換chat経路に合わせてChat Completionsを利用します。
- ブラウザから直接呼ぶ場合、Sakana側がoriginに対してCORSを許可していないと失敗します。ブラウザ単体ではなく、Node.js、backend/serverless proxy、または`examples/sakana-basic`を利用してください。

#### PLaMo

```typescript
const plamoService = ChatServiceFactory.createChatService('plamo', {
  apiKey: process.env.PLAMO_API_KEY,
  model: 'plamo-3.0-prime',
});
```

注意:
- PLaMoは`https://api.platform.preferredai.jp/v1/chat/completions`のOpenAI互換Chat Completionsを利用します。
- 対応モデル: `plamo-3.0-prime`（デフォルト）, `plamo-2.2-prime`
- `plamo-2.2-prime` は明示的な互換用途として残していますが、PLaMo公式docsでは2026-09-30に提供終了し、`plamo-3.0-prime`へ統合予定とされています。
- reasoning対応モデルでは`reasoning_effort`に`none`または`medium`を指定できます。
- このproviderではvision対応はサポート対象として扱いません。
- PLaMoは`openai-compatible`にendpointとmodelを直接指定して使うこともできます。

#### Gemini Nano（Chromeブラウザ内蔵AI）

```typescript
const geminiNanoService = ChatServiceFactory.createChatService('gemini-nano', {
  responseLength: 'medium'
});
```

注意:
- APIキー不要 — ChromeのLanguageModel API（Prompt API）を使用します。
- **Chrome 138以降**で、以下のフラグを有効にする必要があります:
  - `chrome://flags/#optimization-guide-on-device-model` → Enabled
  - `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
- モデルはすべてデバイス上で実行され、推論時にネットワーク通信は発生しません。
- 非ストリーミングのみ — レスポンスは完全なテキストとして一括返却されます。
- ビジョン（画像入力）は非対応です。
- 初回のモデルダウンロードにはユーザー操作が必要で、数分かかる場合があります。

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

- **OpenAI**: GPT-5.6（Sol/Terra/Luna）、GPT-5.5、GPT-5.4 Pro、GPT-5.4、GPT-5.4 Mini、GPT-5.4 Nano、GPT-5.1、GPT-5（Nano/Mini/Standard）、GPT-4.1(miniとnanoを含む), GPT-4, GPT-4o-mini, O3-mini, o1, o1-miniのモデルをサポート
- **OpenAI-Compatible**: OpenAI互換 endpoint 経由で任意のローカル/セルフホスト model ID を利用できます。vision 対応可否は endpoint ごとに差があるため、原則 `unknown` 扱いです
- **Gemini**: Gemini 3.5 Flash、Gemini 3.1 Flash-Lite、Gemini 3.1 Pro Preview、Gemini 3 Flash Preview、Gemini 2.5 Pro、Gemini 2.5 Flash、Gemini 2.5 Flash Lite、Gemma 4 31B IT、Gemma 4 26B A4B IT などの推奨モデルをサポート。Gemini 3.5 Flash はチャット用途向けに minimal thinking を自動適用します。Gemini 3.1 Flash-Lite Preview、Gemini 3 Pro Preview、Gemini 2.5 Flash Lite Preview などの lifecycle 上 deprecated なモデルは明示指定用に export を残しています
- **Claude**: Claude Sonnet 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 4.6, Claude Sonnet 4.5, Claude Haiku 4.5 に加え、まだ利用可能だが非推奨の Claude 4 Opus, Claude 4 Sonnet, Claude 3 Haiku をサポート
- **OpenRouter**: OpenRouterのキュレーション済みモデル一覧（OpenAI/Claude/Gemini/Z.ai/Kimi）をサポート。モデルIDはOpenRouter節を参照してください
- **Z.ai**: GLM-5.2/GLM-5.1/GLM-5/GLM-5-Turbo（テキスト）、GLM-4.7/4.6（テキスト）、GLM-5V-Turbo/GLM-4.6V系（ビジョン）をサポート
- **xAI**: Grok 4.5 をチャット用途向けに `reasoning_effort: 'low'` デフォルトでサポート。加えて Grok 4.3、Grok 4.20 の Reasoning/Non-Reasoning、Grok 4-1 Fast の Reasoning/Non-Reasoning をサポートし、全モデルでビジョン対応
- **Kimi**: Kimi K3（`kimi-k3`、max reasoningのみ）、Kimi K2.7 Code（`kimi-k2.7-code`）、Kimi K2.7 Code HighSpeed（`kimi-k2.7-code-highspeed`）、Kimi K2.6（`kimi-k2.6`、デフォルト）、Kimi K2.5（`kimi-k2.5`、いずれもビジョン対応）をサポート
- **DeepSeek**: DeepSeek V4 Flash（`deepseek-v4-flash`）と DeepSeek V4 Pro（`deepseek-v4-pro`）をOpenAI互換Chat Completions経由でサポート。legacy alias の`deepseek-chat`と`deepseek-reasoner`はDeepSeek側で非推奨です
- **Mistral**: Ministral 3系（`ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`）と現行generalist modelをサポートし、streamingとvisionにも対応。adjustable `reasoning_effort`は対応モデルにだけ送信します
- **Sakana AI**: Fugu（`fugu`）と Fugu Ultra（`fugu-ultra`, `fugu-ultra-20260615`）をOpenAI互換Chat Completions経由でサポート
- **PLaMo**: PLaMo 3.0 Prime（`plamo-3.0-prime`, デフォルト）と PLaMo 2.2 Prime（`plamo-2.2-prime`）をOpenAI互換Chat Completions経由でサポート
- **Gemini Nano**: Chromeブラウザ内蔵AI（LanguageModel API）。デバイス上で動作し、APIキー不要。Chrome 138以降でPrompt APIフラグの有効化が必要。非ストリーミング、ビジョン非対応

## ライセンス

MIT

## 貢献

貢献を歓迎します！プルリクエストをお気軽にご提出ください。

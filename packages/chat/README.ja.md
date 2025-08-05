# @aituber-onair/chat

![@aituber-onair/chat ロゴ](./images/aituber-onair-chat.png)

AITuber OnAirのチャット・LLM API統合ライブラリです。このパッケージは、OpenAI、Claude、Gemini等の様々なAIチャットプロバイダーとやり取りするための統一されたインターフェースを提供します。

## 機能

- 🤖 **複数のAIプロバイダー対応**: OpenAI、Claude (Anthropic)、Google Gemini
- 🔄 **統一されたインターフェース**: 異なるプロバイダー間での一貫したAPI
- 🛠️ **ツール・関数呼び出し**: AI関数呼び出しの自動反復処理をサポート
- 💬 **ストリーミングレスポンス**: リアルタイムストリーミングチャット応答
- 🖼️ **ビジョン対応**: ビジョン対応モデルでの画像処理
- 📝 **感情検出**: AI応答からの感情抽出
- 🎯 **応答長制御**: プリセットまたはカスタムトークン制限での応答長設定
- 🔌 **Model Context Protocol (MCP)**: MCP サーバーサポート（全プロバイダー対応）

## インストール

```bash
npm install @aituber-onair/chat
```

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
  model: 'gpt-4-turbo-preview',
  endpoint: 'chat/completions' // o1シリーズモデルの場合は 'responses'
});
```

#### Claude (Anthropic)

```typescript
const claudeService = ChatServiceFactory.createChatService('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-opus-20240229'
});
```

#### Google Gemini

```typescript
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-pro'
});
```

### ビジョンチャット

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

```typescript
// プリセット応答長を使用
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  responseLength: 'medium' // 'veryShort', 'short', 'medium', 'long', 'veryLong'
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
```

## 利用可能なプロバイダー

### OpenAI
- モデル: GPT-4、GPT-4 Turbo、GPT-3.5 Turbo、o1シリーズ
- ビジョン: GPT-4 Vision
- ツール: 関数呼び出しサポート
- MCP: サポート済み

### Claude (Anthropic)
- モデル: Claude 3 (Opus、Sonnet、Haiku)、Claude 2
- ビジョン: Claude 3モデル
- ツール: ツール使用サポート
- MCP: サポート済み

### Gemini (Google)
- モデル: Gemini Pro、Gemini Pro Vision
- ビジョン: Gemini Pro Vision
- ツール: 関数呼び出しサポート
- MCP: サポート済み（関数呼び出し統合経由）

## 技術的な実装詳細

### Gemini MCP実装

#### 主要実装ファイル
- **`GeminiChatService.ts`** - MCP スキーマ初期化、関数宣言登録、エラーハンドリング
- **`MCPSchemaFetcher.ts`** - MCPサーバーからの動的ツールスキーマ取得
- **`ToolExecutor.ts`** - MCPツール名解析とHTTPリクエスト処理

#### ツール命名規則
MCPツールは適切なルーティングのために特定の命名パターンに従います：

**形式**: `mcp_{サーバー名}_{ツール名}`

**例**:
- `mcp_deepwiki_search` - deepwikiサーバーからの検索ツール
- `mcp_calculator_evaluate` - calculatorサーバーからの評価ツール

#### エラーハンドリング機能

**タイムアウト保護**:
```typescript
// MCPスキーマ取得に5秒のタイムアウト
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('MCP schema fetch timeout')), 5000)
);
```

**フォールバック戦略**:
```typescript
// 一般的な検索ツールへの自動フォールバック
this.mcpToolSchemas = this.mcpServers.map((server) => ({
  name: `mcp_${server.name}_search`,
  description: `${server.name} MCPサーバーを使用した検索（フォールバック）`,
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '検索クエリ' }
    }
  }
}));
```

**優雅な劣化**:
- MCP初期化が失敗しても通常のツールは動作を継続
- MCPツールが利用できない場合の警告表示
- ネットワークエラーに対する堅牢なエラーハンドリング

### 開発のベストプラクティス

#### サーバー環境 vs ブラウザ環境
- **サーバー/Node.js**: 直接MCPサーバーURLを使用（プロキシ不要）
- **ブラウザ**: Gemini用にプロキシを設定、OpenAI/Claudeは直接URL
- **テスト**: 開発にはlocalhost MCPサーバーを使用

#### エラー監視
- MCP初期化失敗のコンソール警告を監視
- ブラウザ開発ツールでCORSの問題のネットワークリクエストをチェック
- MCPサーバーの可用性と応答形式を確認

#### パフォーマンス考慮事項
- MCPスキーマ取得により起動時間が追加（5秒タイムアウト）
- 本番環境でのスキーマキャッシュを検討
- MCP vs 通常ツールのツール実行時間を監視

## ライセンス

MIT

## 貢献

貢献を歓迎します！プルリクエストをお気軽にご提出ください。
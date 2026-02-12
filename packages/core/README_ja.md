# AITuber OnAir Core

![AITuber OnAir Core - logo](./images/aituber-onair-core.png)

[AITuber OnAir Core](https://www.npmjs.com/package/@aituber-onair/core)は、AITuber配信のためのWebサービスである [AITuber OnAir](https://aituberonair.com) で機能提供を行うために開発されたTypeScript製のライブラリです。

[Click here for the English README](./README.md)

[AITuber OnAir](https://aituberonair.com) で機能提供を行なうのが目的ですが、こちらのプロジェクトはオープンソースとして公開されており、MITライセンスの [npmパッケージ](https://www.npmjs.com/package/@aituber-onair/core) として利用が可能です。

テキスト入力や画像入力から応答テキストと音声を生成する機能に特化し、アプリケーションの他の部分（ストレージ、YouTube連携、アバター制御など）と簡単に統合できるように設計されています。

## 目次

- [概要](#概要)
- [インストール方法](#インストール方法)
- [主な機能](#主な機能)
- [基本的な使用方法](#基本的な使用方法)
- [ツールシステム (Function calling)](#ツールシステム)
- [MCPの利用方法](#MCPの利用方法)
- [OpenAI Remote MCPの利用](#OpenAI-Remote-MCPの利用)
- [Claude MCP Connectorの使用方法](#Claude-MCP-Connectorの使用方法)
- [応答長制御](#応答長制御)
- [アーキテクチャ](#アーキテクチャ)
- [主要コンポーネント](#主要コンポーネント)
- [イベントシステム](#イベントシステム)
- [音声エンジン対応](#音声エンジン対応)
- [AIプロバイダーシステム](#AIプロバイダーシステム)
- [メモリと永続化](#メモリと永続化)
- [応用例](#応用例)
- [既存アプリケーションとの統合](#既存アプリケーションとの統合)
- [テストと開発](#テストと開発)
- [メモリイベントの移行ガイド](#メモリイベントの移行ガイド)

## 概要

AITuberOnAirCoreは、AIチューバーの中心的な機能を提供するモジュールで、AITuber OnAirアプリケーションの核となる部分です。複雑なAI応答生成、会話文脈の管理、音声合成などの機能をカプセル化し、シンプルなAPIで利用できるようにしています。

## インストール方法

npmを使用してインストールする場合：

```bash
npm install @aituber-onair/core
```

yarnを使用してインストールする場合：

```bash
yarn add @aituber-onair/core
```

pnpmを使用してインストールする場合：

```bash
pnpm install @aituber-onair/core
```

## 主な機能

- **テキスト入力からのAI応答生成**：ユーザーのテキスト入力に対して、OpenAI GPTモデルを使用して自然な応答を生成
- **画像（Vision）入力からのAI応答生成**：配信画面のキャプチャなどの画像に対して、AIが認識した内容に基づく応答を生成
- **会話の文脈維持と記憶機能**：短期・中期・長期の記憶システムによる長時間の会話の文脈維持
- **テキストから音声への変換**：複数の音声エンジン（VOICEVOX、VoicePeak、AivisSpeech、Aivis Cloud、OpenAI TTS）に対応
- **感情表現の抽出と処理**：AIの応答から感情表現を抽出し、音声合成やアバター表現に活用
- **イベント駆動型のアーキテクチャ**：処理の各段階でイベントを発行し、外部との連携を容易に
- **カスタマイズ可能なプロンプト**：Vision処理や会話要約のためのプロンプトをカスタマイズ可能
- **プラグイン可能な永続化**：メモリ機能をLocalStorage、IndexedDBなど様々な方法で永続化
- **ツール機能によるFunction calling**：テキスト生成以外のアクション（計算、API呼び出し、データ取得など）をAIが実行できる機能を提供

## 基本的な使用方法

```typescript
import { AITuberOnAirCore, AITuberOnAirCoreEvent, AITuberOnAirCoreOptions } from '@aituber-onair/core';

// 1. オプション設定
const options: AITuberOnAirCoreOptions = {
  chatProvider: 'openai', // 省略可能。省略した場合はデフォルトでOpenAIが使用されます
  apiKey: 'YOUR_API_KEY',
  chatOptions: {
    systemPrompt: 'あなたはAIチューバーです。配信者のように振る舞い、明るく親しみやすい口調で話します。',
    visionSystemPrompt: '画面に映っているものについて、配信者らしくコメントしてください。',
    visionPrompt: '配信画面を見て、状況に合ったコメントをしてください。',
    memoryNote: 'これは過去の会話の要約です。適切に参照して会話を続けてください。',
    // 応答長制御
    maxTokens: 150,                    // テキストチャットの直接トークン制限
    responseLength: 'medium',          // またはプリセットを使用: 'veryShort', 'short', 'medium', 'long'
    visionMaxTokens: 200,              // 画像処理の直接トークン制限
    visionResponseLength: 'long',      // 画像処理応答のプリセット
  },
  // OpenAIのデフォルトモデルはgpt-4o-mini
  // テキストチャットと画像処理で異なるモデルを指定することができます
  // model: 'o3-mini',        // テキストチャット用の軽量モデル（画像処理非対応）
  // visionModel: 'gpt-4o',   // 画像処理も可能なモデル
  memoryOptions: {
    enableSummarization: true,
    shortTermDuration: 60 * 1000, // 1分
    midTermDuration: 4 * 60 * 1000, // 4分
    longTermDuration: 9 * 60 * 1000, // 9分
    maxMessagesBeforeSummarization: 20,
    maxSummaryLength: 256,
    // カスタム要約プロンプトを指定可能
    summaryPromptTemplate: '以下の会話を{maxLength}文字以内で要約してください。重要なポイントを含めてください。'
  },
  voiceOptions: {
    engineType: 'voicevox', // 音声エンジンタイプ
    speaker: '1', // 話者ID
    apiKey: 'ENGINE_SPECIFIC_API_KEY', // 必要に応じて（OpenAIなど）
    onComplete: () => console.log('音声再生が完了しました'),
    // カスタムAPIエンドポイントURL（オプション）
    voicevoxApiUrl: 'http://custom-voicevox-server:50021',
    voicepeakApiUrl: 'http://custom-voicepeak-server:20202',
    aivisSpeechApiUrl: 'http://custom-aivis-server:10101',
  },
  debug: true, // デバッグ出力を有効化
};

// 2. インスタンス化
const aituber = new AITuberOnAirCore(options);

// 3. イベントリスナーの設定
aituber.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
  console.log('処理開始');
});

aituber.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
  // ストリーミング応答を受け取り、UIに表示
  console.log(`部分応答: ${text}`);
});

aituber.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data) => {
  const { message, screenplay, rawText } = data;
  console.log(`完全な応答: ${message.content}`);
  console.log(`感情タグ付きの元のテキスト: ${rawText}`); // 例: [happy] こんにちは！
  if (screenplay.emotion) {
    console.log(`感情表現: ${screenplay.emotion}`);
  }
});

aituber.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
  // SPEECH_STARTイベントはscreenplayオブジェクトとrawTextを含む
  if (data && data.screenplay) {
    console.log(`音声再生開始: 感情 = ${data.screenplay.emotion || 'neutral'}`);
    console.log(`感情タグ付きの元のテキスト: ${data.rawText}`);
  } else {
    console.log('音声再生開始');
  }
});

aituber.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
  console.log('音声再生終了');
});

aituber.on(AITuberOnAirCoreEvent.TOOL_USE, (toolBlock) => 
  console.log(`ツール使用 -> ${toolBlock.name}`, toolBlock.input));

aituber.on(AITuberOnAirCoreEvent.TOOL_RESULT, (resultBlock) => 
  console.log(`ツール結果 ->`, resultBlock.content));

aituber.on(AITuberOnAirCoreEvent.ERROR, (error) => {
  console.error('エラー発生:', error);
});

// メモリとチャット履歴関連のイベント
aituber.on(AITuberOnAirCoreEvent.CHAT_HISTORY_SET, (messages) => 
  console.log('チャット履歴が設定されました:', messages.length));

aituber.on(AITuberOnAirCoreEvent.CHAT_HISTORY_CLEARED, () => 
  console.log('チャット履歴がクリアされました'));

aituber.on(AITuberOnAirCoreEvent.MEMORY_CREATED, (memory) => 
  console.log(`新しいメモリが作成されました: ${memory.type}`));

aituber.on(AITuberOnAirCoreEvent.MEMORY_REMOVED, (memoryIds) => {
  console.log('メモリが削除されました:', memoryIds);
});

aituber.on(AITuberOnAirCoreEvent.MEMORY_LOADED, (memories) => {
  console.log('メモリがロードされました:', memories.length);
  // ロードされたメモリ情報をUIに表示するなど
});

aituber.on(AITuberOnAirCoreEvent.MEMORY_SAVED, (memories) => {
  console.log('メモリが保存されました:', memories.length);
  // 保存完了通知を表示するなど
});

aituber.on(AITuberOnAirCoreEvent.STORAGE_CLEARED, () => {
  console.log('ストレージがクリアされました');
});

// 4. テキスト入力の処理
await aituber.processChat('こんにちは、今日の天気はどうですか？');

// 5. イベントリスナーのクリア（必要に応じて）
aituber.offAll();
```

## ツールシステム

AITuber OnAir Coreには、テキスト生成以外のアクションをAIが実行できる強力なツールシステムが含まれています。例えばデータの取得や計算の実行など、対話的なAITuber体験の作成に特に役立ちます。

### ツール定義の構造

ツールは`ToolDefinition`インターフェースを使用して定義され、LLMプロバイダが使用するFunction calling仕様に準拠しています：

```typescript
type ToolDefinition = {
  name: string;                 // ツールの名前
  description?: string;         // ツールの機能説明（オプション）
  parameters: {
    type: 'object';             // 常に'object'（厳格に型付けされています）
    properties?: Record<string, {
      type?: string;            // パラメータの型（例：'string'、'integer'）
      description?: string;     // パラメータの説明
      enum?: any[];             // 列挙値の場合
      items?: any;              // 配列型の場合
      required?: string[];      // 必須のネストされたプロパティ
      [key: string]: any;       // その他のJSONスキーマプロパティ
    }>;
    required?: string[];        // 必須パラメータの名前
    [key: string]: any;         // その他のJSONスキーマプロパティ
  };
  config?: { timeoutMs?: number }; // オプション設定
};
```

注意：`parameters.type`プロパティは`'object'`に厳格に型付けされており、LLMプロバイダが使用するFunction calling標準に準拠しています。

### ツールの登録と使用

ツールはAITuberOnAirCoreの初期化時に登録されます：

```typescript
// ツールの定義
const randomIntTool: ToolDefinition = {
  name: 'randomInt',
  description: '0から(max - 1)までのランダムな整数を返す',
  parameters: {
    type: 'object',  // 必ず'object'を指定する必要があります
    properties: {
      max: {
        type: 'integer',
        description: '上限値（排他的）。デフォルトは100。',
        minimum: 1,
      },
    },
  },
};

// ツールのハンドラーを作成
async function randomIntHandler({ max = 100 }: { max?: number }) {
  return Math.floor(Math.random() * max).toString();
}

// AITuberOnAirCoreにツールを登録
const aituber = new AITuberOnAirCore({
  // ...その他のオプション...
  tools: [{ definition: randomIntTool, handler: randomIntHandler }],
});

// ツール使用のイベントリスナーを設定
aituber.on(AITuberOnAirCoreEvent.TOOL_USE, (toolBlock) => 
  console.log(`ツール使用 -> ${toolBlock.name}`, toolBlock.input));

aituber.on(AITuberOnAirCoreEvent.TOOL_RESULT, (resultBlock) => 
  console.log(`ツール結果 ->`, resultBlock.content));
```

### ツール反復の制御

`maxHops`オプションを使用してツール呼び出しの反復回数を制限できます：

```typescript
const aituber = new AITuberOnAirCore({
  // ...その他のオプション...
  chatOptions: {
    systemPrompt: 'システムプロンプト',
    // ...その他のチャットオプション...
    maxHops: 10,  // ツール呼び出しの最大反復回数（デフォルト：6）
  },
  tools: [/* ツールの配列 */],
});
```

### プロバイダー別のFunction calling実装の違い

AITuber OnAir CoreはOpenAI、Claude、Gemini、Z.aiの主要なAIプロバイダーをサポートしていますが、各プロバイダーはFunction calling（ツール呼び出し）の実装方法が異なります。これらの違いはAITuber OnAir Coreによって抽象化されているため、開発者は統一されたインターフェースを使用できますが、背景を理解しておくことは重要です。

> 注: 本説明は2025年5月時点のAPIバージョンを対象としています。APIは頻繁に更新されるため、最新の公式ドキュメントも併せて参照してください。

#### OpenAIのFunction calling実装

OpenAIのFunction callingは以下の特徴があります：

- **ツール定義形式**: JSONスキーマに基づいた`functions`配列（非推奨）または`tools`配列（2023-12-01以降推奨）
- **応答形式**: ツール使用時は`tool_calls`配列を含む応答オブジェクトを返す
- **ツール結果の送信**: ツール結果は`role: 'tool'`のメッセージとして送信
- **複数ツールのサポート**: 複数のツールを同時に呼び出し可能（Parallel function calling）

```typescript
// OpenAIのツール定義例（最小形式）
const tools = [
  {
    type: "function", 
    function: {
      name: "randomInt",
      description: "Return a random integer from 0 to (max - 1)",
      parameters: {
        type: "object",
        properties: {
          max: {
            type: "integer",
            description: "Upper bound (exclusive). Defaults to 100."
          }
        },
        required: [] // 空でも明示的に指定するとスキーマの完全性が高まります
      }
    }
  }
];

// OpenAIのツール呼び出し応答例
{
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "randomInt",
        arguments: "{\"max\":10}" // 文字列化されたJSONとして返される点に注意
      }
    }
  ]
}

// 複数ツール呼び出しの例（Parallel function calling）
{
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "randomInt",
        arguments: "{\"max\":10}"
      }
    },
    {
      id: "call_def456",
      type: "function",
      function: {
        name: "getCurrentTime",
        arguments: "{\"timezone\":\"JST\"}"
      }
    }
  ]
}

// OpenAIのツール結果送信例
{
  role: "tool",
  tool_call_id: "call_abc123",
  content: "7"
}
```

AITuber OnAir CoreではOpenAIのFunction callingを処理する際、ツール定義をOpenAIのフォーマットに変換し、ツール呼び出しと結果の送受信を処理します。クラス内では`transformToolToFunction`メソッドがこの変換を行います。

#### Claudeのツール呼び出し実装

Claudeのツール呼び出しは以下の特徴があります：

- **ツール定義形式**: `tools`配列の中に各ツールの`name`、`description`、`input_schema`を指定
- **応答形式**: ツール使用時は`type: 'tool_use'`の特殊なブロックとして返され、`stop_reason: 'tool_use'`で停止
- **ツール結果の送信**: `type: 'tool_result'`としてユーザーロールのメッセージに含める
- **ストリーミング時の特殊処理**: ストリーミング応答時にツール呼び出しを適切に処理するための特別なロジックが必要

```typescript
// Claudeのツール定義例
const tools = [
  {
    name: "randomInt",
    description: "Return a random integer from 0 to (max - 1)",
    input_schema: {
      type: "object",
      properties: {
        max: {
          type: "integer",
          description: "Upper bound (exclusive). Defaults to 100."
        }
      }
    }
  }
];

// Claudeのツール呼び出し応答例
{
  id: "msg_abc123",
  model: "claude-3-haiku-20240307",
  role: "assistant",
  content: [
    { type: "text", text: "I'll generate a random number for you." },
    { 
      type: "tool_use", 
      id: "tu_abc123",
      name: "randomInt",
      input: { max: 10 }
    }
  ],
  stop_reason: "tool_use"
}

// テキストなしでツールのみを使用する例も可能
{
  id: "msg_xyz789",
  model: "claude-3-haiku-20240307",
  role: "assistant",
  content: [
    { 
      type: "tool_use", 
      id: "tu_xyz789",
      name: "randomInt",
      input: { max: 100 }
    }
  ],
  stop_reason: "tool_use"
}

// Claudeのツール結果送信例
{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "tu_abc123",
      content: "7"
    }
  ]
}
```

AITuber OnAir CoreではClaudeのツール呼び出しを処理する際、Claudeの独自フォーマットを処理し、特にストリーミング応答時の複雑な処理を抽象化しています。これには`runToolLoop`メソッドの中で特殊な処理が含まれています。

#### Geminiのツール呼び出し実装

Geminiのツール呼び出しは以下の特徴があります：

- **ツール定義形式**: `tools`配列内の`functionDeclarations`に定義を記述
- **応答形式**: `functionCall`を含む部分を持つコンテンツオブジェクトとして返される
- **ツール結果の送信**: `functionResponse`オブジェクトとしてコンテンツパーツに含めて送信
- **複合的な呼び出し**: Compositional Function Callingをサポート

```typescript
// Geminiのツール定義例
const tools = [
  {
    functionDeclarations: [
      {
        name: "randomInt",
        description: "Return a random integer from 0 to (max - 1)",
        parameters: {
          type: "object",
          properties: {
            max: {
              type: "integer",
              description: "Upper bound (exclusive). Defaults to 100."
            }
          }
        }
      }
    ]
  }
];

// Geminiのツール呼び出し応答例（深い階層構造に注意）
{
  candidates: [
    {
      content: {
        parts: [
          {
            functionCall: {
              name: "randomInt",
              args: {
                max: 10
              }
            }
          }
        ]
      }
    }
  ]
}

// 複合的なツール呼び出し例（Compositional Function Calling）
{
  candidates: [
    {
      content: {
        parts: [
          {
            functionCall: {
              name: "randomInt",
              args: {
                max: 10
              }
            }
          },
          {
            functionCall: {
              name: "formatResult",
              args: {
                prefix: "Random number:",
                value: "<function_response:randomInt>"
              }
            }
          }
        ]
      }
    }
  ]
}

// Geminiのツール結果送信例
// content partsに直接functionResponseを含めます（SDKは自動でroleを設定）
{
  parts: [
    {
      functionResponse: {
        name: "randomInt",
        response: {
          value: "7"
        }
      }
    }
  ]
}

// REST API直接呼び出し時は以下のようにroleを含める場合があります
{
  role: "function",
  parts: [
    {
      functionResponse: {
        name: "randomInt",
        response: {
          value: "7"
        }
      }
    }
  ]
}
```

AITuber OnAir CoreではGeminiのツール呼び出しを処理する際、Gemini特有の複雑なレスポンス構造とツール結果のフォーマットを適切に処理しています。特に、ツール応答を適切なJSON形式に変換するためのロジックが必要です。

#### ストリーミング実装の違い

各プロバイダーはストリーミング応答時のツール呼び出し処理にも違いがあります：

1. **OpenAI**:
   - ストリーミング時はデルタ更新として`delta.tool_calls`が送信される
   - 完全なツール呼び出しデータを再構築するために累積が必要

2. **Claude**:
   - SSEストリーミングでは特殊なイベントタイプ`content_block_delta`と`content_block_stop`が使用される
   - ツール呼び出しが完了したときに`stop_reason: "tool_use"`が送信される
   - ツール呼び出しを検出するために特別なパーサーが必要

3. **Gemini**:
   - ストリーミング時は`functionCall`がチャンクに分かれて送信されることがある
   - 完全なJSON構造を再構築するためのバッファリングが必要

AITuber OnAir Coreはこれらのストリーミング処理の違いを抽象化し、どのプロバイダーを使用する場合でも同じインターフェースでツール呼び出しと結果の処理ができるようにしています。

### プロバイダー間の主な違いと抽象化

AITuber OnAir Coreは、これらの3つのプロバイダー間の違いを抽象化し、統一されたインターフェースを提供しています：

1. **入力フォーマットの違い**:
   - 各プロバイダーは独自のツール定義フォーマットを使用
   - AITuber OnAir Coreは内部で適切な変換を行い、共通の`ToolDefinition`インターフェースを提供

2. **応答処理の違い**:
   - OpenAIは`tool_calls`オブジェクト
   - Claudeは`tool_use`ブロック
   - Geminiは`functionCall`オブジェクト
   - AITuber OnAir Coreは各形式を処理し、統一された`TOOL_USE`イベントに変換

3. **ツール結果の送信形式の違い**:
   - 各プロバイダーは異なる形式でツール結果を受け取る
   - AITuber OnAir Coreは適切なフォーマットに変換して送信

4. **ストリーミング処理の違い**:
   - 特にClaudeはストリーミング中のツール呼び出しに特別な処理が必要
   - AITuber OnAir Coreはこれを抽象化し、すべてのプロバイダーで一貫したストリーミング体験を提供

5. **ツール呼び出しの反復**:
   - `runToolLoop`メソッドは各プロバイダーの特性に合わせて実装され、一貫したツール反復処理を提供

これらの抽象化により、開発者はプロバイダーの実装の詳細を気にすることなく、AITuber OnAir Coreの統一されたインターフェースを通じてツール機能を利用できます。プロバイダーを切り替える場合でも、ツールの定義と処理コードを変更する必要はありません。

## MCPの利用方法
AITuber OnAir Coreではツール呼び出しを用いることで [MCP](https://modelcontextprotocol.io/introduction) を組み込むことが可能です。

組み込みの例を記載します。  
以下はランダムな数値を返す `MCP` を組み込むシンプルなサンプルです。

```typescript
// mcpClient.ts
import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
  
let clientPromise: Promise<MCPClient> | null = null;
  
async function getMcpClient(): Promise<MCPClient> {
  if (clientPromise) return clientPromise;

  const client = new MCPClient({
    name: "random-int-server",
    version: "0.0.1",
  });
  const endpoint = import.meta.env.VITE_MCP_ENDPOINT as string;
  if (!endpoint) throw new Error("VITE_MCP_ENDPOINT is not defined");

  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  clientPromise = client.connect(transport).then(() => client);
  return clientPromise;
}

export function createMcpToolHandler<T extends { [key: string]: unknown } = any>(toolName: string) {
    return async (args: T): Promise<string> => {
      const client = await getMcpClient();
      const out = await client.callTool({ name: toolName, arguments: args });
      return (out.content as { text: string }[] | undefined)?.[0]?.text ?? "";
    };
  }
```

```typescript
import { createMcpToolHandler } from './mcpClient';

// tool definition
const randomIntTool: ToolDefinition<{ max: number }> = {
  name: 'randomInt',
  description: '0 以上 {max} 未満の整数を返す',
  parameters: {
    type: 'object',
    properties: {
      max: { type: 'integer', description: '上限 (exclusive)', minimum: 1 },
    },
    required: ['max'],
  },
};

// mcp tool handler
const randomIntHandler = createMcpToolHandler<{ max: number }>('randomInt');

// create options
const aituberOptions: AITuberOnAirCoreOptions = {
  chatProvider,
  apiKey: apiKey.trim(),
  model,
  chatOptions: {
    systemPrompt: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
    visionPrompt: visionPrompt.trim() || DEFAULT_VISION_PROMPT,
  },
  tools: [{ definition: randomIntTool, handler: randomIntHandler }],
  debug: true,
};

// create new instance
const newAITuber = new AITuberOnAirCore(aituberOptions);
```

## OpenAI Remote MCPの利用

OpenAIのResponses APIを使用すると、リモートMCPサーバーに接続できます。
`mcpServers`オプションでMCPサーバー設定を指定すると、**AITuberOnAirCore**が
自動的にOpenAI用のResponses APIエンドポイントに切り替わります。

```typescript
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
  MCPServerConfig,
} from '@aituber-onair/core';

const mcpServers: MCPServerConfig[] = [
  {
    type: 'url',
    url: 'https://mcp-server.example.com/',
    name: 'example-mcp',
    require_approval: 'never', // オプション: 'always' | 'never'
    tool_configuration: { allowed_tools: ['example_tool'] },
    authorization_token: 'YOUR_TOKEN',
  },
];

const options: AITuberOnAirCoreOptions = {
  chatProvider: 'openai',
  apiKey: 'your-openai-api-key',
  model: 'gpt-4.1',
  mcpServers, // MCPサーバー設定時に自動的にResponses APIに切り替わります
};

const aituber = new AITuberOnAirCore(options);
```

**注意**: `endpoint`設定はOpenAI専用の機能で、MCP設定に基づいて自動的に管理されます。
他のプロバイダー（Claude、Gemini）は独自の固定エンドポイントを使用します。

## Claude MCP Connectorの使用方法

AITuber OnAir Coreは、ClaudeのModel Context Protocol (MCP) connector機能をサポートしており、別のMCPクライアントを使用せずにMessages APIからリモートMCPサーバーに直接接続できます。

### 基本的な使用方法

Claudeプロバイダーを使用する場合、`mcpServers`オプションでMCPサーバーを指定できます：

```typescript
import { AITuberOnAirCore, AITuberOnAirCoreOptions } from '@aituber-onair/core';
import { MCPServerConfig } from '@aituber-onair/core';

// MCPサーバー設定を定義
const mcpServers: MCPServerConfig[] = [
  {
    type: 'url',
    url: 'https://mcp-server.example.com/sse',
    name: 'example-mcp',
    tool_configuration: {
      enabled: true,
      allowed_tools: ['example_tool_1', 'example_tool_2']
    },
    authorization_token: 'YOUR_TOKEN' // オプション（OAuth対応サーバー用）
  }
];

// MCPサーバーでAITuberOnAirCoreインスタンスを作成
const options: AITuberOnAirCoreOptions = {
  chatProvider: 'claude', // MCPはClaudeでのみサポート
  apiKey: 'your-claude-api-key',
  model: 'claude-3-haiku-20240307',
  chatOptions: {
    systemPrompt: 'あなたはMCP経由でリモートツールにアクセスできるAI配信者です。',
  },
  // 従来のツール（オプション、MCPと併用可能）
  tools: [
    {
      definition: {
        name: 'local_tool',
        description: 'ローカルツール',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: '入力テキスト' }
          }
        }
      },
      handler: async (input) => {
        return `ローカル結果: ${input.input}`;
      }
    }
  ],
  // MCPサーバー設定
  mcpServers: mcpServers,
  debug: true,
};

const aituber = new AITuberOnAirCore(options);
```

### 複数のMCPサーバー

複数の設定を含めることで、複数のMCPサーバーに接続できます：

```typescript
const mcpServers: MCPServerConfig[] = [
  {
    type: 'url',
    url: 'https://mcp-server-1.example.com/sse',
    name: 'server-1',
    authorization_token: 'TOKEN_1'
  },
  {
    type: 'url',
    url: 'https://mcp-server-2.example.com/sse',
    name: 'server-2',
    tool_configuration: {
      enabled: true,
      allowed_tools: ['specific_tool_1', 'specific_tool_2']
    }
  }
];
```

### OAuth認証

OAuth認証が必要なMCPサーバーの場合、MCP inspectorを使用してアクセストークンを取得できます：

```bash
npx @modelcontextprotocol/inspector
```

inspectorでOAuthフローを実行し、`access_token`の値をコピーして設定の`authorization_token`として使用してください。

### イベントハンドリング

MCPツールの使用は、従来のツールと同じイベントシステムで処理されます：

```typescript
// ツール使用の監視（従来のツールとMCPツールの両方を含む）
aituber.on(AITuberOnAirCoreEvent.TOOL_USE, (toolBlocks) => {
  console.log('使用されたツール:', toolBlocks);
});

aituber.on(AITuberOnAirCoreEvent.TOOL_RESULT, (resultBlocks) => {
  console.log('ツール結果:', resultBlocks);
});
```

### 制限事項

- MCP connectorはClaudeプロバイダーでのみ利用可能
- HTTP経由のMCPサーバーのみサポート（STDIOサーバーは非対応）
- 現在MCP仕様のうちツール呼び出しのみサポート
- Amazon BedrockとGoogle Vertexでは利用不可

### 従来のツールとの共存

MCPサーバーと従来のツール定義は同時に使用できます。AIはローカルツールとリモートMCPツールの両方にシームレスにアクセスできます。

## 応答長制御

AITuber OnAir Coreは包括的な応答長制御機能を提供し、テキストチャットと画像処理の両方でAI応答の長さを細かくコントロールできます。

### 概要

応答長制御により以下が可能になります：
- **コスト最適化**: トークン使用量を制限してコストを削減
- **応答の冗長性制御**: シナリオに応じた応答の詳細レベル調整
- **一貫した応答パターンの維持**: アプリケーション全体で統一された応答スタイル
- **個別制御**: テキストチャットと画像処理で異なる設定

### 設定オプション

応答長制御は2つの方法で設定できます：

#### 1. 直接トークン数指定

正確なトークン制限を直接指定：

```typescript
const options: AITuberOnAirCoreOptions = {
  chatOptions: {
    maxTokens: 150,         // テキストチャットの直接トークン制限
    visionMaxTokens: 200,   // 画像処理の直接トークン制限
  },
  // ... その他のオプション
};
```

#### 2. プリセット応答長

便利なプリセットを使用：

```typescript
const options: AITuberOnAirCoreOptions = {
  chatOptions: {
    responseLength: 'medium',        // テキストチャットのプリセット
    visionResponseLength: 'long',    // 画像処理のプリセット
  },
  // ... その他のオプション
};
```

利用可能なプリセット：
- `'veryShort'`: 40トークン - 必要最小限の簡潔な応答
- `'short'`: 100トークン - 簡潔だが完全な応答
- `'medium'`: 200トークン - ほとんどのシナリオに適したバランスの良い長さ
- `'long'`: 300トークン - 文脈を含む詳細な応答

### 優先順位システム

複数の長さ制御が指定された場合、以下の優先順位が適用されます：

1. **直接指定値** (`maxTokens`, `visionMaxTokens`) - 最高優先度
2. **プリセット値** (`responseLength`, `visionResponseLength`) - 中優先度
3. **デフォルト値** (1000トークン) - 何も指定されていない場合のフォールバック

### 画像処理専用設定

画像処理では、テキストチャットとは異なる応答長が必要な場合が多く、個別に設定できます：

```typescript
const options: AITuberOnAirCoreOptions = {
  chatOptions: {
    // テキストチャット設定
    responseLength: 'short',      // 簡潔なテキスト応答
    
    // 画像処理設定
    visionResponseLength: 'long', // 詳細な画像説明
  },
};
```

画像処理専用設定が提供されていない場合、通常のチャット設定にフォールバックします。

### 動的更新

応答長設定は実行時に更新できます：

```typescript
// チャットプロセッサーオプションの更新
aituber.updateChatProcessorOptions({
  maxTokens: 100,
  visionMaxTokens: 250,
});
```

### 使用例

#### シナリオに応じた異なる長さ

```typescript
// 素早いやり取り用の短い応答
const quickChat = new AITuberOnAirCore({
  chatOptions: {
    responseLength: 'veryShort',
  },
});

// 教育的コンテンツ用の詳細な応答
const educationalChat = new AITuberOnAirCore({
  chatOptions: {
    responseLength: 'long',
    visionResponseLength: 'long',
  },
});
```

#### 直接指定値とプリセットの組み合わせ

```typescript
const options: AITuberOnAirCoreOptions = {
  chatOptions: {
    maxTokens: 120,                  // テキストチャットは直接指定
    visionResponseLength: 'medium',  // 画像処理はプリセット
  },
};
```

### プロバイダー互換性

応答長制御はすべてのAIプロバイダーでサポートされています：
- **OpenAI**: `max_tokens`パラメータを使用
- **Claude**: `max_tokens`パラメータを使用
- **Gemini**: `maxOutputTokens`パラメータを使用

実装はプロバイダー固有の違いを自動的に処理します。

## アーキテクチャ

AITuberOnAirCoreは以下のレイヤー構造で設計されています：

```
AITuberOnAirCore (統合層)
    ├── ChatProcessor (会話処理)
    │     └── ChatService (AI対話)
    ├── MemoryManager (記憶管理)
    │     └── Summarizer (要約)
    └── VoiceService (音声処理)
          └── VoiceEngineAdapter (音声エンジン接続)
                └── 各種音声エンジン (VOICEVOX, OpenAI, etc.)
```

### ディレクトリ構造

ソースコードは以下のディレクトリ構造で整理されています：

```
src/
  ├── constants/             # 定数と設定
  │     ├── index.ts         # エクスポートされる定数
  │     └── prompts.ts       # デフォルトプロンプトとテンプレート
  ├── core/                  # コアコンポーネント
  │     ├── AITuberOnAirCore.ts
  │     ├── ChatProcessor.ts
  │     └── MemoryManager.ts
  ├── services/              # サービス実装
  │     ├── chat/            # チャットサービス
  │     │    ├── ChatService.ts            # 基本インターフェース
  │     │    ├── ChatServiceFactory.ts     # プロバイダー用ファクトリー
  │     │    └── providers/                # AIプロバイダー実装
  │     │         ├── ChatServiceProvider.ts  # プロバイダーインターフェース
  │     │         ├── claude/              # Claude固有
  │     │         │    ├── ClaudeChatService.ts
  │     │         │    ├── ClaudeChatServiceProvider.ts
  │     │         │    └── ClaudeSummarizer.ts
  │     │         ├── gemini/              # Gemini固有
  │     │         │    ├── GeminiChatService.ts
  │     │         │    ├── GeminiChatServiceProvider.ts
  │     │         │    └── GeminiSummarizer.ts
  │     │         └── openai/              # OpenAI固有
  │     │              ├── OpenAIChatService.ts
  │     │              ├── OpenAIChatServiceProvider.ts
  │     │              └── OpenAISummarizer.ts
  │     ├── voice/           # 音声サービス
  │     │    ├── VoiceService.ts
  │     │    ├── VoiceEngineAdapter.ts
  │     │    └── engines/    # 音声エンジン実装
  │     └── youtube/         # YouTube API連携
  │          └── YouTubeDataApiService.ts  # YouTube Data APIクライアント
  ├── types/                 # TypeScript型定義
  └── utils/                 # ユーティリティとヘルパー
       ├── screenplay.ts     # テキストと感情処理
       └── storage.ts        # ストレージユーティリティ
```

## 主要コンポーネント

### AITuberOnAirCore

全体の統合クラスで、他のコンポーネントを初期化・調整します。EventEmitterを継承し、処理の各段階でイベントを発行します。外部からは主にこのクラスのAPIを通じて機能を利用します。

主なメソッド：
- `processChat(text)` - テキスト入力の処理
- `processVisionChat(imageDataUrl, visionPrompt?)` - 画像入力の処理（オプションでカスタムプロンプトを指定可能）
- `stopSpeech()` - 音声再生の停止
- `getChatHistory()` - チャット履歴の取得
- `setChatHistory(messages)` - 外部からチャット履歴を復元・再現できる（リプレイや移行用途など）
- `clearChatHistory()` - チャット履歴のクリア
- `updateVoiceService(options)` - 音声設定の更新
- `isMemoryEnabled()` - メモリ機能が有効かどうかの確認
- `generateOneShotContentFromHistory(prompt, messageHistory)` - システムプロンプトと提供されたメッセージ履歴から新しいコンテンツを生成（一度限り、内部チャット履歴に影響しない）
- `offAll()` - すべてのイベントリスナーの削除

### ChatProcessor

テキスト入力をAIモデル（OpenAI GPTなど）に送信して応答を得るコンポーネントです。会話の流れを管理し、応答をストリーミング形式で取得します。感情表現の抽出も担当します。

主な特徴：
- `updateOptions(newOptions)` - 実行時にオプションを更新可能

### MemoryManager

**MemoryManagerは、会話履歴（chatLog）が長くなりすぎてAPIのトークン制限やコスト増大、レスポンス遅延などの問題が発生しないように設計されています。一定時間やメッセージ数を超えた場合、古い会話履歴を要約し、短期・中期・長期メモリとして保存します。これにより、直近の会話はそのまま、過去の文脈は要約としてAIに渡すことで、文脈維持と効率的なAPI利用を両立しています。**

会話の文脈を維持するためのコンポーネントです。長時間の会話では古いメッセージを要約し、短期（1分）・中期（4分）・長期（9分）の記憶として保持します。これによりAIの応答に一貫性を持たせます。

カスタム設定：
- `summaryPromptTemplate` - 要約のためのプロンプトテンプレートをカスタマイズ可能（`{maxLength}`プレースホルダーを使用）

### VoiceService

テキストから音声への変換を担当するコンポーネントです。VoiceEngineAdapterを通じて、複数の外部音声合成エンジンと連携します。

#### speakTextWithOptionsメソッド

AITuberOnAirCoreクラスは柔軟な音声再生オプションを提供する`speakTextWithOptions`メソッドを備えています:

```typescript
// 一時的に異なる音声設定で発話する例
await aituberOnairCore.speakTextWithOptions('[happy] こんにちは、視聴者の皆さん!', {
  // アニメーションの有効化/無効化
  enableAnimation: true,
  
  // 一時的な音声設定（現在の設定を上書き）
  temporaryVoiceOptions: {
    engineType: 'voicevox',
    speaker: '8',
    apiKey: 'YOUR_API_KEY'  // 必要に応じて
  },
  
  // 再生に使用するオーディオ要素のID
  audioElementId: 'custom-audio-player'
});
```

このメソッドは以下の特徴を持っています：

1. **一時的な音声設定**: 現在の音声設定を変更せずに、一時的に異なる設定で発話できます
2. **アニメーション制御**: `enableAnimation`オプションでアバターのアニメーションを制御できます
3. **柔軟なオーディオ再生**: 特定のHTML audio要素を指定して再生できます
4. **感情情報の自動抽出**: テキストから感情表現（例：`[happy]`）を抽出し、`SPEECH_START`イベントで提供します

## イベントシステム

AITuberOnAirCoreは以下のイベントを発行します：

- `PROCESSING_START`: 処理開始時
- `PROCESSING_END`: 処理終了時
- `ASSISTANT_PARTIAL`: アシスタントの部分応答受信時（ストリーミング）
- `ASSISTANT_RESPONSE`: アシスタントの応答完了時（台本情報と感情タグ付きの元のテキストを含む）
- `SPEECH_START`: 音声再生開始時（感情表現を含むscreenplayオブジェクトと感情タグ付きの元のテキストを含む）
- `SPEECH_END`: 音声再生終了時
- `TOOL_USE`: AIがツールを呼び出す時（ツール名と入力パラメータを含む）
- `TOOL_RESULT`: ツールの実行が完了し結果が返却される時
- `ERROR`: エラー発生時
- `CHAT_HISTORY_SET`: チャット履歴が設定された時
- `CHAT_HISTORY_CLEARED`: チャット履歴がクリアされた時
- `MEMORY_CREATED`: 新しいメモリが作成された時
- `MEMORY_REMOVED`: メモリが削除された時
- `MEMORY_LOADED`: メモリがストレージから読み込まれた時
- `MEMORY_SAVED`: メモリがストレージに保存された時
- `STORAGE_CLEARED`: ストレージがクリアされた時

### イベントデータの安全な取り扱い

特に`SPEECH_START`イベントのリスナーを実装する際は、データの存在チェックを行うことをお勧めします：

```typescript
// SPEECHイベントを安全に処理する例
aituber.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
  // データのnullチェックを追加
  if (!data) {
    console.log('データがありません');
    return;
  }
  
  // screenplayが存在するか確認
  const screenplay = data.screenplay;
  if (!screenplay) {
    console.log('screenplayがありません');
    return;
  }
  
  // 感情情報を安全に取得
  const emotion = screenplay.emotion || 'neutral';
  console.log(`音声再生開始: 感情 = ${emotion}`);
  
  // 感情タグ付きの元のテキストを取得
  console.log(`元のテキスト: ${data.rawText}`);
  
  // 感情情報をUIやアバターアニメーションに反映
  updateUIWithEmotion(emotion);
});
```

### 感情情報の取り扱い

Reactアプリケーションで感情情報を扱う場合、イベント発生時の状態を確実に保持するために`useRef`を活用するとよいでしょう：

```typescript
// Reactでの実装例
const [currentEmotion, setCurrentEmotion] = useState('neutral');
const emotionRef = useRef({ emotion: 'neutral', text: '' });

useEffect(() => {
  if (aituberOnairCore) {
    aituberOnairCore.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
      if (data?.screenplay?.emotion) {
        // 状態の更新
        setCurrentEmotion(data.screenplay.emotion);
        // ref変数にも保存（即時アクセス用）
        emotionRef.current = data.screenplay;
      }
    });
  }
}, [aituberOnairCore]);

// アニメーション用コールバックなどでrefから最新の感情情報を利用
const handleAnimation = () => {
  const currentEmotion = emotionRef.current.emotion || 'neutral';
  // 感情に基づいたアニメーション処理
};
```

### ChatProcessorのイベント

内部コンポーネントであるChatProcessorは、追加のイベントを発行します：

- `chatLogUpdated`: チャットログが更新されたとき（新規メッセージ追加時や履歴クリア時）

このイベントを利用するには、ChatProcessorインスタンスに直接アクセスする必要があります：

```typescript
// ChatProcessorのchatLogUpdatedイベントを利用する例
const aituber = new AITuberOnAirCore(options);
const chatProcessor = aituber['chatProcessor']; // 内部コンポーネントにアクセス

// chatLogUpdatedイベントのリスナーを設定
chatProcessor.on('chatLogUpdated', (chatLog) => {
  console.log('チャットログが更新されました:', chatLog);
  
  // 例：UIの更新
  updateChatDisplay(chatLog);
  
  // 例：外部システムへの同期
  syncChatToExternalSystem(chatLog);
});
```

このイベントは以下のような用途で活用できます：

1. **チャットUIのリアルタイム更新**：
   - メッセージの追加やクリアをUIにリアルタイムで反映

2. **外部システムとの連携**：
   - チャットログをデータベースに保存
   - 分析サービスにデータを送信

3. **デバッグ・モニタリング**：
   - 開発中のチャットログ変更の監視
   - ログ品質のモニタリング

注意：AITuberOnAirCoreのインターフェースでは`getChatHistory()`メソッドを使ってチャットログを取得できますが、リアルタイムの更新通知を受け取るには上記の方法が必要です。

## 音声エンジン対応

AITuberOnAirCoreは以下の音声エンジンに対応しています：

- **VOICEVOX**: 日本語の高品質な音声合成エンジン
- **VoicePeak**: 感情表現が豊かな音声合成エンジン
- **AivisSpeech**: AIを活用した音声合成
- **Aivis Cloud**: SSMLサポート、感情強度制御、複数出力形式（WAV、FLAC、MP3、AAC、Opus）対応の高品質日本語音声合成サービス
- **OpenAI TTS**: OpenAIのText-to-Speech API
- **MiniMax**: 24言語対応の多言語TTS、HD品質対応（APIキーとGroupIdの両方が必要 - 使用例を参照）
- **None**: 音声なしモード（音声出力を行わない）

音声エンジンの切り替えは`updateVoiceService`メソッドで動的に行えます：

```typescript
// 音声エンジンを切り替える例
aituber.updateVoiceService({
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'YOUR_OPENAI_API_KEY'
});
```

### 音声チャンク分割（オプション）

長い応答を複数のチャンクに分割して順次音声化することで、視聴者が音声を聞き始めるまでの待ち時間を短縮できます。既定では過去互換性を保つため **無効** になっており、1 応答につき 1 回だけ音声合成を行います。

`AITuberOnAirCore` 初期化時に `speechChunking` オプションを指定すると有効化できます。

```ts
const aituber = new AITuberOnAirCore({
  // ... 他の設定 ...
  speechChunking: {
    enabled: true,
    // 新しいチャンクを開始する目安となる最小語数。
    // 日本語など空白が少ないテキストでは文字数ベースで判定されます。
    minWords: 40,
    // 句読点プリセット（ja | en | ko | zh | all）
    locale: 'ja',
    // 独自セパレーターを使いたい場合
    // separators: ['.', '!', '?'],
  },
});
```

- 有効化すると、`。！？!?` や読点でテキストを一旦区切り、`minWords` に達するまで隣接チャンクを結合します。これにより、リクエスト回数を抑えつつ早期再生を実現できます。
- `minWords` を `0` もしくは未指定にすると、句読点単位でそのままチャンク化されます。
- 運用中にチャンク分割を切り替えたい場合は `updateSpeechChunking` を利用してください。

```ts
aituber.updateSpeechChunking({ enabled: false });
aituber.updateSpeechChunking({
  enabled: true,
  minWords: 25,
  locale: 'en',
  separators: ['.', '!', '?'],
});
```

### カスタムAPIエンドポイント

ローカルでホストされる音声エンジン（VOICEVOX、VoicePeak、AivisSpeech）については、カスタムAPIエンドポイントURLを指定することができます：

```typescript
// カスタムAPIエンドポイントの設定例
aituber.updateVoiceService({
  engineType: 'voicevox',
  speaker: '1',
  // 自己ホストまたは代替VOICEVOXサーバーのカスタムエンドポイント
  voicevoxApiUrl: 'http://custom-voicevox-server:50021'
});

// VoicePeakの例
aituber.updateVoiceService({
  engineType: 'voicepeak',
  speaker: '2',
  voicepeakApiUrl: 'http://custom-voicepeak-server:20202'
});

// AivisSpeechの例
aituber.updateVoiceService({
  engineType: 'aivisSpeech',
  speaker: '3',
  aivisSpeechApiUrl: 'http://custom-aivis-server:10101'
});

// Aivis Cloudの例（SSMLサポート付き高品質日本語TTS）
aituber.updateVoiceService({
  engineType: 'aivisCloud',
  speaker: 'YOUR_SPEAKER_UUID', // Aivis Cloudの話者UUID
  apiKey: 'YOUR_AIVIS_CLOUD_API_KEY',
  // 高度な制御のためのオプションパラメータ
  emotionalIntensity: 1.0,     // 感情表現の強度（0.0-2.0）
  speakingRate: 1.0,           // 話速（0.5-2.0）
  outputFormat: 'wav'          // 出力形式: wav, flac, mp3, aac, opus
});

// MiniMaxの例（基本設定）
aituber.updateVoiceService({
  engineType: 'minimax',
  speaker: 'male-qn-qingse', // またはサポートされている音声ID
  apiKey: 'YOUR_MINIMAX_API_KEY',
  groupId: 'YOUR_GROUP_ID', // 本番環境では必須
  endpoint: 'global' // 'global' または 'china'を選択
});

// GroupIdについて：
// MiniMaxはAPIキーに加えてGroupIdが必要です
// GroupIdはMiniMaxシステム内でのユーザーグループの一意の識別子で、
// 以下の目的で使用されます：
// - ユーザー認証とグループ管理
// - 使用状況の追跡と統計  
// - 課金とクォータ管理
// GroupIdはMiniMaxアカウントダッシュボードから取得できます

// エンドポイントについて：
// - 'global': グローバル向けAPI（デフォルト）
// - 'china': 中国国内向けAPI
```

これは、音声エンジンを異なるポートやリモートサーバーで実行している場合に便利です。

## AIプロバイダーシステム

AITuber OnAir Coreは拡張可能なプロバイダーシステムを採用しており、様々なAI APIとの連携が可能です。
現在はOpenAI APIとGemini API、Claude API、Z.ai API、Kimi API、OpenRouter APIが利用可能です。もし利用したいAPIがあればPRやメッセージをください。

### 利用可能なプロバイダー

現在、以下のAIプロバイダーが組み込まれています：

- **OpenAI**: GPT-4.1(miniとnanoを含む), GPT-4, GPT-4o-mini, O3-mini, o1, o1-miniのモデルをサポート
- **Gemini**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite Preview, Gemini 2.0 Flash, Gemini 2.0 Flash-Liteのモデルをサポート
- **Claude**: Claude 4.6 Opus、Claude 4.5 Opus/Sonnet/Haiku、Claude 4 Sonnet/Opus、Claude 3.7 Sonnet、Claude 3.5 Haiku/Sonnet、Claude 3 Haikuのモデルをサポート
- **Z.ai**: GLM-5（テキスト専用）、GLM-4.7, GLM-4.7 Flash/FlashX, GLM-4.6, GLM-4.6V, GLM-4.6V Flash/FlashXのモデルをサポート
- **Kimi**: Kimi K2.5（`kimi-k2.5`、ビジョン対応）をサポート
- **OpenRouter**: OpenRouterのキュレーション済みモデル一覧（OpenAI/Claude/Gemini/Z.ai/Kimi）をサポート

### プロバイダーの指定方法

`AITuberOnAirCore`のインスタンス化時に、使用するプロバイダーを指定することができます：

```typescript
const aituberCore = new AITuberOnAirCore({
  chatProvider: 'openai', // プロバイダー名を指定
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini', // 省略可能（省略時はデフォルトモデル「gpt-4o-mini」が使用されます）
  // その他のオプション...
});
```

### モデル固有の機能制限

各AIモデルは異なる機能をサポートしています。例えば：

- **GPT-4o**, **GPT-4o-mini**: テキストチャットと画像処理（Vision）の両方をサポート
- **O3-mini**: テキストチャットのみサポート（画像処理は非対応）

このため、モデル選択時には注意が必要です。サポートされていない機能を使用しようとすると、明示的なエラーが発生します。

**注意**: モデルを指定しない場合、デフォルトでは「gpt-4o-mini」が使用されます。このモデルはテキストチャットと画像処理の両方をサポートしています。

### 異なるモデルの併用

テキストチャットと画像処理で異なるモデルを使用したい場合は、`visionModel`オプションを使用できます：

```typescript
const aituberCore = new AITuberOnAirCore({
  apiKey: 'your-api-key',
  chatProvider: 'openai',
  model: 'o3-mini',       // テキストチャット用 
  visionModel: 'gpt-4o',  // 画像処理用
  // その他のオプション...
});
```

これにより、テキストチャットには軽量なモデルを使用し、画像処理が必要な場合のみ高機能なモデルを使用するといった最適化が可能になります。

注意: visionModelを指定する際は、Vision機能をサポートするモデルを選択してください。サポートされていないモデルが指定された場合、初期化時にエラーが発生します。

### 利用可能なプロバイダーとモデルの取得

プログラム内で利用可能なプロバイダーとモデルを取得することができます：

```typescript
// 利用可能なすべてのプロバイダーを取得
const providers = AITuberOnAirCore.getAvailableProviders();

// 特定のプロバイダーでサポートされているモデルを取得
const models = AITuberOnAirCore.getSupportedModels('openai');
```

### カスタムプロバイダーの作成

新しいAIプロバイダーを追加するには、`ChatServiceProvider`インターフェースを実装したクラスを作成し、`ChatServiceFactory`に登録します：

```typescript
import { ChatServiceFactory } from 'aituber-onair-core';
import { MyCustomProvider } from './MyCustomProvider';

// カスタムプロバイダーを登録
ChatServiceFactory.registerProvider(new MyCustomProvider());

// 登録したプロバイダーを使用
const aituberCore = new AITuberOnAirCore({
  chatProvider: 'myCustomProvider',
  apiKey: 'your-api-key',
  // その他のオプション...
});
```

## メモリと永続化

AITuberOnAirCoreには、長時間の会話文脈を維持するためのメモリ機能が組み込まれています。このメモリ機能を使うことで、AIはユーザとの会話履歴を要約して記憶し、一貫性のある応答を生成できます。

### メモリの種類

メモリには3つの種類があります：

1. **短期メモリ（Short-term memory）**：
   - 会話開始から**1分後**に生成
   - 直近の会話内容を詳細に記憶

2. **中期メモリ（Mid-term memory）**：
   - 会話開始から**4分後**に生成
   - 短期記憶よりやや長い時間範囲の要点を記憶

3. **長期メモリ（Long-term memory）**：
   - 会話開始から**9分後**に生成
   - 会話全体のテーマや重要な情報を記憶

これらのメモリはAIへのプロンプトに自動的に追加され、AIが過去の文脈を踏まえた回答をできるようにサポートします。

### メモリの永続化

AITuberOnAirCoreはメモリの永続化をプラグイン可能な設計にしています。これにより、アプリケーションを再起動してもAIが会話の文脈を記憶し続けることができます。

#### MemoryStorageインターフェース

永続化のための抽象インターフェースとして`MemoryStorage`が提供されています：

```typescript
interface MemoryStorage {
  load(): Promise<MemoryRecord[]>;
  save(records: MemoryRecord[]): Promise<void>;
  clear(): Promise<void>;
}
```

#### 標準実装

標準では以下の実装が提供されています：

1. **LocalStorageMemoryStorage**：
   - WebブラウザのLocalStorageを使用した永続化
   - 容量制限はありますが、簡易的な用途に最適

2. **IndexedDBMemoryStorage** (開発予定)：
   - WebブラウザのIndexedDBを使用した永続化
   - より大きな容量と複雑なデータ構造をサポート

#### 独自のストレージ実装

独自のストレージ実装を作成するには、`MemoryStorage`インターフェースを実装するだけです：

```typescript
class CustomMemoryStorage implements MemoryStorage {
  async load(): Promise<MemoryRecord[]> {
    // カスタムストレージからメモリレコードを読み込む
    return customStorage.getItems();
  }
  
  async save(records: MemoryRecord[]): Promise<void> {
    // カスタムストレージにメモリレコードを保存
    await customStorage.setItems(records);
  }
  
  async clear(): Promise<void> {
    // カスタムストレージのメモリレコードをクリア
    await customStorage.clear();
  }
}
```

### メモリ機能の設定

メモリ機能を有効化して永続化を設定するには、AITuberOnAirCoreの初期化時に以下のオプションを指定します：

```typescript
import { AITuberOnAirCore } from './lib/aituber-onair-core';
import { createMemoryStorage } from './lib/aituber-onair-core/utils/storage';

// メモリストレージの作成（LocalStorage使用）
const memoryStorage = createMemoryStorage('myapp.aiMemoryRecords');

// AITuberOnAirCoreの初期化
const aiTuber = new AITuberOnAirCore({
  // 他のオプション...
  
  // メモリオプション
  memoryOptions: {
    enableSummarization: true,
    shortTermDuration: 60 * 1000, // 1分（ミリ秒）
    midTermDuration: 4 * 60 * 1000, // 4分
    longTermDuration: 9 * 60 * 1000, // 9分
    maxMessagesBeforeSummarization: 20, // 要約前の最大メッセージ数
    maxSummaryLength: 256, // 要約の最大文字数
    memoryRetentionPeriod: 60 * 60 * 1000, // メモリの保持期間（1時間）
  },
  
  // 永続化ストレージ
  memoryStorage: memoryStorage,
});
```

### メモリ関連のイベント

メモリ機能には以下のイベントが発生します：

- `memoriesLoaded`：ストレージからメモリが読み込まれたとき（AITuberOnAirCoreEvent.MEMORY_LOADED に対応）
- `memoryCreated`：新しいメモリが作成されたとき（AITuberOnAirCoreEvent.MEMORY_CREATED に対応）
- `memoriesRemoved`：メモリが削除されたとき（AITuberOnAirCoreEvent.MEMORY_REMOVED に対応）
- `memoriesSaved`：メモリがストレージに保存されたとき（AITuberOnAirCoreEvent.MEMORY_SAVED に対応）
- `storageCleared`：ストレージがクリアされたとき（AITuberOnAirCoreEvent.STORAGE_CLEARED に対応）

これらのイベントは直接`MemoryManager`インスタンスから発行されますが、最新のバージョンではAITuberOnAirCoreからも同様のイベントが発行されるため、通常はAITuberOnAirCoreのイベントを使用することをお勧めします。

#### AITuberOnAirCoreイベントの利用

AITuberOnAirCoreからもメモリ関連のイベントが発行されるようになりました：

```typescript
// メモリとチャット履歴関連のイベントリスナーの設定例
aituber.on(AITuberOnAirCoreEvent.CHAT_HISTORY_SET, (messages) => {
  console.log('チャット履歴が設定されました:', messages.length);
  // UIの更新処理など
});

aituber.on(AITuberOnAirCoreEvent.CHAT_HISTORY_CLEARED, () => {
  console.log('チャット履歴がクリアされました');
  // UIのクリア処理など
});

aituber.on(AITuberOnAirCoreEvent.MEMORY_CREATED, (memory) => {
  console.log(`新しいメモリが作成されました: ${memory.type}`);
  // メモリ作成通知UIの表示など
});

aituber.on(AITuberOnAirCoreEvent.MEMORY_REMOVED, (memoryIds) => {
  console.log('メモリが削除されました:', memoryIds);
});

aituber.on(AITuberOnAirCoreEvent.MEMORY_LOADED, (memories) => {
  console.log('メモリがロードされました:', memories.length);
  // ロードされたメモリ情報をUIに表示するなど
});

aituber.on(AITuberOnAirCoreEvent.MEMORY_SAVED, (memories) => {
  console.log('メモリが保存されました:', memories.length);
  // 保存完了通知を表示するなど
});

aituber.on(AITuberOnAirCoreEvent.STORAGE_CLEARED, () => {
  console.log('ストレージがクリアされました');
});
```

これらのイベントを利用することで、メモリ状態の変化をUIに反映したり、デバッグ情報を表示したりすることができます。

### メモリのクリーンアップ

長期間使用していると、メモリレコードがストレージ容量を圧迫する可能性があります。AITuberOnAirCoreには自動的に古いメモリを削除する機能があります：

- `cleanupOldMemories`メソッドは、設定された保持期間（デフォルト1時間）より古いメモリレコードを削除します
- このメソッドはユーザー発話の処理時に自動的に呼び出されます

手動でクリーンアップを行う場合は以下のようにできます：

```typescript
// チャット履歴とメモリの両方をクリア
aiTuber.clearChatHistory();

// または、内部アクセスを使用して（非推奨）
const memoryManager = aiTuber['memoryManager'];
if (memoryManager) {
  await memoryManager.cleanupOldMemories();
}
```

## 応用例

### Vision（画像入力）の処理

```typescript
// 画像のDataURLを取得（例：カメラキャプチャなど）
const imageDataUrl = captureScreenshot();

// 基本的なVision処理（デフォルトプロンプトを使用）
await aituber.processVisionChat(imageDataUrl);

// カスタムプロンプトを指定したVision処理
await aituber.processVisionChat(
  imageDataUrl,
  '配信画面の内容を分析して、視聴者が楽しめるようなコメントをしてください。'
);
```

### 要約プロンプトのカスタマイズ

```typescript
// カスタム要約プロンプトを使用して初期化
const aiTuberCore = new AITuberOnAirCore({
  openAiKey: 'your_api_key',
  chatOptions: { /* ... */ },
  memoryOptions: {
    enableSummarization: true,
    // その他のメモリ設定
    summaryPromptTemplate: '以下の会話を{maxLength}文字以内で要約し、重要なポイントを強調してください。',
  },
  });
```

### チャット履歴から一度限りのコンテンツ生成

`generateOneShotContentFromHistory`メソッドを使用すると、提供されたメッセージ履歴に基づいて独立したコンテンツを生成できます。内部のチャット履歴には影響せず、ブログ記事、レポート、要約、その他の既存の会話から派生したコンテンツの作成に最適です。

```typescript
// 使用したい会話履歴を定義
const conversationHistory: Message[] = [
  { role: 'user', content: '今日の配信はどうでしたか？', timestamp: Date.now() },
  { role: 'assistant', content: '最高でした！1000人以上の視聴者がいました。', timestamp: Date.now() },
  { role: 'user', content: '一番人気だったコーナーは何ですか？', timestamp: Date.now() },
  { role: 'assistant', content: '料理コーナーが最も盛り上がりました！', timestamp: Date.now() },
];

// 会話からブログ記事を生成
const blogPost = await aituber.generateOneShotContentFromHistory(
  'このライブ配信についての会話を要約して、短いブログ記事を書いてください。',
  conversationHistory
);
console.log(blogPost);

// サマリーレポートを生成
const summary = await aituber.generateOneShotContentFromHistory(
  'この会話から重要なポイントを抜き出して、簡潔な要約レポートを作成してください。',
  conversationHistory
);
console.log(summary);

// SNS用コンテンツを生成
const snsPost = await aituber.generateOneShotContentFromHistory(
  'この会話を基に、今日の配信の成功を祝うSNS用の投稿を作成してください。',
  conversationHistory
);
console.log(snsPost);
```

**主な利点：**
- **独立した動作**: 現在のチャットセッションを変更したり干渉したりしません
- **柔軟な入力**: 任意のメッセージ履歴配列で動作します
- **多用途**: ブログ記事、レポート、要約、SNSコンテンツなどに対応
- **再利用可能**: 異なるプロンプトと履歴で何度でも呼び出せます

### 音声再生の同期処理

```typescript
// 音声再生の完了を待機する例（handleSpeakAi関数を使用）
async function playSequentially() {
  // リスナー（視聴者）の音声再生を待機
  await handleSpeakAi(
    listenerScreenplay,
    listenerVoiceType,
    listenerSpeaker,
    openAiKey
  );
  
  console.log('リスナーの音声再生が完了しました');
  
  // AIアバターの応答処理
  await aituber.processChat(text);
}
```

## 既存アプリケーションとの統合

AITuberOnAirCoreは、既存のアプリケーションに比較的容易に統合できます。例えば：

1. アプリケーション起動時にAPIキーなどの設定があれば初期化
2. イベントリスナーを設定して処理の各段階をキャッチ
3. ユーザー入力やVision入力時に適切なメソッドを呼び出し

```typescript
// App.tsxなどでの統合例
useEffect(() => {
  // 既にAITuberOnAirCoreが初期化されている場合は、イベントリスナーを設定
  if (aituberOnairCore) {
    // 以前のリスナーをクリア
    aituberOnairCore.offAll();
    
    // 新しいリスナーを設定
    aituberOnairCore.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setChatProcessing(true);
      setAssistantMessage('読み込み中...');
    });

    aituberOnairCore.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
      setAssistantMessage((prev) => {
        if (prev === '読み込み中...') return text;
        return prev + text;
      });
    });
    
    // その他のイベントリスナー...
  }
}, [aituberOnairCore]);
```

実際のアプリケーションでは、音声エンジン設定の変更時にAITuberOnAirCoreの設定も更新したり、メモリ機能の有効/無効を切り替えたりするなど、より細かい連携を行うことができます。

AITuberOnAirCoreはAITuber OnAirのコアコンポーネントとして最適化されていますが、このように独自に組み込んでAITuberアプリの開発に利用することが可能です。

## テストと開発

AITuberOnAirCoreは包括的なテストスイートを備えており、ライブラリの品質と安定性を保証します。

### テストの構造

テストは以下のディレクトリ構造で管理されています：

```
tests/
├── core/         # コアコンポーネントのテスト
├── services/     # サービス（音声、チャットなど）のテスト
├── utils/        # ユーティリティ関数のテスト
└── README.md     # テスト関連の詳細な説明
```

### テストの命名規則

- テストファイルは `.test.ts` の接尾辞を使用します（例：`AITuberOnAirCore.test.ts`）
- 各ソースファイルに対応するテストファイルが作成されるべきです

### テストの実行方法

テストはVitestを使用して実行します：

```bash
# AITuberOnAirCoreのルートディレクトリに移動
cd src/lib/aituber-onair-core

# すべてのテストを実行
npm test

# 監視モードでテストを実行（ファイル変更時に自動再実行）
npm run test:watch

# カバレッジレポート付きでテスト実行
npm run test:coverage
```

### テストの書き方

テストを書く際は以下の原則に従ってください：

1. Arrange-Act-Assertパターンを使用する
2. 外部依存関係は適切にモック化する
3. テストは独立して分離されているようにする
4. 成功ケースだけでなくエラーケースもテストする

テスト例：

```typescript
import { describe, it, expect } from 'vitest';
import { AITuberOnAirCore } from '../../core/AITuberOnAirCore';

describe('AITuberOnAirCore', () => {
  describe('constructor', () => {
    it('有効なオプションで初期化できること', () => {
      // Arrange
      const options = { /* ... */ };
      
      // Act
      const instance = new AITuberOnAirCore(options);
      
      // Assert
      expect(instance).toBeDefined();
    });
  });
});
```

### テストカバレッジの要件

以下の部分については特に高いテストカバレッジを目指しています：

- コア機能
- 公開API
- エッジケース
- エラー処理

### 開発環境のセットアップ

開発とテストには以下のツールが必要です：

1. Node.js（v20以上）
2. npm（v10以上）

```bash
# 依存関係のインストール
npm install

# テストの実行
npm test
```

## メモリイベントの移行ガイド

### v0.8.0での変更点

バージョンv0.8.0では、内部の`MemoryManager`コンポーネントから発行されるメモリ関連のイベントをすべてメイン`AITuberOnAirCore`インスタンスに転送するよう、イベントシステムを統一しました。これにより、すべてのイベントを一箇所でリッスンできるより一貫性のあるAPIが実現しました。

### 変更内容

- 以前：メモリ関連のイベント（`memoriesLoaded`、`memoryCreated`など）は内部の`MemoryManager`インスタンスからのみ発行され、このコンポーネントに直接アクセスする必要がありました。
- 現在：これらのイベントは標準化された`AITuberOnAirCoreEvent`列挙型の値としてメイン`AITuberOnAirCore`インスタンスからも発行されます。

### 移行方法

以前、メモリイベントをリッスンするために`MemoryManager`に直接アクセスしていた場合：

```typescript
// 古いアプローチ（非推奨）
const memoryManager = aituber['memoryManager'];
if (memoryManager) {
  memoryManager.on('memoriesLoaded', (memories) => {
    console.log('メモリがロードされました:', memories.length);
  });
}
```

コードを更新して、メインのAITuberOnAirCoreインスタンスを使用してください：

```typescript
// 新しいアプローチ（推奨）
aituber.on(AITuberOnAirCoreEvent.MEMORY_LOADED, (memories) => {
  console.log('メモリがロードされました:', memories.length);
});
```

### イベントマッピング

内部のMemoryManagerイベントとAITuberOnAirCoreEventの値の対応は以下の通りです：

| MemoryManagerイベント | AITuberOnAirCoreEvent |
|-----------------------|----------------------|
| `memoriesLoaded`      | `MEMORY_LOADED`      |
| `memoryCreated`       | `MEMORY_CREATED`     |
| `memoriesRemoved`     | `MEMORY_REMOVED`     |
| `memoriesSaved`       | `MEMORY_SAVED`       |
| `storageCleared`      | `STORAGE_CLEARED`    |

さらに、以下の新しいイベントが追加されました：

| 新しいイベント               | 説明                        |
|------------------------------|---------------------------|
| `CHAT_HISTORY_SET`           | チャット履歴が設定された時   |
| `CHAT_HISTORY_CLEARED`       | チャット履歴がクリアされた時 |

### 新しいアプローチの利点

- **シンプルなAPI**：すべてのイベントが単一のエントリーポイントから利用可能
- **型安全性**：列挙型の値を使用することでTypeScriptのサポートが向上
- **抽象化**：内部実装の詳細が適切に隠蔽されている
- **一貫性**：すべてのイベントが同じパターンに従う
- **ドキュメント**：イベントが列挙型の値と共に明確に文書化されている

### これによりコードは壊れますか？

イベントをリッスンするために`MemoryManager`インスタンスに直接アクセスしていた場合、コードは引き続き機能しますが、この方法は非推奨とみなされます。将来の互換性のために、新しいアプローチへの移行をお勧めします。

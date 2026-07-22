# @aituber-onair/chat

![@aituber-onair/chat logo](https://github.com/shinshin86/aituber-onair/raw/main/packages/chat/images/aituber-onair-chat.png)

Chat and LLM API integration library for AITuber OnAir. This package provides a unified interface for interacting with various AI chat providers including OpenAI, OpenAI-compatible, Claude, Gemini, Gemini Nano (Chrome built-in AI), OpenRouter, Z.ai, xAI, Kimi, DeepSeek, Mistral, Sakana AI, PLaMo, and Agent SDK providers.

## Features

- 🤖 **Multiple AI Provider Support**: OpenAI, OpenAI-compatible, Claude (Anthropic), Google Gemini, Gemini Nano (Chrome built-in AI), OpenRouter, Z.ai, xAI, Kimi, DeepSeek, Mistral, Sakana AI, PLaMo, and Agent SDK providers
- 🔄 **Unified Interface**: Consistent API across different providers
- 🛠️ **Tool/Function Calling**: Support for AI function calling with automatic iteration
- 💬 **Streaming Responses**: Real-time streaming chat responses
- 🖼️ **Vision Support**: Process images with vision-enabled models
- 📝 **Emotion Detection**: Extract emotions from AI responses
- 🎯 **Response Length Control**: Configure response lengths with presets or custom token limits
- 🔌 **Model Context Protocol (MCP)**: Support for MCP servers
- 🧩 **Agent SDK Providers**: Optional `@aituber-onair/chat/agent` entry for agent SDK providers without adding agent SDK packages to the default install

## Installation

```bash
npm install @aituber-onair/chat
```

## UMD Build (Browser/GAS)

This package ships ESM/CJS by default. For environments without bundlers (browsers via script tag, Google Apps Script), a UMD/IIFE bundle is available.

- Global name: `AITuberOnAirChat`
- Files: `dist/umd/aituber-onair-chat.js`, `dist/umd/aituber-onair-chat.min.js`

Build UMD locally (in the monorepo):

```bash
# Install deps at repo root
npm ci

# Build for chat only
npm -w @aituber-onair/chat run build
```

### Browser via UMD

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
      // Streaming is available in browsers
    </script>
  </body>
  </html>
```

### Google Apps Script (GAS)

GAS does not support streaming or the Fetch API natively. Use the provided adapter and the non‑streaming helper.

Steps:
- Build UMD and copy `dist/umd/aituber-onair-chat.min.js` into your GAS project as a script file (e.g., `lib.gs`). With clasp, place it under the project folder and push.
- Create another file (e.g., `main.js`) and use the following snippet:

```javascript
async function testChat() {
  // Install fetch backed by UrlFetchApp
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

Notes:
- GAS runtime: V8. No streaming; prefer `chatOnce(..., false)` or `runOnceText`.
- Set your API key in Script Properties: `OPENAI_API_KEY`.
- See `packages/chat/examples/gas-basic` for a working example. The Apps Script manifest (`appsscript.json`) is optional; modern projects default to V8. Add one only if you need custom settings (e.g., time zone).

## Agent SDK Providers

For agent SDKs such as Codex SDK, Claude Agent SDK, and Copilot SDK, use the
separate `@aituber-onair/chat/agent` entry point:

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';
```

This entry is not part of the browser/GAS UMD build. It loads agent SDK packages
dynamically, so install only the agent SDK package used by your JavaScript runtime application:

```bash
npm install @aituber-onair/chat @openai/codex-sdk
# or
npm install @aituber-onair/chat @anthropic-ai/claude-agent-sdk
# or
npm install @aituber-onair/chat @github/copilot-sdk
```

Minimal Codex SDK example:

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
      'You are a friendly AI avatar for a live chat. Reply warmly and concisely.',
  },
  { role: 'user', content: 'I am working on a TypeScript library tonight.' },
  {
    role: 'assistant',
    content: 'Nice. I can keep the conversation light while you work.',
  },
  {
    role: 'user',
    content: 'What drink would you recommend for a late-night coding session?',
  },
];

const response = await chatService.chatOnce(messages, false);

console.log(response);
```

For Claude Agent SDK:

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
      'You are a friendly AI avatar for a live chat. Reply warmly and concisely.',
  },
  { role: 'user', content: 'I am working on a TypeScript library tonight.' },
  {
    role: 'assistant',
    content: 'Nice. I can keep the conversation light while you work.',
  },
  {
    role: 'user',
    content: 'What drink would you recommend for a late-night coding session?',
  },
];

const response = await chatService.chatOnce(messages, false);

console.log(response);
```

Claude Agent SDK is run as a text-chat provider with built-in tools disabled by
default. Eligible Claude subscription plans can use Agent SDK monthly credits
starting June 15, 2026; API-key based Developer Platform usage remains
pay-as-you-go.

For Copilot SDK:

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const chatService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
});

const messages = [
  {
    role: 'system',
    content:
      'You are a friendly AI avatar for a live chat. Reply warmly and concisely.',
  },
  { role: 'user', content: 'I am working on a TypeScript library tonight.' },
  {
    role: 'assistant',
    content: 'Nice. I can keep the conversation light while you work.',
  },
  {
    role: 'user',
    content: 'What drink would you recommend for a late-night coding session?',
  },
];

const response = await chatService.chatOnce(messages, false);

console.log(response);
```

Copilot SDK requires a permission request handler when creating a session. This
package defaults to denying SDK-managed tool execution for safety. If your
application wants to allow it, pass `onPermissionRequest` explicitly.

```typescript
const chatService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
  onPermissionRequest: () => ({ kind: 'approve-once' }),
});
```

Authenticate the corresponding SDK locally before using these providers. If the
SDK package is missing or authentication is not ready, the provider throws an
error at runtime with the original SDK error details.

## Usage

### Basic Chat

```typescript
import { ChatServiceFactory, ChatServiceOptions } from '@aituber-onair/chat';

// Create a chat service
const options: ChatServiceOptions = {
  apiKey: 'your-api-key',
  model: 'gpt-4' // optional, uses provider default if not specified
};

const chatService = ChatServiceFactory.createChatService('openai', options);

// Process a simple chat
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello! How are you?' }
];

await chatService.processChat(
  messages,
  (partialText) => {
    // Handle streaming response
    console.log('Partial:', partialText);
  },
  async (completeText) => {
    // Handle complete response
    console.log('Complete:', completeText);
  }
);
```

### Provider-Specific Usage

#### OpenAI

```typescript
const openaiService = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5.4-pro',
  gpt5EndpointPreference: 'responses', // Required for GPT-5.4 Pro
  reasoning_effort: 'medium',
  verbosity: 'medium'
});
```

For Chat Completions, use:

```typescript
endpoint: 'https://api.openai.com/v1/chat/completions';
```

##### OpenAI-Compatible Local LLM Quick Start

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

Notes:
- The `endpoint` must be a full URL (not shorthand like `'responses'`).
- The target server must satisfy the OpenAI-compatible API contract.
- This package does not depend on any specific local LLM product.

#### Agent SDK Providers

`@aituber-onair/chat/agent` exposes experimental providers for agent SDKs such
as Codex SDK, Claude Agent SDK, and Copilot SDK. These providers are not
included in the browser/GAS UMD entry point and do not use API keys.

Install only the agent SDK package you actually use in your JavaScript runtime application:

```bash
npm install @aituber-onair/chat @openai/codex-sdk
# or
npm install @aituber-onair/chat @anthropic-ai/claude-agent-sdk
# or
npm install @aituber-onair/chat @github/copilot-sdk
```

`@openai/codex-sdk`, `@anthropic-ai/claude-agent-sdk`, and
`@github/copilot-sdk` are not dependencies of `@aituber-onair/chat`. They are
loaded dynamically, so users who only use the normal API providers do not
install these agent SDK packages.

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
      'You are a friendly AI avatar for a live chat. Keep a natural conversation going.',
  },
  {
    role: 'user',
    content: 'I am thinking about how to keep a side project moving.',
  },
  {
    role: 'assistant',
    content: 'Let us make it feel manageable and easy to restart.',
  },
  { role: 'user', content: 'What should I work on first today?' },
];

const result = await codexService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

For Claude Agent SDK, use `claude-agent-sdk`.

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
      'You are a friendly AI avatar for a live chat. Keep a natural conversation going.',
  },
  {
    role: 'user',
    content: 'I am thinking about how to keep a side project moving.',
  },
  {
    role: 'assistant',
    content: 'Let us make it feel manageable and easy to restart.',
  },
  { role: 'user', content: 'What should I work on first today?' },
];

const result = await claudeService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

Claude Agent SDK is configured with `tools: []`, `permissionMode: 'dontAsk'`,
and `settingSources: []` by default so this provider behaves as text chat and
does not load Claude Code project/user settings unless the implementation is
expanded later.

For Copilot SDK, use `copilot-sdk`.

```typescript
import { createAgentChatService } from '@aituber-onair/chat/agent';

const copilotService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
});

const messages = [
  {
    role: 'system',
    content:
      'You are a friendly AI avatar for a live chat. Keep a natural conversation going.',
  },
  {
    role: 'user',
    content: 'I am thinking about how to keep a side project moving.',
  },
  {
    role: 'assistant',
    content: 'Let us make it feel manageable and easy to restart.',
  },
  { role: 'user', content: 'What should I work on first today?' },
];

const result = await copilotService.chatOnce(messages, false, (text) =>
  process.stdout.write(text),
);
```

Copilot SDK requires a permission request handler when creating a session. This
package defaults to denying SDK-managed tool execution for safety. If you want
to allow it, pass `onPermissionRequest` from your application. For example, to
allow all requests:

```typescript
const copilotService = createAgentChatService('copilot-sdk', {
  model: 'gpt-4.1',
  onPermissionRequest: () => ({ kind: 'approve-once' }),
});
```

Available providers:
- `codex-sdk`: requires `@openai/codex-sdk` and Codex authentication.
- `claude-agent-sdk`: requires `@anthropic-ai/claude-agent-sdk` and Claude Agent SDK authentication.
- `copilot-sdk`: requires `@github/copilot-sdk` and GitHub Copilot authentication.

Current limitations:
- Text chat only.
- Vision chat, tools, and MCP servers are intentionally unsupported for now.
- If an agent SDK package is missing or local authentication is not ready, the
  provider throws an error at runtime with the original SDK error details.

#### OpenAI-Compatible (Local/Self-Hosted)

Use `openai-compatible` when you want to clearly separate official OpenAI
usage from compatible endpoint usage.

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

Notes:
- `openai-compatible` requires both `endpoint` and `model`.
- `apiKey` is optional for `openai-compatible`.
- `openai-compatible` does not support `mcpServers`.
- Vision support for `openai-compatible` is treated as `unknown`.
  Image requests are allowed, but unsupported endpoints or models will fail
  at runtime.
- Existing `openai` provider behavior is unchanged.

`reasoning_effort` options differ per model:
- `gpt-5.6` / `gpt-5.6-sol` / `gpt-5.6-terra` / `gpt-5.6-luna`:
  `'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'`
- `gpt-5.4-pro`: `'medium' | 'high' | 'xhigh'` (Responses API only)
- `gpt-5.5`: `'none' | 'low' | 'medium' | 'high' | 'xhigh'`
- `gpt-5.4`: `'none' | 'low' | 'medium' | 'high' | 'xhigh'`
- `gpt-5.4-mini` / `gpt-5.4-nano`: `'none' | 'low' | 'medium' | 'high' | 'xhigh'`
- `gpt-5.1`: `'none' | 'low' | 'medium' | 'high'`
- `gpt-5` / `gpt-5-mini` / `gpt-5-nano`: `'minimal' | 'low' | 'medium' | 'high'`

Defaults and normalization in this package:
- Models that support `'none'` (`gpt-5.1`, `gpt-5.4`, `gpt-5.4-mini`,
  `gpt-5.4-nano`, `gpt-5.5`, and the GPT-5.6 family) default to `'none'`
  for fast chat responses.
  Note that OpenAI's own default for some of these models is `'medium'`;
  this package intentionally prioritizes low latency.
- Earlier GPT-5 models (`gpt-5`, `gpt-5-mini`, `gpt-5-nano`) use
  `'minimal'` as the default reasoning effort for fast chat responses.
- `gpt-5.4-pro` defaults to `'medium'`, which is its lowest supported
  reasoning effort.
- Values a model does not support are rounded to the nearest supported
  level instead of being reset (e.g. `'minimal'` on `gpt-5.4-nano`
  resolves to `'none'`, `'none'` on `gpt-5-nano` resolves to `'minimal'`,
  and `'xhigh'` on `gpt-5.1` resolves to `'high'`).

##### GPT-5 Presets and Low-Latency Chat (AITuber-style)

Instead of tuning `reasoning_effort` and `verbosity` per model, you can set
`gpt5Preset`:

- `casual` – fastest responses (`reasoning_effort: 'minimal'`,
  `verbosity: 'low'`). On models without `'minimal'` this resolves to the
  lowest supported effort (`'none'` on the GPT-5.1/5.4/5.5/5.6 family,
  `'medium'` on `gpt-5.4-pro`).
- `balanced` – `reasoning_effort: 'medium'`, `verbosity: 'medium'`.
- `expert` – `reasoning_effort: 'high'`, `verbosity: 'high'`.

Recommended settings for real-time character chat (AITuber-style), where
time-to-first-token matters more than deep reasoning:

```typescript
const aituberChatService = ChatServiceFactory.createChatService('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5.4-nano',
  gpt5Preset: 'casual', // resolves to reasoning_effort 'none' on this model
  responseLength: 'veryShort', // or 'short' for slightly longer replies
});
```

Caveats:
- Low reasoning effort trades answer quality on complex questions for
  speed. For tool/function calling or MCP-heavy flows, prefer `balanced`
  or higher.
- OpenAI does not support function tools combined with `reasoning_effort`
  on the Chat Completions API for some GPT-5.4 models. When you use tools
  with reasoning settings, set `gpt5EndpointPreference: 'responses'`.

**Meet the GPT-5 family**

- `gpt-5.6` / `gpt-5.6-sol` – The GPT-5.6 flagship tier for complex professional work. `gpt-5.6` is an alias that routes to Sol.
- `gpt-5.6-terra` – Balances GPT-5.6 intelligence and cost.
- `gpt-5.6-luna` – GPT-5.6 tier for cost-sensitive, high-volume workloads.
- `gpt-5.5` – Previous frontier model for complex professional work, with text and image input support and both Chat Completions and Responses API support.
- `gpt-5.4-pro` – Highest-tier GPT-5.4 model. Use with Responses API only.
- `gpt-5.4` – Previous GPT-5 generation model optimized for stronger coding, instruction following, and long-context agentic work.
- `gpt-5.4-mini` – Faster GPT-5.4-class small model for coding, tool use, and multimodal workloads.
- `gpt-5.4-nano` – Lowest-cost GPT-5.4-class model for simpler high-volume tasks and lightweight subagents.
- `gpt-5.1` – Complex reasoning, broad world knowledge, and code-heavy or multi-step agentic workflows.
- `gpt-5` – Previous flagship, still available for backward compatibility but superseded by GPT-5.1.
- `gpt-5-mini` – Cost-optimized reasoning/chat model that balances speed, cost, and capability.
- `gpt-5-nano` – High-throughput option best suited for simple instruction-following or classification runs.

`gpt-5.5-pro` is not included in the supported model list because OpenAI
documents it as non-streaming, while this package's standard chat flow expects
streaming support.

### OpenAI-Compatible Support Scope

Required:
- Non-stream responses (`stream: false`)
- Stream responses (`stream: true`, SSE)
- Conversation history continuity (`messages`)
- Error handling (especially 4xx and timeout surfaces)

Best effort:
- tools/function calling
- vision input support (runtime-validated for `openai-compatible`)
- strict JSON mode compatibility across implementations

### OpenAI-Compatible Troubleshooting

- CORS: In browser environments, ensure the compatible server returns
  `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers`.
- Authorization: This package sends `Authorization: Bearer <apiKey>` when
  `apiKey` is provided. If omitted, no Authorization header is sent.
  Confirm the expected token format on the server side.
- Model name: Compatible servers often expose different model IDs.
  Confirm the exact model name accepted by your endpoint.
- Vision: `openai-compatible` does not pre-validate vision capability.
  If an image request fails, confirm that both the endpoint and selected model
  actually support image input.
- Stream compatibility: `stream: true` assumes OpenAI-compatible SSE chunks
  (`data: { ... }` + `data: [DONE]`). If the format differs, streaming parse
  may fail.

### Compatibility Probe (Automated)

Use `examples/compat-probe` to validate compatibility automatically:

```bash
npm -w @aituber-onair/chat run openai-compatible:probe
```

For CI/local deterministic runs, pair it with `examples/mock-openai-server`.

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
  model: 'gemini-3.1-flash-lite',
  reasoning_effort: 'minimal'
});
```

`gemini-3.1-flash-lite` remains the default Flash-Lite model.
`gemini-3.5-flash-lite` is available as the latest stable, low-latency
Flash-Lite option, while `gemini-3.6-flash` is available for stronger agentic
and multimodal tasks. Deprecated
preview and shutdown-scheduled models such as `gemini-3.1-flash-lite-preview`,
`gemini-3-pro-preview`, and `gemini-2.5-flash-lite-preview-06-17` remain usable
by explicit model string for backward compatibility, but are no longer
advertised in the standard supported-model list for production use.
`gemini-3.5-flash` is also available as a stable Flash model.

Gemini 3 models accept `reasoning_effort`, which maps to Gemini
`thinkingConfig.thinkingLevel` while keeping `includeThoughts: false`:

- Gemini 3 Flash / Flash-Lite: `minimal`, `low`, `medium`, or `high`;
  defaults to `minimal` for low-latency chat.
- Gemini 3 Pro: `low`, `medium`, or `high`; defaults to `low` because Pro does
  not support `minimal`.

This overrides the medium thinking default of Gemini 3.6/3.5 Flash and reduces
the risk of hidden thinking exhausting short output limits. Gemini 2.5 uses
`thinkingBudget` instead, so `reasoning_effort` is intentionally not sent for
those models.

#### OpenRouter

```typescript
const openRouterService = ChatServiceFactory.createChatService('openrouter', {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'openai/gpt-oss-20b:free', // Free tier model
  // Optional: Add app information for analytics
  appName: 'Your App Name',
  appUrl: 'https://your-app-url.com'
});
```

**Important Notes for OpenRouter:**
- Token limits are automatically disabled for the `gpt-oss-20b:free` model due to technical limitations
- To control response length, include instructions in your prompt (e.g., "Please respond in 40 characters or less")
- Free tier has rate limits (20 requests/minute)
- Free tier detection is based on the model ID suffix `:free` (dynamic `:free` IDs are also rate-limited)
- `openrouter/fusion` runs a multi-model panel plus a judge model; OpenRouter bills the sum of the underlying model calls and any enabled web search/fetch usage, not a single fixed model rate.
- For `z-ai/glm-5.2`, OpenRouter reasoning defaults to `none` and token limits are automatically disabled because reasoning tokens can otherwise exhaust the output budget before visible content is emitted.
- Supported models (curated list):
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

**Dynamic OpenRouter free model refresh**

You can fetch currently available `:free` models and probe them before use:

```typescript
import { refreshOpenRouterFreeModels } from '@aituber-onair/chat';

const result = await refreshOpenRouterFreeModels({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  concurrency: 2, // default: 2
  timeoutMs: 12000, // default: 12000
  maxCandidates: 1, // default: 1
  maxWorking: 10, // default: 10
});

console.log(result.working); // e.g. ['openai/gpt-oss-20b:free']
console.log(result.failed); // [{ id, reason }, ...]
console.log(result.fetchedAt); // Date.now() timestamp
```

Notes:
- Models are fetched from `https://openrouter.ai/api/v1/models`
- Candidates are filtered by model ID suffix `:free`
- `maxCandidates` means "maximum number of candidates to probe" (e.g., `10` probes up to 10 candidates, not until 10 working models are found)
- Probe uses OpenRouter chat completions with a minimal one-shot request (`stream: false`)
- Works in both browser and Node runtimes (uses `fetch`)

#### Z.ai (GLM)

```typescript
const zaiService = ChatServiceFactory.createChatService('zai', {
  apiKey: process.env.ZAI_API_KEY,
  model: 'glm-5.2',
  visionModel: 'glm-4.6V-Flash', // Optional: vision-capable model
  responseFormat: { type: 'json_object' } // Optional JSON mode
});
```

Notes:
- Z.ai uses OpenAI-compatible Chat Completions.
- Supported text models: `glm-5.2`, `glm-5.1`, `glm-5`, `glm-5-turbo`, `glm-4.7`, `glm-4.7-FlashX`, `glm-4.7-Flash`, `glm-4.6`
- Supported vision models: `glm-5v-turbo`, `glm-4.6V`, `glm-4.6V-FlashX`, `glm-4.6V-Flash`
- `thinking` is disabled by default to match fast response behavior.

#### xAI (Grok)

```typescript
const xaiService = ChatServiceFactory.createChatService('xai', {
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-4.5',
  reasoning_effort: 'low', // Optional for Grok 4.5: low, medium, high
  visionModel: 'grok-4.3', // Optional: use a vision-capable xAI model
});
```

Notes:
- xAI uses OpenAI-compatible Chat Completions.
- Supported models: `grok-4.5`, `grok-4.3`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`, `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`
- `reasoning_effort` is sent only for models that support it. `grok-4.5` supports `low`, `medium`, and `high` and defaults to `low` for chat-style responses. `grok-4.3` supports `none`, `low`, `medium`, and `high` and defaults to `none`.
- Supported xAI models can be used with vision and tool/function calling. Grok 4.5 vision support is enabled so image chat can be validated directly in the React basic sample.

#### Kimi (Moonshot)

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  model: 'kimi-k3',
  // Optional: override endpoint or baseUrl
  // endpoint: 'https://api.moonshot.ai/v1/chat/completions',
  // baseUrl: 'https://api.moonshot.ai/v1',
  reasoning_effort: 'max'
});
```

Notes:
- Kimi uses OpenAI-compatible Chat Completions.
- Supported models: `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, `kimi-k2.5`
- `kimi-k2.6` remains the default model for chat-oriented usage.
- Kimi K3 is an explicit high-reasoning option. It currently supports only `reasoning_effort: 'max'` and does not accept the K2.x `thinking` option.
- Kimi K3 uses `max_completion_tokens` for configured response limits.
- For Kimi K3 multi-turn and tool-call flows, append the returned `completion.assistant_message` to history so `reasoning_content` and `tool_calls` are preserved.
- Kimi K2.7 Code models are coding-oriented and require thinking mode, so they keep `thinking` enabled even when tools are used.
- Explicitly setting `thinking: { type: 'disabled' }` with Kimi K2.7 Code models throws before sending the request.
- For older Kimi models, when tools are enabled, `thinking` is forced to `{ type: 'disabled' }`.

Self-hosted example:

```typescript
const kimiService = ChatServiceFactory.createChatService('kimi', {
  apiKey: process.env.MOONSHOT_API_KEY,
  baseUrl: 'http://localhost:8000/v1',
  thinking: { type: 'disabled' }
});
```

Notes for self-hosted:
- Self-hosted endpoints use `chat_template_kwargs` for thinking controls.

#### DeepSeek

```typescript
const deepSeekService = ChatServiceFactory.createChatService('deepseek', {
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-v4-flash',
});
```

Notes:
- DeepSeek uses OpenAI-compatible Chat Completions at `https://api.deepseek.com/chat/completions`.
- Recommended models: `deepseek-v4-flash` (default) and `deepseek-v4-pro`.
- Legacy aliases `deepseek-chat` and `deepseek-reasoner` remain exported for explicit compatibility, but DeepSeek marks them deprecated and scheduled for removal on 2026-07-24.
- You can still use DeepSeek through `openai-compatible` by providing the full endpoint and model manually, but the first-class `deepseek` provider supplies the endpoint and default model for you.
- DeepSeek documents thinking/reasoning controls, but this package does not add DeepSeek-specific request parameters by default. Standard chat and streaming are prioritized here.

#### Mistral

```typescript
const mistralService = ChatServiceFactory.createChatService('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-small-latest',
});

await mistralService.processChat(
  [{ role: 'user', content: 'Give me one concise streaming reply.' }],
  (partial) => process.stdout.write(partial),
  async (complete) => console.log('\nDone:', complete),
);
```

Notes:
- Mistral uses Chat Completions at `https://api.mistral.ai/v1/chat/completions`.
- Default model: `mistral-small-latest`, chosen for the sample-friendly balance of low cost, strong general chat quality, vision support, and adjustable reasoning support.
- Supported models: `mistral-small-latest`, `ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`, `mistral-medium-3-5`, `mistral-large-latest`, `mistral-large-2512`, `mistral-small-2603`, `mistral-medium-2508`.
- Ministral 3 models support text, vision, streaming, and function calling through the same Chat Completions endpoint.
- `reasoning_effort` is supported as `'none' | 'high'` and is only sent for `mistral-small-latest` and `mistral-medium-3-5`, matching Mistral's adjustable reasoning docs. It is omitted for other models.

Reasoning example:

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

Notes:
- Sakana AI Fugu uses OpenAI-compatible Chat Completions at `https://api.sakana.ai/v1/chat/completions`.
- Supported models: `fugu` (default), `fugu-ultra`, and `fugu-ultra-20260615`.
- Sakana recommends `max_completion_tokens` for new Chat Completions integrations, but also accepts legacy `max_tokens`. This provider keeps `max_tokens` to match existing OpenAI-compatible provider behavior.
- Sakana recommends the Responses API for best performance, but this provider uses Chat Completions because it matches the package's OpenAI-compatible chat path.
- Direct browser usage may fail with CORS unless Sakana enables CORS for your origin. Use Node.js, a backend/serverless proxy, or `examples/sakana-basic` instead of calling Sakana directly from browser-only apps.

#### PLaMo

```typescript
const plamoService = ChatServiceFactory.createChatService('plamo', {
  apiKey: process.env.PLAMO_API_KEY,
  model: 'plamo-3.0-prime',
});
```

Notes:
- PLaMo uses OpenAI-compatible Chat Completions at `https://api.platform.preferredai.jp/v1/chat/completions`.
- Supported models: `plamo-3.0-prime` (default) and `plamo-2.2-prime`.
- `plamo-2.2-prime` is kept for explicit compatibility, but PLaMo docs state
  it is scheduled to be discontinued on 2026-09-30 and consolidated into
  `plamo-3.0-prime`.
- `reasoning_effort` can be set to `none` or `medium` for reasoning-capable PLaMo models.
- Vision is not advertised as supported by this provider.
- PLaMo can also be used through `openai-compatible` by manually providing the full endpoint and model.

#### Gemini Nano (Chrome Built-in AI)

```typescript
const geminiNanoService = ChatServiceFactory.createChatService('gemini-nano', {
  responseLength: 'medium'
});
```

Notes:
- No API key required — uses Chrome's built-in LanguageModel API (Prompt API).
- Requires **Chrome 138+** with the following flags enabled:
  - `chrome://flags/#optimization-guide-on-device-model` → Enabled
  - `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
- The model runs entirely on-device; no network requests are made for inference.
- Non-streaming only — responses are returned as a single complete text.
- Vision is not supported.
- The initial model download requires a user action and may take a few minutes.

### Vision Chat

For built-in providers with curated model lists, the library pre-validates
vision support. For `openai-compatible`, vision support is reported as
`'unknown'` unless your application adds its own endpoint-specific knowledge.
In that case, image requests are still allowed and any incompatibility is
surfaced as a runtime error from the target endpoint.

```typescript
const visionMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'What do you see in this image?' },
    {
      type: 'image_url',
      image_url: {
        url: 'data:image/jpeg;base64,...', // or https:// URL
        detail: 'low' // 'low', 'high', or 'auto'
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

You can inspect the pre-validation status from `ChatServiceFactory`:

```typescript
const level = ChatServiceFactory.getVisionSupportLevelForModel(
  'openai-compatible',
  'your-local-model',
);

console.log(level); // 'unknown'
```

### Tool/Function Calling

```typescript
import { ToolDefinition } from '@aituber-onair/chat';

const tools: ToolDefinition[] = [{
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  }
}];

// Tool calling is handled automatically by the chat service
// Configure tool handlers when creating the service
```

### Response Length Control

Base preset token targets are:
- `veryShort`: 40
- `short`: 100
- `medium`: 200
- `long`: 300
- `veryLong`: 1000
- `deep`: 5000

For the OpenAI GPT-5 family (`gpt-5`, `gpt-5-mini`, `gpt-5-nano`,
`gpt-5.1`, `gpt-5.4`, `gpt-5.5`, `gpt-5.6`, `gpt-5.6-sol`,
`gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.4-mini`, `gpt-5.4-nano`,
`gpt-5.4-pro`),
these values are treated as base presets. The library may raise the actual
`max_completion_tokens` or `max_output_tokens` to reduce premature truncation,
depending on the selected model and `reasoning_effort`.

If you need an exact token limit, use `maxTokens`.

```typescript
// Using preset response lengths
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  responseLength: 'medium' // 'veryShort', 'short', 'medium', 'long', 'veryLong', 'deep'
});

// Using custom token limits
const service = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  maxTokens: 500 // Direct token limit
});
```

### Model Context Protocol (MCP)

The chat package supports MCP (Model Context Protocol) servers across all providers, with different implementation approaches:

#### Provider-Specific MCP Implementation

**OpenAI & Claude**: Direct MCP Integration
- Uses provider's native MCP support (Responses API for OpenAI)
- Server-to-server communication (no CORS issues)
- Direct connection to MCP servers

**Gemini**: Function Calling Integration
- MCP tools are registered as Gemini function declarations
- ToolExecutor handles MCP server communication
- Requires CORS configuration in browser environments

#### Basic Usage

```typescript
// MCP servers work with all providers (OpenAI, Claude, Gemini)
const mcpServers = [{
  type: 'url',
  url: 'http://localhost:3000',
  name: 'local-server',
  authorization_token: 'optional-token'
}];

// OpenAI/Claude - direct MCP integration
const openaiService = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-key',
  mcpServers // Direct integration via Responses API
});

// Gemini - MCP via function calling
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: 'your-key',
  mcpServers // Integrated as function declarations
});

// MCP tools are automatically available and handled by ToolExecutor
```

#### Gemini-Specific CORS Configuration

When using Gemini with MCP in browser environments, you need to configure a proxy to avoid CORS issues:

**Vite Development Setup** (`vite.config.ts`):
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

**Dynamic MCP URL Configuration**:
```typescript
// Provider-specific MCP server configuration
const getMcpServers = (provider: string): MCPServerConfig[] => {
  const baseUrl = provider === 'gemini' 
    ? '/api/mcp/sse'  // Proxy URL for Gemini (browser)
    : 'https://mcp.deepwiki.com/sse';  // Direct URL for OpenAI/Claude

  return [{
    type: 'url',
    url: baseUrl,
    name: 'deepwiki',
  }];
};

// Use in chat service creation
const mcpServers = getMcpServers(chatProvider);
const chatService = ChatServiceFactory.createChatService(chatProvider, {
  apiKey: 'your-api-key',
  mcpServers
});
```

#### Error Handling & Timeouts

The Gemini MCP implementation includes robust error handling:
- 5-second timeout for MCP schema fetching
- Automatic fallback to basic search tools if MCP servers are unavailable
- Graceful degradation when MCP initialization fails

### Emotion Detection

```typescript
import { textToScreenplay } from '@aituber-onair/chat';

const text = "[happy] I'm so glad to see you!";
const screenplay = textToScreenplay(text);
console.log(screenplay); // { emotion: 'happy', text: "I'm so glad to see you!" }
```

## API Reference

### ChatService Interface

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

### Types

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

type ChatResponseLength = 'veryShort' | 'short' | 'medium' | 'long' | 'veryLong' | 'deep';
type VisionSupportLevel = 'supported' | 'unsupported' | 'unknown';
```

### Vision Support Discovery

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

Semantics:
- `supported`: Known to support vision before sending the request
- `unsupported`: Known to reject vision before sending the request
- `unknown`: Cannot be pre-validated, but vision requests may still succeed

### Provider Capability Discovery

UI and agent runtimes can inspect provider features before creating a chat
service:

```typescript
const capabilities = ChatServiceFactory.getProviderCapabilities(
  'openai',
  'gpt-5.4-mini',
);

if (capabilities?.jsonMode) {
  // Show a JSON mode toggle or pass responseFormat safely.
}

if (!capabilities?.mcp) {
  // Disable MCP server settings for this provider.
}
```

`getProviderCapabilities(provider, model?)` returns machine-readable metadata
such as `models`, `defaultModel`, `vision`, `tools`, `mcp`, `jsonMode`,
`responseLength`, and supported `reasoningEffort` values. Use
`getAllProviderCapabilities()` to populate provider pickers or dashboards.

The capability object is static planning metadata. It does not include API keys,
endpoints, base URLs, MCP server definitions, or other user configuration. This
helps UI surfaces hide unsupported controls before execution, and lets agents
choose whether to use tools, MCP, vision, JSON mode, or reasoning settings
without hard-coding provider-specific rules.

## Available Providers

Currently, the following AI providers are built-in:

- **OpenAI**: Supports models like GPT-5.6 (Sol/Terra/Luna), GPT-5.5, GPT-5.4 Pro, GPT-5.4, GPT-5.4 Mini, GPT-5.4 Nano, GPT-5.1, GPT-5 (Nano/Mini/Standard), GPT-4.1 (including mini and nano), GPT-4, GPT-4o-mini, O3-mini, o1, o1-mini
- **OpenAI-Compatible**: Supports arbitrary local/self-hosted model IDs via OpenAI-compatible endpoints. Vision capability is treated as `unknown` unless your app knows the endpoint-specific model catalog.
- **Gemini**: Supports recommended models like Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.5 Flash-Lite, Gemini 3.1 Flash-Lite, Gemini 3.1 Pro Preview, Gemini 3 Flash Preview, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite, Gemma 4 31B IT, and Gemma 4 26B A4B IT. Gemini 3 Flash models default to minimal thinking for chat-style responses, while Gemini 3 Pro models default to low. Deprecated lifecycle models such as Gemini 3.1 Flash-Lite Preview, Gemini 3 Pro Preview, and Gemini 2.5 Flash Lite Preview remain exported for explicit use.
- **Claude**: Supports current Claude API model IDs including Claude Sonnet 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 4.6, Claude Sonnet 4.5, Claude Haiku 4.5, plus deprecated-but-still-available Claude 4 Opus, Claude 4 Sonnet, and Claude 3 Haiku
- **OpenRouter**: Supports a curated OpenRouter model list (OpenAI/Claude/Gemini/Z.ai/Kimi). See the OpenRouter section for model IDs.
- **Z.ai**: Supports GLM-5.2/GLM-5.1/GLM-5/GLM-5-Turbo (text), GLM-4.7/4.6 (text), and GLM-5V-Turbo/GLM-4.6V family (vision)
- **xAI**: Supports Grok 4.5 with `reasoning_effort: 'low'` by default for chat-style responses, plus Grok 4.3, Grok 4.20 Reasoning/Non-Reasoning, and Grok 4-1 Fast Reasoning/Non-Reasoning, all with vision support.
- **Kimi**: Supports Kimi K3 (`kimi-k3`, max reasoning only), Kimi K2.7 Code (`kimi-k2.7-code`), Kimi K2.7 Code HighSpeed (`kimi-k2.7-code-highspeed`), Kimi K2.6 (`kimi-k2.6`, default), and Kimi K2.5 (`kimi-k2.5`) with vision support
- **DeepSeek**: Supports DeepSeek V4 Flash (`deepseek-v4-flash`) and DeepSeek V4 Pro (`deepseek-v4-pro`) via OpenAI-compatible Chat Completions. Legacy aliases `deepseek-chat` and `deepseek-reasoner` are deprecated by DeepSeek.
- **Mistral**: Supports the Ministral 3 family (`ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`) and current Mistral generalist models, with streaming and vision support. Adjustable `reasoning_effort` is only sent for supported models.
- **Sakana AI**: Supports Fugu (`fugu`) and Fugu Ultra (`fugu-ultra`, `fugu-ultra-20260615`) via OpenAI-compatible Chat Completions.
- **PLaMo**: Supports PLaMo 3.0 Prime (`plamo-3.0-prime`, default) and PLaMo 2.2 Prime (`plamo-2.2-prime`) via OpenAI-compatible Chat Completions.
- **Gemini Nano**: Chrome built-in AI (LanguageModel API). Runs on-device with no API key required. Chrome 138+ with Prompt API flags enabled. Non-streaming, no vision support.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

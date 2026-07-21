# @aituber-onair/chat support knowledge
## Scope
`@aituber-onair/chat` is the chat and LLM integration package for AITuber
OnAir.
It provides one interface for multiple AI chat providers.
The main package supports browser and JavaScript server runtimes.
Its core strengths are:
- A unified service factory.
- Strong TypeScript types.
- Streaming text responses.
- Provider and model switching.
- Tool and function calling.
- Vision messages.
- Response-length controls.
- Model Context Protocol support for documented providers.
- Static capability discovery for UI planning.
The package is useful beyond VTubers.
It can power support bots, character chats, assistants, and other
conversational interfaces.
## Relationship to other AITuber OnAir packages
`@aituber-onair/core` is the higher-level orchestration package.
It brings chat processing and voice synthesis together for complete AITuber
experiences.
`@aituber-onair/voice` is the voice synthesis package.
Use it when a text response from the chat package should be spoken by a TTS
engine.
`@aituber-onair/manneri` detects repetitive conversation patterns.
It can help an application notice and avoid monotonous AI replies.
`@aituber-onair/bushitsu-client` is a WebSocket client with React hooks for
chat functionality.
It covers realtime client communication rather than provider API abstraction.
`@aituber-onair/kizuna` manages relationship or bond state between users and
AI characters.
It can provide relationship context around a chat experience.
`@aituber-onair/chat` remains independently usable.
Applications should import its public API from `@aituber-onair/chat`, not from
its generated `dist` internals.
## Installation
Install the package with npm:
```bash
npm install @aituber-onair/chat
```
In this monorepo, install dependencies at the repository root and build the
chat workspace before running source examples.
```bash
npm ci
npm -w @aituber-onair/chat run build
```
The package ships ESM and CommonJS builds.
It also ships a UMD/IIFE build for script-tag browser usage and Google Apps
Script.
The UMD global is `AITuberOnAirChat`.
Google Apps Script does not stream natively, so its adapter uses non-streaming
helpers such as `runOnceText`.
## Quick start
Import `ChatServiceFactory` and create a provider service.
```typescript
import {
  ChatServiceFactory,
  MODEL_GPT_5_6_TERRA,
  type Message,
} from '@aituber-onair/chat';
const chatService = ChatServiceFactory.createChatService('openai', {
  apiKey: 'your-api-key',
  model: MODEL_GPT_5_6_TERRA,
  responseLength: 'short',
});
const messages: Message[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
];
await chatService.processChat(
  messages,
  (partialText) => console.log('Partial:', partialText),
  async (completeText) => console.log('Complete:', completeText),
);
```
The service factory is the normal entry point for built-in providers.
The common message roles are `system`, `user`, `assistant`, and `tool`.
For multi-turn chat, pass earlier user and assistant messages with the new
user message on each turn.
## Built-in providers
The main entry point includes these provider names:
- `openai`
- `openai-compatible`
- `claude`
- `gemini`
- `gemini-nano`
- `openrouter`
- `zai`
- `xai`
- `kimi`
- `deepseek`
- `mistral`
- `sakana`
- `plamo`
Agent SDK providers use the separate `@aituber-onair/chat/agent` entry point.
Those experimental providers are `codex-sdk`, `claude-agent-sdk`, and
`copilot-sdk`.
They dynamically load the matching provider SDK in a JavaScript runtime.
They are not part of the browser/GAS UMD entry point.
## OpenAI models
Representative exported OpenAI constants include:
- `MODEL_GPT_5_6` = `gpt-5.6`
- `MODEL_GPT_5_6_SOL` = `gpt-5.6-sol`
- `MODEL_GPT_5_6_TERRA` = `gpt-5.6-terra`
- `MODEL_GPT_5_6_LUNA` = `gpt-5.6-luna`
- `MODEL_GPT_5_5` = `gpt-5.5`
- `MODEL_GPT_5_4_PRO` = `gpt-5.4-pro`
- `MODEL_GPT_5_4` = `gpt-5.4`
- `MODEL_GPT_5_4_MINI` = `gpt-5.4-mini`
- `MODEL_GPT_5_4_NANO` = `gpt-5.4-nano`
- `MODEL_GPT_5_1` = `gpt-5.1`
- `MODEL_GPT_5` = `gpt-5`
- `MODEL_GPT_5_MINI` = `gpt-5-mini`
- `MODEL_GPT_5_NANO` = `gpt-5-nano`
- `MODEL_GPT_4_1` = `gpt-4.1`
- `MODEL_GPT_4O_MINI` = `gpt-4o-mini`
`gpt-5.6` is an alias that routes to the Sol tier.
Terra balances GPT-5.6 intelligence and cost.
Luna is intended for cost-sensitive, high-volume workloads.
The GPT-5.6 family supports `none`, `low`, `medium`, `high`, `xhigh`, and
`max` reasoning effort through this package.
The package defaults GPT-5.6 models to `none` for low-latency chat.
The `casual`, `balanced`, and `expert` GPT-5 presets provide convenient
reasoning and verbosity combinations.
`gpt-5.4-pro` uses the Responses API only.
## Claude models
Representative exported Claude constants include:
- `MODEL_CLAUDE_5_SONNET` = `claude-sonnet-5`
- `MODEL_CLAUDE_4_8_OPUS` = `claude-opus-4-8`
- `MODEL_CLAUDE_4_7_OPUS` = `claude-opus-4-7`
- `MODEL_CLAUDE_4_6_OPUS` = `claude-opus-4-6`
- `MODEL_CLAUDE_4_6_SONNET` = `claude-sonnet-4-6`
- `MODEL_CLAUDE_4_5_OPUS` = `claude-opus-4-5-20251101`
- `MODEL_CLAUDE_4_5_SONNET` = `claude-sonnet-4-5-20250929`
- `MODEL_CLAUDE_4_5_HAIKU` = `claude-haiku-4-5-20251001`
- `MODEL_CLAUDE_3_HAIKU` = `claude-3-haiku-20240307`
Create a Claude service with the same factory:
```typescript
const claudeService = ChatServiceFactory.createChatService('claude', {
  apiKey: 'your-anthropic-key',
  model: MODEL_CLAUDE_4_5_HAIKU,
});
```
## Gemini models
Representative exported Gemini constants include:
- `MODEL_GEMINI_3_5_FLASH` = `gemini-3.5-flash`
- `MODEL_GEMINI_3_1_FLASH_LITE` = `gemini-3.1-flash-lite`
- `MODEL_GEMINI_3_1_PRO_PREVIEW` = `gemini-3.1-pro-preview`
- `MODEL_GEMINI_3_FLASH_PREVIEW` = `gemini-3-flash-preview`
- `MODEL_GEMINI_2_5_PRO` = `gemini-2.5-pro`
- `MODEL_GEMINI_2_5_FLASH` = `gemini-2.5-flash`
- `MODEL_GEMINI_2_5_FLASH_LITE` = `gemini-2.5-flash-lite`
- `MODEL_GEMMA_4_31B_IT` = `gemma-4-31b-it`
- `MODEL_GEMMA_4_26B_A4B_IT` = `gemma-4-26b-a4b-it`
`gemini-3.1-flash-lite` is the recommended stable Flash-Lite model in the
package README.
Gemini 3.5 Flash uses minimal thinking automatically for chat-style responses.
Create a Gemini service with provider name `gemini`.
```typescript
const geminiService = ChatServiceFactory.createChatService('gemini', {
  apiKey: 'your-google-key',
  model: MODEL_GEMINI_3_1_FLASH_LITE,
});
```
## Other provider examples
OpenRouter uses provider name `openrouter` and a curated cross-provider model
list.
Its free model IDs use the `:free` suffix.
Z.ai uses provider name `zai` and GLM models.
xAI uses provider name `xai` and Grok models.
Kimi uses provider name `kimi` and Moonshot model IDs.
DeepSeek uses provider name `deepseek` and current V4 Flash or V4 Pro models.
Mistral uses provider name `mistral` and supports current Mistral and Ministral
models.
Sakana AI uses provider name `sakana` with Fugu models, but direct browser use
may fail because of CORS.
PLaMo uses provider name `plamo` with PLaMo 3.0 Prime as its package default.
Gemini Nano uses provider name `gemini-nano`, needs no API key, and depends on
Chrome's built-in LanguageModel API.
Gemini Nano is non-streaming and does not support vision.
## OpenAI-compatible endpoints
Use `openai-compatible` for local or self-hosted servers that implement the
OpenAI Chat Completions contract.
```typescript
const localService = ChatServiceFactory.createChatService(
  'openai-compatible',
  {
    endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
    model: 'your-local-model',
    apiKey: 'optional-key',
  },
);
```
Both `endpoint` and `model` are required.
The endpoint must be a full URL.
The API key is optional for this provider.
Streaming expects OpenAI-compatible server-sent event chunks and a final
`[DONE]` marker.
Vision support is reported as `unknown` and is validated only when a request
reaches the endpoint.
The `openai-compatible` provider does not support `mcpServers`.
## Streaming
`processChat` takes the full message array and two response callbacks.
The partial callback receives response text chunks as they arrive.
Append each partial chunk to the visible assistant message.
The completion callback receives the complete text.
Use the complete text to finalize the assistant message.
`processVisionChat` provides the equivalent flow for messages containing image
blocks.
`chatOnce` and `visionChatOnce` are lower-level helpers that can return tool
completion metadata.
## Tool and function calling
The package exports `ToolDefinition` for declaring callable tools.
A tool definition includes a name, description, and JSON-schema-style
parameters.
Tool handlers are configured when the service is created.
The service can iterate through tool calls and return the resulting assistant
response.
For provider-specific reasoning state and tool calls, preserve the returned
assistant message metadata when continuing a conversation.
## Model Context Protocol
The package documents MCP integration for OpenAI, Claude, and Gemini.
OpenAI and Claude use direct provider integration.
Gemini exposes MCP tools through function declarations and a tool executor.
An MCP URL configuration has fields such as `type`, `url`, `name`, and an
optional `authorization_token`.
Browser-based Gemini MCP use can require a proxy because the MCP server must
allow the browser origin.
Use `ChatServiceFactory.getProviderCapabilities(provider, model)` to inspect
whether a provider supports MCP before showing related UI.
## Vision
Vision messages use text and `image_url` content blocks.
```typescript
const visionMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'What do you see?' },
    {
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,...', detail: 'low' },
    },
  ],
};
```
Call `processVisionChat` for these messages.
Use `ChatServiceFactory.getVisionSupportLevelForModel(provider, model)` to
check a model before enabling image input.
The result is `supported`, `unsupported`, or `unknown`.
`unknown` means the library cannot pre-validate support; it does not mean the
request is guaranteed to fail.
## Response length
The response-length presets are:
- `veryShort`: base target 40 tokens.
- `short`: base target 100 tokens.
- `medium`: base target 200 tokens.
- `long`: base target 300 tokens.
- `veryLong`: base target 1000 tokens.
- `deep`: base target 5000 tokens.
GPT-5 models may raise the actual output limit to leave room for reasoning.
Use `maxTokens` when an exact token limit is needed.
## Capability discovery
Call `ChatServiceFactory.getProviderCapabilities(provider, model)` for static,
machine-readable planning metadata.
The metadata can describe models, default model, vision, tools, MCP, JSON mode,
response length, and reasoning effort.
It does not contain API keys, endpoint URLs, or user configuration.
Call `getAllProviderCapabilities()` to populate broader provider dashboards.
## Browser API key safety
A browser application can pass an API key directly to a service for a demo.
That exposes the key to the browser user and to any script running on the page.
`localStorage` is convenient for a local demonstration but is not a secure
secret store.
Production applications should normally send requests through a trusted
server-side or serverless proxy.
Never commit API keys to source control.
## Browser CORS notes
CORS behavior belongs to the remote provider or proxy.
A valid API key does not bypass a browser CORS policy.
If direct browser requests fail, confirm that the provider allows the page's
origin and request headers.
For local OpenAI-compatible servers, configure
`Access-Control-Allow-Origin` and `Access-Control-Allow-Headers` as needed.
Sakana AI is disabled in the package's React browser example because direct
browser CORS support may be unavailable.
Use a Node.js example or backend proxy for providers that do not allow direct
browser requests.
## Frequently asked questions
### Can I switch providers without changing the UI message shape?
Yes. Create a new service with the chosen provider and model, then pass the
same common `Message[]` conversation shape.
Provider-specific options still differ and should be configured only when the
chosen provider supports them.
### How do I keep conversation context?
Pass the previous user and assistant messages on the next `processChat` call.
Include a system message when the application needs stable instructions.
### Why is no response visible yet?
Show a typing state until the first partial callback fires.
Then append partial chunks to the assistant message until completion.
### Why does a browser request fail while a Node.js request works?
Check CORS first.
If the provider does not support direct browser calls, use a server-side
proxy.
### Can I use a model string directly?
The options accept model IDs, but exported constants reduce typos and keep
examples aligned with the supported package catalog.
Do not assume an unlisted model works with a provider.
### Where should I check for APIs not covered here?
Use the package README and repository source as the authority.
Do not invent option names or endpoint behavior.
## Deeper documentation
- Package README:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat
- Basic chat:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#basic-chat
- OpenAI-compatible support:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#openai-compatible-localself-hosted
- Vision chat:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#vision-chat
- Tool and function calling:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#toolfunction-calling
- Response length:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#response-length-control
- MCP:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#model-context-protocol-mcp
- API reference:
  https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#api-reference

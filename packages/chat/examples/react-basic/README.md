# React Chat Example

Interactive web application demonstrating the @aituber-onair/chat package with React, TypeScript, and Vite.

## Features

- 🔄 **Provider Switching** - Switch between OpenAI, OpenAI-compatible, Claude, Gemini, OpenRouter, Z.ai, Kimi, DeepSeek, Mistral, browser-disabled Sakana AI, and PLaMo in real-time
- 💬 **Real-time Streaming** - See AI responses as they're generated
- 📝 **Chat History** - Full conversation history with role indicators
- 🖼️ **Vision Support** - Upload and analyze images (drag & drop supported)
- 🎛️ **Response Control** - Adjust response lengths and model settings
- 🎨 **Modern UI** - Clean, responsive interface
- ⚡ **Fast Development** - Vite with hot module replacement
- 🔒 **Secure** - API keys stored in browser session only

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

4. Enter your API key(s) and start chatting!

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- API keys for at least one provider:
  - OpenAI: https://platform.openai.com/api-keys
  - OpenAI-compatible (Local LLM): use your own endpoint and token (or dummy key)
  - Claude: https://console.anthropic.com/
  - Gemini: https://makersuite.google.com/app/apikey
  - OpenRouter: https://openrouter.ai/
  - Z.ai: https://platform.z.ai/
  - Kimi (Moonshot): https://platform.moonshot.cn/
  - DeepSeek: https://platform.deepseek.com/
  - Mistral: https://console.mistral.ai/
  - PLaMo: https://plamo.preferredai.jp/

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Project Structure

```
react-basic/
├── src/
│   ├── App.tsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.tsx             # Application entry point
│   └── components/
│       ├── ChatInterface.tsx # Chat UI component
│       ├── ProviderSelector.tsx # Provider switching
│       └── MessageList.tsx  # Message display
├── index.html               # HTML template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── vite.config.ts           # Vite configuration
```

## Usage Guide

### Basic Chat

1. Select a provider (OpenAI, OpenAI-compatible, Claude, Gemini, OpenRouter, Z.ai, Kimi, DeepSeek, Mistral, browser-disabled Sakana AI, or PLaMo)
2. Enter your API key
3. Type a message and press Enter or click Send
4. Watch the AI response stream in real-time

### Local LLM (OpenAI-Compatible)

1. Select `OpenAI-Compatible`
2. Choose an Ollama, LM Studio, llama.cpp, or vLLM preset, or enter a custom endpoint. An origin, `/v1` base URL, or full Chat Completions URL works; the resolved request URL appears below the field.
3. Click `Fetch models` and choose an ID, or type the exact model ID yourself.
4. Enter an API key if your server requires one, then click `Test connection`. The test uses `/v1/models` and does not generate text.
5. Send a message to check chat streaming. For local server setup and browser CORS, see the [local LLM guide](../../../../docs/local-llm.md).

To try the bundled mock server, run `node packages/chat/examples/mock-openai-server/server.js --port=18080` from the repository root. Use the default endpoint, API key `test-key`, and model `mock-chat-model` in this example.

### Image Analysis (Vision)

1. Ensure you're using a vision-capable model
2. Click the image icon or drag & drop an image
3. Add a text prompt about the image
4. Send to analyze

### Response Length Control

Use the dropdown to select response length:
- Very Short: ~40 tokens
- Short: ~100 tokens
- Medium: ~200 tokens (default)
- Long: ~300 tokens
- Very Long: ~1000 tokens
- Deep: ~5000 tokens

OpenRouter dynamic routers (`openrouter/auto` and `openrouter/auto-beta`) do not
send token limits derived from these presets because a routed reasoning model
can consume the output budget before producing visible text. Use a length
instruction in the prompt when selecting either router.

For Gemini Nano, the presets also apply concrete sentence-count guidance:
`Very Short` up to 1 sentence, `Short` up to 2, `Medium` up to 3, `Long` up
to 5, and `Very Long` up to 10. `Deep` has no sentence-count limit. The
example supplies two short Japanese user/assistant examples through
`initialPrompts` only for `Very Short` and `Short`, so longer presets are not
biased toward one-sentence answers. Chat input remains disabled until the
built-in model status is `available`.

### Provider-Specific Features

**OpenAI**
- Models: GPT-6.1 Sol, GPT-6 Astra, GPT-6 Sol, GPT-6 Luna, GPT-5.6 (Sol/Terra/Luna), GPT-5.5, GPT-5.4 Pro, GPT-5.4, GPT-5.1, GPT-5 (Standard), GPT-5 Mini, GPT-5 Nano, GPT-4.1, GPT-4, GPT-3.5
- Vision: GPT-4 Vision
- Best for: General purpose, code generation, advanced reasoning
- Reasoning Effort: GPT-5.5 supports None/Low/Medium/High/XHigh and defaults to None in this package, GPT-5.4 supports None/Low/Medium/High/XHigh, GPT-5.4 Pro supports Medium/High/XHigh (Responses API only), GPT-5.1 supports None/Low/Medium/High, and GPT-5.0 models support Minimal/Low/Medium/High

**OpenAI-Compatible (Local/Self-Hosted)**
- Endpoint: server origin, API base URL, or full Chat Completions URL
- Model: user-configurable model ID
- Vision: depends on your server/model implementation
- Best for: local LLMs (Ollama/LM Studio/vLLM-compatible endpoints)

**Claude**
- Models: Claude Opus 5.5, Claude Sonnet 5.5, Claude Fable 5, Claude Opus 5, Claude Sonnet 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, and Claude 4.5 (Opus, Sonnet, Haiku)
- Vision: All listed Claude models
- Effort: Supported models expose model-aware Low/Medium/High/XHigh/Max options. The control maps to `output_config.effort` and defaults to High.
- Refusals: Streaming refusal metadata is preserved as a terminal completion rather than surfaced as a tool error.
- Best for: Long context, tool use + advanced reasoning

**Gemini**
- Models: Gemini 3.8 Flash, Gemini 3.7 Flash, Gemini 3.6 Flash, Gemini 3.5 Flash/Flash-Lite, Gemini 3.1 Flash-Lite, Gemini 3.1 Pro Preview, Gemini 3 Flash Preview, Gemini 2.5 Pro/Flash/Flash Lite, Gemma 4 31B IT, Gemma 4 26B A4B IT
- Vision: Supported for all listed Gemini models. Deprecated lifecycle models remain selectable with a deprecated label for explicit compatibility.
- Reasoning Effort: Gemini 3 models default to their lowest supported effort. Minimal-capable Flash/Flash-Lite models expose Minimal/Low/Medium/High; models without Minimal expose Low/Medium/High. The latter currently includes Gemini 3.8 Flash, Gemini 3.7 Flash, and Gemini 3 Pro. Gemini 2.5 uses `thinkingBudget`, so this control is disabled for 2.5 models.
- Best for: Fast responses and multimodal chat. The lowest supported thinking level keeps latency and hidden-token usage low.

**OpenRouter**
- Models: Curated multi-provider model list (OpenRouter Auto/Auto Beta/Fusion, OpenAI GPT-5.6, Claude Fable/Opus 5, Gemini 3.7/3.6/3.5, Z.ai, Grok 4.6, Kimi K3, DeepSeek V4 Flash and V4 Pro 0813, KAT-Coder V2.5)
- Vision: Depends on selected routed model
- Reasoning Effort: Model-aware options. DeepSeek V4 Flash 0731 exposes None/Low/High/Max; the older unversioned Flash and V4 Pro 0813 expose None/High/XHigh. None is the default and disables reasoning rather than only hiding it.
- Best for: Flexible model routing and unified API usage
- Auto Beta: Selects a model per request and charges the selected model's rate
- Coding models: KAT-Coder-Air/Pro V2.5 are explicit text-only options, not defaults
- Fusion Cost: `openrouter/fusion` bills the combined underlying model calls and any enabled web search/fetch usage
- Dynamic Free Models: Click `Fetch free models` to probe currently available `:free` models and append working IDs to the model list
- Max candidates: Adjustable in UI (default `1`) to control probe request volume
- `Max candidates = 10` means probing up to 10 `:free` candidates (it does not continue until 10 working models are found)
- Persistence: Fetched dynamic free model IDs are saved under localStorage root key `AITuberOnAirChat_example_react-basic`

**Z.ai**
- Models: GLM-5.2, GLM-5.1, GLM-5, GLM-5-Turbo, GLM-5V-Turbo, GLM-4.7/4.6, GLM-4.6V family
- Vision: GLM-5V-Turbo and GLM-4.6V family (`glm-5.2`, `glm-5.1`, `glm-5`, and `glm-5-turbo` are text-only)
- Reasoning Effort: GLM-5.2 exposes all protocol values and defaults to None for low latency. The UI shows their effective None/High/Max mapping.
- Best for: OpenAI-compatible GLM integration

**xAI**
- Models: Grok 4.7, Grok 4.6, Grok 4.5, Grok 4.3, Grok 4.20 Reasoning/Non-Reasoning
- Vision: Supported
- Best for: Grok models with OpenAI-compatible API
- Grok 4.7 and 4.6 expose Low/Medium/High/XHigh `reasoning_effort`; Grok 4.7, 4.6, and 4.5 default to `low` for faster chat responses, while Grok 4.3 defaults to `none`
- Grok 4.3 is the package and sample default.

**Kimi**
- Models: Kimi K3, Kimi K2.7 Code, Kimi K2.7 Code HighSpeed, Kimi K2.6, Kimi K2.5
- Vision: Supported
- Best for: Moonshot models with OpenAI-compatible API. Kimi K2.6 remains the chat-oriented default; Kimi K3 is an explicit reasoning option, and Kimi K2.7 Code models are coding-oriented.
- Kimi K3 reasoning: selectable `low`, `high`, or `max`, with `max` as the API default. Reasoning cannot be disabled.

**DeepSeek**
- Models: DeepSeek V4 Flash, DeepSeek V4 Pro
- Vision: Not pre-validated as supported
- Reasoning Effort: V4 Flash exposes None/Low/High/Max; V4 Pro exposes None/High/Max. None is the default for responsive chat. Thinking with tool calling is not supported yet.
- Best for: DeepSeek's OpenAI-compatible API without manually configuring an endpoint

**Mistral**
- Models: Mistral Small Latest, Ministral 3 3B/8B/14B, Mistral Medium 3.5, Mistral Large Latest/2512, Mistral Small 2603, GLM-5.3 (Mistral)
- Vision: Supported except text-only GLM-5.3
- Best for: Mistral Chat Completions with streaming and optional adjustable reasoning

**PLaMo**
- Models: PLaMo 3.0 Prime. The retiring 2.2 constant remains exported for source compatibility but is not shown in the selector.
- Vision: Not supported by this provider
- Best for: Japanese-focused chat through PLaMo's OpenAI-compatible API

### OpenRouter Dynamic Free Models (Manual Check)

1. Select `OpenRouter` as provider
2. Enter a valid OpenRouter API key
3. Click `Fetch free models` in the model settings panel
4. Confirm fetched `:free` models are added to the `Models` list
5. Select one dynamic model and send a chat message
6. Reload the page and confirm the dynamic list is restored from localStorage

## Troubleshooting

### Build Issues

If you encounter module resolution errors:
```bash
cd ../../  # Go to chat package root
npm run build
cd examples/react-basic
npm install
```

### API Errors

- **401**: Invalid API key
- **429**: Rate limit exceeded
- **500**: Server error (try again)

### CORS Issues

Named providers in this sample send requests directly to their configured
upstream endpoints. The `/api/openai`, `/api/anthropic`, and `/api/google`
rules in `vite.config.ts` only proxy requests made to those local paths;
selecting a provider does not automatically use those rules. In particular,
native OpenAI, Z.ai, and OpenRouter requests remain direct browser requests.
Their success depends on the upstream service permitting your origin and
request headers. Mock transport tests do not verify live CORS behavior.

Sakana AI is shown as a disabled provider in this browser example because direct browser
requests can fail with CORS unless Sakana enables the required CORS headers for
your origin. Use `../node-basic/sakana-example.js` from Node.js, or call Sakana through your own
backend/serverless proxy in a web app.

For production, you'll need to:
1. Use a backend proxy
2. Configure CORS on your server
3. Keep provider credentials on that backend; browser SDKs cannot bypass CORS

### Offline React integration tests

From the repository root after `npm ci`, run:

```bash
npm -w @aituber-onair/chat run test:example:react
```

The same tests are discovered by the normal Chat `npm test` command and the
repository test workflow. They mount the real React app in JSDOM, change the
rendered provider/model/settings controls, submit messages, and use the real
Chat services with fail-closed mocked fetch responses and fake credentials.
No provider inference or live API calls are made, and no new test dependencies
are required beyond the existing monorepo installation.

Coverage includes all nine GPT-6.1 Sol / GLM-5.3 FlashX native and new OpenRouter
options, every offered reasoning effort, endpoint selection, image requests,
fragmented streaming text, conversation history, repeated sends, clearing an
in-flight conversation, schema validation, provider/model switching, and
recovery from HTTP, network, and in-stream provider errors. These tests verify
DOM behavior and request/response wiring, not browser layout, live provider
availability, account permissions, actual model output, or CORS/preflight.

## Customization

### Styling

Modify `App.css` for custom styling. The app uses CSS variables for theming:

```css
:root {
  --primary-color: #007bff;
  --background: #f5f5f5;
  --text-color: #333;
}
```

### Adding Features

Common extensions:
- Chat export/import
- Message editing
- Voice input/output
- Custom system prompts
- Tool/function integration

## Production Deployment

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service

3. Set up environment variables for API keys (don't hardcode!)

4. Configure a backend proxy for API calls

## Security Notes

- Never commit API keys
- Use environment variables in production
- Implement rate limiting
- Add user authentication for public deployments
- Validate and sanitize all inputs

## Learn More

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Chat Package Documentation](../../README.md)

### Additional model options

The model selector includes GPT-6.1 Sol, GPT-6 Astra, GPT-6 Sol, and GPT-6 Luna (native
OpenAI), Claude Fable 5.1, and DeepSeek V4.1 Flash (`deepseek-flash`). Astra
uses Responses and starts at low reasoning; Luna uses Responses and defaults to
low reasoning for responsive chat. Fable 5.1 always thinks and uses automatic
tool selection. DeepSeek tools require reasoning to be set to none.

GPT-6.1 Sol defaults to low reasoning and Responses. Its tools require Responses;
Chat Completions is available only without tools. Unsupported none/minimal
reasoning settings normalize to low.

GLM-5.3 FlashX is an explicit Z.ai vision/streaming/tool option using the public
Model API key and endpoint, not the Coding Plan endpoint. Like other GLM-5.3
models, it always thinks and defaults to low reasoning.

OpenRouter also offers GPT-6.1 Sol, GPT-6 Sol/Luna, Claude Sonnet/Opus 5.5,
Grok 4.7, and GLM-5.3 FlashX, alongside Astra/Pro, Fable 5.1, DeepSeek V4.1
Flash, Gemini 3.8 Flash, Ling 3.0 Flash VL (free), Mercury 2.5, Nex N2.5 Mini/Pro (free),
Qwen3.8 Max (0902), and Muse Spark 1.3. Reasoning choices follow each model's
capabilities. The new OpenRouter models default to low reasoning, except Sol/Luna
which default to none; tools use OpenRouter Chat Completions. Claude 5.5 tool
selection stays automatic. Mercury 2.5 is text-only. Provider defaults are
unchanged.

### Additional explicit Chat Completions models

OpenRouter includes Nemotron 3.5 Lightning (`nvidia/nemotron-3.5-lightning`, text-only), Qwen3.8 27B (`qwen/qwen3.8-27b`), and Qwen3.8 Omni Flash (`qwen/qwen3.8-omni-flash`). The Qwen models accept images; audio and video are not supported by this example. These models and Mistral GLM-5.3 do not expose an effort selector because model-specific effort values are not documented. Select the provider, enter its API key, and choose the model. Requests go directly to the existing provider endpoint; defaults are unchanged.

### Additional OpenRouter chat options

Select OpenRouter, enter your API key, and choose Solar Mini4
(`upstage/solar-mini4`), MiMo V2.6 Flash (`xiaomi/mimo-v2.6-flash`), or
Apodex 1.1 Mini (Free) (`apodex/apodex-1.1-mini:free`). Existing defaults stay
unchanged. Only MiMo in this group accepts image input. Solar provides effort
levels from `none` through `max`, including `minimal`, and starts at `none`.
All three omit reasoning token budgets; MiMo and Apodex also omit effort fields
and use the provider's reasoning defaults. Apodex uses OpenRouter's free-tier
limits. These choices use the direct `https://openrouter.ai/api/v1/chat/completions`
endpoint without a provider proxy.

### Ling 3.1 Flash on OpenRouter

Select **OpenRouter → Ling 3.1 Flash** and enter your OpenRouter API key.
The explicit, non-default model ID is `inclusionai/ling-3.1-flash`, without a
`:free` suffix. It supports text input; image upload is disabled. The effort
and reasoning-token-budget controls are hidden, and stale values from another
model are omitted. Provider-default reasoning remains enabled; **Include
Reasoning** controls upstream output, not computation, and does not display
reasoning in this example.

The sample sends authenticated JSON directly to
`https://openrouter.ai/api/v1/chat/completions` and parses SSE text deltas.
There is no additional proxy setup. Selection, settings, streaming, and error
recovery are covered by mocked rendered-DOM tests; these do not prove live
inference or browser CORS. The provider can parse tool calls, but does not retain
`reasoning_details` for reasoning-state-preserving multi-turn tool continuations.
See the [model API example](https://openrouter.ai/inclusionai/ling-3.1-flash?view=api)
and the [package limitations](../../README.md#openrouter).

### Pareto 26.10 Preview on OpenRouter

Select **OpenRouter → Pareto 26.10 Preview** and enter your OpenRouter API key.
This explicit preview accepts text and images and may change without notice;
existing defaults stay unchanged. Requests go directly to
`https://openrouter.ai/api/v1/chat/completions` with Bearer authentication.
The sample parses SSE text deltas. Effort and reasoning-token-budget controls
are hidden, and inherited values are omitted. No proxy configuration is needed.
The package supports automatic tool selection, but the sample chat UI does not
configure tools. File/audio/video input and enforced structured output are not
supported. Mocked rendered-DOM tests cover requests, repeated streaming replies,
image input, and HTTP recovery; these do not prove live inference or authenticated
browser CORS. See the [model API example](https://openrouter.ai/unbiased/pareto-26.10-preview?view=api)
and [package usage](../../README.md#openrouter).

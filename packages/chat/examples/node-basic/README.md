# Node.js Chat Examples

This directory contains Node.js examples demonstrating how to use the @aituber-onair/chat package.

**Note**: All examples use default models for optimal cost and performance:
- **OpenAI**: `gpt-5.6-luna`
- **Claude**: `claude-3-haiku-20240307`  
- **Gemini**: `gemini-3.1-flash-lite`

## Prerequisites

1. Build the chat package:
   ```bash
   cd ../../
   npm install
   npm run build
   ```

2. Set up API keys:
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export ANTHROPIC_API_KEY="your-claude-key"
   export GOOGLE_API_KEY="your-gemini-key"
   ```

## Examples

### Basic Usage (`index.js`)
Introduction to the chat package with all three providers.
```bash
node index.js
```

### Provider-Specific Examples

#### OpenAI (`openai-example.js`)
- Default model (gpt-5.6-luna) usage
- o1 series models (reasoning)
- Response format control
- Temperature and creativity settings
```bash
node openai-example.js
```

#### Claude (`claude-example.js`)
- Default model (claude-3-haiku-20240307) usage
- Claude 3 model comparison
- System prompts
- Advanced prompt engineering
```bash
node claude-example.js
```

#### Gemini (`gemini-example.js`)
- Default model (gemini-3.1-flash-lite) usage
- Safety settings
- Generation configuration
```bash
node gemini-example.js
```

#### Sakana AI Fugu (`sakana-example.js`)
Minimal smoke test for the first-class `sakana` provider:
- Uses OpenAI-compatible Chat Completions
- Defaults to `fugu`; also supports the current exact Fugu Ultra ID
  `fugu-ultra-v1.1`
- Uses the smallest working response length presets (`veryShort` for `fugu`,
  `medium` for Fugu Ultra models because smaller presets can leave no visible
  output after orchestration/reasoning)
```bash
export FUGU_API_KEY="xxx..."
node sakana-example.js

# Try another model
FUGU_MODEL="fugu-ultra-v1.1" node sakana-example.js

# Run all supported models with a tiny prompt
node sakana-example.js --all

# Optional custom base URL (defaults to https://api.sakana.ai/v1)
FUGU_BASE_URL="https://api.sakana.ai/v1" node sakana-example.js
```
**Browser note**: The React browser example shows Sakana AI as disabled because
direct browser requests can fail with CORS unless Sakana enables the required
CORS headers for your origin. Run this Node.js example, or use a backend or
serverless proxy for browser apps. If an Ultra model prints no text, increase
the response length preset in `sakana-example.js`; Sakana documents that the
token limit applies only to the final Fugu Ultra response, while orchestration
work uses its own maximum token limit.

#### Sarashina (`sarashina-example.js`)

Run from a protected Node.js/backend environment. The React browser example
keeps providers that cannot be called directly disabled, currently Sakana AI
and Sarashina. Sarashina keys must not be shipped in browser/mobile clients.

```bash
export SARASHINA_API_KEY="your-api-key"
node sarashina-example.js
SARASHINA_MODEL="sarashina3-mini" node sarashina-example.js
SARASHINA_MODEL="sarashina3.2-mini-thinking" node sarashina-example.js --continue
# Optional, thinking model only (default low):
SARASHINA_MODEL="sarashina3.2-mini-thinking" SARASHINA_REASONING_EFFORT="high" node sarashina-example.js
```

Nano is the lightweight conversational default. The thinking example uses the
larger `deep` response budget (5000 tokens), because thinking counts against the
output limit; non-thinking models use `short` (100). `--continue` appends the
returned assistant message including opaque encrypted `reasoning`, without
printing or decoding it. `SARASHINA_BASE_URL` can override the API base URL.
The package clamps explicit output limits to 1–8000 and supports text/streaming/tools,
with no vision. The [official docs](https://docs.sarashina.ai/introduction)
require protected server-side execution. The [service](https://sarashina.ai/) is a
free beta; [terms](https://sarashina.ai/terms) limit eligibility to Japan residents
or Japan-headquartered companies, allow training use of input/output, and describe
training opt-out for paid plans only. Check the current terms before sending data.
No live inference or account-access verification was run for this sample.

### Advanced Features

#### Vision Chat (`vision-example.js`)
Process images with vision-enabled models:
- Local image files
- Base64 encoded images
- Remote image URLs
```bash
node vision-example.js
```

#### Tool Calling (`tool-calling-example.js`)
Demonstrate function calling capabilities:
- Weather lookup example
- Calculator example
- Multiple tool usage
```bash
node tool-calling-example.js
```

#### Streaming (`streaming-example.js`)
Real-time streaming responses:
- Character-by-character output
- Progress indicators
- Stream interruption handling
```bash
node streaming-example.js
```

## Tips

1. **API Keys**: Never hardcode API keys. Use environment variables.
2. **Error Handling**: All examples include proper error handling.
3. **Rate Limits**: Be aware of provider rate limits.
4. **Costs**: Monitor your API usage to control costs.

## Common Issues

- **Module not found**: Make sure to build the chat package first
- **Invalid API key**: Check your environment variables
- **Rate limit errors**: Add delays between requests
- **Network errors**: Check your internet connection and firewall

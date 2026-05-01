# Slack AI Character Bot Example

Minimal Slack example that lets an AI character live in your workspace using
`@aituber-onair/chat` and Slack Socket Mode.

## Prerequisites

1. Build the chat package from the repository root:

   ```bash
   npm -w @aituber-onair/chat run build
   ```

2. Create a Slack app.
3. Enable **Socket Mode** and create an app-level token with
   `connections:write`.
4. Add bot token scopes:
   - `app_mentions:read`
   - `chat:write`
   - `im:history`
   - `im:read`
5. Subscribe to bot events:
   - `app_mention`
   - `message.im`
6. Install the app to your workspace.

## Setup

```bash
cd packages/chat/examples/slack-bot
npm install
```

Set environment variables:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_APP_TOKEN="xapp-your-app-level-token"
export OPENAI_API_KEY="your-openai-api-key"
```

Run the bot:

```bash
npm start
```

By default, the character responds to app mentions in channels and direct
messages. To disable direct-message replies:

```bash
export SLACK_RESPOND_TO_DIRECT_MESSAGES="false"
```

## Character Configuration

The default character speaks Japanese. You can customize the name and profile:

```bash
export BOT_CHARACTER_NAME="ミコ"
export BOT_CHARACTER_PROFILE="明るく少し茶目っ気のあるAIキャラクター。ワークスペースの同僚のように、短く自然な日本語で返事をする。"
```

- `BOT_CHARACTER_NAME`: the character's display name in the prompt
- `BOT_CHARACTER_PROFILE`: personality, speaking style, relationship to users,
  and other character notes
- `BOT_SYSTEM_PROMPT`: full system prompt override. When this is set,
  `BOT_CHARACTER_NAME` and `BOT_CHARACTER_PROFILE` are not used.
- `BOT_HISTORY_LIMIT`: number of recent conversation turns to keep, defaults to
  `12`

## Provider Configuration

The example defaults to OpenAI. You can switch providers with environment
variables:

```bash
export CHAT_PROVIDER="claude"
export ANTHROPIC_API_KEY="your-anthropic-key"
```

Optional variables:

- `CHAT_MODEL`: model name for the selected provider
- `CHAT_API_KEY`: generic API key override
- `CHAT_RESPONSE_LENGTH`: response length preset, defaults to `short`

For OpenAI-compatible endpoints:

```bash
export CHAT_PROVIDER="openai-compatible"
export CHAT_ENDPOINT="http://127.0.0.1:11434/v1/chat/completions"
export CHAT_MODEL="your-model"
export CHAT_API_KEY="dummy-key"
```

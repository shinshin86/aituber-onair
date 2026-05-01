# Discord AI Character Bot Example

Minimal Discord example that lets an AI character live in your server or direct
messages using `@aituber-onair/chat`.

## Prerequisites

1. Build the chat package from the repository root:

   ```bash
   npm -w @aituber-onair/chat run build
   ```

2. Create a Discord application and bot in the Discord Developer Portal.
3. Enable the bot's **Message Content Intent**.
4. Invite the bot to your server with permission to read and send messages.

## Setup

```bash
cd packages/chat/examples/discord-bot
npm install
```

Set environment variables:

```bash
export DISCORD_BOT_TOKEN="your-discord-bot-token"
export OPENAI_API_KEY="your-openai-api-key"
```

Run the bot:

```bash
npm start
```

By default, the character responds to direct messages and server messages that
mention the bot. To respond to every non-bot message in channels where the bot
can read messages, set:

```bash
export DISCORD_RESPOND_TO_ALL="true"
```

## Character Configuration

The default character speaks Japanese. You can customize the name and profile:

```bash
export BOT_CHARACTER_NAME="ミコ"
export BOT_CHARACTER_PROFILE="明るく少し茶目っ気のあるAIキャラクター。配信仲間のように、短く自然な日本語で返事をする。"
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

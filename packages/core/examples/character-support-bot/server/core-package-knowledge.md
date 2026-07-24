# @aituber-onair/core support knowledge

## Scope

`@aituber-onair/core` is the high-level orchestration package for AITuber
OnAir. It combines chat processing, voice synthesis, memory management, tools,
and events into one typed interface. The package is designed for browser and
server JavaScript runtimes.

Applications import public APIs from `@aituber-onair/core`, never from `dist`
internals.

## Installation

```bash
npm install @aituber-onair/core
```

## Basic setup

Create an `AITuberOnAirCore` instance with an API key, chat provider, model,
chat options, and optional voice options.

```ts
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
} from '@aituber-onair/core';

const core = new AITuberOnAirCore({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  chatProvider: 'openai',
  model: 'gpt-4o-mini',
  chatOptions: {
    systemPrompt: 'You are a concise, friendly character.',
  },
  voiceOptions: {
    engineType: 'openai',
    speaker: 'alloy',
    apiKey: process.env.OPENAI_API_KEY,
  },
});

core.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, console.log);
await core.processChat('Hello!');
```

## Main events

- `PROCESSING_START`: a chat or vision request began.
- `PROCESSING_END`: processing finished, including error cleanup.
- `ASSISTANT_PARTIAL`: a streamed text delta arrived.
- `ASSISTANT_RESPONSE`: the complete message and parsed screenplay arrived.
- `ASSISTANT_RESPONSE_TRUNCATED`: the model stopped because of a response
  limit.
- `SPEECH_START`: speech playback is about to begin. Event data contains the
  parsed screenplay emotion and text.
- `SPEECH_END`: speech playback finished.
- `ERROR`: chat, voice, memory, or processing failed.
- `TOOL_USE` and `TOOL_RESULT`: tool-loop activity.
- Memory and chat-history lifecycle events are also available.

Call `offAll()` when an application tears down an instance and no longer wants
event listeners.

## Chat providers

Core delegates provider behavior to `@aituber-onair/chat`. Supported provider
names include `openai`, `openai-compatible`, `claude`, `gemini`,
`gemini-nano`, `openrouter`, `zai`, `xai`, `kimi`, `deepseek`, `mistral`,
`sakana`, and `plamo`.

For `openai-compatible`, pass a full chat-completions URL in
`providerOptions.endpoint`. A model is required; an API key can be empty for
local servers.

```ts
const core = new AITuberOnAirCore({
  apiKey: '',
  chatProvider: 'openai-compatible',
  model: 'local-model',
  providerOptions: {
    endpoint: 'http://127.0.0.1:18080/v1/chat/completions',
  },
  chatOptions: { systemPrompt: 'You are helpful.' },
});
```

## Voice

Core delegates speech to `@aituber-onair/voice`. Voice options support engines
including OpenAI, OpenAI-compatible speech endpoints, VOICEVOX, VOICEPEAK,
AivisSpeech, Aivis Cloud, Gemini TTS, xAI, MiniMax, ElevenLabs, Inworld,
Gradium, Unreal Speech, PiperPlus, Web Speech, and no voice.

The `onPlay` voice callback receives synthesized audio as an `ArrayBuffer`.
Applications can decode those bytes with Web Audio, play them, and analyze
amplitude for lip sync.

For `openaiCompatible`, configure:

- `engineType: 'openaiCompatible'`
- `openAiCompatibleApiUrl`: full `/v1/audio/speech`-style endpoint
- `openAiCompatibleModel`: model expected by the endpoint
- optional `speaker`
- optional `openAiCompatibleSpeed`
- optional `apiKey`
- `onPlay` to control playback

Use `updateVoiceService()` to change voice settings without recreating the
whole core instance. Use `stopSpeech()` to stop queued or active playback.

## Emotion and screenplay

Voice text can begin with an emotion tag such as `[happy]`, `[sad]`, `[angry]`,
`[surprised]`, `[relaxed]`, or `[neutral]`. Core parses the response into a
screenplay object with clean text and an optional emotion. The screenplay is
included in response and speech events, so an avatar can react before audio
playback.

## Speech chunking

`speechChunking` can split a response into smaller playback chunks. It is
disabled by default. Options include `enabled`, `minWords`, `locale`, and
custom separator characters. Supported locale presets include Japanese,
English, Korean, Chinese, and a combined preset.

## Chat history and memory

Use `getChatHistory()`, `setChatHistory()`, and `clearChatHistory()` for
conversation state. Optional memory summarization is configured through
`memoryOptions` and can use an application-provided storage implementation.

## Tools

Pass tool definitions and handlers through the `tools` option. Core executes
the provider tool loop and emits tool-use and tool-result events. The default
maximum number of tool hops is six.

## This example's security boundary

The browser-side core intentionally uses empty credentials and same-origin
OpenAI-compatible proxy endpoints. The local Node server stores LLM and TTS
keys in `server/data/settings.json`, adds credentials to upstream requests, and
returns only masked values from admin GET routes.

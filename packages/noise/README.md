# @aituber-onair/noise

![@aituber-onair/noise logo](./images/aituber-onair-noise.png)

AITuber OnAir Noise is a context-aware response rewrite engine for disturbing
predictable LLM phrasing without changing the meaning of the reply.

Do not let AI responses end in predictable harmony.

It is designed for AI VTubers and AI character streams where a response can feel
too clean, too agreeable, or too neatly summarized. The package detects
predictability, builds rewrite directives, and asks an LLM to rewrite the draft
while preserving the character.

## Basic Usage

```ts
import { createContaminator } from '@aituber-onair/noise';

const contaminator = createContaminator({
  intensity: 0.42,
  mode: 'performer',
  chat: {
    provider: 'openai',
    options: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    },
  },
});

const result = await contaminator.contaminate({
  systemPrompt: 'You are a strange AI VTuber.',
  messages: [{ role: 'user', content: 'Thanks for the stream!' }],
  draft:
    'Thank you for coming today. It was a very fun stream. Please look forward to the next one.',
  seed: 'ending-1',
  constraints: {
    preserveCodeBlocks: true,
    preserveUrls: true,
    preserveNumbers: true,
    maxAddedChars: 120,
  },
});

console.log(result.text);
console.log(result.applied);
console.log(result.quality);
```

## Browser Example

This package includes a browser lab for trying LLM-based rewrites and adaptive
memory providers.

```sh
npm -w @aituber-onair/noise run example:noise-sample
```

## Design

The engine has three layers:

- `scorePredictability()` detects clean summaries, uniform rhythm, generic
  agreement, and over-polished endings.
- `planStains()` chooses a small set of rewrite directives from the current
  context, predictability score, intensity, mode, and memory.
- `rewriteWithStains()` asks an LLM to rewrite the draft while preserving the
  character voice, facts, URLs, numbers, and code.
- `evaluateNoiseQuality()` checks whether the rewrite reduced predictability
  without drifting the character, overdoing the noise, or adding ungrounded
  details.

This package does not depend on any LLM SDK. You can use the built-in
`@aituber-onair/chat` integration for OpenAI, OpenAI-compatible, Gemini, Claude,
OpenRouter, xAI, Kimi, DeepSeek, Mistral, and Gemini Nano providers:

```ts
const contaminator = createContaminator({
  chat: {
    provider: 'claude',
    options: {
      apiKey: process.env.CLAUDE_API_KEY!,
      model: 'claude-3-5-haiku-latest',
    },
  },
});
```

You can also use a custom adapter:

```ts
const contaminator = createContaminator({
  model: {
    async generate({ system, prompt }) {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        body: JSON.stringify({ system, prompt }),
      });
      const json = await response.json();
      return json.text;
    },
  },
});
```

If none of `chat`, `llm`, or `model` is provided, `contaminate()` throws. Noise
no longer falls back to local rule-based rewriting because that can change a
character's personality too easily.

## Safety

By default, code blocks, URLs, and numbers are protected before rewriting and
restored after rewriting. The safety guard also avoids mutating high-stakes
medical, legal, and financial text.

The purpose of this package is not to make the AI more human or to break facts.
It only disturbs the way a reply lands when it is becoming too predictable.

## Quality Report

Every rewrite returns a `quality` report:

```ts
if (!result.quality.passed) {
  console.warn(result.quality.issues);
}
```

The report is intentionally conservative. It flags outputs that are still too
predictable, too aggressive for the character, over-explain the noise, or add
details that were not present in the draft or recent conversation.

## Adaptive Memory

Noise can keep a small memory of predictable response patterns. The memory does
not store the full conversation by default. It tracks repeated closings,
repeated phrases, recently used rewrite directives, and topic-level loops so
later plans can avoid collapsing into the same style of rewrite.

The root package exports an environment-independent in-memory store:

```ts
import {
  InMemoryNoiseMemoryStore,
  createContaminator,
} from '@aituber-onair/noise';

const store = new InMemoryNoiseMemoryStore();

const contaminator = createContaminator({
  memory: {
    scopeId: 'stream-session',
    store,
  },
});
```

For browsers, import the web provider:

```ts
import { LocalStorageNoiseMemoryStore } from '@aituber-onair/noise/web';

const store = new LocalStorageNoiseMemoryStore();
```

For Node.js, import the node provider:

```ts
import { JsonFileNoiseMemoryStore } from '@aituber-onair/noise/node';

const store = new JsonFileNoiseMemoryStore({
  filePath: './noise-memory.json',
});
```

`detectNoiseRuntime()` can detect `browser`, `node`, or `unknown`, but the
recommended production style is to import `@aituber-onair/noise/web` or
`@aituber-onair/noise/node` explicitly. This keeps browser bundles from pulling
in Node.js modules.

## Streaming

`createContaminationStream()` uses the Web-standard `TransformStream` API. The
current MVP buffers the full text and contaminates it on flush so the engine can
rewrite with enough context.

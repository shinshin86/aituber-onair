# @aituber-onair/noise

![@aituber-onair/noise logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/noise/images/aituber-onair-noise.png)

AITuber OnAir Noise is a context-aware response rewrite engine for disturbing
predictable LLM phrasing without changing the meaning of the reply.

Do not let AI responses end in predictable harmony.

It is designed for AI VTubers and AI character streams where a response can feel
too clean, too agreeable, or too neatly summarized. The package detects
predictability, builds structured friction parameters, asks an LLM for multiple
rewrite candidates, and selects the candidate that best preserves the character
while avoiding a predictable landing.

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
  streamContext: {
    currentSituation: 'The stream is ending too neatly.',
  },
  seed: 'ending-1',
  constraints: {
    preserveCodeBlocks: true,
    preserveUrls: true,
    preserveNumbers: true,
    maxAddedChars: 120,
  },
});

console.log(result.text);
console.log(result.diagnosis);
console.log(result.plan);
console.log(result.applied);
console.log(result.quality);
```

## Conditional Usage

Noise does not have to run on every LLM reply. In a production stream, a common
pattern is to diagnose the draft first, then rewrite only when the response is
likely to land too safely:

```ts
import {
  createContextFingerprint,
  createContaminator,
  diagnosePredictability,
} from '@aituber-onair/noise';

const context = createContextFingerprint({
  systemPrompt,
  messages,
  streamContext,
});
const diagnosis = diagnosePredictability({
  draft: llmReply,
  context,
});
const shouldUseNoise = diagnosis.score >= 0.45;

const finalReply = shouldUseNoise
  ? (
      await contaminator.contaminate({
        systemPrompt,
        messages,
        draft: llmReply,
        streamContext,
      })
    ).text
  : llmReply;
```

This makes Noise behave like a post-generation effect: use it for overly safe
closings, repeated phrasing, forced positivity, and stream situations where a
flat response would weaken the character. Skip it for precise announcements,
system messages, and high-stakes text.

## Browser Example

This package includes a browser lab for trying LLM-based rewrites and adaptive
memory providers.

```sh
npm -w @aituber-onair/noise run example:noise-sample
```

## Rewrite Modes

`mode` controls how far Noise may move the response away from a predictable
landing:

- `subtle`: small edits that remove obvious polish.
- `performer`: character-safe live-stream phrasing.
- `bold`: stronger streamer judgment and clearer live tension.
- `inversion`: reverses the expected emotional landing while preserving facts.
- `chaotic`: the largest coherent disruption, with self-repair and unfinished
  edges.

## Design

Noise works after an LLM has already produced a draft. It is independent from
conversation-loop detectors such as `@aituber-onair/manneri`: those tools can
watch the conversation flow before generation, while Noise watches the response
landing after generation.

The engine has six steps:

- `createContextFingerprint()` reads the persona, recent messages, and optional
  `streamContext`.
- `diagnosePredictability()` classifies why the draft feels too safe, generic,
  or over-polished.
- `buildInterventionPlan()` and `buildFrictionParameters()` turn that diagnosis
  into structured instructions such as grounding in recent comments, reducing
  over-apology, or adding streamer judgment.
- `generateRewriteCandidates()` asks an LLM for multiple candidates from those
  structured parameters.
- `evaluateRewriteCandidates()` checks predictability reduction, context
  grounding, specificity, persona preservation, meaning preservation,
  aggression risk, and ungrounded detail risk.
- `selectBestCandidate()` returns the strongest safe candidate.

Noise does not import or depend on Manneri. If an app has external knowledge
about the stream, pass it as plain `streamContext`; Noise treats it as ordinary
runtime context, not as a package-specific integration.

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

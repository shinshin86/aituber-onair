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

Noise is not just a rewrite engine: it is a deviation orchestration engine.
Research across conversation analysis, improv theory, humor theory, and field
analysis of successful AI VTubers converges on one formula (see
`docs/design-research.md`):

> Pleasant unpredictability = (established pattern) x (deviation shipped with a
> simultaneous "this is play" marker) x (safe target) x (relational license) x
> (return to pattern). Remove any factor and the same output flips from charm
> to malfunction.

So in addition to rewriting, Noise schedules when deviation is allowed
(rhythm), decides how much deviation the relationship has earned
(relationship capital), refuses to disturb sincere moments (sincerity gate),
certifies teasing as play (play markers), reuses shared memories as running
gags (gag ledger), and learns from audience reactions (reaction loop).

## Why this exists

LLMs are trained on the average of a huge amount of text, and preference tuning
(RLHF) pushes them further toward replies that are safe, agreeable, and neatly
summarized. That is fine for an assistant, but for an AI character stream it
produces **predictable harmony** (予定調和): the same temperature every time, a
tidy closing every time, and an audience that gets bored. Human conversation is
engaging precisely because it does *not* go to plan — a retort, a pause, a
deliberately withheld reaction, a callback to an old joke.

The hard part is **not** generating disruption — an LLM can do that. The hard
part is that whether a broken expectation reads as *charm* or as *malfunction*
does not live in the text; it lives in the receiver. The same blunt line is
"endearing gap" from a beloved regular character and "rude" from a stranger.
So Noise is less a text generator and more a controller: it manages **when, how
far, and toward whom** a reply may deviate, and learns from how the audience
reacts.

## How it works (one turn)

After the LLM produces a draft reply, Noise runs this pipeline (the same one the
browser sample visualizes under "ノイズの判断を見る"):

1. **Diagnose** — is this draft too predictable? Detect clean closings,
   over-apology, over-agreement, etc., and score it.
2. **Three gates — may we disrupt at all?**
   - **Sincerity gate**: if the viewer is making a serious or vulnerable bid,
     stop everything (failed uptake of a sincere moment is the worst violation).
   - **Relationship capital**: unlock stronger interventions (teasing, callbacks)
     only as the bond grows.
   - **Rhythm**: rest right after a disruption, because constant disruption
     becomes a new predictable style.
3. **Plan** — choose which interventions to use, limited to what the gates allow.
4. **Generate & score candidates** — ask the LLM for several rewrites and score
   them on predictability reduction, character preservation, genericity, and
   whether a play marker is present.
5. **Select & quality-check** — pick the strongest safe candidate; reject
   over-corrections.
6. **Learn** — record what was actually applied; later `reportReaction()` feeds
   the audience response back, raising or lowering how far Noise will push next
   time and promoting well-received moments into the gag ledger.

In short: **keep the character's "form", choreograph when and how far to break
it, and always return to form.** The laughter-flavored reaction signals are not
there to make the AI tell jokes — they are the sensor that measures whether a
deviation (a bet) actually paid off.

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

## Deviation Orchestration

### Rhythm: platform -> tilt -> platform

A deviation only reads as an event against a stretch of normal, in-character
turns. The built-in rhythm controller skips noise right after a tilt
(cooldown) and can require platform turns before tilting:

```ts
const contaminator = createContaminator({
  rhythm: {
    minPlatformTurns: 2, // in-character turns required before a tilt
    cooldownTurns: 2, // in-character turns enforced after a tilt
    tiltThreshold: 0.45, // diagnosis score needed to tilt
    forcedTiltAfter: 8, // tilt anyway after this many flat turns
  },
});
```

When a turn is skipped, `contaminate()` returns the draft unchanged with
`result.skipped` describing why (`'cooldown'`, `'platform'`,
`'low_predictability'`, `'repair'`, or `'sincerity'`). Pass
`forceTilt: true` in the input to bypass the rhythm gate.

### Relationship capital

The same tease that charms an established audience alienates a new one. Pass
`relationshipCapital` (0-1) per call — derived from any bond system, for
example kizuna points — and Noise caps both the effective mode and the
intervention vocabulary:

- `stranger` (< 0.25): phrasing-level edits only (`subtle`).
- `acquaintance` (< 0.55): + soft disagreement, dispreferred shape, length
  violation (`performer`).
- `regular` (< 0.8): + contrarian reframe, callbacks, boke bait, status
  seesaw (`inversion`).
- `companion` (>= 0.8): + tsukkomi, withheld uptake (`chaotic`).

```ts
const result = await contaminator.contaminate({
  systemPrompt,
  messages,
  draft,
  relationshipCapital: 0.7,
});
console.log(result.gates.relationship.tier); // 'regular'
```

### Sincerity gate

When recent user messages carry a sincere bid — distress, a serious
consultation, a heavy life event — all noise is suppressed before any other
processing. Failed uptake of a sincere moment is the worst possible violation.
Disable with `sincerityGate: false` if the app handles this elsewhere.

### Play markers

Benign violation theory: a violation must be decoded as play at the same
moment it lands. Teasing-class interventions (`tsukkomi`, `withheld_uptake`,
`boke_bait`, `status_seesaw`, `contrarian_reframe`) require a playful marker
(laughter token, exaggeration, self-tease) in the same reply; candidates
without one are penalized and flagged with a `missing_play_marker` issue.

### Gag ledger and callbacks

Callbacks — resurfacing a shared past moment — are the highest-value,
lowest-risk surprise: they are unexpected and prove memory at the same time.

```ts
await contaminator.recordMoment({
  summary: 'The viewer exploded a pudding in the fridge',
  source: 'user',
});
// Later turns may plan a `callback` intervention with that moment as material.
```

Moments are also promoted automatically when a tilt gets a positive reaction.

### Reaction loop

Every deviation is a bet; feed the observed result back:

```ts
const reaction = await contaminator.reportReaction({ signal: 'laughter' });
// 'laughter' | 'positive' | 'neutral' | 'silence' | 'pushback' | 'discomfort'
```

Positive signals widen the violation budget and promote the latest tilt into
the gag ledger. Negative signals shrink the budget and schedule repair turns
during which noise stays off. Subscribe to lifecycle events via
`onNoiseEvent` (`tilt_applied`, `noise_skipped`, `repair_advised`,
`moment_recorded`, `callback_used`) to let the app stage reactions — solo AI
chaos is nonsense, chaos with a visible reactor is comedy.

### Positioning: why the vocabulary sounds like comedy

Noise is **not** a library for making an AI character do comedy. The goal is
unchanged: keep LLM replies from converging to the safe, average landing. The
comedy-flavored vocabulary (reactions like "it got laughs", boke/tsukkomi
interventions, the gag ledger) exists for three structural reasons:

1. **Every deviation is a bet, and the payoff lives in the audience.**
   Whether a broken expectation reads as charm or as malfunction is not a
   property of the text — expectancy violations theory shows it is decided by
   the receiver's appraisal. An engine that injects deviation without
   observing reception is an open-loop controller: it cannot know whether to
   push further or pull back. `reportReaction()` is that sensor, and the
   violation budget is the feedback loop. The API signals themselves are
   neutral (`laughter` / `positive` / `silence` / `pushback` / `discomfort`).
2. **Humor research is borrowed as measurement science, not as a goal.**
   The most developed body of knowledge about when a norm violation lands as
   *pleasure* instead of offense is humor theory (benign violation theory,
   boke/tsukkomi as a grammar for certifying deviation as play). Noise uses
   it to keep deviations safe, the same way it uses conversation analysis for
   response shapes — neither makes the output a joke.
3. **In a live stream, laughter is the most observable proxy for "the
   deviation was accepted."** You cannot directly measure "the audience
   appraised the violation positively", but you can literally count 草 and w
   in chat. That is why the browser lab labels its reaction buttons in
   streamer terms (ウケた / スベった): it is the sample's translation into
   its own context, not the library's purpose. Likewise the gag ledger is at
   heart a *shared-memory callback* device — resurfacing a moment the
   audience lived through proves memory and deepens the relationship; being
   funny is optional.

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

The engine pipeline:

- `createContextFingerprint()` reads the persona, recent messages, and optional
  `streamContext`.
- `diagnosePredictability()` classifies why the draft feels too safe, generic,
  or over-polished.
- `assessSincerity()`, `resolveRelationshipTier()`, and `decideRhythm()` gate
  whether this turn may deviate at all, and how far.
- `buildInterventionPlan()` and `buildFrictionParameters()` turn the diagnosis
  into structured instructions such as grounding in recent comments, reducing
  over-apology, adding streamer judgment, dispreferred response shape,
  boke/tsukkomi moves, status seesaw, or a callback from the gag ledger.
- `generateRewriteCandidates()` asks an LLM for multiple candidates from those
  structured parameters, each with a self-reported typicality so selection can
  prefer the distribution tail.
- `evaluateRewriteCandidates()` checks predictability reduction, context
  grounding, specificity, persona preservation, meaning preservation,
  aggression risk, ungrounded detail risk, genericity (stock phrases and
  near-repeats of the character's own recent outputs), play markers, and
  whether the final sentence — the highest-value surprise position — actually
  changed.
- `selectBestCandidate()` returns the strongest safe candidate.

The full intervention vocabulary:

| Intervention | What it does |
| --- | --- |
| `ground_in_recent_comment` | Reference something a viewer actually said |
| `add_streamer_judgment` | Make a streamer-side decision |
| `soft_disagreement` | Replace clean agreement with a warm reservation |
| `contrarian_reframe` | Reverse the expected emotional landing |
| `self_repair` | Live-speech self-correction mid-flow |
| `unfinished_margin` | Leave the final thought slightly open |
| `reduce_over_apology` | Drop service-style apology tone |
| `reduce_over_agreement` | Weaken automatic acceptance |
| `increase_specificity` | Add a concrete anchor |
| `acknowledge_tension` | Name the visible trouble |
| `break_clean_closing` | Avoid a tidy goodbye |
| `callback` | Resurface a gag-ledger moment as a running gag |
| `dispreferred_shape` | Human-shaped hedged/grudging (dis)agreement |
| `boke_bait` | Plant a correctable absurdity inviting the audience retort |
| `tsukkomi` | Sharp but clearly playful retort to the absurd part |
| `withheld_uptake` | Deadpan past the expected reaction once |
| `status_seesaw` | Brief confident stance, immediately self-mocked |
| `response_length_violation` | Strikingly short reply where a paragraph was expected |

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
repeated phrases, the character's own recent responses (for the genericity
penalty), recently used rewrite directives, and topic-level loops so later
plans can avoid collapsing into the same style of rewrite. It also persists the
deviation orchestration state: the rhythm counters, the violation budget
learned from reactions, and the gag ledger of memorable moments.

Without a configured store, the same state still works in-memory for the
lifetime of the contaminator instance, so the rhythm controller and reaction
loop function out of the box.

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

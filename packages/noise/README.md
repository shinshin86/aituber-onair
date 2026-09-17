# @aituber-onair/noise

![@aituber-onair/noise logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/noise/images/aituber-onair-noise.png)

AITuber OnAir Noise is a context-aware response rewrite engine for disturbing
predictable LLM phrasing without changing the meaning of the reply.

The optional neural response adapter also permits changes in meaning, while
keeping a recognizable character and a coherent conversation.
For real wiring, follow the [dataset setup guide](#malecns-setup).

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

By default `tiltThreshold` is `0.35`, so drafts that already land naturally
are left untouched out of the box; set it to `0` to make every turn eligible.

When a turn is skipped, `contaminate()` returns the draft unchanged with
`result.skipped` describing why (`'cooldown'`, `'platform'`,
`'low_predictability'`, `'repair'`, `'sincerity'`,
`'no_licensed_intervention'`, `'model_error'`, or `'quality_fail'`). Pass
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

With `@aituber-onair/kizuna` the mapping is one line — normalize the user's
points into 0-1:

```ts
const user = await kizuna.getUser(userId);
const relationshipCapital = Math.min(1, (user?.points ?? 0) / 1000);
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

In a live stream the reaction is directly observable in chat, so you can infer
the signal instead of hand-labelling it. Pass the output's `turnId` back so a
late reaction can only promote the tilt it belongs to:

```ts
import { inferReactionFromComments } from '@aituber-onair/noise';

const output = await contaminator.contaminate({ ... });
// ...collect the comments that arrived in the next few seconds...
await contaminator.reportReaction({
  ...inferReactionFromComments(commentsAfterTilt),
  turnId: output.turnId,
});
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

## Failure Handling

Noise is a post-generation effect: losing a rewrite is acceptable on a live
stream, losing the reply is not. `contaminate()` therefore never throws on
rewrite-model failures — any model error returns the draft unchanged with
`skipped.reason === 'model_error'`, and malformed/truncated candidate JSON
falls back to the draft instead of shipping raw model output. Two options
tighten this further:

```ts
const contaminator = createContaminator({
  // Abort a hanging rewrite call and return the draft.
  modelTimeoutMs: 4000,
  // If every candidate fails the quality report, return the draft
  // (skipped.reason === 'quality_fail') instead of the failing rewrite.
  fallbackToDraftOnQualityFail: true,
});
```

Protected spans (code blocks, URLs, numbers) are replaced with placeholder
tokens before the rewrite; the model is instructed to keep them verbatim, and
any candidate that drops or mangles one degrades to the draft.

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

## Custom Lexicon

The built-in detection vocabulary only knows generic assistant phrasing. A
character's own catchphrases, habitual closings, and play-marker style are
app-specific knowledge — pass them as a lexicon (case-insensitive substring
matching):

```ts
const contaminator = createContaminator({
  lexicon: {
    // Counts as predictable wording during diagnosis.
    predictablePhrases: ['それでは今日のまとめコーナー'],
    // Counts as generic stock replies for the genericity penalty.
    stockReplies: ['ナイスファイトです'],
    // Accepted as "this is play" markers for teasing-class interventions.
    playMarkers: ['にゃはは'],
  },
});
```

The same option is accepted by the standalone `scorePredictability()`,
`diagnosePredictability()`, `scoreGenericity()`, `hasPlayMarker()`, and
`evaluateRewriteCandidates()` functions. The adaptive memory complements this
at runtime: closings and phrases the character actually repeats are learned
and fed back into the diagnosis automatically.

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

The package ships dual ESM (`dist/esm`) and CommonJS (`dist/cjs`) builds, so
both `import` and `require` work in Node.js.

## Streaming

`createContaminationStream()` uses the Web-standard `TransformStream` API. The
current MVP buffers the full text and contaminates it on flush so the engine can
rewrite with enough context.

## Experimental neural modulation

`createVirtualNoiseBrain()` generates a small deterministic reservoir locally.
It is the default backend when opting into the brain feature; omitting
`modulator` keeps existing Noise behavior. There is no dataset download during
installation or normal startup.

```ts
import { createContaminator, createVirtualNoiseBrain } from '@aituber-onair/noise';

const brain = createVirtualNoiseBrain({ seed: 42 });
const contaminator = createContaminator({
  model, // Your existing RewriteModel
  modulator: brain,
  fallbackToDraftOnQualityFail: true,
});
```

The virtual backend defaults to 1,024 neurons, 16 outgoing connections per
neuron, and 24 simulation steps of 1 ms. It uses a seeded random graph with
80% excitatory / 20% inhibitory source neurons. These are artificial design
choices, not a reconstruction of a fly. Its graph arrays occupy 143,380 bytes;
state arrays require additional memory. Optional `neurons`,
`connectionsPerNeuron`, `steps`, and `dtMs` configure the experiment.

Both backends reset every turn. Six neutral stimulus channels encode existing
energy, tension, repetition, predictability, volatility, and viewer-intent
signals without another LLM call. A discrete leaky integrate-and-fire model
uses a 20 ms leak constant, threshold 1, 2 ms refractory period, one-step
synaptic delay, gain 4, and pulses every four steps. Only spiking neurons visit
outgoing edges; neuron state is scanned every step. There is no learning.

Readout includes global activity, descending-population activity (an artificial
readout quarter in the virtual backend), side balance, dispersion, and four
seeded signed projections of readout spike counts. Hand-designed mappings
bias contrarian reframing, self-repair/unfinished margins, playful interventions,
and persona volatility. Neither input nor output semantics are biological
claims. The fly does not understand language, praise, or insults.

Modulation runs only after sincerity/rhythm gates and an initial licensed plan.
The relationship allowlist still applies before biased selection. Intensity
multipliers are limited to 0.75–1.25, intervention biases to ±0.25, and persona
deltas to ±0.20; final values remain within 0–1. Non-finite controls become
neutral, and rejected or malformed modulation falls back to the original plan.
Existing protected-span and quality behavior remains intact. Set
`fallbackToDraftOnQualityFail: true` to reject failed rewrites; modulation does
not override this existing application setting. `output.modulation` exposes
bounded controls and a small activity summary, including on later model/quality
failures. The default asynchronous modulator deadline is 1,000 ms
(`modulatorTimeoutMs`); a timer cannot interrupt synchronous CPU work.

### Optional MaleCNS v1.0 backend

The MaleCNS connectome driven experimental reservoir uses the actual retained
wiring graph. It is an approximate point-neuron simulation, not an accurate
digital reconstruction of a living fly. The graph is **not bundled in npm**.

<a id="malecns-setup"></a>

#### Set up real wiring

Skip this setup for the virtual circuit. For real wiring, download the official
source files and convert them with the repository's preparation script. The
script and CLI/WebUI examples are not included in the npm package; use a checkout
of this GitHub repository.

**1. Prepare the repository**

Requires Node.js 20+, npm and Git. For a new checkout, run the following commands.
For an existing checkout, start at `npm ci` from its root directory.

```sh
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair
npm ci
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/noise run build
```

**2. Download and convert**

Continue from the repository root:

```sh
npm -w @aituber-onair/noise run malecns:prepare -- \
  --source data/malecns-source --out data/malecns-v1 --download
```

`--download` fetches missing source files from the official MaleCNS Google Cloud
Storage bucket, then converts them. Dataset files are not downloaded from this
repository, during npm installation, or when starting the virtual circuit.

Workspace command paths resolve from `packages/noise`. Sources are stored in
`packages/noise/data/malecns-source`; converted data goes to
`packages/noise/data/malecns-v1`. Wiring alone occupies approximately 207 MB;
source files, positions and annotations require additional disk space.

If the official source files are already in the `--source` directory, omit
`--download`. The output directory must not exist. After a failed attempt, retry
with a different output such as `--out data/malecns-v1-retry`.

Successful preparation prints a JSON summary and writes `manifest.json` last.
The output directory contains:

| File | Purpose |
| --- | --- |
| `manifest.json` | Version, counts, hashes and conversion settings |
| `graph.bin` | Wiring loaded by Noise |
| `metadata.json` | Neuron annotations for the WebUI |
| `soma-positions.f32` | Soma positions for the WebUI |
| `ATTRIBUTION.txt` | Source credits, license name and modification notice |

**3. Check loading**

This command loads the real graph and runs the circuit without an LLM call.
Its text output is a plumbing check, not a language-quality comparison.

```sh
MALECNS_DATA_DIR=./packages/noise/data/malecns-v1 \
  node packages/noise/scripts/brain-example.mjs
```

For this direct `node` command, paths resolve from the repository root. Without
`MALECNS_DATA_DIR`, the script uses the virtual circuit.

**4. Use the WebUI or CLI**

```sh
npm -w @aituber-onair/noise run example:brain-chat
```

Open `http://127.0.0.1:5183`, open **設定**, and select
**ハエの脳の実データ（MaleCNS）**. Keep `/brain-data/manifest.json` as the data URL,
then click **選んだ脳で会話を始め直す**. Use **動きを試す** to inspect activity without
an API key. For real chat, select a provider/model and enter any required API key
in the same settings dialog.

To use data prepared elsewhere, set the directory at startup. With this npm
workspace command, relative paths resolve from `packages/noise`:

```sh
MALECNS_DATA_DIR=./data/malecns-v1-retry \
  npm -w @aituber-onair/noise run example:brain-chat
```

For real responses through the Codex SDK, follow the
[CLI connection instructions](examples/neural-rewrite-cli/README.md#run-with-codex-sdk).
Install the SDK separately and select real wiring with `MALECNS_DATA_DIR`.
See the [WebUI README](examples/noise-brain-chat/README.md) for hosting and controls.

In your own Node.js application, place the converted directory where the app can
read it and pass that path to `loadMaleCnsNoiseBrain({ dataDir })` as shown below.
The original Feather files are not needed at runtime.

**Hosting and redistribution**

The data is provided by [MaleCNS](https://male-cns.janelia.org/) under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Include `ATTRIBUTION.txt`
when distributing converted data, and retain source credits, a license link and
an explanation of the modifications. A hosted app should make these available
in its data information or credits. The local development server serves the four
data files above, not `ATTRIBUTION.txt`.

#### Conversion and loading details

Preparation uses Apache Arrow 21.2 and an LZ4 decoder, installed by `npm ci` above.
It scans Feather connectivity batches twice without creating a JavaScript object
per edge. Optional `--signs signs.json` replaces the transmitter-sign table;
unknown names always have sign zero.

Retained entries have non-empty `superclass`, excluding glia. All connections
between retained entries remain, including self-connections and zero-effective
weights, without a synapse threshold. Preparation requires exactly 166,700
neurons and 25,582,938 directed edges for this release. Changes fail validation.
`consensus_nt` supplies the transmitter: acetylcholine is positive; GABA,
glutamate, and histamine are negative; modulators and unknown transmitters
have no fast effect. Signed weights are divided by the target's incoming
absolute signed strength. This is a configurable simulation assumption,
not a universal description of neurotransmitter effects.

The six input channels deterministically partition annotated LC4, LPLC2,
LPLC1, and LC10a populations. These channel assignments have no claimed
conversational or sensory equivalence. Descending neurons are identified by
`superclass === 'descending_neuron'`.

```ts
import { loadMaleCnsNoiseBrain } from '@aituber-onair/noise/node';

const brain = await loadMaleCnsNoiseBrain({
  dataDir: './packages/noise/data/malecns-v1',
  seed: 42,
});
// Pass brain as createContaminator({ model, modulator: brain }).
```

Runtime verifies the manifest's version/counts and the graph SHA-256 before
validating the graph layout. The manifest records source hashes, preprocessing
options, and generation date. Use a trusted manifest: a hash is an integrity
check, not authentication of its publisher.

### Browser deployment and workers

Developers prepare/download the files in advance and host `manifest.json` and
`graph.bin` at an explicitly configured application URL. A GitHub Release can
distribute prepared files to developers; this prototype does not publish a
Release or silently fetch one. Serving a file near the application still
requires the browser to transfer it when loaded. Keep the virtual backend as
the normal experience and make the large backend an explicit application choice.

For CPU isolation, create a module Worker using your application's bundler.
The package ships no preconfigured worker URL or automatic dataset URL.

```ts
// brain.worker.ts: bind immediately so requests can wait for initialization.
import { exposeNoiseBrainWorker, loadMaleCnsNoiseBrain } from '@aituber-onair/noise/web';
exposeNoiseBrainWorker(self, loadMaleCnsNoiseBrain({
  manifestUrl: '/data/malecns-v1/manifest.json',
}));
// For the small backend use createVirtualNoiseBrain() instead.
```

```ts
// Application: a larger initial deadline accommodates loading the large graph.
import { createWorkerNoiseModulator } from '@aituber-onair/noise/web';
const worker = new Worker(new URL('./brain.worker.ts', import.meta.url), {
  type: 'module',
});
const modulator = createWorkerNoiseModulator(worker, 30_000);
const contaminator = createContaminator({
  model, modulator, modulatorTimeoutMs: 31_000,
  fallbackToDraftOnQualityFail: true,
});
// Call modulator.dispose() when the application no longer needs the worker.
```

Worker failures/timeouts reject pending requests and timeouts terminate the
worker. Later calls fail immediately so Noise can continue without modulation.
Recreate the worker to retry. The built-in protocol returns small modulation
summaries only; per-neuron visualization snapshots need an application-specific
message in the worker. HTTPS or localhost is needed for Web Crypto verification.
No SharedArrayBuffer or cross-origin-isolation headers are required.

### Activity inspection, data layout, and validation

`brain.getActivitySnapshot()` returns a detached `Uint32Array` of last-turn spike
counts; `brain.getBodyIds()` returns corresponding IDs. Snapshots are created
only on request. These are simulated activity counts, not proof of a neuron's
causal role. The virtual backend's IDs are synthetic.

Prepared files include optional `metadata.json` and `soma-positions.f32` for
future visualization. The latter stores XYZ Float32 soma locations in MaleCNS
EM voxel coordinates (8 nm), with NaN for absent positions. It adds 2,000,400
bytes; neither file is loaded by the simulation. A point view can join IDs to
these positions, but detailed neuron branches, brain meshes, a fly body,
and animated movement require additional geometry and rendering. This package
does not include a renderer or NeuroMechFly.

`graph.bin` uses little-endian 32-bit values: magic `0x3142524e`, format version
1, neuron count, edge count; then offsets (N+1), body IDs (N), flags (N), targets
(E), Float32 weights (E). Flags contain descending membership (bit 0), left
(bit 1), right (bit 2), and neutral input channel (bits 8–15; 255 means none).
The complete retained graph is 206,663,924 bytes, before optional metadata.

```sh
npm -w @aituber-onair/noise run example:brain
# After building, optionally validate/load and exercise the actual dataset:
MALECNS_DATA_DIR=./packages/noise/data/malecns-v1 \
  node packages/noise/scripts/brain-example.mjs
```

The example compares plans with and without a brain and reports loading time,
simulation time, activity, and process memory. Its offline rewrite stub returns
the draft; this verifies plumbing, not improved language quality. Real data is
never required by CI. Tests use a synthetic graph with the same binary layout.
TypeScript is the initial numerical backend; no Wasm artifact or native build
is required. Backend interfaces keep a future kernel replacement possible.

Data attribution: [MaleCNS project](https://male-cns.janelia.org/), FlyEM
(HHMI Janelia), University of Cambridge, MRC Laboratory of Molecular Biology,
and Google Research. The dataset is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Prepared output includes attribution and describes the transformation.
This simulator is independently implemented; no code from other fly simulators
is copied.

### Chat and neural activity sample

```sh
npm -w @aituber-onair/noise run example:brain-chat
```

Select a provider and model through `@aituber-onair/chat`, compare the draft and Noise response,
and replay recorded neural activity. Switch between virtual and prepared
MaleCNS backends, then inspect IDs, annotations, and spike counts.
The sample opts into `captureActivity: true` and `brain.getActivityTrace()`;
normal consumers do not need temporal recording. See the
[sample README](./examples/noise-brain-chat/README.md) for connection settings,
data hosting, visualization semantics, and the offline demonstration mode.

See the [neural rewrite CLI](./examples/neural-rewrite-cli/README.md) for repeated
Codex SDK evaluations of the same composition pipeline.

### State-driven neural responses

```ts
import { createContaminator, createVirtualNoiseBrain,
  createNeuralReactionModel, createChatRewriteModel } from '@aituber-onair/noise';

const brain = createVirtualNoiseBrain({
  seed: 42, steps: 32, captureReadout: true, retainState: true,
});
const noise = createContaminator({
  model: createNeuralReactionModel({
    brain,
    model: createChatRewriteModel({ service: chatService }),
    onTrace: (trace) => console.log(trace.state),
  }),
  mode: 'chaotic',
  intensity: 0.9,
  relationshipCapital: 0.8,
  quality: { minLengthRatio: 0.8, maxLengthRatio: 1.1 },
  fallbackToDraftOnQualityFail: true,
});
```

`chatService` is a configured AITuber OnAir Chat service. An encoder classifies six
stimulus channels from the incoming conversation. Code splits the original into
lossless clauses and binds each clause to a balanced readout-population projection
using a fixed hash. Actual spikes produce separate early/late attention weights
over those clauses. The writer receives the original, persona and these weights.
The binding is artificial, not learned semantics or fly language. Different
wording can bind different cells; no random writing-style selector is used.

The original is a starting point: meaning, conclusion, momentary feelings and
immediate intentions may change, and source details may be omitted. Preserve a
recognizable character and a coherent connection to the conversation. Do not invent
past events or external facts. Protected numbers, URLs and code remain intact. The adapter opts
into `shift_attention` planning while sincerity, relationship and rhythm gates
remain. Restored length is limited to 0.8–1.1 times the original. The successful
path uses three model calls: classification, speech, coherence/character/attention audit.
Two candidates are audited in order, with one speech retry at most (seven calls),
then fallback. Weak attention also returns the original as `neural_unfocused`.
Model checks cannot establish corpus diversity or neural causality.

`retainState: true` preserves membrane and pending synaptic state across turns, with
an 8 ms simulated quiet interval; it does not track wall-clock time. Use a separate
instance per conversation and call `brain.reset()` to start over. The default false
retains the original per-turn reset behavior. `onTrace` reports stimuli, source
clauses (`facts`/`anchors`), `attention`, spike summaries, proposed texts and rejection
reasons. Legacy `state` is diagnostic and no longer controls speech. Final acceptance belongs to `output.text`
and `output.rewriteTrace`; core quality checks may still reject a generated response.

`captureReadout: true` is required and stores small temporal summaries without full
visualization frames. Custom modulators must accept `readoutKeys` and return aligned
`contentKeys` and per-frame `contentAxes`; missing readouts fall back to the draft.
Pass the same options to the real-wiring loader when using prepared data. Wiring is
never sent to the LLM. This is opt-in; ordinary Noise behavior is unchanged.
See the [CLI sample](examples/neural-rewrite-cli/README.md) for execution and evaluation.

### Experimental neural working memory

`createNeuralWorkingMemory` recalls source conversation episodes through a small
stateful spiking circuit. The caller provides embeddings and passes the recalled
messages to any language model. This path generates a response from recalled
context without rewriting a draft or sending style controls. It changes model
input, not hidden activations; conversation quality and an advantage over ordinary
retrieval are not established. It is a separate opt-in virtual circuit, with no
automatic model or wiring downloads.

See the [working-memory CLI](examples/neural-memory-cli/README.md) for the input
format, state lifecycle, provider integration and limitations.

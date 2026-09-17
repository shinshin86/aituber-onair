# Neural working memory CLI (experimental)

This sample uses a stateful circuit to recall earlier conversation episodes before
generating a reply. It makes one ordinary chat call per turn. The model receives
the character's system message, selected source exchanges, and the current
conversation. There is no draft, rewrite request, style selection, or numerical
neural-state instruction in that call.

The library is independent of the language model. The CLI uses AITuber OnAir Chat's
Codex SDK provider; an application can pass the selected messages to its preferred
chat provider. This changes the context available to the model. It does not access
or modify the model's hidden activations.

## Run

Requires Node.js 20+, repository dependencies and a separately installed SDK:

```sh
npm ci
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/noise run build
npm install --prefix /path/to/runtime @openai/codex-sdk
node packages/noise/examples/neural-memory-cli/run.mjs \
  --sdk-path /path/to/runtime/node_modules/@openai/codex-sdk/dist/index.js \
  --model YOUR_MODEL
```

Use an available model ID. Omitting `--model` uses the Chat provider default.
The CLI uses an existing file-backed Codex login (`auth.json`). It copies that
file into a private temporary runtime and removes the runtime on normal completion
or a handled failure. Forced termination can leave temporary data. The original
login and settings are not changed; keychain-only login is unsupported. The
temporary runtime disables shell execution, local image viewing, web search,
multi-agent tools and app connectors, and does not load project instructions.
These settings follow the [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

```sh
node packages/noise/examples/neural-memory-cli/run.mjs --offline
node packages/noise/examples/neural-memory-cli/run.mjs --input /path/to/session.json \
  --sdk-path /path/to/runtime/node_modules/@openai/codex-sdk/dist/index.js
```

`--offline` prints actual recalled episodes without calling a model. It does not
generate a substitute reply or assess conversation quality. Each JSONL record on
stdout contains the recall diagnostics, exact model messages, and, in live mode,
the model's first response. There is no quality-based candidate selection or retry.
Treat this output as conversation data when deciding where to save it.

## Session input

`session.json` is a fictional wiring fixture. Its vectors are manually assigned
topic coordinates, not measured embeddings or evidence of language quality.
Supply vectors from the same encoder for all episodes, observations, and queries
in a real application. The library does not download or select an encoder.

The provider-independent integration is ordinary message assembly:

```ts
import { createNeuralWorkingMemory } from '@aituber-onair/noise';

const memory = createNeuralWorkingMemory({ dimensions: embeddingDimensions });
memory.remember({ id: 'episode-1', messages: pastExchange, vector: pastVector });
memory.observe(stimulusVector);
const recalled = memory.recall(currentVector, { maxEpisodes: 2, maxChars: 2000 });
const completion = await chatService.chatOnce([
  { role: 'system', content: characterInstructions },
  ...recalled.episodes.flatMap((episode) => episode.messages),
  ...recentConversation,
]);
```

Here the vectors, source exchange, recent conversation (including the latest user
comment), and configured `chatService` belong to the consuming application.
The memory object has no access to the model or its settings.

- `system`: the application's normal character instructions.
- `dimensions`: vector size, from 1 to 4096.
- `episodes`: chronological source exchanges with an `id`, `messages` and `vector`.
- `budget`: optional `maxEpisodes`, `maxChars` and `excludeIds` for recall.
- `turns`: an ordered list of `observations` (optional vectors), a current query
  `vector`, and `messages` ending in the current user comment.

Each turn's observations update neural state before recall. Observation text is
not added to the chat context. State carries across turns; the episode bank is
fixed in this CLI. Model replies are not automatically added to later turns.
Supply needed recent conversation explicitly in `messages`. In an application,
use `remember()` to add episodes after a completed exchange.

Recall supplies potentially noncontiguous earlier exchanges in their original
order. Keep the complete recent exchange in `messages`, and keep essential
instructions and facts outside this optional recall path. Use `excludeIds` to avoid
duplicating episodes already present in the recent context.

## Circuit and limits

`createNeuralWorkingMemory` is an opt-in virtual circuit separate from the draft
rewriting API. It uses one abstract leaky integrate-and-fire unit per episode,
positive similarity-weighted recurrent links, shared inhibition, refractory
periods, and a decaying activity trace. An observation advances 24 fixed simulation
ticks. Recall advances with the current query, filters by semantic similarity,
then ranks eligible episodes by their resulting activity trace. Whole episodes
fit within the caller's budget; the library does not rewrite or truncate them.

This designed circuit is not a biological reconstruction. It does not use the
real-wiring loader or automatically download any data. Its constants are prototype
parameters, not calibrated biological values. A recall choice can remain unchanged
despite different neural states. The scalar activity values are diagnostics, not
language-quality scores.

Use a separate instance per conversation. `reset()` clears activity while retaining
the bank. `forget(id)` deletes the episode and resets residual activity throughout
the circuit. `clear()` removes the bank and all activity. The default capacity is
64 episodes, with an explicit maximum of 256; a full bank rejects new entries.
Embeddings and source text stay in memory unless the consuming application saves
them. Only the messages assembled by the application are sent to its chat provider.

To assess an application, hold the bank, input and encoder results fixed, vary
only prior neural stimulation, and repeat generation from identical recalled
context. Also compare with ordinary similarity retrieval. Different replies alone
cannot establish a benefit from this circuit; read outputs across inputs for
repeated response patterns and unwanted character changes.

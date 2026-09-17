# Neural reaction CLI

This experimental CLI lets neural activity shape a different response from the
same character. Draft meaning may change while the reply remains coherent. Comments become six
stimulus channels. Exact source clauses bind deterministically to balanced readout
population projections via fixed hashes. The writer receives the original draft,
persona, and early/late attention distributions over those clauses. The draft is a starting point: opinions, feelings, immediate intentions and what
to answer may change. Source content may be omitted. Semantic change is permitted,
not required. Protected information stays intact; invented history or external
facts and incoherent topic jumps are rejected.

The binding is an application convention, not learned semantics or fly language.
Different wording can bind different populations. Actual spikes determine weights;
no random writing-style selector is used. Sincerity, relationship and rhythm gates
remain, followed by a content-attention intervention plan.

The sample uses `chaotic` mode and strength `0.9`, preserving sincerity/relationship
gates. Restored length must be 0.8–1.1 times the original. The normal path uses
three model calls (stimulus classification, speech, coherence/character audit). Candidates are audited separately, stopping at the first pass. Up to seven calls
are possible with one speech retry before
falling back to the original. Weak attention also returns the original as
`neural_unfocused`, recorded as a case without an effect.

## Run with Codex SDK

Requires Node.js 20+ and a file-backed Codex login (`auth.json`). Install the SDK
in a consuming runtime, not as a Noise/repository dependency.

On a fresh checkout, first run `npm ci` and `npm -w @aituber-onair/chat run build` from the repository root.

```sh
npm install --prefix /path/to/runtime @openai/codex-sdk
npm -w @aituber-onair/noise run build
node packages/noise/examples/neural-rewrite-cli/run.mjs \
  --sdk-path /path/to/runtime/node_modules/@openai/codex-sdk/dist/index.js \
  --model YOUR_GENERATION_MODEL --judge --judge-model YOUR_REVIEW_MODEL
```

This uses AITuber OnAir Chat's `codex-sdk` provider and consumes Codex usage without
passing an API key. Specify model IDs available to your account. Without `--model`,
the SDK default is used; without `--judge-model`, generation and evaluation use the
same model. An unavailable judge records a failure. `--audit-model MODEL` optionally uses a
separate model for the runtime acceptance audit, independently of `--judge-model`.

File-backed authentication is copied into a private temporary directory and removed
with SDK session data on normal exit. Original settings/login remain unchanged.
Keychain-only login is unsupported. Forced termination may leave temporary data.

For real wiring, first follow the [data setup](../../README.md#malecns-setup).
Run the following from the repository root for the default output directory;
change `MALECNS_DATA_DIR` if you prepared the data elsewhere:

```sh
MALECNS_DATA_DIR=./packages/noise/data/malecns-v1 \
  node packages/noise/examples/neural-rewrite-cli/run.mjs \
  --sdk-path /path/to/runtime/node_modules/@openai/codex-sdk/dist/index.js --judge
```

Otherwise the backend is `virtual`. Wiring stays local; only conversation, original
text and derived behavioral controls reach the LLM.

## Sessions and evaluation

`--sequence` carries neural state and recent messages between ordered cases.
Otherwise each case resets the circuit. Every `--repeat` round starts a new session.
The circuit uses an 8 ms simulated quiet interval between turns, not wall-clock time.

Results and a summary are printed as JSONL, never automatically saved. Options:
`--case ID`, `--repeat 1..10`, `--seed`, `--cases FILE`. A custom corpus is a JSON
array with `id`, `message`, `draft`, literal `required` strings and optional
`expectSkip`. Use `required` for literals that must survive, not a checklist of draft meanings.

The default `reaction-cases.json` contains fictional teasing, praise, requests,
refusals and conditions. `cases.json` and `cases-extended.json` are additional
corpora. Keep unseen cases for checking generalization.

Inspect `original`/`result`, `stimulus` (threat, reward, social, novelty, demand,
repetition), `attention` (opening/settling weights, focus index and contrast),
`anchors`/`facts` (source clauses), all `attempts` and rejection reasons,
`lengthRatio`, `checks`, and `review`. Legacy `state` values remain diagnostic;
they no longer control speech. Weights are not quality scores. The optional
`--judge` checks grounding (`grounded`), personality, naturalness, a listener-felt
response difference and attention alignment. It does not require semantic
equivalence. Small wording changes count when they change how the reply comes
across. `attempts[].missingFacts` records omissions without rejecting them.
Specify a different judge model for a separately labeled evaluation.

All failures and fallbacks stay visible and return exit code 1. Model evaluations
are not guarantees; inspect full outputs together for repeated transformation
patterns. `--sequence` changes both neural state and visible history, so it cannot
isolate neural causality. That needs internal controlled trials with frozen stimulus
classification, identical text/context, intervened neural state, and repeated
same-state generations. The summary does not certify diversity or causality.

## Offline wiring smoke test

```sh
npm -w @aituber-onair/noise run example:neural-rewrite -- --offline
```

Fixed stimuli, substitutions and audit fixtures exercise wiring only. This cannot
establish language quality or whether the neural state was expressed.

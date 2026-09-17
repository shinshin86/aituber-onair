# Noise Brain Chat

A browser chat sample that shows the recorded neural activity behind optional
Noise modulation. The virtual reservoir works without a dataset. The MaleCNS
backend uses prepared wiring and actual soma positions in a dedicated Worker.

## Start

Requires Node.js 20+. The sample is not included in the npm package. Follow the
[repository setup](../../README.md#malecns-setup), then run `npm ci` and
`npm -w @aituber-onair/chat run build` from the repository root on first use.
No dataset download is needed for the virtual circuit. Start the sample with:

```sh
npm -w @aituber-onair/noise run example:brain-chat
```

Open `http://127.0.0.1:5183`. Use **動きを試す** to inspect the UI
without an API: both draft and rewrite are fixed strings, but the brain and
Noise pipeline actually run. This is not an LLM or a language-quality test.

For real chat, open **設定**, select a provider and model, and enter
its API key. The lists come from `@aituber-onair/chat`. For OpenAI-compatible
or local servers, enter a model ID and the full URL including `/chat/completions`;
the API key is optional. Gemini Nano requires a compatible browser with its
built-in AI prepared, but no API key. External endpoints must allow browser
requests via CORS. Draft generation and rewriting use the same Chat service
and model. Changing providers clears the API key; changing connection or
character settings resets conversation context, Noise and neural session state.
The first request generates a draft; eligible turns then use three model calls for
stimulus classification, speech and coherence/character audit, or up to seven with one speech/audit retry. API keys are kept only in page memory. Conversation and rewrite instructions
are sent only to the configured endpoint. Demo and real-chat histories are
separated when switching modes. Recent conversation context is limited to 20
messages. Failed rewrites retain the draft.

Under **設定 → 返答の調整**, **毎回、返答の変化を試す** bypasses the rhythm wait so activity is easier to inspect, but
does not bypass sincerity or relationship gates. Turn it off to use the normal
rhythm controller. A skipped turn clears the previous visualization.

## State-driven responses

The sample uses strength `0.9` and content-attention planning. Six encoded stimulus
channels drive the circuit. Exact source clauses bind to balanced readout-population
projections using fixed hashes. Early/late spikes produce attention weights over
those clauses. The writer receives the original, persona and weights. The original is a starting point; meaning, momentary opinions, feelings and
immediate intentions may change, and content may be omitted. Keep a recognizable
character and a coherent response to the conversation. Protected information stays
intact; do not invent history or external facts. The binding is artificial, not learned
semantics: different wording can bind different cells. Weak attention keeps the
original. The displayed attention describes the generation input, not proof that
the output realizes it.

Restored length is bounded to 0.8–1.1 times the original. Rejected candidates fall
back to the draft. Model-based audits are not guarantees. Character edit percentage
is not a measure of humor or semantic change. Inspect multiple outputs for repeated
transformation patterns. Chat changes both neural state and visible history;
isolating neural effects requires separate controlled trials.

Neural state carries across turns, with an 8 ms simulated quiet interval rather than
wall-clock decay. Starting a new conversation resets it. `captureReadout: true`
provides compact temporal summaries separately from full visualization frames.
The offline demo uses fixed text for UI inspection. Use the
[CLI sample](../neural-rewrite-cli/README.md) for repeated real-language evaluation.

## MaleCNS

Follow the [real-wiring setup](../../README.md#malecns-setup) to download, convert
and check the official data. The development
server serves four explicitly allowed files from `packages/noise/data/malecns-v1`
at `/brain-data/`. To use another directory, set `MALECNS_DATA_DIR` (relative
paths resolve from the npm workspace's working directory). Select MaleCNS and
click the load button. This explicitly transfers approximately 207 MB of wiring
plus metadata and positions into the browser. There is no automatic download
from GitHub or the upstream dataset.

For static hosting, place `manifest.json`, `graph.bin`, `metadata.json`, and
`soma-positions.f32` on your own server and set the manifest URL. The Vite
development middleware is not part of the production build. You can put files
in this sample's ignored `public/brain-data/` directory, but Vite will copy them
into the production output. They remain outside the npm package and Git history.
For hosting or redistribution, follow the credits, license-link and modification
notice instructions in the setup guide.

## Reading the display

- Green points are recorded spikes; pink points are readout-population spikes
  (descending neurons in MaleCNS). Gray-green points are inactive context.
- Play or scrub the timeline to inspect recorded intervals. Playback is slowed
  down for display; it does not represent conversational time. **合計** shows
  cumulative spike counts for the turn.
- Expand **活動の詳細** to see the eight most active neurons with body ID,
  type, group, coordinates, and spike count. Missing soma locations are marked
  and excluded from the plot, but their activity still counts in the metrics.
- Drag to rotate the coordinate projection. The virtual layout is synthetic.
  MaleCNS uses actual soma positions, not neuron branches or a fly body mesh.
- Inactive background points are sampled to at most about 6,500 points. Every
  active neuron with a valid coordinate is drawn. Not all 166,700 neurons have
  a soma position.
- Each response can reopen its activity record. At most six records are retained
  in memory. Loading a different brain clears the conversation and recordings.

The sample also enables `captureReadout: true`, returning compact temporal summaries
in `modulation.readoutTrace` for rewriting. The standard Worker bridge transfers
these with modulation. For the neuron display, it enables `captureActivity: true` and reads `brain.getActivityTrace()`.
This opt-in API records at most 64 bins of per-neuron spike counts, with
`stepsPerFrame` and `dtMs` describing bin timing (the last bin may be shorter).
It has no effect on the simulation output. This sample’s 32-step MaleCNS recording
adds about 5.3 MB of frame data per record, plus counts and UI overhead. This
sample implements its own Worker messages for geometry and recording transfer;
the package's minimal Worker bridge still transfers only modulation summaries.

Activity is from an approximate simulation, not evidence that a neuron
understands a word or causally determines the reply. The fly does not generate
language. Geometry and annotations are derived from
[MaleCNS v1.0](https://male-cns.janelia.org/), CC BY 4.0, by FlyEM / HHMI Janelia,
University of Cambridge, MRC LMB, and Google Research. Preserve attribution when
hosting the data. No rendering code or body assets are copied from other fly
simulators.

## Build

```sh
npm -w @aituber-onair/noise run example:brain-chat:build
```

This checks the sample TypeScript, builds the page, and bundles the module
Worker. The normal package tests verify that recorded frame counts sum to the
per-turn activity and do not change modulation.

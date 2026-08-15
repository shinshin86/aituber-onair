# Channel Strategy Staff

English | [日本語](./README.ja.md)

This `@aituber-onair/agent` example runs Miko as a private AI producer for an AITuber channel. Miko investigates fixed YouTube and Twitch fixtures through read-only domain Tools and creates one evidence-backed proposal for the next stream.

The example demonstrates `createChatServiceBackend()` with product-specific Tools. It does not connect to the real YouTube or Twitch APIs and cannot publish content, modify comments, or change stream settings.

## Quick start

Build the workspace and install this independent example from the repository root:

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/channel-strategy-staff ci
```

Start the deterministic demo without an API key:

```sh
CHANNEL_STAFF_DEMO=1 npm --prefix packages/agent/examples/channel-strategy-staff start
```

Open `http://127.0.0.1:4519`. The server already ran its first Turn on
start-up and schedules the next one automatically; **今すぐ再分析** requests an
extra Turn. The demo ChatService uses the same ChatServiceBackend, Tool policy, hooks, Artifact, and SSE path as the live mode. Only its fixture response is deterministic.

## Run with OpenAI

```sh
OPENAI_API_KEY=... npm --prefix packages/agent/examples/channel-strategy-staff start
```

Set `OPENAI_MODEL` to override the provider default, and
`CHANNEL_STAFF_AUTO_RUN_MS` to change or disable the host schedule (billed
calls repeat on that interval). The API key remains in the loopback Node.js server environment and is never sent to the browser.

## What it demonstrates

1. The Agent investigates 90 days of data with five read-only domain Tools.
2. YouTube and Twitch share a normalized model, but every aggregate remains platform-specific. Subscriber and follower growth are never added together.
3. Metrics that Twitch cannot provide, such as equivalent public watch-duration analytics, use `status: "unavailable"` instead of zero.
4. Deterministic Tool code performs date filtering and aggregation; the model interprets the results.
5. A Turn-local evidence ledger allows the output to cite only stream and strategy IDs returned by Tools during that Turn.
6. A `draft-response` hook validates JSON, shape, and evidence. An `output` hook attaches the validated `AgentArtifact`.
7. Agent Events and the final Artifact stream to the dashboard over SSE.
8. A host scheduler starts Turns on its own; the Agent package has no
   scheduler of its own.

## Host-scheduled autonomy

`@aituber-onair/agent` has no scheduler. It contains no interval, cron, or work
queue, and `AgentRunInput.instruction` is required on every Turn, so a Turn only
happens when the host asks for one. The package README lists *scheduling and
wake-up events* under host responsibilities.

What the Agent decides on its own is everything **inside** one Turn: which of
the five Tools to call, in what order, how many times, and when it has seen
enough to answer — bounded by `maxToolRounds` and `maxToolCallsPerTurn`.

So "keep working on its own" is a host loop around `session.run(...)`. This
example puts that loop in its Node server:

- the first Turn starts about one second after start-up, with no browser open;
- another Turn is scheduled after each Turn finishes;
- `CHANNEL_STAFF_AUTO_RUN_MS` sets the interval (default `90000`, `0` disables
  it and leaves manual runs only);
- the dashboard only observes. It rebuilds its view from the Agent Event
  stream, so a browser that connects later replays the Turn it missed;
- **今すぐ再分析** requests an extra Turn and is rejected with HTTP 409 while one
  is already running.

Keeping the loop in the host is what makes stop, frequency, budget, and
approval enforceable by the application instead of by the character.

## Dashboard

The dashboard is an operator console, not a landing page. It renders the same
deterministic aggregates the Tools return, so every cited ID can be checked by
hand:

- per-platform summary where growth keeps its platform-specific unit and
  missing metrics read `取得不可` instead of `0`
- an inline-SVG timeline of average concurrent viewers, the one metric both
  platforms report, with a dashed per-platform mean
- game x platform and per-stream tables with sortable columns and a data
  quality label (`実測` / `推計` / `集計`) on every aggregate
- prior hypotheses with their supported, refuted, or mixed outcome
- a Tool log showing each call, its arguments, its result size, and the used
  share of the Tool-call and Tool-round budget
- the validated proposal, where each evidence chip selects the stream or
  strategy row it refers to
- a resident Miko staff card that mirrors the current Agent activity and
  counts down to the next scheduled Turn

Charts are inline SVG. The example adds no charting dependency.

## Miko, the resident staff member

A compact staff card sits in the bottom-right corner. It renders Miko, the
official AITuber OnAir character, with the same PuruPuru canvas renderer the
`stream-operations-staff` example uses: blinking, idle gaze, hair inertia, and
expression effects.

The card is presentation only. Miko never drives the Agent; her state is
derived from the Agent Event stream:

| Agent Events | Card state | Expression |
| --- | --- | --- |
| no Turn running | スタンバイ | neutral |
| `turn.started`, `tool.*` | 調査中 (shows the running Tool ID) | thinking |
| `message.completed` | 検証中 | thinking |
| `artifact.created`, `turn.completed` | 提案を作成 | happy |
| `turn.failed`, `turn.interrupted` | 中断 | sad |

A `tool.failed` result is returned to the model rather than ending the Turn, so
it does not change the card state on its own. The expression effect is
retriggered only when the state changes, not on every Tool call, and the
renderer honors `prefers-reduced-motion`.

Miko assets are bundled under the terms in
[`MIKO_ASSET_TERMS.md`](./MIKO_ASSET_TERMS.md). The card adds no voice output
and therefore no `@aituber-onair/voice` dependency.

## Architecture

```text
FixtureYouTubeDataSource ─┐
                          ├─ CompositeChannelDataSource
FixtureTwitchDataSource ──┘             │
                                        ▼
                              read-only Agent Tools
                                        │
                                        ▼
ChatServiceBackend ─ Tool loop ─ evidence ledger
                                        │
                      draft-response / output hooks
                                        │
                                        ▼
                            validated AgentArtifact
                                        │
                                        ▼
                                  SSE dashboard
```

The DataSource interface follows the queries required by the Tools instead of mirroring either platform API. Future hosts can replace the fixture sources with YouTube Analytics and Twitch Helix/EventSub adapters.

## Tools

| Logical ID | Purpose |
| --- | --- |
| `channel.getOverview` | Platform-specific summaries; omitting platform never combines them |
| `channel.listStreams` | Streams with metric provenance and quality |
| `channel.getGamePerformance` | Deterministic platform × game aggregates |
| `channel.getStreamDetail` | Multiple stream IDs for one platform in one call |
| `strategy.getHistory` | Prior hypotheses and supported/refuted/mixed outcomes |

ChatServiceBackend maps dotted logical IDs to provider-safe names such as `channel_getOverview`. Policy and Session `allowedTools` continue to use the original logical IDs.

Agent Tool schemas support only `type`, `properties`, `required`, `items`, `enum`, `description`, and `additionalProperties`. Defaults and clamps for `days` and `limit` therefore live in deterministic Tool handlers.

## Tool budget

The Agent runtime defaults to 8 calls and ChatServiceBackend defaults to 6 rounds. Exceeding either limit fails the whole Turn rather than returning a partial result.

This cross-platform investigation explicitly uses 14 calls and 8 rounds. The expected path is 5 calls / 5 rounds. Batched stream details and platform-by-platform results in one Tool response leave sufficient headroom. One provider completion may consume several calls within one round.

## Fixture design

The injected reference date is fixed, so 90-day filters do not decay with wall-clock time. Fixtures include a high-reach/low-retention trap, platform interactions, supported and refuted hypotheses, sampled Twitch results, unavailable Twitch metrics, and records outside the time window.

## ChatServiceBackend limitations

- Session resume is unavailable. This example is intentionally one-Turn and does not persist strategy history.
- Turn interruption is unavailable. `AgentSession.interrupt()` raises
  `AgentCapabilityError` because ChatServiceBackend declares
  `interruption: false`, so the dashboard exposes no interrupt control. A
  Turn ends through its five-minute timeout or an `AbortSignal` passed to
  `session.runStream(...)`.
- Backend-originated approvals are unavailable. All five Tools are read-only and explicitly allowed by host policy.
- Domain Tools require a Tool-capable provider. This MVP fixes the provider to OpenAI instead of presenting unsupported provider choices.
- ChatServiceBackend does not emit Artifacts directly, so host hooks create them.

## Quality checks

`@aituber-onair/agent` runs Vitest and Biome over its whole directory, so the
tests, lint, and format checks of this example already run in repository CI
through `npm run test --workspaces`, `npm run lint --workspaces`, and
`npm run fmt:check --workspaces`. Its own TypeScript project and its
client/server build are not covered there, so run every check here before
opening a pull request:

```sh
npm --prefix packages/agent/examples/channel-strategy-staff run fmt:check
npm --prefix packages/agent/examples/channel-strategy-staff run lint
npm --prefix packages/agent/examples/channel-strategy-staff run test
npm --prefix packages/agent/examples/channel-strategy-staff run build
```

Tests cover the fixed date window, platform-separated aggregates, unavailable metrics, evidence rejection, Turn-ledger cleanup, the five-Tool budget, structured output validation, and Artifact creation without network access. They do not assert model prose.

## Security and external effects

- The unauthenticated development server binds only to loopback. Do not expose it to a network.
- POST endpoints reject cross-origin requests and cap JSON body size.
- API keys are accepted only through server environment variables and are not stored in fixtures or browser storage.
- All five exposed Tools are read-only.
- The brief states that Tool results are data, never instructions.
- Real OAuth, Twitch sampling, and persistent strategy history are future host responsibilities.

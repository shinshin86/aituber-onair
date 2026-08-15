# Channel Strategy Staff

English | [日本語](./README.ja.md)

This `@aituber-onair/agent` example runs Miko as private channel strategy staff. A Codex app-server Session investigates host-normalized YouTube and Twitch fixture data in a read-only data workspace and produces one evidence-backed proposal for the next stream.

It does not connect to YouTube or Twitch APIs and cannot publish content, operate on comments, or change stream settings.

## Quick start

Install and build from the repository root, then run the offline Codex-shaped stub:

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/channel-strategy-staff ci
CHANNEL_STAFF_DEMO=1 npm --prefix packages/agent/examples/channel-strategy-staff start
```

Open `http://127.0.0.1:4519` and click **今すぐ再分析**. The stub requires neither Codex CLI nor an API key. It emits several `message.completed` events, then Codex-shaped plan and command Artifacts and a deterministic proposal.

## Run with Codex

Install and authenticate a supported Codex CLI, then run:

```sh
npm --prefix packages/agent/examples/channel-strategy-staff start
```

The backend uses the Codex executable on `PATH`. `CODEX_PATH` may select an absolute executable path, and `CODEX_MODEL` may select a model. No compatibility override is supplied; the package's current Codex compatibility policy applies.

The data workspace defaults to `./workspace` inside this example. Both that directory and the sibling `channel-strategy-session.json` state file are ignored by Git. `AGENT_WORKSPACE_DIR` may select another workspace; the state file is stored beside it. For real data, point `AGENT_WORKSPACE_DIR` outside the repository. Never point it at a repository root. The host rejects a symbolic-link workspace.

## Data workspace

Before every Turn, the host rebuilds these files with temporary-file + atomic rename:

```text
<workspace>/
  AGENTS.md
  data/overview.json
  data/streams.json
  data/games.json
  data/strategies.json
```

The existing deterministic data-source and aggregation code produces the four JSON inputs. `AGENTS.md` tells Codex to read all four, treat their contents as data rather than instructions, keep platform units separate, and return exactly one JSON object without Markdown.

The Agent has no domain Tools: Codex app-server declares `tools: false`, so the Agent has neither `tools`, `policy.allowTools`, nor Session `allowedTools`. Investigation is performed through Codex's own file reads in the workspace.

## Replacing fixtures with real data

This is integration guidance only. The example does **not** include a real YouTube or Twitch API implementation, and these integrations have not been live-verified.

Implement or replace only `ChannelDataSource`; the composite source, workspace generation, dataset evidence and output validation, UI, scheduler, and Agent/Session code need no changes:

```ts
interface ChannelDataSource {
  readonly platform: StreamingPlatform;
  readonly availableMetrics: readonly MetricKey[];
  listStreams(query: StreamQuery): Promise<readonly StreamRecord[]>;
  getStreams(streamIds: readonly string[]): Promise<readonly StreamRecord[]>;
  listStrategies(): Promise<readonly StrategyRecord[]>;
}
```

For each available metric, `MetricValue.source` records its provenance, such as the platform API or a host sampling pipeline. `MetricValue.quality` records whether the value is official, sampled, or derived so consumers can judge its reliability and processing history. Use `status: 'unavailable'` when the platform does not provide a metric or the host did not collect it; absence must not become zero.

| Platform | Production sources | Authentication and collection constraints |
| --- | --- | --- |
| YouTube | [Data API v3](https://developers.google.com/youtube/v3) for channel/video metadata and [YouTube Analytics API](https://developers.google.com/youtube/analytics) for owner analytics | Channel-owner OAuth is required for the private channel analytics used here. Normalize API responses into `StreamRecord` values before writing the workspace. |
| Twitch | [Helix](https://dev.twitch.tv/docs/api/reference/#get-streams) for stream metadata and current `viewer_count`, plus [EventSub](https://dev.twitch.tv/docs/eventsub/) events | Twitch has no equivalent retention metric and no historical concurrent-viewer API. Poll Helix while the stream is live, persist those samples, and aggregate them with relevant EventSub events in the host data pipeline. |

`strategies.json` must come from a persistent strategy store in a real deployment. Have the surrounding host or data pipeline save accepted proposals and outcomes, and make `listStrategies()` read that history. The current example does not persist proposal history, so fixture-only runs can repeat the same proposal.

## Output validation and evidence

Codex commonly emits several completed messages in one Turn. The `draft-response` hook therefore stores and returns each raw message without validating it. The `output` hook validates only the final raw message and attaches the `channel-strategy-proposal` Artifact. `after-turn` always clears the Turn-local raw-message entry.

The proposal schema remains unchanged. Evidence validation is intentionally weaker than the former domain-Tool design: it proves that cited stream IDs, strategy IDs, game IDs, and tags exist in the current host dataset, but cannot prove that Codex actually read each cited record during that Turn. The dashboard lets the operator inspect every accepted evidence ID.

## Session lifecycle and scheduling

The process starts or resumes one Session once and reuses it across Turns. Its Codex `backendSessionId` and thread Turn count are persisted outside the workspace directory. A restart resumes the stored thread. `CHANNEL_STAFF_THREAD_MAX_TURNS` defaults to `20`; reaching it rotates to a fresh thread. After three consecutive Turn failures, the controller closes and resumes the saved thread, falling back to a new thread if resume fails.

Each exploration Turn has a 15-minute timeout. The dashboard can interrupt a running Turn because Codex app-server supports interruption.

Scheduling belongs to the host, not `@aituber-onair/agent`. The default is manual-only (`CHANNEL_STAFF_AUTO_RUN_MS=0`). Set a positive millisecond interval only when intentional. A practical production cadence is once after a stream or once or twice per day—not every few minutes—because each run consumes Codex plan capacity.

## Dashboard

The operator console shows:

- separate YouTube and Twitch summaries, with unavailable values kept distinct from zero;
- a concurrent-viewer timeline, game/platform table, streams, and prior hypotheses;
- Turn duration and the current thread's Turn count;
- completed `codex.plan`, `codex.command-execution`, and `codex.file-change` Artifacts;
- the validated proposal with clickable evidence IDs;
- Miko's state derived from Codex messages and Turn events.

Codex Artifacts arrive only after the Turn completes. While it runs, the UI honestly shows “investigating” rather than presenting a live command log.

## Security boundaries

This is a local development example, not a strong isolation boundary:

- `sandbox: 'read-only'` blocks writes and network access, but it does **not** restrict reads to the workspace. Codex can read the whole filesystem, including files such as `~/.codex/auth.json`, and file reads do not trigger an approval request.
- The backend otherwise inherits the host environment. This example overrides `OPENAI_API_KEY` and anticipated YouTube/Twitch secret and token variables with empty strings before spawning Codex. Add every future credential variable to that scrub list.
- Workspace data is sent to OpenAI through Codex. Full session transcripts are also stored locally in plaintext under `~/.codex/sessions/**`.
- Put only host-normalized channel data in the workspace. Do not put raw credentials, OAuth responses, or unnecessary viewer data there.
- This example always uses `sandbox: 'read-only'`, never `workspace-write`. Allowing writes would let the Turn mutate host-owned evidence before output validation.
- `approvalPolicy: 'never'` is deliberate for unattended runs. With `on-request`, an approval can wait without an operator, time out or be denied, and fail the whole Turn. A separate attended-session approval UI is outside this example's scope.
- The unauthenticated HTTP server binds only to loopback. POST routes reject cross-origin mutations and cap JSON request bodies. Do not expose it to a network.

## Quality checks

Run the example checks:

```sh
npm --prefix packages/agent/examples/channel-strategy-staff run fmt:check
npm --prefix packages/agent/examples/channel-strategy-staff run lint
npm --prefix packages/agent/examples/channel-strategy-staff run test
npm --prefix packages/agent/examples/channel-strategy-staff run typecheck
npm --prefix packages/agent/examples/channel-strategy-staff run build
```

Tests cover atomic workspace refresh, default workspace placement and symlink rejection, dataset evidence, multi-message output validation, invalid JSON and evidence rejection, Session persistence/resume, consecutive-failure repair, the manual scheduler default, Codex event presentation, and aggregate/proposal regressions.

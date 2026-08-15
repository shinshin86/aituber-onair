# AI Staff for Live Stream Monitoring

English | [日本語](./README.ja.md)

This example runs Miko, an official AITuber OnAir character, as live-stream
operations staff. The existing React dashboard replays 16 fixed comments,
while a loopback-only Node.js server runs a real `@aituber-onair/agent` Agent
with `CodexAppServerBackend`.

`@aituber-onair/comment-intelligence` performs deterministic server-side
preprocessing. Codex receives only structured observations and generates every
briefing card and the post-stream report. The example never controls an
external streaming service.

## Requirements

- Node.js 18 or later
- Codex CLI `0.136.0` or later, installed locally
- A completed `codex login`

Install Codex CLI and sign in. No exact version pin is required:

```sh
npm install --global @openai/codex
codex login
```

The required app-server schema elements were confirmed in Codex CLI `0.136.0`;
the integration was verified against `0.145.0`. The backend warns but continues
with other versions at or above the minimum.

## Start

Build the workspace packages from the repository root, install this example,
and start its Node server:

```sh
npm ci
npm run build
npm --prefix packages/agent/examples/stream-operations-staff ci
npm --prefix packages/agent/examples/stream-operations-staff start
```

Open `http://127.0.0.1:4518`.

The server can find `codex` on `PATH`. To select a specific executable, pass an
absolute path:

```sh
CODEX_PATH=/absolute/path/to/codex npm --prefix packages/agent/examples/stream-operations-staff start
```

## What it demonstrates

1. The browser replays the same 16 YouTube and Twitch fixtures with the
   existing `1x / 2x / 4x` controls.
2. The browser sends only the ordered fixture IDs to the Node server. The
   server resolves the fixture data and runs `comment-intelligence` in rules
   mode with chaos-resistant ranking, a maximum of 8 selected comments,
   Japanese AITuber context, and high-risk viewer blocking.
3. The server removes viewer text and author data before creating the Codex
   Turn context. The context contains IDs, ranking reasons, host categories,
   attention levels, aggregate ignored-comment data, and safety observations.
4. Codex returns JSON for each briefing card. The server validates its shape,
   evidence IDs, severity, and category before an output hook creates the
   versioned Agent Artifact.
5. After all comments have played, Codex generates the post-stream report. The
   server validates it against the local JSON Schema before creating an
   Artifact with `delivery: "local-draft"`.
6. Agent Events stream to the dashboard over Server-Sent Events. Event history
   supports `Last-Event-ID` replay after a temporary disconnect.
7. Codex approval requests appear with only `allow-once` and `deny` actions.
   The active Turn can also be interrupted from the dashboard.

Briefing Turns run on even-numbered fixture batches and immediately when a new
medium/high safety observation appears. This keeps cards arriving throughout
playback without running a Turn for every comment. All displayed briefing
cards still originate from Codex Turns.

## Architecture and trust boundary

The React UI keeps fixture playback, timeline rendering, the Miko avatar, Web
Speech, and AivisSpeech in the browser. `src/agentRuntime.ts` is now an HTTP/SSE
client; Agent construction, preprocessing, artifact validation, approval
resolution, interruption, and resume live under `server/`.

Raw viewer text is never copied into the Codex instruction, conversation input,
or context. For this fixed scenario, the browser does not send raw text to the
server at all. The server reads the known fixture prefix, runs
`comment-intelligence`, and builds a text-free structured context. IDs in Codex
artifacts must match IDs in that context.

The Miko brief tells Codex to return the requested JSON only and not execute
commands, edit files, publish content, or perform moderation. The backend still
uses `approvalPolicy: "on-request"` so an unexpected command or file request is
held for an explicit human decision.

## Approval flow

- `allow-once` approves only the displayed request.
- `deny` rejects only the displayed request.
- There is intentionally no session-wide or permanent approval button.
- Closing or interrupting the Session, or reaching the ten-minute timeout,
  denies any unresolved request.

Review the displayed tool, risk, reason, and sanitized arguments before
allowing a request.

## Cold resume

The Codex backend Session ID is stored as host-owned lifecycle state in
`workspace/.agent-session.json`. On restart, the server calls
`agent.resumeSession(...)` with that ID. A missing, malformed, or unresumable
record falls back to a fresh Codex thread and is replaced.

Cold resume restores the Codex thread. Browser event history lasts only for the
current HTTP server process. The Miko brief tells Codex not to read or modify
`.agent-session.json`.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4518` | Local HTTP port. The server always binds to `127.0.0.1`. |
| `CODEX_PATH` | `codex` on `PATH` | Absolute path to a specific Codex executable. |
| `CODEX_SANDBOX` | `read-only` | Set exactly to `workspace-write` to allow changes inside the isolated workspace. |
| `AGENT_WORKSPACE_DIR` | `./workspace` | Isolated Codex working directory and Session record location. |

## Safety and external effects

- The HTTP server has no authentication and is intentionally loopback-only. Do
  not proxy or expose it to a network.
- Keep `AGENT_WORKSPACE_DIR` isolated. Do not point it at a home directory,
  repository root, or another broad directory.
- The default sandbox is read-only. Enable `workspace-write` only for content
  Codex may change.
- POST endpoints reject cross-origin requests. JSON endpoints require
  `Content-Type: application/json`, and static serving rejects path traversal.
- The example cannot post, reply, delete, ban, time out users, or change stream
  settings. Reports remain local drafts.
- Hostile comment text is suppressed in the dashboard and speech output.
- The example uses the existing local Codex login and does not read or accept
  API keys.

## Speech

Web Speech uses the browser and operating system `speechSynthesis`
implementation. It prefers a Japanese voice, but availability depends on the
local environment.

For local AivisSpeech:

1. Start the [AivisSpeech](https://aivis-project.com/) application.
2. Select `AivisSpeech（ローカル）` under `Mikoの音声`.
3. After the connection succeeds, select a voice from the retrieved list.

If AivisSpeech is unavailable, the selection remains active and the dashboard
shows the connection error. Start the service and press `再確認` to retry.

## Quality checks

Automated tests inject a deterministic mock `AgentBackend`. They do not launch
Codex, use a network service, or require login.

```sh
npm --prefix packages/agent/examples/stream-operations-staff run fmt:check
npm --prefix packages/agent/examples/stream-operations-staff run lint
npm --prefix packages/agent/examples/stream-operations-staff run test
npm --prefix packages/agent/examples/stream-operations-staff run build
```

The tests cover server-side preprocessing, the no-raw-text boundary, Codex JSON
validation, SSE replay, approvals, interruption, same-origin checks, and cold
resume fallback.

## Miko avatar and accessibility

The bundled PuruPuru PNGTuber avatar uses the available `neutral`, `thinking`,
`sad`, and `happy` states. See
[MIKO_ASSET_TERMS.md](./MIKO_ASSET_TERMS.md) for asset terms.

Controls are keyboard accessible. Selection, safety, approval, and speech
states have text labels; live updates use `aria-live`; focus indicators and
reduced motion are supported.

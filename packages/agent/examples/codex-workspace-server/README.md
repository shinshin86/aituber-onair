# Codex Workspace Server

English | [日本語](./README.ja.md)

This Node.js example runs an `@aituber-onair/agent` Session against a real
Codex app-server and exposes a small operator UI at
`http://127.0.0.1:4517`.

The server keeps one Agent and Session alive. The browser sends instructions,
receives `AgentEvent` objects over Server-Sent Events, renders
`message.delta` text as it arrives, resolves approvals with `allow-once` or
`deny`, and can interrupt the active Turn.

## Requirements

- Node.js 18 or later
- Codex CLI `0.145.0`, installed locally
- A completed `codex login`

Install the pinned CLI and sign in:

```sh
npm install --global @openai/codex@0.145.0
codex login
```

The backend deliberately rejects other Codex CLI versions because the
app-server protocol is version-sensitive.

## Start

Build the Agent package once from the monorepo root, then start the example:

```sh
npm -w @aituber-onair/agent run build
cd packages/agent/examples/codex-workspace-server
npm install
npm start
```

Open `http://127.0.0.1:4517`.

The server can find `codex` on `PATH`. To select a specific executable, pass
an absolute path:

```sh
CODEX_PATH=/absolute/path/to/codex npm start
```

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4517` | Local HTTP port. The server always binds to `127.0.0.1`. |
| `CODEX_PATH` | `codex` on `PATH` | Absolute path to the pinned Codex executable. |
| `CODEX_SANDBOX` | `read-only` | Set exactly to `workspace-write` to let Codex modify the workspace. Other values remain read-only. |
| `AGENT_WORKSPACE_DIR` | `./workspace` | Isolated workspace directory. Relative paths resolve from the process working directory. |

## Approval flow

The Codex backend uses `approvalPolicy: "on-request"`. When Codex asks for
permission, the pending request appears in the browser with its risk, reason,
and sanitized arguments.

- `allow-once` approves only that request.
- `deny` rejects that request.
- There is intentionally no session-wide or permanent approval button.

The Agent approval timeout is ten minutes so a human has time to respond.
Closing the Session, interrupting the Turn, or reaching the timeout denies any
remaining request.

## Workspace and cold resume

On first start, the server copies files from `workspace-template/` into the
workspace. Directories are seeded recursively, and an existing file is never
overwritten.

The Codex backend Session ID is stored in `.agent-session.json` inside the
workspace. On a later server start, the application calls
`agent.resumeSession(...)` with that ID. If the stored record is missing,
malformed, or no longer resumable, the server starts a fresh Codex thread and
replaces the record.

This file is host-owned lifecycle state. The brief tells Codex not to read or
change it. Because `workspace-write` cannot exclude one file from its writable
root, the server also treats a missing, changed, or invalid record as
untrusted and falls back to a fresh thread.

Cold resume restores the Codex thread. Browser event history is kept only for
the lifetime of the current HTTP server process.

## Safety notes

- The HTTP server has no authentication and is intentionally loopback-only.
  Do not proxy or expose it to a network.
- The default sandbox is read-only. Enable `workspace-write` only for an
  isolated directory whose contents Codex may change.
- `AGENT_WORKSPACE_DIR` defines the backend working directory. Do not point it
  at a home directory, repository root, or another broad location.
- The UI offers only one-request approval. Review the displayed path, command,
  reason, and risk before allowing it.
- The server rejects cross-origin mutation requests. JSON endpoints also
  require `Content-Type: application/json`.
- Only host-authored instructions belong in this owner Session. Do not forward
  raw viewer comments or other untrusted text into it.
- The example uses the existing local Codex login and does not read or accept
  API keys.

## Quality checks

The automated tests use a deterministic mock `AgentBackend`; they do not
launch Codex, use the network, or require a login.

```sh
npm run fmt
npm run lint
npm test
npm run build
```

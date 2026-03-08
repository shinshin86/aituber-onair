# Coding Agent Example

English | [日本語](./README_ja.md)

A local coding agent example for Node.js using `@aituber-onair/core`.
It uses a clear architecture (`app/domain/infra/tools`) and
allowlist-only command policy.

## Architecture

- `src/app`: session runtime, state machine, loop guards
- `src/domain`: typed errors, policies, events
- `src/infra`: adapters for core, filesystem, process, logging
- `src/tools`: command implementations and registry
- `src/config`: strict env config loader

## Setup

```bash
npm install
cp .env.example .env
```

Set at least:
- `AGENT_WORKDIR`
- `AGENT_API_KEY`

## Run

```bash
npm run agent
```

or

```bash
# after running npm run build
node dist/index.js
node dist/index.js <workdir>
node dist/index.js --workdir <workdir>
```

## Test

```bash
npm test
npm run test:e2e
```

`npm test` excludes e2e.

## E2E

E2E uses a local OpenAI-compatible mock server (no external API call) and
validates deterministic tool loop behavior.

## Security Notes

- Allowlist-only command execution
- Workspace sandbox enforced by path policy
- Sensitive paths are blocked (`.env`, `*.pem`, `id_rsa`, etc.)
- Shell trampoline args (`-c`, `--command`, `| sh`) are blocked

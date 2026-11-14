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

### Chat 0.71.0

Core 0.26.30 uses published Chat 0.71.0 and Voice 0.30.0.
Gemini 4 models (currently Argon, Carbon, and Hydrogen) are explicit,
image-capable choices with mandatory thinking. Select `low` (package default),
`medium`, or `high`; provider default models are unchanged.
Hydrogen (`gemini-4-hydrogen`, OpenRouter `google/gemini-4-hydrogen`) is
available on the rate-limited direct Gemini API free tier; its OpenRouter route
is paid. Google defaults Hydrogen to `high`. Its additional `xhigh` level is
not exposed because the GenerateContent REST enum spelling is undocumented.
Argon and Carbon require the paid tier and default to `medium` upstream.
Carbon uses more thinking tokens than Argon, with higher latency and token use.

Thinking counts toward output limits. All Gemini 4 models keep an implicit
32,768-token floor, including on OpenRouter. For direct Gemini calls, explicit
limits are capped per model: Argon/Carbon at 32,768 non-streaming / 65,536
streaming; Hydrogen at 65,536 in both modes. Smaller explicit limits are
preserved. Request short replies in the prompt. Long decode and automatic
continuation are not implemented.

New OpenRouter text/image routes support tools and streaming without changing
the provider default:

| Model ID | Reasoning efforts (package default) |
| --- | --- |
| `meta/muse-ember` | max, xhigh, high, medium, low, minimal (`minimal`) |
| `thinkingmachines/inkling-2-small` | max, high, medium, low, minimal (`minimal`) |
| `nex-agi/nex-n2.6` | high, medium (`medium`); thinking cannot be disabled |
| `inclusionai/ling-3.2-flash:free` | No effort selector; provider default |

These routes expose no reasoning token-budget control. Ling uses its exact
`:free` ID and retains `includeReasoning` display control. Audio, video, and
file inputs are not added. See the [Chat documentation](../../../chat/README.md).

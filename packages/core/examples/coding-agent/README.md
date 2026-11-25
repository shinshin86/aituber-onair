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

### Chat 0.73.0 and Voice 0.31.0

Core 0.26.33 uses published Chat 0.73.0 and Voice 0.31.0.
Gemini 4 Neon is an explicit, paid, image-capable option with streaming and
tools on two routes. Native Gemini (`gemini-4-neon`, `MODEL_GEMINI_4_NEON`)
exposes `low` (package default), `medium`, and `high`; OpenRouter
(`google/gemini-4-neon`, `MODEL_GOOGLE_GEMINI_4_NEON`) also exposes `xhigh`.
Native Gemini 4 routes omit `xhigh` when its REST enum is undocumented:
currently Hydrogen and Neon. Neon returns signed model
history. Core forwards it unchanged within one tool-call loop, but its chat log
keeps only the visible reply text, so later turns and saved logs carry no
signatures. To keep signed history across turns, call Chat directly and append
the returned `assistant_message`.
OpenRouter also adds five explicit image-capable routes with tools and
streaming: `tencent/hy4-flash` (no reasoning control), `qwen/qwen4-max`
(default `none`), `openai/gpt-6.2-sol` and `openai/gpt-6.2-astra` (default
`low`), and `thinkingmachines/inkling-2-mini` (default `none`). Provider
default models are unchanged.

Native OpenAI GPT-6.2 Sol (`gpt-6.2-sol`) and GPT-6.2 Astra (`gpt-6.2-astra`)
are explicit image-capable options. Reasoning starts at `low`; only `low` and
`medium` are exposed, and other saved levels are normalized to that range.
Responses is the default endpoint and is required for tools and MCP. Tool-free
Chat Completions remains available; custom endpoints with tools fail before
sending. Mistral-hosted DeepSeek V4.1 Flash 1017 (`deepseek-v4-1-flash-1017`)
is an explicit public-preview option with image input, streaming, and tools;
no reasoning control is sent because none is documented. Mistral tool calls
now continue correctly in follow-up requests. Provider defaults are unchanged.

Gemini 4 models (currently Argon, Carbon, Hydrogen, and Neon) are explicit,
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
streaming; Hydrogen and Neon at 65,536 in both modes. Smaller explicit limits are
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

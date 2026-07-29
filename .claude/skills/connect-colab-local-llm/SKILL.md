---
name: connect-colab-local-llm
description: Launch vLLM or llama.cpp as an OpenAI-compatible Chat Completions server on Google Colab through Colab MCP Go, issue a temporary trycloudflare URL with cloudflared, and verify it with the @aituber-onair/chat compatibility probe and an AITuber OnAir Core React sample. Use when requests mention running vLLM, serving a GGUF model with llama.cpp, connecting a Colab local LLM to Core, testing an OpenAI-compatible Colab endpoint, cloudflared Quick Tunnels, or operating Colab MCP Go for local LLM development.
---

# Connect Colab Local LLM

## Goal

Use Colab MCP Go to launch a user-selected local LLM backend on Google Colab,
expose its OpenAI-compatible API safely, and prove that it works through the
same `@aituber-onair/chat` and Core paths used by AITuber OnAir.

Use the implemented vLLM adapter for native Hugging Face generation
checkpoints and the implemented llama.cpp adapter for GGUF artifacts. Keep
other backends candidate-only until their endpoint, request and response
shapes, streaming behavior, authentication, and model-specific options have
been documented and live-verified.

## Inputs

Collect or infer:

- `backend`: default `vllm`; infer `llama.cpp` when the requested artifact is
  GGUF
- `model_id`: required Hugging Face model id or accessible model path
- `served_model_name`: default to `model_id`
- `model_revision`: optional tag or commit; prefer one for reproducible runs
- `vllm_version`: default `0.25.1`
- `cuda_variant`: infer from the current official release assets and Colab
  driver; the initial live-validated A100 path uses `cu129`
- `llama_cpp_revision`: default to the last live-validated revision recorded
  in `references/llama-cpp.md`; change it only after checking upstream support
  and recording the resolved commit
- `gguf_filename`: required for a multi-file GGUF repository; infer it only
  when the repository exposes one unambiguous artifact
- `core_example`: default `react-pngtuber-app`
- `test_prompt`: short Japanese prompt for the final Core check
- `cloudflared_version`: default `2026.7.3`; update only after checking the
  official release and rerunning the public streaming probe
- `exposure`: default `public` for Colab-to-Core; use `local` only for
  notebook-internal diagnostics
- optional vLLM settings: `dtype`, `quantization`, `max_model_len`, and
  `gpu_memory_utilization`
- optional llama.cpp settings: `context_size` (default `4096`),
  `n_gpu_layers` (default `99` on NVIDIA), and `parallel` (default `1`)
- `trust_remote_code`: default `false`; enable only when the model requires it
  and the user accepts the risk

The user handles Google login, GPU runtime selection, gated-model license
acceptance, and `HF_TOKEN` when required. A cloudflared Quick Tunnel needs no
Cloudflare account or tunnel token.

## Procedure

1. Read `skills/connect-colab-local-llm/references/backends.md` before choosing
   the backend, cloudflared version, install command, or model-specific flags.
   When `backend=llama.cpp`, also read
   `skills/connect-colab-local-llm/references/llama-cpp.md`.
   When the user asks how to invoke this workflow or wants a copy-paste request,
   read `skills/connect-colab-local-llm/references/request-examples.md`.
2. Confirm Colab MCP Go is available.
   - Use `open_colab_browser_connection` when no Colab session is connected.
   - Then call `list_colab_tools`.
   - Do not assume exact remote tool names. Select the available tools that can
     inspect, create or replace, run, and monitor notebook cells.
3. Inspect the Colab runtime before installing anything.
   - Record GPU name, VRAM, driver/CUDA information, Python version, and free
     disk space.
   - Stop when there is no supported accelerator.
   - Compare model size and quantization with the available VRAM. Do not rely
     on model download success as proof that it will fit.
4. Resolve prerequisites without exposing secrets.
   - Read `HF_TOKEN` and optional `AITUBER_LLM_API_KEY` from Colab Secrets.
   - Never put real tokens in notebook source, repository files, issue text, or
     final reports.
   - Do not require the user to provision an LLM API key. Generate a random
     per-session key automatically before any public tunnel opens when
     `AITUBER_LLM_API_KEY` is absent.
   - Authentication may be omitted only while the server remains bound to
     loopback for notebook-internal diagnostics.
   - Ask the user to provide missing gated-model credentials in Colab Secrets
     instead of requesting the token value in chat.
5. Install the selected backend without replacing the Colab system
   environment.
   - For vLLM, install a pinned release in a dedicated virtual environment.
     Prefer the official `uv` flow and an explicit compatible CUDA wheel.
   - For llama.cpp, clone the pinned revision and build `llama-server` with
     `GGML_CUDA=ON`. Record the resolved commit and build options.
   - For GGUF, download the exact requested file and verify its `GGUF` magic,
     byte size, and SHA-256 against the official hosting metadata before
     loading it.
   - Do not silently replace the Colab system PyTorch or CUDA stack. Inspect
     compatibility failures before changing versions or CUDA variants.
6. Start the selected backend on `127.0.0.1`.
   - Require API-key authentication for public exposure. A loopback-only
     diagnostic server may omit it.
   - For vLLM, pass the key through `VLLM_API_KEY` and set
     `--served-model-name` explicitly.
   - For llama.cpp, pass the key through `LLAMA_API_KEY`. Use router mode with
     a pinned INI preset, `--no-models-autoload`, and the preset section name
     equal to `served_model_name`. Do not use single-model mode for the final
     probe because it accepts unknown model names.
   - Write output under `/content/aituber-local-llm/logs/` using a
     backend-specific filename.
   - Redact known secrets before displaying any log excerpt. Do not print the
     full command environment or process environment.
   - Start the server in its own process group so cleanup stops API and engine
     worker processes together.
   - Add optional flags only when justified by the selected model, backend
     documentation, or available VRAM.
   - Do not enable arbitrary remote code by default.
7. Wait for local readiness before opening a tunnel.
   - Confirm the server process is alive.
   - Confirm `GET /health`.
   - Confirm authenticated `GET /v1/models` returns `served_model_name`.
   - On failure, inspect the selected backend log tail before changing
     settings.
8. Open a cloudflared Quick Tunnel.
   - Download the pinned official `cloudflared` Linux binary and record its
     resolved version.
   - Start `cloudflared tunnel --url http://127.0.0.1:<port>
     --no-autoupdate` in its own process group.
   - Extract the temporary `https://...trycloudflare.com` URL from its log.
   - Do not require a Cloudflare account, tunnel token, or custom domain.
   - Cloudflare's documentation warns that Quick Tunnels do not support SSE,
     even though cloudflared `2026.7.3` passed live vLLM and llama.cpp
     streaming probes.
     Therefore rerun the public SSE probe for every session and never infer
     compatibility from a previous run.
   - Treat every public URL as temporary and sensitive. Keep backend API-key
     authentication enabled while the Quick Tunnel is running.
9. Print only the connection handoff needed by the user:
   - endpoint:
     `https://<public-host>/v1/chat/completions`
   - model: `served_model_name`
   - API key: the temporary per-session key
   - server and tunnel process identifiers or cleanup instructions
10. Validate the public endpoint in increasing scope.
    - Confirm a Chat Completions request without the backend API key is
      rejected.
    - Confirm authenticated `GET /v1/models`.
    - Confirm a non-streaming `POST /v1/chat/completions`.
    - Confirm streaming returns incremental SSE deltas through the tunnel.
    - Send a browser-style CORS preflight with `Origin`,
      `Access-Control-Request-Method: POST`, and requested
      `authorization,content-type` headers.
11. Run the repository compatibility probe.
    - Build `@aituber-onair/chat`.
    - Use the exact public `/v1/chat/completions` endpoint.
    - Set `COMPAT_ERROR_MODEL` to an intentionally nonexistent model.
    - Keep `COMPAT_STREAM=true`; a skipped or failed streaming check does not
      satisfy the Core acceptance criteria.
12. Validate one Core React sample.
    - Start the selected sample using its documented development command.
    - In LLM settings, select OpenAI-Compatible and enter the full endpoint,
      exact served model name, and temporary API key.
    - Send `test_prompt` and confirm the response appears incrementally in the
      browser.
    - Inspect the browser console and network request if the UI does not
      update.
13. Report versions, GPU, model, tunnel type, probe results, Core sample, and
    remaining limitations. Then stop the server and tunnel unless the user
    explicitly asks to keep the Colab session running.

## Compatibility Probe

Run from the repository root:

```bash
npm -w @aituber-onair/chat run build

COMPAT_ENDPOINT="<public_url>/v1/chat/completions" \
COMPAT_API_KEY="<temporary_api_key>" \
COMPAT_MODEL="<served_model_name>" \
COMPAT_STREAM="true" \
COMPAT_ERROR_MODEL="__aituber_invalid_model__" \
node packages/chat/examples/compat-probe/index.js
```

The required probe covers non-streaming, SSE streaming, conversation history,
long input, intentional 4xx handling, and timeout handling. A passing probe is
necessary but not sufficient; complete the browser-based Core check too.

## Acceptance Criteria

Complete the task only when:

- the chosen backend and exact version are recorded
- the model fits the selected Colab runtime and reaches ready state
- the public Chat Completions endpoint requires a non-default API key
- `/v1/models`, non-streaming chat, SSE streaming, and CORS preflight pass
- all required compatibility-probe checks pass
- one Core React sample receives and displays a streamed response
- no token, temporary endpoint, notebook secret, or machine-specific path was
  written to the repository

If only a non-streaming Quick Tunnel check succeeds, report a partial result.
Do not describe it as Core-compatible or silently switch to another tunnel.

## Failure Modes

- No GPU or unsupported accelerator: select a compatible Colab GPU runtime.
- CUDA, PyTorch, or vLLM install mismatch: return to a clean runtime, compare
  the official install matrix, and retry in an isolated virtual environment
  with one deliberate version or CUDA-variant change. An error such as missing
  `libcudart.so.13` after a system install is an environment mismatch, not a
  model or GPU-capacity failure.
- Model is gated: ask the user to accept its license and add `HF_TOKEN` to
  Colab Secrets.
- Out of memory: lower `max_model_len`, select a supported quantization, choose
  a smaller model, or use a larger runtime. Do not present reduced settings as
  equivalent without noting the tradeoff.
- vLLM reports a missing chat template: choose a model with a documented chat
  template or pass a verified template. Do not invent one.
- llama.cpp CUDA build is slow: build only the selected pinned revision, record
  the detected GPU architecture, and use a conservative parallel job count.
  Do not replace the verified source build with an unverified binary.
- GGUF verification fails: delete only the incomplete artifact, redownload it,
  and recheck the official byte size and SHA-256 before starting the server.
- llama.cpp wrong-model `4xx` probe fails: stop single-model mode and use the
  router preset with `--no-models-autoload`; do not weaken or skip the probe.
- Local API works but public API fails: inspect the tunnel process and test
  `/v1/models` before debugging Core.
- Non-streaming works but streaming stalls: verify the tunnel supports SSE.
  Restart cloudflared once after confirming local SSE. If it still fails,
  report the Quick Tunnel as incompatible for that session and stop before the
  Core sample.
- Browser request fails while command-line requests pass: inspect the CORS
  preflight and selected backend allowed origins/headers.
- `401 Unauthorized`: confirm that the same temporary backend API key is used
  by the probe and Core settings.
- API key appears in a log or process list: stop the non-public server, rotate
  the key, and restart with `VLLM_API_KEY` or `LLAMA_API_KEY` in the child
  environment instead of `--api-key`. Redact the old value from every
  diagnostic excerpt.
- Wrong-model `4xx` probe fails: inspect the backend response and verify it
  follows the OpenAI-compatible error path before changing the probe.

## Boundaries

- Do not add the selected model to repository-supported model lists merely
  because it works in this generic OpenAI-compatible flow.
- Do not modify package source code to compensate for an unverified backend.
- Do not expose an unauthenticated public LLM endpoint.
- Do not fall back to ngrok or require an ngrok account.
- Do not use this workflow as production hosting. Colab runtimes and temporary
  tunnels can expire without notice.
- Do not mix vLLM, llama.cpp, or a future SGLang path in one backend adapter.
  Keep separate launch, authentication, cleanup, and acceptance evidence.

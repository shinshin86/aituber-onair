---
name: wrap-tts-as-openai-compatible
description: Wrap a practical local or self-hosted TTS engine behind an OpenAI-compatible `POST /v1/audio/speech` server, especially for Google Colab or browser-driven testing. Use when requests include exposing a TTS model as OpenAI-compatible speech, building a compatibility wrapper for a broadly usable local TTS, classifying how an upstream TTS should be adapted, adding JSON/CORS support, or debugging browser/CORS/422/500/runtime issues for custom TTS servers.
---

# Wrap TTS As OpenAI-Compatible

## Overview

Build or fix a thin compatibility server that exposes an existing TTS runtime as
OpenAI-compatible speech at `POST /v1/audio/speech`.

Prefer a minimal adapter. Do not redesign the upstream TTS runtime unless the
request explicitly asks for it.

Optimize for practical local TTS runtimes that can reasonably fit the OpenAI
speech shape: text input, optional voice selection, optional speed, and WAV
output.

## Scope

Good fit:

- local or self-hosted TTS with a stable Python API, CLI, or save helper
- engines that can generate a single complete WAV response for one text input
- engines that can be driven in Colab or a normal Python environment without
  large custom serving infrastructure

Out of scope by default:

- research-first repos with fragile notebooks as the main inference path
- systems whose primary value is streaming, duplex audio, or realtime turn
  management rather than one-shot speech generation
- engines that require nonstandard request inputs such as reference audio,
  long-lived sessions, or multi-step orchestration to be useful

For out-of-scope engines, do not force them into this skill. Say that the
engine does not fit the minimal OpenAI-compatible wrapper path cleanly, and
either narrow the scope or use a separate workflow.

## Inputs

Collect missing inputs before editing:

- `source_repo`: upstream TTS repository or runtime source
- `runtime_env`: one of `colab`, `local-python`, or `server`
- `model_id`: default model id to expose
- `response_format`: default `wav`
- `cors_origins`: browser origins to allow, if browser use is expected
- `supports_voice_optional`: whether `voice` should be optional; default `true`
- `api_path`: default `/v1/audio/speech`

## Procedure

1. Inspect the upstream TTS runtime before writing wrapper code.
   Classify it into one primary integration pattern:
   - **Pattern A: direct Python API**
     - Example shape: `model.generate(...)` returns audio or
       `generate_to_file(...)` exists.
     - Prefer this when the upstream project exposes a stable Python entrypoint.
   - **Pattern B: CLI or batch inference with file output**
     - Example shape: `./bin/piper --text ... -f output.wav`.
     - Prefer this when the upstream project already writes WAV reliably from a
       command line interface.
   - **Pattern C: internal runtime plus project save helper**
     - Example shape: `runtime.synthesize(...)` plus a repo helper such as
       `save_wav(...)`.
     - Prefer this when direct serialization is fragile and the upstream repo
       already has a proven save path.
2. For the chosen pattern, find both:
   - the canonical inference entrypoint
   - the canonical audio-save path used by the repo itself
   Do not assume `result.audio` can be serialized directly.
   If the repo only demonstrates inference through notebooks or research
   scripts, stop and reassess whether this skill is the right tool.
3. Preserve OpenAI-compatible request semantics:
   - Accept `application/json`.
   - Support `model`, `input`, optional `voice`, optional `speed`, and
     optional `response_format`.
   - If the upstream runtime has no `voice` concept, accept `voice` but treat
     it as optional metadata.
4. Preserve OpenAI-compatible response semantics:
   - Return raw audio bytes with `media_type="audio/wav"` unless another format
     is explicitly requested and supported.
   - Set `Content-Length` when practical.
   - If the upstream engine only supports WAV, reject unsupported
     `response_format` values with a clear `400`.
   - Do not add `content-range` unless implementing Range support.
5. For browser-driven examples, configure CORS explicitly:
   - Prefer framework middleware over hand-written `OPTIONS` routes.
   - Allow `POST` and `OPTIONS`.
   - Allow `Content-Type` and `Authorization`.
   - If browser clients need to read custom headers, expose them explicitly.
6. For Colab, isolate dependencies:
   - Prefer project-local `.venv` or equivalent over global `pip install`.
   - Avoid mutating the Colab base environment when possible.
   - Log server output to a file such as `uvicorn.log`.
7. Pick the simplest wrapper that matches the upstream:
   - Pattern A: call the Python API directly; prefer `generate_to_file(...)`
     over reimplementing serialization.
   - Pattern B: shell out to the CLI, write to a temporary WAV, then return the
     file bytes.
   - Pattern C: call the runtime directly and reuse the repo's own save helper.
   Do not add nonstandard OpenAI extensions unless the user explicitly asks for
   them.
8. Add minimal observability:
   - Persist server logs to a file.
   - Return structured 500 JSON during debugging if needed.
   - Keep the wrapper simple once the issue is resolved.
9. Verify in this order:
   - Local root endpoint (`GET /`)
   - Model listing (`GET /v1/models`) if implemented
   - `curl` JSON request to `/v1/audio/speech`
   - Browser request from the intended frontend
   - `@aituber-onair/voice` integration if the wrapper is meant to be consumed
     by this repo

## Validation Scope

If the wrapper is intended for `@aituber-onair/voice`, validate both layers:

- **Wrapper-only validation**
  - local request works
  - tunnel or public URL works
  - browser CORS works
- **Consumer validation**
  - `openaiCompatible` in `@aituber-onair/voice` can fetch audio from the
    wrapper
  - the React example can play audio with the intended `model`, optional
    `voice`, and optional API key flow

## Common Failure Modes

- `422` with `body.input` missing:
  - The server is still expecting `Form(...)` instead of JSON.
- Browser shows CORS but server actually failed:
  - A `500` response without CORS headers often looks like a CORS failure in
    the browser. Check server logs first.
- Repeatedly seeing old behavior:
  - An old server process is still bound to the port. Kill it before restart.
- `ModuleNotFoundError` in Colab:
  - The required dependency was installed into the wrong environment.
- WAV serialization failure:
  - The wrapper is bypassing the upstream repo's canonical save path.
- Wrapper works with `curl` but not from `@aituber-onair/voice`:
  - Check whether the consumer sends `voice`, `speed`, API key headers, and
    browser-origin CORS exactly as expected.
- Reached the wrong abstraction level:
  - If the upstream already exposes a reliable file-output CLI or save helper,
    stop trying to invent a lower-level serialization path.
- The upstream is too research-oriented:
  - If clean one-shot WAV generation is not already demonstrated, this skill is
    probably the wrong abstraction.

## References

- Read the compatibility checklist and debugging notes in:
  `skills/wrap-tts-as-openai-compatible/references/openai-compatible-tts-checklist.md`
- For choosing the adapter shape, read:
  `skills/wrap-tts-as-openai-compatible/references/integration-patterns.md`
- For `@aituber-onair/voice` integration and browser checks, read:
  `skills/wrap-tts-as-openai-compatible/references/voice-e2e-validation.md`

## Verification Commands

Run from the wrapper project root or notebook environment:

```bash
curl -i http://127.0.0.1:8000/
curl -i http://127.0.0.1:8000/v1/models
curl -X POST http://127.0.0.1:8000/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"<model_id>","input":"hello","speed":1}' \
  --output out.wav
```

For Colab or uvicorn-backed wrappers, also check:

```bash
tail -n 200 uvicorn.log
```

## Acceptance Criteria

- The upstream TTS has been classified into a concrete wrapper pattern before
  implementation.
- The wrapper accepts JSON requests at `/v1/audio/speech`.
- `voice` is optional when the upstream runtime does not need it.
- The response returns playable audio bytes with `audio/wav`.
- Browser access works when CORS is expected.
- Colab or local setup avoids unnecessary global dependency conflicts.
- The implementation uses the upstream repo's proven WAV-save path when
  available.
- If the wrapper is intended for this repo, `@aituber-onair/voice` can use it
  through the `openaiCompatible` path.
- The chosen upstream TTS is a practical fit for one-shot OpenAI-compatible
  speech, not a forced adaptation of a research-only or streaming-first system.

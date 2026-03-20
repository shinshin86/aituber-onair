# OpenAI-Compatible TTS Checklist

## API Contract

- Endpoint: `POST /v1/audio/speech`
- Request body: `application/json`
- Required fields:
  - `model`
  - `input`
- Optional fields:
  - `voice`
  - `speed`
  - `response_format`
- Response:
  - Raw audio bytes
  - `Content-Type: audio/wav`
  - `Content-Length` when practical
- If only WAV is supported, reject unsupported `response_format` values instead
  of silently ignoring them.

## Wrapper Pattern Selection

Pick one upstream integration pattern before writing the wrapper:

- Pattern A: direct Python API
- Pattern B: CLI or batch file-output path
- Pattern C: internal runtime plus project save helper

Prefer the highest-level proven path that the upstream repo already documents.

Before proceeding, ask one gating question:

- Can this engine cleanly produce one-shot WAV output from text without relying
  on notebook-only flows, streaming sessions, or required extra inputs outside
  the default OpenAI speech request?

If not, this skill is probably not the right default path.

## Browser Compatibility

- Use framework CORS middleware.
- Allow:
  - `POST`
  - `OPTIONS`
  - `Content-Type`
  - `Authorization`
- Expose any custom headers that the client needs to read.
- If the browser shows a CORS error and the server returned `500`, treat the
  server exception as the primary issue first.

## Colab Setup Notes

- Prefer project-local `.venv` plus `uv` or equivalent.
- Avoid global `pip install` when the dependency rewrites shared packages such
  as `protobuf`.
- Log `uvicorn` output to a file for repeatable debugging.
- Kill any old `uvicorn` and tunnel processes before restart.

## Audio Serialization Guidance

- First choice: reuse the upstream repo's save helper.
- If a direct `generate_to_file(...)`-style API exists, use it instead of
  reimplementing serialization.
- If a CLI already writes WAV reliably, wrap the CLI before attempting to
  serialize internal tensors manually.
- For Irodori-TTS, prefer `save_wav(...)` from
  `irodori_tts.inference_runtime` instead of rolling a new `soundfile` path.
- If no helper exists, inspect:
  - `type(result.audio)`
  - `dtype`
  - `shape`
  before choosing a serialization path.

## Debug Order

1. Confirm the new server process actually started and bound the port.
2. Confirm `curl` works locally.
3. Confirm tunnel URL points to the current process.
4. Confirm browser CORS with the real origin.
5. Confirm the intended consumer, such as `@aituber-onair/voice`, can use the
   wrapper.
6. Only after that, refine wrapper behavior.

## Known Symptom Mapping

- `422` + `body.input` missing:
  - JSON route mismatch; likely still using `Form(...)`.
- `500` + browser shows CORS:
  - Server exception with missing CORS headers on error path.
- `ModuleNotFoundError`:
  - Dependency installed outside the actual runtime environment.
- `address already in use`:
  - Old server process still owns the port.
- `Format not recognised` while writing WAV:
  - Wrong serialization path; use the upstream helper if present.
- Wrapper works in `curl` but fails from the browser client:
  - Recheck CORS, optional `voice`, API key handling, and the exact request
    body sent by the frontend.
- The wrapper keeps growing nonstandard request fields:
  - The upstream engine may not be a good fit for this minimal compatibility
    layer.

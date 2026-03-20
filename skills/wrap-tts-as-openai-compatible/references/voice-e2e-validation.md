# `@aituber-onair/voice` E2E Validation

Use this when the compatibility server is intended to be consumed by
`@aituber-onair/voice`.

## Goal

Confirm both:

- the wrapper server works on its own
- the `openaiCompatible` path in `@aituber-onair/voice` can consume it from the
  browser-facing example

## Validation Order

1. Verify the wrapper locally:
   - `GET /`
   - `GET /v1/models` if implemented
   - `curl` JSON request to `/v1/audio/speech`
2. Verify the browser path:
   - target server returns the required CORS headers
   - tunnel URL points to the current process
3. Verify `@aituber-onair/voice` integration:
   - build `@aituber-onair/voice`
   - run the React example
   - select `openaiCompatible`
   - set the wrapper URL and model
   - test with and without `voice` depending on upstream behavior

## Repo Checks

Run these from the repository root when validating integration changes:

```bash
npm -w @aituber-onair/voice run fmt
npm -w @aituber-onair/voice run build
npm -w @aituber-onair/voice run test
cd packages/voice/examples/react-basic && npm run build
```

If runtime behavior must be checked manually:

```bash
cd packages/voice/examples/react-basic && npm run dev
```

## React Example Expectations

- `engineType` is `openaiCompatible`
- API URL points to `/v1/audio/speech`
- API key is optional unless the upstream server requires it
- `voice` is optional for wrappers that do not require a speaker

## Symptom Mapping

- `Unsupported voice engine type: openaiCompatible`
  - `@aituber-onair/voice` dist output is stale; rebuild the package.
- `API key is required for openai`
  - example validation logic still treats `openaiCompatible` as plain OpenAI.
- Browser `Failed to fetch`
  - check server reachability, then CORS, then tunnel freshness.
- `422` from the wrapper
  - inspect the exact request body sent by the browser.

## Good End State

- `curl` can save a playable WAV from the wrapper
- the React example can fetch and play audio through `openaiCompatible`
- the final setup path is reproducible in Colab or local Python without
  depending on ad hoc dev-only proxy behavior

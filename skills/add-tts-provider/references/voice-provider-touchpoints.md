# Voice Provider Touchpoints

Use this file when applying `$add-tts-provider`.

## Public Touchpoints

- `packages/voice/src/types/voiceEngine.ts`
  Add the new `engineType` string.
- `packages/voice/src/services/VoiceService.ts`
  Add provider-specific public option types and update types.
- `packages/voice/src/engines/index.ts`
  Export the new engine class.
- `packages/voice/src/index.ts`
  Usually already covered by `export * from './engines';`, but confirm.

## Internal Touchpoints

- `packages/voice/src/constants/voiceEngine.ts`
  Add a default endpoint only if the provider has a stable default URL.
- `packages/voice/src/engines/<Engine>.ts`
  Add the provider implementation.
- `packages/voice/src/engines/VoiceEngineFactory.ts`
  Register the constructor.
- `packages/voice/src/services/internal/engineHandlers/<engine_type>.ts`
  Add handler-owned option application and update key rules.
- `packages/voice/src/services/internal/engineHandlers/index.ts`
  Register the handler.

## Test Touchpoints

- `packages/voice/tests/<Engine>.test.ts`
  Provider-specific tests.
- `packages/voice/tests/VoiceEngineAdapter.test.ts`
  Adapter integration and `updateOptions()` regression tests.
- `packages/voice/tests/index.test.ts`
  Export-surface regression tests if public exports change.

## Docs And Examples

- `packages/voice/README.md`
- `packages/voice/README_ja.md`
- `packages/voice/examples/react-basic/src/App.tsx`
- `packages/voice/examples/react-basic/README.md`
- `packages/voice/examples/README.md`
- Example READMEs and Node/Bun/Deno examples only when requested by scope.

## Naming Rules

- Keep the existing public option style:
  - `<engine_type>ApiUrl`
  - `<engine_type><SettingName>`
- Do not add a nested `config` object.
- Do not change `VoiceEngineAdapter` consumer usage.
- Prefer explicit option names over generic maps.

## Pattern Selection

- `local` provider:
  - Usually has `ApiUrl`
  - Usually does not require `apiKey`
  - Example patterns: `voicevox`, `voicepeak`, `aivisSpeech`
- `cloud` provider:
  - Usually uses `apiKey`
  - May have no public API URL override
  - Example patterns: `openai`, `aivisCloud`, `minimax`
- `openai-compatible` provider:
  - Prefer a dedicated provider when endpoint URL, API key optionality, or
    default model differs from the official `openai` provider
  - Usually has `ApiUrl`, `Model`, and `Speed`
  - Often accepts an optional `apiKey`
  - Example pattern: `openaiCompatible` for Kokoro FastAPI style endpoints

## Internal Refactor Assumption

The current design keeps provider-specific logic out of
`VoiceEngineAdapter.ts` and inside `src/services/internal/engineHandlers/`.
New providers should follow that structure rather than reintroducing large
provider-specific `switch` blocks into the adapter.

# Contributing to @aituber-onair/voice

## Adding a TTS provider

When adding a new voice engine, keep the public API and internal option wiring
in sync. A complete provider usually needs these changes:

1. Add `src/engines/FooEngine.ts`.
2. Add the engine type to `src/types/voiceEngine.ts`.
3. Register the constructor in `src/engines/VoiceEngineFactory.ts`.
4. Export the engine from `src/engines/index.ts`.
5. Add `FooVoiceServiceOptions` and update unions in
   `src/services/VoiceService.ts`.
6. Add the configurable engine interface to
   `src/services/internal/engineHandlers/types.ts`.
7. Add `src/services/internal/engineHandlers/foo.ts` and register it in
   `src/services/internal/engineHandlers/index.ts`.
8. Add focused tests for the engine, handler, factory registration, and option
   propagation through `VoiceEngineAdapter`.

Prefer shared helpers from `src/engines/internal/` and `src/utils/` for URL
building, decoding, clamping, WAV creation, and fetch timeout behavior. Do not
add provider SDKs as package dependencies unless they are required at runtime
for every consumer.

After changes, run the affected package checks in order:

```bash
npm -w @aituber-onair/voice run fmt
npm -w @aituber-onair/voice run build
npm -w @aituber-onair/voice run test
```

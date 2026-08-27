# Browser basic example

This minimal browser example exercises `@aituber-onair/transcription` without
AITuber OnAir Core or a UI framework. The interface automatically starts in
Japanese for Japanese browser preferences and otherwise starts in English. Use
the language selector in the page to switch at any time.

Install the repository dependencies from the repository root first. Then start
the example from this directory:

```sh
cd packages/transcription/examples/browser-basic
npm run dev
```

You can also start it from the repository root:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Web Speech and Local Whisper require no API key. To use OpenAI or Gemini, select
the provider and enter an API key from your own account. The example connects
to the selected service directly from the browser, so avoid using it on a
shared device. Production Gemini integrations should use a backend-issued
ephemeral token instead of a standard API key in the browser.

Use localhost or HTTPS and grant microphone access when prompted. Local Whisper
requires WebGPU. Select Tiny (about 122 MB), Base (about 209 MB), or Small
(about 589 MB); larger models take longer to download and infer. The default is
Tiny. Assets are cached in the browser. The example aggregates known per-file
totals to show overall download progress, then shows model initialization and
hides the progress row when listening starts. Microphone audio stays in the
browser. OpenAI and Gemini usage may incur charges while a session is
listening. Gemini Live Transcribe connections are limited to 10 minutes.

## Local Whisper worker URL

This example aliases the package entry to `src/index.ts`, so the published
`dist/local-whisper.worker.js` asset is not available during local development.
It therefore imports the source worker with Vite's `?worker&url` query and
passes that URL to the Local Whisper session through `workerUrl`. The session
creates the module worker only when Local Whisper is started; loading the page
or selecting another provider does not initialize Transformers.js. Vite handles
the same import during development and emits a dedicated worker chunk in
production builds. The Vite worker output format is set to `es`; no dependency
optimization exclusion is required.

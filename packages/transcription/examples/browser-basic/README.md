# Browser basic example

This minimal browser example exercises `@aituber-onair/transcription` without
AITuber OnAir Core or a UI framework.

From the repository root:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Web Speech requires no API key. For the recommended OpenAI server mode, copy
`.env.example` to `.env.local` in this directory and set `OPENAI_API_KEY`. The
key stays in the local Vite server and the browser receives only a short-lived
client secret.

Browser BYOK is also available for frontend-only testing. Enter an end-user
owned key in the page after accepting the displayed risk. The example keeps it
only in the input element and does not persist it.

Use localhost or HTTPS and grant microphone access when prompted. OpenAI usage
may incur charges while a session is listening.

# Browser basic example

This minimal browser example exercises `@aituber-onair/transcription` without
AITuber OnAir Core or a UI framework.

From the repository root:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Web Speech requires no API key. To use OpenAI, select OpenAI Realtime and enter
an end-user-owned API key in the page. The example reads the key from the input
when a session starts and does not persist it. This browser BYOK flow is meant
only for frontend-only testing; review the risk shown in the page before use.

Use localhost or HTTPS and grant microphone access when prompted. OpenAI usage
may incur charges while a session is listening.

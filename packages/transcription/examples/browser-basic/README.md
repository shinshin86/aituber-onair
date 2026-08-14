# Browser basic example

This minimal browser example exercises `@aituber-onair/transcription` without
AITuber OnAir Core or a UI framework. The interface automatically starts in
Japanese for Japanese browser preferences and otherwise starts in English. Use
the language selector in the page to switch at any time.

From the repository root:

```sh
npm -w @aituber-onair/transcription run example:dev
```

Web Speech requires no API key. To use OpenAI, select OpenAI Realtime and enter
an API key from your own OpenAI account. The example connects to OpenAI directly
from the browser, so avoid using it on a shared device.

Use localhost or HTTPS and grant microphone access when prompted. OpenAI usage
may incur charges while a session is listening.

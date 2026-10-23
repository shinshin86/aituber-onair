# Hand-made replay fixture

These responses are hand-written in `src/autoscript/demo-cache.ts`. They are
fictional demo annotations, not outputs from an LLM or proof of vision quality.
No API calls are used to create them. Each JSON entry stores the SHA-256 hash of
the full canonical request (including the extracted image) and a response string.
No keys, request bodies or source images are stored here.

From the example directory run `npm run build`, then replay using the command in
the README. To adapt hashes after changing prompts, the demo, or your local
ffmpeg/canvas version, run `npm run demo:dungeon` then `npm run demo:cache`.
The latter regenerates the sample JSON too. It is deliberately separate from
build; a normal build never silently updates these fixtures.

Use a separate ignored `work/` cache directory for real `--record` output.
Do not mix real responses with this hand-made fixture.

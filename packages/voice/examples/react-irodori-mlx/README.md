# Irodori Local Voice (Apple Silicon / MLX)

A standalone React + TypeScript sample using `@aituber-onair/voice` to generate
and play short speech using the bundled `sample-speaker` reference or an audio
file uploaded by the user.

Browser → `VoiceEngineAdapter` → loopback OpenAI-compatible API → persistent
MLX-Audio / Irodori model → PCM WAV → browser Web Audio playback.
The library's public `onPlay` callback uses an AudioContext resumed inside the
button click, before network inference, to accommodate autoplay restrictions.

## Requirements

- Native Apple Silicon Mac, macOS compatible with the locked MLX Metal wheel;
  macOS 14 or newer is recommended. Intel, Rosetta and CPU-only execution are not supported.
- Node.js 20+, npm, and an existing `uv` installation (tested with uv 0.9.21).
- Python 3.12 is downloaded and managed by uv inside this sample.
- Start with 16 GB unified memory and several GB of free disk space. Actual peak
  memory and inference time depend on the Mac and reference audio.
- A short, clear reference clip you provide: WAV, MP3 or FLAC supported by
  SoundFile. Only the first five seconds are read, downmixed and resampled to
  48 kHz. At least one second and non-silent audio are required. Put speech near
  the start; a five-second silent intro is unsuitable.

## First setup

From the repository root, install the normal workspace dependencies (`npm ci`)
if this is a fresh checkout. Then:

```sh
cd packages/voice/examples/react-irodori-mlx
npm run setup
```

Setup runs `uv sync --locked`, `npm ci`, builds the local voice package, then
fetches only these pinned resources:

| Resource | Revision |
| --- | --- |
| `mlx-community/Irodori-TTS-500M-v3-8bit` (including bundled DACVAE) | `43b5d5539d8f07da46c7cd58d9f0ebed50ec1cc9` |
| `llm-jp/llm-jp-3-150m` tokenizer JSON files only | `b112feef602fff752e4dac4c30af6a2c2fa41c7a` |

The latter is the tokenizer required by this checkpoint; **its LLM weights are
never downloaded**. MLX-Audio is locked to 0.5.3. `package-lock.json` and `uv.lock`
fix dependencies. Initial setup needs network access and can take several minutes.
No Python command uses the system environment, global pip, sudo or Homebrew.

## Default reference and browser upload

The sample includes `samples/sample-speaker.wav`: a five-second, mono 48 kHz
PCM16 reference. It is ready to select as `sample-speaker` without a local
registration file. The WAV contains audio chunks only; source filenames, tags
and filesystem attributes are not embedded.

To add your own voice, expand **自分の参照音声を追加**, enter a unique identifier
(such as `my-speaker`), choose a WAV/MP3/FLAC file, and click **音声を追加**.
The new voice is selected immediately and survives an API restart.

Uploads are sent only to this local API, limited to 10 MiB, and decoded for at
most the first five seconds. The server saves validated mono PCM WAV under a
random filename in `.local/references` and updates `.local/voices.json` atomically.
Original filenames and embedded tags are not stored. Empty/invalid/too-short
or silent audio is rejected. Existing identifiers, including `sample-speaker`,
cannot be replaced by upload. Up to 16 voices including the default are allowed.

There is no separate maximum duration for the source file: it must contain at
least one second and the **entire file** must fit within 10 MiB. Five seconds is
the amount used by the model, not a source-file duration limit. The server
automatically takes the first five seconds after receiving the file (or all of
a shorter clip). You do not need to trim it manually. Longer WAV files can
exceed the byte limit even when only the first five seconds will be used.

If a file below 10 MiB gets `Request too large`, restart `npm run dev` with
Ctrl+C first. An API process started before upload support still applies the
old 4 KiB JSON limit; refreshing the browser alone does not reload Python.

The committed default WAV is separate from all user uploads, which remain
ignored by Git. Existing manual registrations are preserved and may override
the default identifier for backward compatibility.

## Manual registration (optional)

Run inside this sample:

```sh
mkdir -p .local/references
cp /path/to/your-reference.mp3 .local/references/my-speaker.mp3
cp voices.example.json .local/voices.json
```

For WAV/FLAC, change the extension in both commands and the configuration.
The configuration maps identifiers to paths relative to `.local`:

```json
{
  "my-speaker": "references/my-speaker.mp3"
}
```

Additional voices can be added to this mapping (up to 16 including the default). Identifiers allow
letters, digits, hyphens and underscores. All files must resolve inside
`.local/references`, including symlink targets. Restart after editing registration.
The API accepts registered identifiers, never a request-supplied file path.
Keep your original reference elsewhere as a backup.

## Start, generate, play, stop

```sh
npm run dev
```

Open **http://localhost:5173** or **http://127.0.0.1:5173**.
The API listens at `127.0.0.1:8000`.
Wait for the model-ready indicator, select `sample-speaker` and a speaking speed
using the slider (0.5–2.0 in steps of 0.5; default 1.0), and click
**生成・再生**. Begin with `こんにちは。`.

The model loads once per API process. The UI displays loading, generating,
playing and error states; generation is disabled before readiness or while busy.
Keep the tab active while generating and playing. If browser audio permission
blocks playback, allow audio and click again.

Ctrl+C stops both service process groups. Startup/service failure also stops
both; shutdown escalates to SIGKILL after five seconds if native inference will
not stop. Occupied ports cause a clear failure; existing services are never killed.
API initialization is allowed up to 180 seconds. Logs are replaced on each launch
in `.local/api.log` and `.local/frontend.log`.

## Limits and error handling

- One short sentence, at most 40 Unicode code points. This is a conservative input
  limit, not a guarantee of sub-30-second generation on every Mac.
- `cfg_guidance_mode="alternating"`, six Sway steps (`sway_coeff=-1`),
  `max_seconds=6`, `max_ref_seconds=5`, non-streaming generation.
- v3 dynamically predicts sequence length; setting `sequence_length` alone
  does not constrain it. The sample wraps the model's public `generate_latents`
  method to inspect its returned frame count **before silence trimming**.
  Reaching the six-second frame cap produces HTTP 422 rather than playing a
  possibly truncated sentence. This conservative check may reject an exact fit.
  It cannot prove correct pronunciation or semantic completion below the cap.
- The API accepts finite `speed` values from 0.5 to 2.0 (default 1.0), and maps
  them to Irodori `duration_scale=1/speed`. Values below 1 make speech slower;
  values above 1 make it faster. The UI slider moves in steps of 0.5. Unsupported values
  are rejected with 422, never silently clamped. This adjusts predicted generation
  duration rather than resampling playback, so it is not an exact audio-speed
  multiplier and pronunciation/naturalness can vary. Very short speech can hit
  Irodori's 0.5-second minimum (rounded to audio frames). Slower speech is still
  subject to the six-second cap; shorten the sentence or increase speed if rejected.
- Only one GPU request is admitted; no waiting inference queue. Concurrent
  requests get 429. The HTTP server also limits concurrent connections to 16
  and speech JSON to 4 KiB (audio uploads to 10 MiB).
- The API responds with 504 after 25 seconds, leaving margin before the voice
  package's 30-second fetch timeout. Native GPU work cannot be safely cancelled
  mid-call; the busy lock remains held until it finishes. This is a response
  deadline, not a hard wall-clock GPU limit. Shorten input and wait before retrying.
- Empty/invalid input, unsupported model/speed/format and invalid audio: 422;
  unknown voice: 404; unavailable model: 503; generation failure: 500.
- WAV validation rejects empty, non-finite or near-silent data (RMS < 0.0001).
  Peaks above 0.98 are attenuated before upstream PCM16 serialization. This
  prevents serialization clipping; it does not repair upstream waveform distortion.
- The API logs reference PCM SHA-256, duration and generated audio metrics, never
  the input sentence. The `reference` event describes the bounded waveform
  actually passed as `ref_audio` to the model. Paths are not returned by `/voices`.
- CORS permits both `http://localhost:5173` and `http://127.0.0.1:5173`.
  Requests with other Origin headers
  are rejected. This loopback sample has no authentication and is not intended
  for tunnels, LAN exposure or deployment.

## API

`POST /voices/{identifier}` accepts raw audio bytes (`application/octet-stream`).
Success returns 201 with `{"voice":"identifier"}`; duplicate names return 409,
invalid audio/name 422, oversized payload 413, and a concurrent upload 429.

`GET /health`: `status` (`loading`, `ready`, `error`), `busy`, `error`.
Returns 503 until model preparation succeeds. `GET /voices` returns identifiers.

```sh
curl --fail-with-body http://127.0.0.1:8000/v1/audio/speech \
  -H 'Content-Type: application/json' \
  -d '{"model":"mlx-community/Irodori-TTS-500M-v3-8bit","input":"こんにちは。","voice":"sample-speaker","speed":1.0}' \
  --output .local/generated.wav
```

Success returns `Content-Type: audio/wav`. Failures return JSON; do not treat an
error response saved by curl as audio. The browser adapter uses the same payload.
It exposes generic HTTP errors, so consult `.local/api.log` for detailed failures.

## Isolation, cache and offline use

Everything below is sample-local and ignored by Git:

| Directory | Contents |
| --- | --- |
| `.python/` | uv-managed Python distribution |
| `.venv/` | Locked Python environment |
| `.cache/uv/`, `.cache/npm/` | Dependency caches |
| `.cache/huggingface/` | Hugging Face metadata/cache |
| `.cache/model/` | Pinned model, codec, tokenizer and setup manifest |
| `.local/` | User configuration, references, generated audio, verification, logs |

The Node launcher sets `UV_CACHE_DIR`, `UV_PYTHON_INSTALL_DIR`, `HF_HOME`,
`XDG_CACHE_HOME` and related variables only in children. It removes inherited
Python environment overrides. No manual exports or shell profile changes are needed.
`npm run dev` uses existing environments (`uv run --no-sync --offline`) and
forces Hugging Face/Transformers offline. After successful setup, it works without
network access; missing assets cause an error instead of downloading another model.
Do not delete the tokenizer or bundled codec from the cache.

Stop the sample before cleanup. To rebuild dependencies while retaining the model:

```sh
rm -rf .venv node_modules
npm run setup
```

To remove the downloaded environment and rebuild from scratch:

```sh
rm -rf .venv .python .cache node_modules dist
npm run setup
```

These commands must be run **inside this sample directory**. `.local` is retained
so references are not accidentally deleted. Remove `.local` separately only when
you intend to erase your local settings, copied audio and logs.

## Metal troubleshooting

First confirm a native arm64 terminal and supported macOS/MLX version. A sandbox
may deny GPU discovery or abort during `import mlx.core`, before Python can even
report `metal.is_available()`. Retry the same `npm run dev` from a normal local
terminal. If that succeeds, the failure was the execution environment, not the
TTS wrapper. Do not install system Python packages or silently switch to CPU.
Check `.local/api.log` for missing model files, reference decode errors or Metal
initialization failures. Exit and close other GPU-heavy apps if memory is low.

## Development and verification

```sh
npm run fmt
npm run build
npm test
```

Tests cover HTTP validation/CORS, bounded requests, serialization, reference
containment, duration caps and busy admission after timeouts. They use a fake
runtime for API tests; those tests do **not** establish audible MLX compatibility.
Live validation must separately use a provided reference, generate through the
browser, observe playback, inspect PCM duration/RMS/peak and retain screenshots
and logs under `.local`. Voice similarity and pronunciation require listening.

The library's public API is unchanged. This example uses the repository-local
voice package just like `react-basic`; no version bump or new provider is needed.

## Implementation sources

- [MLX-Audio 0.5.3 published source](https://pypi.org/project/mlx-audio/0.5.3/#files):
  `mlx_audio/tts/models/irodori_tts/irodori_tts.py`, `tts/utils.py`, `audio_io.py`.
- [Pinned model configuration](https://huggingface.co/mlx-community/Irodori-TTS-500M-v3-8bit/blob/43b5d5539d8f07da46c7cd58d9f0ebed50ec1cc9/config.json).
- [Pinned tokenizer files](https://huggingface.co/llm-jp/llm-jp-3-150m/tree/b112feef602fff752e4dac4c30af6a2c2fa41c7a).

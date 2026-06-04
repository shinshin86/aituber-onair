---
name: connect-colab-local-tts
description: Launch a local-tts-on-google-colab OpenAI-compatible TTS server through Colab MCP Go, expose it with trycloudflare, then validate it from @aituber-onair/voice using the Node.js openaiCompatible example. Use when requests mention connecting Colab local TTS, local-tts-on-google-colab, Colab MCP Go, trycloudflare TTS URLs, or running @aituber-onair/voice against a Colab OpenAI-compatible speech endpoint.
---

# Connect Colab Local TTS

## Goal

Use Colab MCP Go to drive Google Colab, launch
`shinshin86/local-tts-on-google-colab`, capture its public
`trycloudflare` URL, and verify speech generation through
`@aituber-onair/voice`.

This skill consumes an existing OpenAI-compatible Colab TTS project. Do not
rewrite TTS wrappers unless the user explicitly asks for wrapper development.

## Inputs

Collect or infer:

- `repo_url`: default `https://github.com/shinshin86/local-tts-on-google-colab.git`
- `repo_ref`: default `main`; prefer a tag or commit for reproducible runs
- `engine`: default `Irodori-TTS` when the user does not choose one
- `model`: OpenAI-compatible model id; default to the selected engine
- `voice`: optional; leave empty for engines with no useful voice selector
- `text`: Japanese smoke text to synthesize

Good sample engines:

- `Irodori-TTS`: useful Japanese default candidate
- `Piper-Plus`: lightweight multilingual candidate
- `MOSS-TTS-v1.5`: notable Hugging Face model, but A100-class Colab is usually
  required

## Procedure

1. Confirm Colab MCP Go is available.
   - Use `open_colab_browser_connection` when the Colab session is not
     connected.
   - Then call `list_colab_tools`.
   - Do not assume exact remote tool names; choose the available tool that can
     create/replace notebook cell code and run it.
2. If the run needs a GPU, gated model access, or `HF_TOKEN`, ask the user to
   prepare those items in Colab before launching.
   - The user handles Google login, runtime selection, gated-model license
     acceptance, and token/secret setup.
   - The agent should still explain the concrete missing prerequisite.
3. Generate one Colab cell that launches the selected engine.
   - Use `repo_url`, `repo_ref`, and `engine`.
   - Keep `EXPOSE_PUBLIC_URL = True`.
   - Pass engine-specific options only when the user chose them.
   - Set `OPENAI_MODEL_ID` to `model` when provided.
4. Execute the cell through the Colab MCP tools and monitor output.
   - Wait for `=== Public Ready ===`.
   - Extract `Speech   : https://...trycloudflare.com/v1/audio/speech`.
   - If the MCP result only shows `CompletedProcess(...)`, inspect
     `/content/openai-compatible-local-tts/logs/cloudflared.log` and extract
     the latest `https://...trycloudflare.com` URL.
   - If the run fails, inspect the tail shown by the Colab output before
     changing settings.
5. Validate the Colab server itself.
   - Use the generated test curl from Colab output when possible.
   - Confirm `GET /v1/models` and `POST /v1/audio/speech` work before running
     the local voice package example.
6. Validate `@aituber-onair/voice` locally.
   - Build the voice package before running the Node example.
   - Run `packages/voice/examples/node-basic/openai-compatible-colab-example.js`
     with dynamic environment variables:

```bash
OPENAI_COMPATIBLE_TTS_URL="<speech_url>" \
OPENAI_COMPATIBLE_TTS_MODEL="<model>" \
OPENAI_COMPATIBLE_TTS_VOICE="<voice>" \
OPENAI_COMPATIBLE_TTS_TEXT="<text>" \
node packages/voice/examples/node-basic/openai-compatible-colab-example.js
```

Use `OPENAI_COMPATIBLE_TTS_PLAY=0` when the environment cannot play audio but
WAV generation should still be verified.

## Colab Cell Shape

Use the current canonical launch flow from
`local-tts-on-google-colab`. The generated cell should be equivalent to:

```python
REPO_URL = "https://github.com/shinshin86/local-tts-on-google-colab.git"
REPO_REF = "main"
WORKDIR = "/content/local-tts-on-google-colab"
ENGINE = "Irodori-TTS"
EXPOSE_PUBLIC_URL = True
TEST_TEXT = "こんにちは。AITuber OnAir Voice から再生しています。"
TEST_SPEED = 1.0
TEST_VOICE = ""
OPENAI_MODEL_ID = "Irodori-TTS"

import os
import subprocess

if not os.path.exists(WORKDIR):
    subprocess.run(["git", "clone", REPO_URL, WORKDIR], check=True)

subprocess.run(["git", "fetch", "--all", "--tags"], cwd=WORKDIR, check=True)
subprocess.run(["git", "checkout", REPO_REF], cwd=WORKDIR, check=True)

cmd = [
    "python", "colab/bootstrap.py",
    "--engine", ENGINE,
    "--test-text", TEST_TEXT,
    "--test-speed", str(TEST_SPEED),
    "--openai-model-id", OPENAI_MODEL_ID,
]
if TEST_VOICE:
    cmd.extend(["--test-voice", TEST_VOICE])
if EXPOSE_PUBLIC_URL:
    cmd.append("--expose-public-url")
else:
    cmd.append("--no-expose-public-url")

subprocess.run(cmd, cwd=WORKDIR, check=True)
```

For `Piper-Plus`, add `--piper-plus-model <value>` only when the user chooses
one. For `MOSS-TTS-v1.5`, warn that A100 is expected and pass
`--moss-tts-v1-5-language`, `--moss-tts-v1-5-default-voice`, or prompt WAV
options only when selected.

## Verification Commands

Run from the repository root after a code change:

```bash
npm -w @aituber-onair/voice run fmt
npm -w @aituber-onair/voice run build
npm -w @aituber-onair/voice run test
```

For a live Colab endpoint:

```bash
OPENAI_COMPATIBLE_TTS_URL="<speech_url>" \
OPENAI_COMPATIBLE_TTS_MODEL="<model>" \
OPENAI_COMPATIBLE_TTS_VOICE="<voice>" \
OPENAI_COMPATIBLE_TTS_PLAY=0 \
node packages/voice/examples/node-basic/openai-compatible-colab-example.js
```

## Failure Modes

- Colab MCP tools are unavailable: open the Colab browser connection and list
  tools again.
- No public URL appears: check `cloudflared` output and whether the server
  became ready locally.
- Colab reports success but no detailed output: read the files under
  `/content/openai-compatible-local-tts/logs`, especially `cloudflared.log`
  and the engine-specific uvicorn log.
- `MOSS-TTS-v1.5` fails on L4/T4: retry on A100 or choose a lighter engine.
- `POST /v1/audio/speech` fails but `/v1/models` works: inspect Colab logs and
  verify model, voice, prompt WAV, language, and gated-model prerequisites.
- Node example saves no audio: confirm `OPENAI_COMPATIBLE_TTS_URL` includes
  `/v1/audio/speech`, and set `OPENAI_COMPATIBLE_TTS_PLAY=0` to isolate
  playback from synthesis.

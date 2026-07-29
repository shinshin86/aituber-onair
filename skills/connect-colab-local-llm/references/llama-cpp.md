# llama.cpp Colab Adapter

Use this adapter for GGUF artifacts. Recheck the linked upstream documentation
when the Colab image, CUDA toolkit, llama.cpp revision, or model changes.

## Contents

- Official references
- Runtime and artifact checks
- CUDA build
- GGUF download verification
- Strict authenticated router
- Endpoint behavior and cleanup
- Initial live validation

## Official References

- Repository and CUDA build:
  https://github.com/ggml-org/llama.cpp
- Server and OpenAI-compatible API:
  https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- CUDA build details:
  https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md

The server provides `/v1/models`, `/v1/chat/completions`, SSE streaming, CORS,
and API-key authentication. Use `LLAMA_API_KEY` for the temporary key instead
of putting it in the command line.

## Runtime and Artifact Checks

Before downloading:

1. Record GPU name, VRAM, compute capability, driver, CUDA toolkit, Python,
   CMake, and free disk space.
2. Confirm that the exact GGUF filename exists in the official model
   repository.
3. Estimate model weights plus KV cache and runtime buffers. Leave several GiB
   of VRAM headroom.
4. Start with `context_size=4096`, `parallel=1`, and full GPU offload on an
   NVIDIA Colab runtime.
5. Do not assume that a GGUF supported by another application is supported by
   the pinned llama.cpp revision.

For Hugging Face artifacts, verify:

- the first four bytes are `GGUF`
- the downloaded byte size equals the `x-linked-size` response header
- SHA-256 equals the `x-linked-etag` response header

Stop before loading when any check differs.

## CUDA Build

The last live-validated revision is:

```text
e9fa0781f1c25fc4fe8c86be1edc6970661ad6f0
```

Build the pinned revision rather than an unrecorded moving branch:

```python
from pathlib import Path
import subprocess

LLAMA_CPP_REVISION = "e9fa0781f1c25fc4fe8c86be1edc6970661ad6f0"
WORKDIR = Path("/content/aituber-local-llm")
SOURCE = WORKDIR / "llama.cpp"
BUILD = SOURCE / "build-cuda"
LOGDIR = WORKDIR / "logs"
LOGDIR.mkdir(parents=True, exist_ok=True)

if not (SOURCE / ".git").exists():
    subprocess.run(
        [
            "git",
            "clone",
            "--filter=blob:none",
            "--no-checkout",
            "https://github.com/ggml-org/llama.cpp.git",
            str(SOURCE),
        ],
        check=True,
    )

subprocess.run(
    [
        "git",
        "-C",
        str(SOURCE),
        "fetch",
        "--depth",
        "1",
        "origin",
        LLAMA_CPP_REVISION,
    ],
    check=True,
)
subprocess.run(
    ["git", "-C", str(SOURCE), "checkout", "--detach", "FETCH_HEAD"],
    check=True,
)
resolved_revision = subprocess.run(
    ["git", "-C", str(SOURCE), "rev-parse", "HEAD"],
    capture_output=True,
    text=True,
    check=True,
).stdout.strip()
if resolved_revision != LLAMA_CPP_REVISION:
    raise RuntimeError("llama.cpp revision mismatch")

subprocess.run(
    [
        "cmake",
        "-S",
        str(SOURCE),
        "-B",
        str(BUILD),
        "-DGGML_CUDA=ON",
        "-DLLAMA_CURL=ON",
        "-DLLAMA_BUILD_SERVER=ON",
        "-DLLAMA_BUILD_TESTS=OFF",
        "-DLLAMA_BUILD_EXAMPLES=OFF",
    ],
    check=True,
)
subprocess.run(
    [
        "cmake",
        "--build",
        str(BUILD),
        "--config",
        "Release",
        "--target",
        "llama-server",
        "-j6",
    ],
    check=True,
)

LLAMA_SERVER = BUILD / "bin" / "llama-server"
if not LLAMA_SERVER.exists():
    raise RuntimeError("llama-server was not built")
```

Use a lower `-j` value if the current Colab CPU or memory is smaller. Building
may take several minutes because CUDA kernels are compiled for many quantized
operations.

## GGUF Download Verification

For an anonymously accessible single-file Hugging Face artifact:

```python
import hashlib
import requests
import subprocess

MODEL_ID = "<hugging_face_model_id>"
MODEL_FILE = "<exact_gguf_filename>"
MODEL_DIR = WORKDIR / "models"
MODEL_PATH = MODEL_DIR / MODEL_FILE
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_URL = (
    f"https://huggingface.co/{MODEL_ID}/resolve/main/"
    f"{MODEL_FILE}?download=true"
)

subprocess.run(
    ["wget", "-c", "-O", str(MODEL_PATH), MODEL_URL],
    check=True,
)

head = requests.head(MODEL_URL, allow_redirects=False, timeout=30)
expected_size = head.headers.get("x-linked-size")
expected_sha256 = (head.headers.get("x-linked-etag") or "").strip('"')
with MODEL_PATH.open("rb") as model_file:
    magic = model_file.read(4)
    model_file.seek(0)
    digest = hashlib.file_digest(model_file, "sha256").hexdigest()

if magic != b"GGUF":
    raise RuntimeError("Downloaded artifact is not GGUF")
if expected_size is None or MODEL_PATH.stat().st_size != int(expected_size):
    raise RuntimeError("GGUF byte-size mismatch")
if not expected_sha256 or digest != expected_sha256:
    raise RuntimeError("GGUF SHA-256 mismatch")
```

For gated repositories, read `HF_TOKEN` from Colab Secrets and use the official
Hugging Face client. Never put the token in the notebook source or URL.

## Strict Authenticated Router

Use router mode for the final server. Single-model mode serves the loaded model
even when the request contains an unknown model name, which makes the required
wrong-model `4xx` probe fail.

Create a preset whose section name is the public model name:

```python
import os
import secrets
import subprocess

SERVED_MODEL_NAME = "<served_model_name>"
PORT = 8000
CONTEXT_SIZE = 4096

try:
    from google.colab import userdata

    try:
        configured_api_key = userdata.get("AITUBER_LLM_API_KEY")
    except Exception:
        configured_api_key = None
except ImportError:
    configured_api_key = None

api_key = configured_api_key or secrets.token_urlsafe(32)
preset_path = WORKDIR / "llama-models.ini"
preset_path.write_text(
    "\n".join(
        [
            "version = 1",
            "",
            f"[{SERVED_MODEL_NAME}]",
            f"model = {MODEL_PATH}",
            f"c = {CONTEXT_SIZE}",
            "n-gpu-layers = 99",
            "reasoning = off",
            "parallel = 1",
            "load-on-startup = true",
            "",
        ]
    )
)

server_env = os.environ.copy()
server_env["LLAMA_API_KEY"] = api_key
server_log = open(LOGDIR / "llama-server-router.log", "w")
server_process = subprocess.Popen(
    [
        str(LLAMA_SERVER),
        "--models-preset",
        str(preset_path),
        "--models-max",
        "1",
        "--no-models-autoload",
        "--host",
        "127.0.0.1",
        "--port",
        str(PORT),
        "--no-webui",
    ],
    stdout=server_log,
    stderr=subprocess.STDOUT,
    env=server_env,
    start_new_session=True,
)
print("router server process group:", server_process.pid)
```

`reasoning = off` is appropriate for the initial low-latency AITuber text
check. Change reasoning behavior only after confirming the selected model's
chat template and the Core response parser.

## Endpoint Behavior and Cleanup

Before opening cloudflared, confirm:

1. `GET /health` returns `200`.
2. Authenticated `GET /v1/models` includes `SERVED_MODEL_NAME`.
3. Authenticated non-streaming chat returns an OpenAI-compatible response.
4. Authenticated streaming chat emits multiple `data:` events and `[DONE]`.
5. A Chat Completions request without the key returns `401`.
6. An authenticated request with an unknown model returns `4xx`.

Current llama.cpp exposes `/v1/models` without requiring the API key. Treat the
model list as public metadata and require authentication on Chat Completions.
Do not weaken the Chat authentication check.

When parsing SSE in Python, split only on the newline byte:

```python
for raw_line in response.iter_lines(
    decode_unicode=False,
    delimiter=b"\n",
):
    line = raw_line.rstrip(b"\r")
```

This avoids Python's broader Unicode line-boundary handling when response text
contains non-ASCII characters.

Stop both process groups when the user no longer needs the runtime:

```python
import os
import signal
import subprocess

for process in (cloudflared_process, server_process):
    if process.poll() is not None:
        continue
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=20)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=10)
```

## Initial Live Validation

On 2026-07-29, the adapter was verified through Colab MCP Go with:

- Colab GPU: NVIDIA L4, 23,034 MiB
- CUDA toolkit: 12.8
- llama.cpp revision:
  `e9fa0781f1c25fc4fe8c86be1edc6970661ad6f0`
- model: `google/gemma-4-12B-it-qat-q4_0-gguf`
- file: `gemma-4-12b-it-qat-q4_0.gguf`
- file size: 6,975,879,296 bytes
- SHA-256:
  `93567e57a8fe10b23569b9d9ec38cd005deedf71e29477c421a4b83f418a538b`
- context: 4,096
- parallel slots: 1
- GPU memory after router startup: about 7,538 MiB
- cloudflared: 2026.7.3

Observed results:

- anonymous Chat Completions: `401`
- unknown model in router mode: `400`
- authenticated `/v1/models`: `200` with the served name
- local non-streaming Japanese response: `200`
- local SSE: 28 events, first event at 0.093 seconds, terminal `[DONE]`
- public non-streaming Japanese response: `200` in 0.685 seconds
- public SSE: 21 events, first event at 0.213 seconds, terminal `[DONE]`
- CORS preflight: `200` with `POST` and authorization headers allowed
- repository compatibility probe: T1-T6 all passed
- `react-pngtuber-app`: displayed an intermediate streaming state and the
  completed Japanese response

The browser also logged a speech-playback `EncodingError` with TTS set to
`None`. The streamed text completed normally, so record this separately from
the LLM backend result and do not hide it in future reports.

This evidence validates this exact L4, revision, model, context, tunnel, and
Core combination. Re-run the public SSE, compatibility probe, and browser check
for every new session.

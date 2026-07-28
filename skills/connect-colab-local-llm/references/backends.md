# Colab Local LLM Backend Reference

Read this reference before launching a backend or tunnel. Recheck the linked
official documentation when package versions or hosted-runtime images may have
changed.

## Contents

- Support status and runtime sizing
- vLLM installation, launch, authentication, and cleanup
- cloudflared Quick Tunnel launch and connection handoff
- Readiness and endpoint checks
- Initial live validation
- Future backend adapters

## Support Status

| Backend | Status in this skill | Best fit |
| --- | --- | --- |
| vLLM | Implemented first path | Hugging Face generation models on NVIDIA GPUs |
| llama.cpp server | Candidate only | GGUF and lower-memory or heavily quantized runs |
| SGLang | Candidate only | Model-specific reasoning, tool use, or serving features |

`candidate only` means the agent may assess and propose the backend, but must
not claim a reusable Colab workflow until it has passed the same endpoint,
streaming, CORS, compatibility-probe, and Core checks as vLLM.

## Colab Runtime Sizing

Use an A100 for the first end-to-end workflow when it is available. This
reduces the chance that model loading or KV-cache pressure is confused with an
API, tunnel, or Core integration problem.

An L4 is a useful lower-cost follow-up target:

- sub-4B generation models should generally be the easiest starting point
- 7B/8B models may be practical, but context length, dtype, quantization, and
  vLLM overhead determine whether they fit
- 14B and larger models usually require more aggressive tradeoffs than an L4
  provides; prefer an A100 for the first proof

Estimate weight memory before download:

- BF16 or FP16: roughly `parameter_count * 2 bytes`
- FP8 or INT8 weights: roughly `parameter_count * 1 byte`
- 4-bit weights: roughly `parameter_count * 0.5 bytes`

These estimates exclude KV cache, activations, CUDA graphs, temporary buffers,
and engine overhead. Leave headroom and verify actual GPU memory after the
server reaches ready state. A quantized artifact must also be supported by the
selected vLLM version and GPU; a smaller file alone is not proof of runtime
compatibility.

## vLLM

Official references:

- Quickstart and installation:
  https://docs.vllm.ai/en/latest/getting_started/quickstart/
- OpenAI-compatible server CLI:
  https://docs.vllm.ai/en/latest/cli/serve/
- Environment variables:
  https://docs.vllm.ai/en/latest/configuration/env_vars/
- Published package versions: https://pypi.org/project/vllm/

The initial pinned path is vLLM `0.25.1` with its official `cu129` release
wheel. Before running it:

1. Confirm that the version still exists in the official package index.
2. Inspect the official GitHub release assets and confirm that the selected
   CUDA wheel exists.
3. Confirm that the current Colab Python and NVIDIA driver satisfy the current
   vLLM installation requirements.
4. Create an isolated environment; do not replace Colab's system PyTorch.
5. Record the package, Python, PyTorch, CUDA, and GPU versions in the result.

Prefer this install shape in a clean Colab runtime:

```python
from pathlib import Path
import subprocess
import sys

VLLM_VERSION = "0.25.1"
CUDA_VARIANT = "cu129"
WORKDIR = Path("/content/aituber-local-llm")
VENV = WORKDIR / ".venv"
WHEEL_URL = (
    "https://github.com/vllm-project/vllm/releases/download/"
    f"v{VLLM_VERSION}/vllm-{VLLM_VERSION}%2B{CUDA_VARIANT}-"
    "cp38-abi3-manylinux_2_28_x86_64.whl"
)

subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q", "uv"],
    check=True,
)
subprocess.run(
    ["uv", "venv", str(VENV), "--python", "3.12", "--seed"],
    check=True,
)
subprocess.run(
    [
        "uv",
        "pip",
        "install",
        "--python",
        str(VENV / "bin" / "python"),
        WHEEL_URL,
        f"--torch-backend={CUDA_VARIANT}",
    ],
    check=True,
)
```

The explicit wheel is intentional. A live Colab A100 check found that installing
the plain vLLM wheel into the system environment selected CUDA 13 while Colab's
preinstalled PyTorch used CUDA 12.8, causing a missing `libcudart.so.13`
failure. Recheck the current release assets instead of assuming `cu129` will
remain the correct variant forever.

The vLLM CLI exposes OpenAI-compatible APIs and supports `--api-key`,
`--served-model-name`, and CORS configuration. Start from a minimal command:

```python
import os
import secrets
import subprocess
from pathlib import Path

MODEL_ID = "<hugging_face_model_id>"
SERVED_MODEL_NAME = "<served_model_name>"
MODEL_REVISION = ""
PORT = 8000
WORKDIR = Path("/content/aituber-local-llm")
LOGDIR = WORKDIR / "logs"
VLLM_EXECUTABLE = WORKDIR / ".venv" / "bin" / "vllm"
LOGDIR.mkdir(parents=True, exist_ok=True)

try:
    from google.colab import userdata
except ImportError:
    userdata = None

def read_secret(name):
    if userdata is None:
        return None
    try:
        return userdata.get(name)
    except Exception:
        return None

hf_token = read_secret("HF_TOKEN")
if hf_token:
    os.environ["HF_TOKEN"] = hf_token

api_key = read_secret("AITUBER_LLM_API_KEY") or secrets.token_urlsafe(32)
server_env = os.environ.copy()
server_env["VLLM_API_KEY"] = api_key
cmd = [
    str(VLLM_EXECUTABLE),
    "serve",
    MODEL_ID,
    "--host",
    "127.0.0.1",
    "--port",
    str(PORT),
    "--served-model-name",
    SERVED_MODEL_NAME,
]
if MODEL_REVISION:
    cmd.extend(["--revision", MODEL_REVISION])

vllm_log = open(LOGDIR / "vllm.log", "w")
vllm_process = subprocess.Popen(
    cmd,
    stdout=vllm_log,
    stderr=subprocess.STDOUT,
    env=server_env,
    start_new_session=True,
)
print("vLLM process group:", vllm_process.pid)
```

vLLM supports `VLLM_API_KEY`, so keep the key in the child process environment
instead of the CLI. Passing `--api-key` can expose the value in vLLM's
non-default-argument log and process listings. Never print the full environment.
When displaying a diagnostic log excerpt, replace every known secret value with
`<redacted>` first. If a key is exposed before the tunnel opens, stop the server,
rotate the key, and restart it before continuing.

The key requires no prior user setup: generate it for each public Colab session
and have the user paste it into Core's API Key field. A key may be omitted for a
strictly loopback-only diagnostic server, but create one and restart the server
before opening any public tunnel.

Start a dedicated process group because vLLM launches engine workers. Stopping
only the API parent can leave an orphan worker holding GPU memory. Use the
combined cloudflared and vLLM cleanup shown below.

Add only necessary options:

- `--dtype <value>`
- `--quantization <value>`
- `--max-model-len <value>`
- `--gpu-memory-utilization <value>`
- `--trust-remote-code` only with explicit user acceptance

Do not copy model-specific reasoning parsers, tool parsers, chat templates, or
quantization flags from another model. Verify them against that model and vLLM
version.

## cloudflared Quick Tunnel

Official references:

- Quick Tunnels:
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- Downloads:
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
- Releases: https://github.com/cloudflare/cloudflared/releases

Use a cloudflared Quick Tunnel as the only public transport in this skill. It
requires no Cloudflare account, tunnel token, or custom domain. Pin and record
the binary version so that a passing streaming result is reproducible.

Cloudflare's Quick Tunnel documentation warns that Server-Sent Events are not
supported. However, a live test with cloudflared `2026.7.3` delivered vLLM SSE
incrementally and passed all six repository compatibility checks. Treat the
live probe as the authority for the current session: rerun it every time and
stop before Core if streaming fails.

Start cloudflared only after local vLLM checks pass:

```python
import os
import re
import subprocess
import time
from pathlib import Path

CLOUDFLARED_VERSION = "2026.7.3"
CLOUDFLARED = Path("/content/cloudflared")
CLOUDFLARED_URL = (
    "https://github.com/cloudflare/cloudflared/releases/download/"
    f"{CLOUDFLARED_VERSION}/cloudflared-linux-amd64"
)

if not CLOUDFLARED.exists():
    subprocess.run(
        ["wget", "-q", "-O", str(CLOUDFLARED), CLOUDFLARED_URL],
        check=True,
    )
os.chmod(CLOUDFLARED, 0o755)

resolved_version = subprocess.run(
    [str(CLOUDFLARED), "--version"],
    capture_output=True,
    text=True,
    check=True,
).stdout.strip()

cloudflared_log_path = LOGDIR / "cloudflared.log"
cloudflared_log = open(cloudflared_log_path, "w")
cloudflared_process = subprocess.Popen(
    [
        str(CLOUDFLARED),
        "tunnel",
        "--url",
        f"http://127.0.0.1:{PORT}",
        "--no-autoupdate",
    ],
    stdout=cloudflared_log,
    stderr=subprocess.STDOUT,
    start_new_session=True,
)

public_base_url = None
for _ in range(30):
    log_text = cloudflared_log_path.read_text(errors="replace")
    match = re.search(
        r"https://[a-z0-9-]+\.trycloudflare\.com",
        log_text,
    )
    if match:
        public_base_url = match.group(0)
        break
    if cloudflared_process.poll() is not None:
        break
    time.sleep(1)

if not public_base_url:
    raise RuntimeError("No trycloudflare URL appeared; inspect the log.")

print("cloudflared:", resolved_version)
```

The generated vLLM API key is a temporary credential for the current private
notebook session. Do not copy it into repository files or public logs. The user
does not need to configure any Cloudflare or LLM API credential. For each run,
present a compact handoff:

```python
print("=== AITuber OnAir Core Connection ===")
print("Endpoint :", f"{public_base_url}/v1/chat/completions")
print("Model    :", SERVED_MODEL_NAME)
print("API Key  :", api_key)
print("This URL and key expire with the Colab/tunnel session.")
```

The user should only need to copy these three values into the Core sample.
When the session ends, stop the cloudflared and vLLM process groups:

```python
import os
import signal
import subprocess

for process in (cloudflared_process, vllm_process):
    if process.poll() is not None:
        continue
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=20)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=10)
```

## Readiness and Endpoint Checks

Poll local readiness before opening a tunnel:

```python
import requests
import time

headers = {"Authorization": f"Bearer {api_key}"}
for _ in range(120):
    if vllm_process.poll() is not None:
        raise RuntimeError("vLLM exited; inspect the vLLM log.")
    try:
        health = requests.get(
            f"http://127.0.0.1:{PORT}/health",
            timeout=2,
        )
        models = requests.get(
            f"http://127.0.0.1:{PORT}/v1/models",
            headers=headers,
            timeout=5,
        )
        if health.ok and models.ok:
            print(models.json())
            break
    except requests.RequestException:
        pass
    time.sleep(5)
else:
    raise TimeoutError("vLLM did not become ready; inspect the log.")
```

For the public endpoint, verify:

1. Missing authorization is rejected.
2. `GET /v1/models` returns the configured served name.
3. Chat completions work with `"stream": false`.
4. Chat completions with `"stream": true` return incremental
   `data: {...}` events and a terminating event.
5. An `OPTIONS` request from the Core development origin permits `POST`,
   `authorization`, and `content-type`.

Then run `packages/chat/examples/compat-probe/index.js` and the selected Core
React sample. Do not substitute a successful `/health` response for these
checks.

## Initial Live Validation

On 2026-07-29, this workflow was verified through Colab MCP Go with:

- Colab GPU: NVIDIA A100-SXM4-40GB
- Python: 3.12.13
- vLLM: 0.25.1+cu129 in an isolated virtual environment
- PyTorch: 2.11.0+cu129
- smoke model: `Qwen/Qwen2.5-0.5B-Instruct`
- served name: `aituber-colab-smoke`
- `max_model_len`: 4096
- `gpu_memory_utilization`: 0.50
- cloudflared: 2026.7.3

Observed results:

- missing API key: `401`
- authenticated `/v1/models`: `200` with the served name
- non-streaming chat: `200` with response text
- streaming chat: `200`, incremental SSE events, and terminal `[DONE]`
- browser-style CORS preflight: `200`, wildcard origin, `POST`, and
  `authorization,content-type` allowed
- Quick Tunnel SSE timing: 160 events, first event at 0.055 seconds, events
  spread over 0.386 seconds, and terminal `[DONE]`
- repository compatibility probe through the public URL: T1-T6 all passed
- `react-pngtuber-app` browser check: OpenAI-Compatible received and displayed
  a streamed response through the public URL with TTS disabled
- process-group cleanup: API and engine worker processes both stopped

This result validates the initial vLLM path, not every future cloudflared,
Colab, model, or Core combination. Keep the public SSE and Core browser checks
mandatory for each run.

## Future Backend Adapters

### llama.cpp server

Official server documentation:
https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md

Use this candidate when the requested artifact is GGUF or the available GPU
memory makes a supported quantized build more suitable than vLLM. Before
promoting it to implemented status, document the Colab build/binary source,
model download integrity, authentication layer, CORS behavior, streaming shape,
and cleanup flow.

### SGLang

Official OpenAI-compatible API documentation:
https://docs.sglang.io/docs/basic_usage/openai_api_completions

Use this candidate only when its model-specific serving behavior is needed.
Before promoting it, verify the exact reasoning/tool parser flags, API
authentication, CORS behavior, streaming, and the repository compatibility
probe. Do not translate vLLM flags by name without checking SGLang semantics.

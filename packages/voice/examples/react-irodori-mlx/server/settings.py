from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_ID = "mlx-community/Irodori-TTS-500M-v3-8bit"
MODEL_REVISION = "43b5d5539d8f07da46c7cd58d9f0ebed50ec1cc9"
TOKENIZER_ID = "llm-jp/llm-jp-3-150m"
TOKENIZER_REVISION = "b112feef602fff752e4dac4c30af6a2c2fa41c7a"
MODEL_DIR = ROOT / ".cache" / "model"
REF_SECONDS = 5.0
MIN_REF_SECONDS = 1.0
ALLOWED_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]

DEFAULT_REFERENCE = ROOT / "samples" / "sample-speaker.wav"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

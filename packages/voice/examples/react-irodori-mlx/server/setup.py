"""Download only the selected checkpoint and its tokenizer files, never LLM weights."""
import json

from huggingface_hub import snapshot_download
from server.settings import (
    MODEL_DIR, MODEL_ID, MODEL_REVISION, TOKENIZER_ID, TOKENIZER_REVISION,
)

snapshot_download(
    MODEL_ID,
    revision=MODEL_REVISION,
    local_dir=MODEL_DIR,
    allow_patterns=["config.json", "model.safetensors", "dacvae/*"],
)
snapshot_download(
    TOKENIZER_ID,
    revision=TOKENIZER_REVISION,
    local_dir=MODEL_DIR / "tokenizer",
    allow_patterns=["tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"],
)
(MODEL_DIR / "sample-manifest.json").write_text(json.dumps({
    "model": MODEL_REVISION, "tokenizer": TOKENIZER_REVISION,
}))
print("Setup complete. Run npm run dev; sample-speaker is ready, and you can upload your own reference in the browser.")

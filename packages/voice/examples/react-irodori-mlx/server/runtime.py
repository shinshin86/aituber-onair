"""The single persistent MLX model is used only on the dedicated GPU thread."""
import json
import sys
import time

import numpy as np

from server.audio import read_reference, wav_bytes
from server.settings import MODEL_DIR, MODEL_REVISION, TOKENIZER_REVISION, REF_SECONDS


def validate_text_tokens(tokenizer, text, config):
    # Match upstream tokenization, but reject its silent truncation.
    tokens = tokenizer.encode(text, add_special_tokens=False)
    if len(tokens) + int(config.dit.text_add_bos) > config.max_text_length:
        raise ValueError("Input exceeds the model's token capacity. Split the text into smaller passages.")


class Runtime:
    def __init__(self):
        import mlx.core as mx
        from mlx_audio.tts.utils import load

        if not mx.metal.is_available():
            raise RuntimeError("Metal GPU unavailable. Run natively on Apple Silicon outside a GPU-blocking sandbox.")
        marker = MODEL_DIR / "sample-manifest.json"
        if not marker.is_file() or json.loads(marker.read_text()) != {
            "model": MODEL_REVISION, "tokenizer": TOKENIZER_REVISION,
        }:
            raise RuntimeError("Model setup missing or outdated. Run npm run setup.")
        for relative in ("dacvae/model.safetensors", "dacvae/config.json", "tokenizer/tokenizer.json"):
            if not (MODEL_DIR / relative).is_file():
                raise RuntimeError("Model cache incomplete. Run npm run setup.")
        self.model = load(MODEL_DIR)
        if self.model.dacvae is None or not self.model.config.dit.use_duration_predictor:
            raise RuntimeError("Expected the pinned Irodori v3 model with bundled DACVAE.")
        from mlx_audio.tts.models.irodori_tts.text import normalize_text
        self.normalize_text = normalize_text
        from transformers import AutoTokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR / "tokenizer", local_files_only=True)

    def synthesize(self, text, voice, reference, speed=1.0):
        import mlx.core as mx

        validate_text_tokens(self.tokenizer, self.normalize_text(text).strip(), self.model.config)
        start = time.monotonic()
        audio, reference_metrics = read_reference(reference, self.model.sample_rate)
        print(json.dumps({"event": "reference", "voice": voice, **reference_metrics}), flush=True)
        try:
            # Upstream floors max_seconds to integer frames, so infinity is invalid.
            # Use the platform sample-index range, not an application duration cap.
            results = list(self.model.generate(
                text=text, ref_audio=mx.array(audio), stream=False,
                cfg_guidance_mode="alternating", max_seconds=sys.maxsize / self.model.sample_rate,
                max_ref_seconds=REF_SECONDS, num_steps=6,
                t_schedule_mode="sway", sway_coeff=-1.0,
                duration_scale=1.0 / speed,
            ))
            if len(results) != 1:
                raise ValueError("Expected one non-streaming speech result.")
            result = results[0]
            payload, metrics = wav_bytes(np.asarray(result.audio, dtype=np.float32), result.sample_rate)
            print(json.dumps({"event": "generated", "voice": voice, "speed": speed,
                              "duration_scale": 1.0 / speed, **metrics,
                              "elapsed": time.monotonic() - start,
                              "peak_memory_gb": result.peak_memory_usage}), flush=True)
            return payload
        finally:
            mx.clear_cache()

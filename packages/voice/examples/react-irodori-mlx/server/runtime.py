"""The single persistent MLX model is used only on the dedicated GPU thread."""
import json
import math
import time

import numpy as np

from server.audio import read_reference, wav_bytes
from server.settings import MODEL_DIR, MODEL_REVISION, TOKENIZER_REVISION, MAX_SECONDS, REF_SECONDS


class DurationLimitError(ValueError):
    pass


def guard_duration(generate_latents, max_frames):
    # Observe the PUBLIC latent API before generate() trims trailing silence.
    # Output duration alone cannot reveal a cap hidden by silence trimming.
    def guarded(*args, **kwargs):
        latent, frames = generate_latents(*args, **kwargs)
        if frames >= max_frames:
            raise DurationLimitError("Predicted speech reached the duration limit. Shorten the text or increase the speed.")
        return latent, frames
    return guarded


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
        max_frames = math.floor(MAX_SECONDS * self.model.sample_rate / self.model.config.audio_downsample_factor)
        self.model.generate_latents = guard_duration(self.model.generate_latents, max_frames)

    def synthesize(self, text, voice, reference, speed=1.0):
        import mlx.core as mx

        start = time.monotonic()
        audio, reference_metrics = read_reference(reference, self.model.sample_rate)
        print(json.dumps({"event": "reference", "voice": voice, **reference_metrics}), flush=True)
        try:
            results = list(self.model.generate(
                text=text, ref_audio=mx.array(audio), stream=False,
                cfg_guidance_mode="alternating", max_seconds=MAX_SECONDS,
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

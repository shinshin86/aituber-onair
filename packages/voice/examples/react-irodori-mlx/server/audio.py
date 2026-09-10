"""CPU-only validation, bounded reference decoding, and upstream WAV serialization."""
import hashlib
import io
import json
import re
import os
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from math import gcd

from server.settings import MIN_REF_SECONDS, REF_SECONDS


def load_voices(local: Path) -> dict[str, Path]:
    try:
        mapping = json.loads((local / "voices.json").read_text())
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:
        raise ValueError("Invalid .local/voices.json registration.") from exc
    if not isinstance(mapping, dict) or len(set(mapping) | {"sample-speaker"}) > 16:
        raise ValueError("Register at most 16 voices.")
    voices = {}
    reference_dir = (local / "references").resolve()
    for name, relative in mapping.items():
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", name):
            raise ValueError("Invalid voice identifier.")
        if not isinstance(relative, str) or Path(relative).is_absolute():
            raise ValueError("Voice paths must be relative to .local.")
        path = (local / relative).resolve()
        if not path.is_relative_to(reference_dir) or not path.is_file():
            raise ValueError(f"Missing reference inside .local/references for {name}.")
        voices[name] = path
    return voices


def validate_audio(audio: np.ndarray, rate: int) -> dict:
    if rate <= 0 or audio.ndim != 1 or not audio.size or not np.isfinite(audio).all():
        raise ValueError("Audio is empty or contains invalid samples.")
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio.astype(np.float64) ** 2)))
    if rms < 0.0001:
        raise ValueError("Audio is silent or too quiet.")
    return {"seconds": audio.size / rate, "peak": peak, "rms": rms,
            "near_clip_fraction": float(np.mean(np.abs(audio) >= 0.999))}


def read_reference(path: Path, rate: int = 48000) -> tuple[np.ndarray, dict]:
    try:
        with sf.SoundFile(path) as source:
            if source.samplerate > 192000 or source.channels > 8:
                raise ValueError("Unsupported reference sample rate or channel count.")
            audio = source.read(int(source.samplerate * REF_SECONDS), dtype="float32", always_2d=True)
            source_rate = source.samplerate
    except (OSError, sf.LibsndfileError) as exc:
        raise ValueError("Reference audio is missing or cannot be decoded. Check registration.") from exc
    audio = audio.mean(axis=1)
    if audio.size / source_rate < MIN_REF_SECONDS:
        raise ValueError("Reference must contain at least one second of speech.")
    factor = gcd(source_rate, rate)
    if source_rate != rate:
        audio = resample_poly(audio, rate // factor, source_rate // factor).astype(np.float32)
    audio = np.ascontiguousarray(audio[:int(rate * REF_SECONDS)])
    metrics = validate_audio(audio, rate)
    metrics["reference_sha256"] = hashlib.sha256(audio.tobytes()).hexdigest()
    return audio, metrics


def wav_bytes(audio: np.ndarray, rate: int) -> tuple[bytes, dict]:
    from mlx_audio.audio_io import write

    metrics = validate_audio(audio, rate)
    gain = min(1.0, 0.98 / metrics["peak"])
    audio = (audio * gain).astype(np.float32)
    output = io.BytesIO()
    write(output, audio, rate, format="wav")
    metrics["gain"] = gain
    metrics["saved_peak"] = float(np.max(np.abs(audio)))
    return output.getvalue(), metrics


def register_reference(local: Path, name: str, payload: bytes) -> Path:
    """Store only validated, bounded PCM; never retain original names or tags."""
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", name) or name == "sample-speaker":
        raise ValueError("Use a unique voice name with letters, digits, hyphens or underscores.")
    mapping = load_voices(local)
    if name in mapping:
        raise ValueError("That voice name is already registered.")
    if len(set(mapping) | {"sample-speaker"}) >= 16:
        raise ValueError("At most 16 voices including sample-speaker can be registered.")
    audio, _ = read_reference(io.BytesIO(payload))
    wav, _ = wav_bytes(audio, 48000)
    directory = local / "references"
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"voice-{uuid.uuid4().hex}.wav"
    temporary = local / f"voices-{uuid.uuid4().hex}.tmp"
    try:
        with target.open("xb") as file:
            file.write(wav)
        registration = {key: str(path.relative_to(local.resolve())) for key, path in mapping.items()}
        registration[name] = str(target.relative_to(local))
        temporary.write_text(json.dumps(registration, indent=2) + "\n")
        os.replace(temporary, local / "voices.json")
    except Exception:
        target.unlink(missing_ok=True)
        temporary.unlink(missing_ok=True)
        raise
    return target

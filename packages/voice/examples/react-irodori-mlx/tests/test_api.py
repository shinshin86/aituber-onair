import io
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from server.app import create_app
from server.audio import load_voices, read_reference, validate_audio, wav_bytes
from server.runtime import DurationLimitError, guard_duration
from server.settings import MODEL_ID, ALLOWED_ORIGINS

BODY = {"model": MODEL_ID, "input": "こんにちは。", "voice": "sample-speaker", "speed": 1.0}


@pytest.fixture
def local(tmp_path):
    (tmp_path / "references").mkdir()
    audio = np.sin(np.arange(48000 * 7) * 0.03).astype(np.float32) * 0.2
    sf.write(tmp_path / "references/sample.wav", audio, 48000)
    (tmp_path / "voices.json").write_text(json.dumps({"sample-speaker": "references/sample.wav"}))
    return tmp_path


class FakeRuntime:
    def synthesize(self, text, voice, reference, speed):
        assert voice == "sample-speaker" and reference.name == "sample.wav"
        return b"test-payload"


def ready(client):
    for _ in range(100):
        if client.get("/health").status_code == 200:
            return
        time.sleep(0.01)
    raise AssertionError("Not ready")


@pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
def test_contract(local, origin):
    with TestClient(create_app(FakeRuntime, local)) as client:
        ready(client)
        response = client.post("/v1/audio/speech", json=BODY, headers={"Origin": origin})
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/wav"
        assert response.headers["access-control-allow-origin"] == origin
        assert client.get("/voices").json() == {"voices": ["sample-speaker"]}
        for change in ({"input": " "}, {"input": "!"}, {"input": "a" * 41},
                       {"model": "other"}, {"speed": 0.49}, {"speed": 2.01}, {"speed": "1"},
                       {"response_format": "mp3"}, {"ref_audio": "/tmp/other.wav"}):
            assert client.post("/v1/audio/speech", json={**BODY, **change}).status_code == 422
        assert client.post("/v1/audio/speech", json={**BODY, "voice": "../other"}).status_code == 404
        assert client.post("/v1/audio/speech", json=BODY, headers={"Origin": "https://example.com"}).status_code == 403
        assert client.post("/v1/audio/speech", content=b"x" * 4097).status_code == 413
        preflight = client.options("/v1/audio/speech", headers={"Origin": origin,
                                   "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        assert preflight.status_code == 200
        assert preflight.headers["access-control-allow-origin"] == origin
        health = client.get("/health", headers={"Origin": origin})
        assert health.headers["access-control-allow-origin"] == origin


def test_gpu_remains_busy_after_timeout(local):
    entered = threading.Event()
    release = threading.Event()
    class SlowRuntime:
        def synthesize(self, *args):
            entered.set()
            release.wait(3)
            return b"audio"
    with TestClient(create_app(SlowRuntime, local, timeout=0.05)) as client:
        ready(client)
        try:
            with ThreadPoolExecutor() as pool:
                first = pool.submit(client.post, "/v1/audio/speech", json=BODY)
                assert entered.wait(1)
                assert client.post("/v1/audio/speech", json=BODY).status_code == 429
                assert first.result().status_code == 504
                assert client.get("/health").json()["busy"]
                assert client.post("/v1/audio/speech", json=BODY).status_code == 429
        finally:
            release.set()
        for _ in range(100):
            if not client.get("/health").json()["busy"]:
                break
            time.sleep(0.01)
        assert not client.get("/health").json()["busy"]


def test_generation_failure(local):
    class BrokenRuntime:
        def synthesize(self, *args):
            raise RuntimeError("private detail")
    with TestClient(create_app(BrokenRuntime, local)) as client:
        ready(client)
        response = client.post("/v1/audio/speech", json=BODY)
        assert response.status_code == 500
        assert "private detail" not in response.text


def test_default_without_registration(local):
    (local / "voices.json").unlink()
    with TestClient(create_app(FakeRuntime, local)) as client:
        ready(client)
        assert client.get("/voices").json() == {"voices": ["sample-speaker"]}


def test_reference_boundaries(local):
    audio, metrics = read_reference(local / "references/sample.wav")
    assert audio.shape == (240000,)
    assert metrics["seconds"] == 5
    for value in ("../outside.wav", "/tmp/outside.wav", "references/missing.wav"):
        (local / "voices.json").write_text(json.dumps({"sample-speaker": value}))
        with pytest.raises(ValueError):
            load_voices(local)
    for invalid in (np.array([]), np.zeros(48000), np.array([np.nan]), np.array([np.inf])):
        with pytest.raises(ValueError):
            validate_audio(invalid, 48000)
    sf.write(local / "references/short.wav", np.ones(100), 48000)
    with pytest.raises(ValueError, match="at least one second"):
        read_reference(local / "references/short.wav")


def test_wav_normalization():
    audio = np.sin(np.arange(48000) * 0.03).astype(np.float32) * 2
    payload, metrics = wav_bytes(audio, 48000)
    assert payload[:4] == b"RIFF" and payload[8:12] == b"WAVE"
    decoded, rate = sf.read(io.BytesIO(payload))
    assert rate == 48000 and len(decoded) == 48000
    assert 0.97 < max(abs(decoded)) < 0.981
    assert metrics["gain"] < 1


def test_cap_detected_before_silence_trimming():
    safe = guard_duration(lambda: ("latent", 149), 150)
    assert safe() == ("latent", 149)
    for frames in (150, 151):
        guarded = guard_duration(lambda: ("latent", frames), 150)
        with pytest.raises(DurationLimitError):
            guarded()


@pytest.mark.parametrize("speed", [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, None])
def test_speed_reaches_runtime(local, speed):
    received = []
    class CaptureRuntime:
        def synthesize(self, text, voice, reference, speed):
            received.append(speed)
            return b"audio"
    with TestClient(create_app(CaptureRuntime, local)) as client:
        ready(client)
        body = {**BODY, "speed": speed}
        if speed is None:
            del body["speed"]
        assert client.post("/v1/audio/speech", json=body).status_code == 200
        assert received == [1.0 if speed is None else speed]


@pytest.mark.parametrize("speed", [float("nan"), float("inf"), -float("inf"), 0, -1, True])
def test_invalid_speed(speed):
    from pydantic import ValidationError
    from server.app import Speech
    with pytest.raises(ValidationError):
        Speech(**{**BODY, "speed": speed})


@pytest.mark.parametrize("speed,scale", [(0.5, 2.0), (1.0, 1.0), (2.0, 0.5)])
def test_runtime_maps_speed_to_generation(monkeypatch, speed, scale):
    import sys
    from types import SimpleNamespace
    import server.runtime as module
    recorded = {}
    reference = np.ones(48000, dtype=np.float32)
    fake_mx = SimpleNamespace(array=lambda audio: audio, clear_cache=lambda: None)
    monkeypatch.setitem(sys.modules, "mlx", SimpleNamespace(core=fake_mx))
    monkeypatch.setitem(sys.modules, "mlx.core", fake_mx)
    monkeypatch.setattr(module, "read_reference", lambda path, rate: (reference, {}))
    monkeypatch.setattr(module, "wav_bytes", lambda audio, rate: (b"wav", {}))
    def generate(**kwargs):
        recorded.update(kwargs)
        yield SimpleNamespace(audio=reference, sample_rate=48000, peak_memory_usage=0)
    runtime = module.Runtime.__new__(module.Runtime)
    runtime.model = SimpleNamespace(sample_rate=48000, generate=generate)
    assert runtime.synthesize("hello", "sample-speaker", "unused", speed) == b"wav"
    assert recorded["duration_scale"] == scale
    assert recorded["ref_audio"] is reference
    assert recorded["max_seconds"] == 6.0
    assert recorded["stream"] is False


def test_upload_is_persistent_bounded_and_metadata_free(local):
    import struct
    received = []
    class UploadedRuntime:
        def synthesize(self, text, voice, reference, speed):
            received.append(reference)
            return b"audio"
    payload = (local / "references/sample.wav").read_bytes()
    # Add an ancillary metadata chunk; registration must not copy it.
    tag = b"private-test-metadata"
    payload += b"LIST" + struct.pack("<I", len(tag)) + tag
    payload = payload[:4] + struct.pack("<I", len(payload) - 8) + payload[8:]
    with TestClient(create_app(UploadedRuntime, local)) as client:
        ready(client)
        response = client.post('/voices/my-speaker', content=payload,
                               headers={"Origin": "http://localhost:5173", "Content-Type": "application/octet-stream"})
        assert response.status_code == 201
        assert response.json() == {"voice": "my-speaker"}
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert "my-speaker" in client.get('/voices').json()['voices']
        assert client.post('/v1/audio/speech', json={**BODY, 'voice': 'my-speaker'}).status_code == 200
        saved = received[0]
        assert saved.name.startswith('voice-') and saved.suffix == '.wav'
        data = saved.read_bytes()
        assert tag not in data
        audio, rate = sf.read(saved)
        assert len(audio) == rate * 5 and rate == 48000
        assert client.post('/voices/my-speaker', content=payload).status_code == 409
        assert client.post('/voices/sample-speaker', content=payload).status_code == 409
    with TestClient(create_app(UploadedRuntime, local)) as client:
        ready(client)
        assert "my-speaker" in client.get('/voices').json()['voices']


def test_invalid_upload_leaves_no_registration(local):
    from server.settings import MAX_UPLOAD_BYTES
    initial = (local / 'voices.json').read_bytes()
    before = set((local / 'references').iterdir())
    with TestClient(create_app(FakeRuntime, local)) as client:
        ready(client)
        for payload in (b'', b'not an audio file'):
            assert client.post('/voices/my-speaker', content=payload).status_code == 422
        assert client.post('/voices/bad!name', content=b'bad').status_code == 422
        assert client.post('/voices/my-speaker', content=b'x' * (MAX_UPLOAD_BYTES + 1)).status_code == 413
        assert client.post('/voices/my-speaker', content=b'x', headers={'Origin':'https://example.com'}).status_code == 403
    assert (local / 'voices.json').read_bytes() == initial
    assert set((local / 'references').iterdir()) == before


def test_upload_registration_is_serialized(local, monkeypatch):
    import server.app as module
    entered = threading.Event()
    release = threading.Event()
    original = module.register_reference
    def delayed(*args):
        entered.set()
        release.wait(3)
        return original(*args)
    monkeypatch.setattr(module, 'register_reference', delayed)
    payload = (local / 'references/sample.wav').read_bytes()
    with TestClient(create_app(FakeRuntime, local)) as client:
        ready(client)
        with ThreadPoolExecutor() as pool:
            first = pool.submit(client.post, '/voices/first', content=payload)
            try:
                assert entered.wait(1)
                assert client.post('/voices/second', content=payload).status_code == 429
            finally:
                release.set()
            assert first.result().status_code == 201
        assert client.post('/voices/second', content=payload).status_code == 201
    mapping = load_voices(local)
    assert 'first' in mapping and 'second' in mapping

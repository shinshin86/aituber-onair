"""Loopback-only OpenAI-compatible speech with no GPU request queue."""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from server.audio import load_voices, register_reference
from server.runtime import DurationLimitError, Runtime
from server.settings import MODEL_ID, MAX_CHARACTERS, ALLOWED_ORIGINS, REQUEST_SECONDS, ROOT, DEFAULT_REFERENCE, MAX_UPLOAD_BYTES


class Speech(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    model: Literal[MODEL_ID]
    input: str = Field(min_length=1, max_length=MAX_CHARACTERS)
    voice: str = Field(min_length=1, max_length=64)
    speed: float = Field(default=1.0, ge=0.5, le=2.0, allow_inf_nan=False)
    response_format: Literal["wav"] = "wav"

    @field_validator("input")
    @classmethod
    def meaningful_text(cls, value):
        value = value.strip()
        if not value or not any(c.isalnum() for c in value):
            raise ValueError("Enter a short sentence containing letters or numbers.")
        return value


def create_app(runtime_factory=Runtime, local=ROOT / ".local", timeout=REQUEST_SECONDS):
    state = {"runtime": None, "error": None, "busy": False, "uploading": False, "voices": {}}
    pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="irodori-gpu")

    @asynccontextmanager
    async def lifespan(app):
        async def prepare():
            try:
                state["voices"] = {"sample-speaker": DEFAULT_REFERENCE, **load_voices(local)}
                state["runtime"] = await asyncio.get_running_loop().run_in_executor(pool, runtime_factory)
            except Exception:
                logging.exception("Startup failed")
                state["error"] = "Startup failed. Check .local/api.log for reference, cache, or Metal errors."
        task = asyncio.create_task(prepare())
        yield
        await task
        pool.shutdown(wait=True, cancel_futures=True)

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # Do not log or echo user input, file paths, or Pydantic context objects.
        errors = [{"location": list(error["loc"]), "message": error["msg"]}
                  for error in exc.errors()]
        logging.warning("Invalid speech request: %s", errors)
        return JSONResponse({"detail": errors}, status_code=422)

    @app.get("/health")
    async def health():
        status = "error" if state["error"] else "ready" if state["runtime"] else "loading"
        return JSONResponse({"status": status, "busy": state["busy"], "error": state["error"]},
                            status_code=200 if status == "ready" else 503)

    @app.get("/voices")
    async def voices():
        return {"voices": list(state["voices"])}

    @app.post("/voices/{name}")
    async def upload_voice(name: str, request: Request):
        if state["runtime"] is None:
            raise HTTPException(503, "Model is not ready.")
        if name in state["voices"]:
            raise HTTPException(409, "That voice name is already registered. Choose another name.")
        if state["uploading"]:
            raise HTTPException(429, "Another upload is in progress.")
        payload = await request.body()
        # Recheck after receiving the body before admitting one registration.
        if state["uploading"]:
            raise HTTPException(429, "Another upload is in progress.")
        state["uploading"] = True
        task = asyncio.create_task(asyncio.to_thread(register_reference, local, name, payload))

        def registered(done):
            state["uploading"] = False
            if not done.cancelled() and done.exception() is None:
                state["voices"][name] = done.result()
        task.add_done_callback(registered)
        try:
            await asyncio.shield(task)
            return JSONResponse({"voice": name}, status_code=201)
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        except Exception:
            logging.exception("Reference registration failed")
            raise HTTPException(500, "Could not save the reference. Check .local/api.log.")

    @app.post("/v1/audio/speech")
    async def speech(body: Speech):
        if state["runtime"] is None:
            raise HTTPException(503, "Model is not ready. Check /health.")
        if body.voice not in state["voices"]:
            raise HTTPException(404, "Unknown registered voice.")
        if state["busy"]:
            raise HTTPException(429, "GPU is busy. Wait before retrying.", headers={"Retry-After": "5"})
        # No await between testing and setting busy: admission is atomic on this event loop.
        state["busy"] = True
        future = asyncio.get_running_loop().run_in_executor(
            pool, state["runtime"].synthesize, body.input, body.voice, state["voices"][body.voice], body.speed,
        )

        def finished(done):
            state["busy"] = False
            # Consume errors even after client timeout/disconnect.
            if not done.cancelled():
                done.exception()
        future.add_done_callback(finished)
        try:
            audio = await asyncio.wait_for(asyncio.shield(future), timeout=timeout)
            return Response(audio, media_type="audio/wav")
        except TimeoutError:
            raise HTTPException(504, "Generation exceeded 25 seconds. GPU remains busy until work finishes.")
        except (DurationLimitError, ValueError) as exc:
            logging.warning("Speech rejected: %s", exc)
            raise HTTPException(422, str(exc))
        except Exception:
            logging.exception("Generation failed")
            raise HTTPException(500, "Generation failed. Check .local/api.log.")

    # Limit bytes before JSON parsing, including chunked requests. CORS remains outermost.
    class RequestBoundary:
        def __init__(self, inner):
            self.inner = inner

        async def __call__(self, scope, receive, send):
            if scope["type"] != "http" or scope["method"] != "POST":
                return await self.inner(scope, receive, send)
            headers = dict(scope["headers"])
            origin = headers.get(b"origin")
            if origin is not None and origin.decode() not in ALLOWED_ORIGINS:
                return await JSONResponse({"detail": "Origin not allowed."}, 403)(scope, receive, send)
            chunks = []
            total = 0
            while True:
                event = await receive()
                if event["type"] == "http.disconnect":
                    return
                total += len(event.get("body", b""))
                limit = MAX_UPLOAD_BYTES if scope["path"].startswith("/voices/") else 4096
                if total > limit:
                    detail = ("Audio file exceeds 10 MiB. Automatic trimming happens after upload."
                              if limit == MAX_UPLOAD_BYTES else "Speech JSON exceeds 4 KiB.")
                    return await JSONResponse({"detail": detail}, 413)(scope, receive, send)
                chunks.append(event.get("body", b""))
                if not event.get("more_body", False):
                    break
            async def buffered():
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await self.inner(scope, buffered, send)

    return CORSMiddleware(RequestBoundary(app), allow_origins=ALLOWED_ORIGINS,
                          allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


app = create_app()

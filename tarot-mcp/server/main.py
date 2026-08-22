from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import json, uuid

app = FastAPI()
active_readings = {}

@app.on_event("startup")
async def startup():
    print("Tarot MCP Server started")

@app.get("/")
async def root():
    return {"status": "tarot-mcp-running", "spreads": 11}

@app.post("/api/reading")
async def create_reading(payload: dict):
    reading_id = str(uuid.uuid4())
    active_readings[reading_id] = payload
    return {"reading_id": reading_id, "status": "created"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            await websocket.send_json({"echo": msg})
    except WebSocketDisconnect:
        pass

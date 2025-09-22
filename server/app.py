import os
import time
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from jose import jwt, JWTError

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

app = FastAPI()
templates = Jinja2Templates(directory="web")

# --- in-memory session state (swap to Redis in prod) ---
players_ws: Dict[str, WebSocket] = {}

# Broadcast filter knob
RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
LOOT_MIN = os.getenv("LOOT_MIN_RARITY", "epic").lower()


def rarity_at_least(r: str) -> bool:
    try:
        return RARITY_ORDER.index(r.lower()) >= RARITY_ORDER.index(LOOT_MIN)
    except ValueError:
        return False


# --- JWT join tokens ---
def make_join_token(user: str, ttl_sec: int = 300) -> str:
    payload = {"u": user, "exp": int(time.time()) + ttl_sec}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_join_token(t: str) -> str:
    try:
        data = jwt.decode(t, JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return data["u"]


# --- pages ---
@app.get("/play", response_class=HTMLResponse)
async def play_page(request: Request, t: str):
    user = verify_join_token(t)
    return templates.TemplateResponse("index.html", {"request": request, "token": t, "user": user})


# --- WebSocket for per-player sessions ---
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        init = await ws.receive_json()  # expects {"token": "..."}
        user = verify_join_token(init.get("token", ""))
        players_ws[user] = ws
        await ws.send_json({"type": "system", "text": f"Welcome, @{user}. Adventure is live."})

        # Main loop: receive inputs, forward to game, echo a short line
        from server.adapter import handle_player_input  # import here to avoid circulars
        while True:
            msg = await ws.receive_json()
            text = (msg.get("text") or "").strip()
            if not text:
                continue
            out = handle_player_input(user, text)
            await ws.send_json({"type": "log", "text": out})
    except WebSocketDisconnect:
        pass
    finally:
        for k, v in list(players_ws.items()):
            if v is ws:
                players_ws.pop(k, None)


# ---- helpers used by adapter.py ----
def send_private(user: str, payload: Dict[str, Any]):
    ws = players_ws.get(user)
    if ws:
        try:
            return ws.send_json(payload)
        except Exception:
            # connection may be gone
            pass


# Will be monkey-patched by twitch_bot.py at startup
def post_to_twitch(message: str):
    print("Twitch>", message)
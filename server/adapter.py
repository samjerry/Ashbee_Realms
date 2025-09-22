from typing import Dict, Any, Optional
import os

# Import from the server package (matches your folder layout)
from server.app import send_private, post_to_twitch, rarity_at_least  # type: ignore

# Keep a session per Twitch user (expand to real state as needed)
_sessions: Dict[str, "Session"] = {}

SHOW_LEVEL = os.getenv("DISPLAY_GAINED_LEVEL", "true").lower() == "true"
SHOW_DEATH = os.getenv("DISPLAY_PLAYER_DIED", "true").lower() == "true"
SHOW_BOSS  = os.getenv("DISPLAY_ENCOUNTER_BOSS", "true").lower() == "true"

class Session:
    """
    One running game per user. If your engine is class-based, wire callbacks here.
    """
    def __init__(self, user: str):
        self.user = user
        self.game = None  # optional: attach your real game object here

    def handle_input(self, text: str) -> Optional[str]:
        """
        Feed a command into your game and return a short line to echo.
        If your engine narrates via adapter.log/emit, just return None.
        """
        # Change this to your real entry point if different.
        try:
            from game.engine import process_input  # def process_input(user: str, text: str) -> Optional[str]
        except Exception:
            process_input = None

        if process_input:
            return process_input(self.user, text)
        return None


# ---------- public API used by app.py ----------
def handle_player_input(user: str, text: str) -> str:
    sess = _sessions.get(user) or Session(user)
    _sessions[user] = sess
    out = sess.handle_input(text)
    return out or f"You: {text}"


def log(user: str, text: str):
    """Private narration to the player's web tab."""
    send_private(user, {"type": "log", "text": text})


def emit(user: str, etype: str, data: Dict[str, Any]):
    """
    Structured event from your game.
    Always sent to the player; sometimes broadcast to Twitch chat.
    """
    # Always to player tab
    send_private(user, {"type": "event", "event": etype, "data": data})

    # Optional Twitch broadcasts (edit thresholds/wording to taste)
    if etype == "boss" and SHOW_BOSS:
        post_to_twitch(f"@{user} has encountered BOSS {data.get('name')} in {data.get('zone', '?')}!")
    elif etype == "loot":
        rarity = (data.get("rarity") or "common").lower()
        item = data.get("item") or "unknown item"
        if rarity_at_least(rarity):
            post_to_twitch(f"@{user} looted {item} [{rarity.upper()}] 🎉")
    elif etype == "levelup" and SHOW_LEVEL:
        level = data.get("level")
        if level is None:
            return  # don't post ambiguous message
        post_to_twitch(f"@{user} reached level {level} 🎉")
    elif etype == "death" and SHOW_DEATH:
        post_to_twitch(f"@{user} was slain by {data.get('by', 'unknown')} 💀")
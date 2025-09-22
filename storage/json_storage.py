from __future__ import annotations
from typing import Dict
import json, os
from game.models import Player

class JSONStorage:
    def __init__(self, path: str = "player_state.json"):
        self.path = path

    def load(self) -> Dict[str, Player]:
        if not os.path.exists(self.path):
            return {}
        with open(self.path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        out: Dict[str, Player] = {}
        for k, v in raw.items():
            out[k] = Player.from_json(v)
        return out

    def save(self, state: Dict[str, Player]) -> None:
        tmp = self.path + ".tmp"
        raw = {k: v.to_json() for k, v in state.items()}
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.path)

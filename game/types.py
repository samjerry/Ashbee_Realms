from dataclasses import dataclass, field
from typing import Protocol, Dict, Any, List

@dataclass
class Stats:
    hp: int = 10
    atk: int = 1
    def clamp(self):
        self.hp = max(self.hp, 0)

class HasStats(Protocol):
    stats: Stats

class HasEffects(Protocol):
    effects: List["EffectBase"]

class EffectBase(Protocol):
    id: str
    def apply(self, target: HasStats) -> None: ...

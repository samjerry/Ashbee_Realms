# stat_recompute.py
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict
from typing import Dict, Iterable, List, Optional

# --- Core types --------------------------------------------------------------

class Stat(str, Enum):
    MAX_HP = "max_hp"
    ATK    = "atk"
    DEF    = "def"
    SPD    = "spd"
    CRIT   = "crit"        # 0..1
    CRITDMG= "crit_dmg"    # >= 1.0
    LUCK   = "luck"

class ModKind(str, Enum):
    FLAT = "flat"          # +x
    ADD  = "add"           # +(x * base)
    MULT = "mult"          # *(1 + x)

@dataclass(frozen=True)
class StatMod:
    stat: Stat
    value: float
    kind: ModKind

# --- Public API --------------------------------------------------------------

def recompute_totals(
    base: Dict[str, float],
    equipped_mods: Iterable[StatMod],
    clamp: bool = True,
) -> Dict[str, float]:
    """
    Recompute totals from base + all equipment modifiers.
    Order: (base + sumFlat) * (1 + sumAdd) * (1 + sumMult)
    """
    sum_flat  = defaultdict(float)
    sum_add   = defaultdict(float)
    sum_mult  = defaultdict(float)

    for m in equipped_mods:
        if m.kind == ModKind.FLAT: sum_flat[m.stat]  += m.value
        elif m.kind == ModKind.ADD:  sum_add[m.stat]   += m.value
        elif m.kind == ModKind.MULT: sum_mult[m.stat]  += m.value

    totals = {}
    for key in set(base.keys()) | set(sum_flat.keys()) | set(sum_add.keys()) | set(sum_mult.keys()):
        b = float(base.get(key, 0.0))
        f = sum_flat.get(key, 0.0)
        a = sum_add.get(key, 0.0)
        mu = sum_mult.get(key, 0.0)
        val = (b + f) * (1.0 + a) * (1.0 + mu)

        if clamp:
            if key == Stat.CRIT.value:
                val = max(0.0, min(1.0, val))
            if key == Stat.CRITDMG.value:
                val = max(1.0, val)
        totals[key] = val
    return totals

# --- Helpers to adapt to your existing item schema --------------------------

def collect_item_mods(item) -> List[StatMod]:
    """
    Convert your item schema -> List[StatMod].
    Supported shapes (example):
      - item.mods = [{'stat':'atk','kind':'flat','value':3}, ...]
      - item.effects = [{'type':'stat','stat':'atk','op':'add','value':0.2}, ...]
    Adjust if your field names differ.
    """
    mods = []

    if hasattr(item, "mods") and isinstance(item.mods, list):
        for m in item.mods:
            mods.append(StatMod(
                stat=Stat(str(m["stat"])),
                value=float(m["value"]),
                kind=ModKind(str(m.get("kind","flat")))
            ))

    elif hasattr(item, "effects") and isinstance(item.effects, list):
        for e in item.effects:
            if e.get("type") == "stat":
                kind = e.get("op", "flat")
                mods.append(StatMod(
                    stat=Stat(str(e["stat"])),
                    value=float(e["value"]),
                    kind=ModKind(kind)
                ))
    return mods

def collect_equipped_mods(player) -> List[StatMod]:
    """
    Read player's equipped items from your inventory/equipment model.
    Expected player.equipment to be an iterable of item objects (or None).
    """
    out: List[StatMod] = []
    equipment = getattr(player, "equipment", None) or []
    for it in equipment:
        if it:
            out.extend(collect_item_mods(it))
    return out

def apply_recompute(player, hp_field: str = "hp_current"):
    """
    Mutates player.total_stats (dict) from player.base_stats (dict) + equipped.
    Clamps current HP to new Max HP.
    """
    base = getattr(player, "base_stats")
    equipped = collect_equipped_mods(player)
    totals = recompute_totals(base, equipped)
    setattr(player, "total_stats", totals)

    max_hp = totals.get(Stat.MAX_HP.value, base.get(Stat.MAX_HP.value, 0))
    cur = getattr(player, hp_field, None)
    if cur is not None:
        setattr(player, hp_field, max(0.0, min(cur, max_hp)))

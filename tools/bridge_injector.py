#!/usr/bin/env python3
"""
Patch your codebase so narration is private via the web tab and only
big moments are broadcast to Twitch.

- Scans:   game/*.py  and  ./TwitchGame.py
- Inserts: from server.adapter import log, emit
- Rewrites common "print/send" patterns to log(...) or emit(...).
- Leaves TODOs where it can't infer enough.

Run once from the project root:

    python tools/bridge_injector.py

Patched files are written to ./patched/ with the same folder tree.
Backups are written to ./backup_<timestamp>/
"""

import re
import sys
import shutil
import os
import time
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parents[1]

SRC_FILES: List[Path] = []
SRC_FILES += list((ROOT / "game").glob("*.py"))
twg = ROOT / "TwitchGame.py"
if twg.exists():
    SRC_FILES.append(twg)

INSERT_IMPORT = """
try:
    from server.adapter import log, emit
except Exception:
    # fallback no-ops if the bridge isn't running during local tests
    def log(user, text):  # type: ignore
        pass
    def emit(user, etype, data):  # type: ignore
        pass
"""

REPLACERS = [
    # Simple prints → private log. (Assumes a 'user' is in scope. If not, TODO will be added.)
    (r"\bprint\(\s*f?([\"'])(.+?)\1\s*\)", r"log(user, r'\2')", "print → log(user, ...)"),

    # Common helper names → log
    (r"\bsend_to_chat\(\s*user\s*,\s*(.+?)\)", r"log(user, \1)", "send_to_chat(user, msg) → log"),
    (r"\bsend_message\(\s*user\s*,\s*(.+?)\)", r"log(user, \1)", "send_message(user, msg) → log"),

    # Loot: very tolerant — tweak manually if your game uses different names.
    (r"(?:give|award|add)_loot\(\s*user\s*,\s*(?P<item>[^,]+)\s*,\s*(?P<rarity>[^,\)]+)\s*\)",
     r"emit(user, 'loot', {'item': \g<item>, 'rarity': str(\g<rarity>)})",
     "award_loot(...) → emit('loot', ...)"),

    # Deaths
    (r"(?:kill|die|on_death)\(\s*user(?:\s*,\s*(?P<cause>[^,\)]+))?\s*\)",
     r"emit(user, 'death', {'by': (\g<cause> if '\g<cause>'!='' else 'unknown')})",
     "death → emit('death', ...)"),

    # Boss/elite
    (r"(?:spawn|encounter)_(?:boss|elite)\(\s*user\s*,\s*(?P<name>[^,]+)(?:\s*,\s*(?P<zone>[^,\)]+))?\s*\)",
     r"emit(user, 'boss', {'name': \g<name>, 'zone': (\g<zone> if '\g<zone>'!='' else 'Unknown')})",
     "boss → emit('boss', ...)"),
]


def ensure_imports(text: str) -> str:
    if "from server.adapter import log, emit" in text:
        return text
    # insert after the first import block
    m = re.search(r"(^(\s*from .+ import .+|\s*import .+)\n)+", text, flags=re.M)
    if m:
        idx = m.end()
        return text[:idx] + INSERT_IMPORT + text[idx:]
    else:
        return INSERT_IMPORT + text


def apply_rewrites(text: str) -> str:
    out = text
    for pat, repl, _ in REPLACERS:
        out = re.sub(pat, repl, out)
    # TODO markers if we didn't find any emit but file clearly references terms
    lower = out.lower()
    additions = []
    if "emit(" not in out:
        if "loot" in lower:
            additions.append("# TODO: call emit(user, 'loot', {'rarity': rarity, 'item': item_name}) where loot is granted.")
        if "boss" in lower or "elite" in lower:
            additions.append("# TODO: call emit(user, 'boss', {'name': boss_name, 'zone': zone_name}) at boss encounters.")
        if any(w in lower for w in ["death", "die", "killed"]):
            additions.append("# TODO: call emit(user, 'death', {'by': cause}) when the player dies.")
    if "log(" not in out and "print(" in lower:
        additions.append("# TODO: replace prints with log(user, text) if they are intended as narration.")
    if additions:
        out += "\n" + "\n".join(additions) + "\n"
    return out


def patch_file(src: Path, dst: Path):
    original = src.read_text(encoding="utf-8", errors="ignore")
    patched = ensure_imports(original)
    patched = apply_rewrites(patched)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(patched, encoding="utf-8")


def main():
    ts = time.strftime("%Y%m%d_%H%M%S")
    backup_dir = ROOT / f"backup_{ts}"
    patched_dir = ROOT / "patched"
    backup_dir.mkdir(exist_ok=True)
    if patched_dir.exists():
        shutil.rmtree(patched_dir)
    patched_dir.mkdir()

    for src in SRC_FILES:
        # copy to backup
        rel = src.relative_to(ROOT)
        (backup_dir / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, backup_dir / rel)

        # write patched version
        dst = patched_dir / rel
        patch_file(src, dst)
        print(f"Patched: {rel}")

    print(f"\nBackups in: {backup_dir}")
    print(f"Patched files in: {patched_dir}")


if __name__ == "__main__":
    main()

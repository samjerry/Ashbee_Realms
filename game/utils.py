from __future__ import annotations
from datetime import datetime
import json, os, traceback

LOG_FILE = "error.log"

def now():
    return datetime.now().strftime("[%Y-%m-%d %H:%M:%S]")

def log_error(e: Exception):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{now()} {repr(e)}\n{traceback.format_exc()}\n")

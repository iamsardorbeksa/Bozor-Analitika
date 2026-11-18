"""Tiny in-process TTL cache for market-wide aggregates (movers, overview).

Entries are keyed per database URL so separate databases (e.g. tests) never share results.
Writes that change prices call `invalidate()`; otherwise entries simply expire.
"""
from __future__ import annotations

import threading
import time
from typing import Any, Callable

from sqlalchemy.orm import Session

TTL_SECONDS = 60.0
_store: dict[tuple, tuple[float, Any]] = {}
_lock = threading.Lock()


def _db_key(db: Session) -> str:
    bind = db.get_bind()
    return str(getattr(bind, "url", id(bind)))


def cached(db: Session, key: tuple, compute: Callable[[], Any], ttl: float = TTL_SECONDS) -> Any:
    full = (_db_key(db), *key)
    now = time.monotonic()
    with _lock:
        hit = _store.get(full)
        if hit and hit[0] > now:
            return hit[1]
    value = compute()
    with _lock:
        _store[full] = (now + ttl, value)
    return value


def invalidate() -> None:
    with _lock:
        _store.clear()

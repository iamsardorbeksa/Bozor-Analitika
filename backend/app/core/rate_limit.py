"""Small in-process sliding-window limiter for sensitive endpoints (login, register, AI).
For multi-instance deployments swap for a Redis-backed limiter."""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def rate_limit(name: str, limit: int, window_s: int):
    def dependency(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        key = f"{name}:{ip}"
        now = time.monotonic()
        with _lock:
            q = _hits[key]
            while q and now - q[0] > window_s:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests, try again shortly")
            q.append(now)

    return dependency


def reset_limits() -> None:
    with _lock:
        _hits.clear()

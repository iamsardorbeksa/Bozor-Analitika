"""A polite HTTP client for reading public pages: identifies itself, obeys robots.txt and waits between requests."""
from __future__ import annotations

import time
import urllib.robotparser
from urllib.parse import urlsplit

import httpx

USER_AGENT = "BozorAnalitikaBot/1.0 (+price research; respects robots.txt)"
BROWSER_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "uz,ru;q=0.9,en;q=0.8",
}


class Blocked(Exception):
    """robots.txt disallows the URL, or the site answered with a bot check."""


class PoliteClient:
    def __init__(self, delay: float = 1.5, timeout: float = 30.0):
        self.delay = delay
        self._last = 0.0
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}
        self.http = httpx.Client(headers=BROWSER_HEADERS, timeout=timeout, follow_redirects=True)

    def close(self):
        self.http.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def _wait(self):
        gap = time.monotonic() - self._last
        if gap < self.delay:
            time.sleep(self.delay - gap)
        self._last = time.monotonic()

    def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        rp = self._robots.get(origin)
        if rp is None:
            rp = urllib.robotparser.RobotFileParser()
            try:
                self._wait()
                r = self.http.get(origin + "/robots.txt")
                rp.parse(r.text.splitlines() if r.status_code == 200 else [])
            except httpx.HTTPError:
                rp.parse([])
            self._robots[origin] = rp
        return rp.can_fetch(USER_AGENT, url)

    def get(self, url: str) -> str:
        if not self.allowed(url):
            raise Blocked(f"robots.txt disallows {url}")
        self._wait()
        r = self.http.get(url)
        if r.status_code in (403, 429, 503) and ("Just a moment" in r.text or "cf-chl" in r.text):
            raise Blocked(f"{urlsplit(url).netloc} answered with a bot check")
        r.raise_for_status()
        return r.text

"""Korzinka (korzinka.uz): the supermarket chain's public online catalogue and weekly promotions.

The prices are in the page's Nuxt state (`window.__NUXT__`), see nuxt.py. Prices are the same in all
Korzinka stores (the chain publishes one catalogue), so they are recorded for Tashkent, where most stores are.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from app.scraping.base import Listing, money
from app.scraping.http import PoliteClient
from app.scraping.nuxt import decode

SITE = "korzinka.uz"
BASE = "https://korzinka.uz"
START_PAGES = ["/uz/catalog", "/uz/catalog/special"]


def _walk(x, out: list[dict]):
    if isinstance(x, dict):
        if "prices" in x and "title_uz" in x and "id" in x:
            out.append(x)
            return out
        for v in x.values():
            _walk(v, out)
    elif isinstance(x, list):
        for v in x:
            _walk(v, out)
    return out


def parse_page(html: str, page_url: str, now: datetime) -> list[Listing]:
    state = decode(html)
    if not state:
        return []
    out = []
    for p in _walk(state, []):
        prices = p.get("prices") or {}
        price = money(prices.get("actual_price"))
        if not price:
            continue
        title_uz = (p.get("title_uz") or p.get("title") or "").replace("👍", "").strip()
        title_ru = (p.get("title_ru") or "").replace("👍", "").strip()
        weighed = (prices.get("product_type") or "").lower().startswith("вес")
        out.append(Listing(
            site=SITE,
            external_id=str(p["id"]),
            title=title_uz or title_ru,
            titles=[t for t in (title_ru, p.get("title_en")) if t],
            price=price,
            old_price=money(prices.get("old_price")) if prices.get("is_discount") else None,
            size_text=None if weighed else p.get("weight_param"),
            url=page_url,
            image_url=p.get("small_image_url"),
            observed_at=now,
            region_code="toshkent",
            place="Korzinka supermarketlari",
            per_kg=weighed,
        ))
    return out


def scrape(client: PoliteClient, log=print) -> list[Listing]:
    now = datetime.now(timezone.utc)
    pages = list(START_PAGES)
    seen_pages: set[str] = set()
    found: dict[str, Listing] = {}
    while pages:
        path = pages.pop(0)
        if path in seen_pages:
            continue
        seen_pages.add(path)
        url = BASE + path
        html = client.get(url)
        items = parse_page(html, url, now)
        log(f"  {SITE}{path}: {len(items)} products")
        for it in items:
            found.setdefault(it.external_id, it)
        # weekly promotion pages linked from the catalogue
        for pid in sorted(set(re.findall(r"catalog/special\?id=(\d+)", html))):
            pages.append(f"/uz/catalog/special?id={pid}")
    return list(found.values())

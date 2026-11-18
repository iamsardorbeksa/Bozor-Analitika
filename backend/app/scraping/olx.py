"""OLX.uz: public classified ads in the food and building-materials categories.

The listing pages carry their data as JSON in `window.__PRERENDERED_STATE__`. Only the ad's title, price,
city/region, time and link are kept: no seller names, phone numbers, descriptions or photos of people.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from app.scraping.base import Listing, money
from app.scraping.http import PoliteClient

SITE = "olx.uz"
BASE = "https://www.olx.uz"
CATEGORIES = {  # path -> max pages (50 ads per page)
    "/dom-i-sad/produkty-pitaniya-napitki/": 25,
    "/dom-i-sad/tovari-dlya-stroitelstva-remonta/": 10,
}
# OLX region id -> our region code (Tashkent city is region 5 with city "Ташкент")
REGION_BY_OLX = {
    5: "toshkent-viloyati", 33: "samarqand", 36: "fargona", 29: "qashqadaryo", 27: "buxoro", 30: "navoiy",
    6: "andijon", 37: "xorazm", 34: "surxondaryo", 32: "qoraqalpogiston", 31: "namangan", 28: "jizzax", 35: "sirdaryo",
}
_PHONE = re.compile(r"(?:\+?998[\s\-()]*)?\(?\d{2}\)?[\s\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}")


def state_of(html: str) -> dict | None:
    i = html.find("window.__PRERENDERED_STATE__")
    if i < 0:
        return None
    j = html.find("=", i) + 1
    raw, _ = json.JSONDecoder().raw_decode(html[j:].lstrip())
    return json.loads(raw) if isinstance(raw, str) else raw


def _region(loc: dict) -> str:
    rid = loc.get("regionId")
    if rid == 5 and (loc.get("cityNormalizedName") == "tashkent" or loc.get("cityName") == "Ташкент"):
        return "toshkent"
    return REGION_BY_OLX.get(rid, "toshkent")


def clean_title(t: str) -> str:
    t = _PHONE.sub(" ", t.replace("\n", " "))
    return re.sub(r"\s+", " ", t).strip()[:160]


def parse_page(html: str) -> tuple[list[Listing], int]:
    st = state_of(html)
    if not st:
        return [], 0
    lst = (st.get("listing") or {}).get("listing") or {}
    out = []
    for a in lst.get("ads") or []:
        price = a.get("price") or {}
        reg = price.get("regularPrice") or {}
        if price.get("free") or price.get("exchange") or reg.get("currencyCode", "UZS") != "UZS":
            continue
        value = money(reg.get("value"))
        if not value:
            continue
        loc = a.get("location") or {}
        when = a.get("lastRefreshTime") or a.get("createdTime")
        try:
            observed = datetime.fromisoformat(when).astimezone(timezone.utc) if when else datetime.now(timezone.utc)
        except ValueError:
            observed = datetime.now(timezone.utc)
        place = ", ".join(x for x in (loc.get("cityName"), loc.get("districtName")) if x) or None
        out.append(Listing(
            site=SITE,
            external_id=str(a["id"]),
            title=clean_title(a.get("title") or ""),
            price=value,
            url=a.get("url") or BASE,
            observed_at=observed,
            region_code=_region(loc),
            place=place,
            seller_kind="business" if a.get("isBusiness") else "private",
        ))
    return out, int(lst.get("totalPages") or 1)


def scrape(client: PoliteClient, log=print, categories: dict[str, int] | None = None) -> list[Listing]:
    found: dict[str, Listing] = {}
    for path, max_pages in (categories or CATEGORIES).items():
        page, pages = 1, 1
        while page <= min(pages, max_pages):
            url = BASE + path + (f"?page={page}" if page > 1 else "")
            items, pages = parse_page(client.get(url))
            log(f"  {SITE}{path} page {page}/{min(pages, max_pages)}: {len(items)} ads")
            for it in items:
                found.setdefault(it.external_id, it)
            if not items:
                break
            page += 1
    return list(found.values())

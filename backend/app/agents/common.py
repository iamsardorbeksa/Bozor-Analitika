"""Shared helpers for the agents: reference data (CSV), market reference prices, formatting."""
from __future__ import annotations

import csv
import re
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from statistics import median
from uuid import UUID

from sqlalchemy.orm import Session

from app.analytics import price_stats
from app.models import Offer

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
LANGS = ("uz", "ru", "en")

SUSPICIOUS_LOW_PCT = -20.0   # >20% below the median: suspiciously cheap (not recommended)
OVERPRICED_PCT = 25.0        # >25% above the median: overpriced


# ------------------------------------------------------------------ reference data

def _read(name: str) -> list[dict]:
    with open(DATA_DIR / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


@lru_cache
def loan_types() -> dict[str, dict]:
    return {r["loan_type"]: r for r in _read("loan_rate_types.csv")}


@lru_cache
def loan_rates() -> list[dict]:
    rows = _read("loan_rates.csv")
    return sorted(rows, key=lambda r: float(r["rate_pct"]))


@lru_cache
def business_rules() -> dict[str, dict]:
    return {r["rule_id"]: r for r in _read("business_rules.csv")}


# ------------------------------------------------------------------ market reference

def market_reference(db: Session, product_id: UUID, region_offers: list[Offer], excluded: set[UUID] | None = None) -> dict:
    """Robust average / median for a product: offers in the searched regions without national outliers.
    Falls back to the national picture when the searched regions hold fewer than 3 usable prices."""
    if excluded is None:
        excluded = price_stats.outlier_offer_ids(db, [product_id])
    prices = [o.unit_price for o in region_offers if o.id not in excluded]
    scope = "regions"
    if len(prices) < 3:
        nat = db.scalars(price_stats.active_offers_q(product_id)).all()
        prices = [o.unit_price for o in nat if o.id not in excluded]
        scope = "national"
    snap = price_stats.snapshot(prices)
    return {"avg": snap["avg"], "median": snap["median"], "count": snap["count"], "scope": scope}


def vs_pct(price: Decimal | float, ref: Decimal | float | None) -> float | None:
    return price_stats.pct_change(price, ref)


def median_of(values: list[Decimal]) -> Decimal | None:
    return Decimal(str(median(values))) if values else None


# ------------------------------------------------------------------ formatting

def uz_typo(s: str) -> str:
    """Uzbek Latin typography: o' -> oʻ, g' -> gʻ, other letter' -> ʼ (tutuq belgisi)."""
    s = re.sub(r"([oOgG])['‘’`]", r"\1ʻ", s)
    return re.sub(r"(?<=[A-Za-z])['’](?=[A-Za-z])", "ʼ", s)


def som(v, lang: str) -> str:
    if v is None:
        return "—"
    s = f"{round(float(v)):,}".replace(",", " ")
    return f"{s} " + {"uz": "so'm", "ru": "сум", "en": "UZS"}.get(lang, "so'm")


def num(v) -> str:
    f = float(v)
    return f"{int(f):,}".replace(",", " ") if f == int(f) else f"{f:.2f}".rstrip("0").rstrip(".")


def pct(v) -> str:
    return "—" if v is None else f"{v:+.1f}%"


UNIT_NAMES = {
    "kg": {"uz": "kg", "ru": "кг", "en": "kg"},
    "l": {"uz": "litr", "ru": "л", "en": "l"},
    "piece": {"uz": "dona", "ru": "шт", "en": "pcs"},
    "sack": {"uz": "qop", "ru": "мешок", "en": "sack"},
}


def unit_name(unit: str, lang: str) -> str:
    return UNIT_NAMES.get(unit, {}).get(lang, unit)


def pname(item: dict, lang: str) -> str:
    return item.get(f"name_{lang}") or item.get("name_uz") or ""


def f(v) -> float | None:
    """Decimal/number -> JSON float (None stays None)."""
    return None if v is None else round(float(v), 2)

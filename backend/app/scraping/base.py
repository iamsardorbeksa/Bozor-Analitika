from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal


@dataclass
class Listing:
    """One product + price as seen on a public website (no personal data)."""

    site: str  # korzinka.uz, olx.uz
    external_id: str
    title: str  # as published (Uzbek where the site has it)
    price: Decimal  # UZS for the whole listing (pack / item / kg)
    url: str
    observed_at: datetime
    titles: list[str] = field(default_factory=list)  # other-language titles, for catalogue matching
    per_kg: bool = False  # weighed at the counter: the price is per kilogram
    size_text: str | None = None  # "1 кг", "70г" when the site states the pack size separately
    old_price: Decimal | None = None  # price before a promotion
    image_url: str | None = None
    region_code: str = "toshkent"
    place: str | None = None  # city / district, for display
    description: str | None = None
    seller_kind: str | None = None  # "business" / "private" (OLX), never a name or phone


def money(text) -> Decimal | None:
    """'8 490' / '20 000 сум' / 8490 -> Decimal('8490')."""
    if text is None:
        return None
    if isinstance(text, (int, float, Decimal)):
        return Decimal(str(text)) if text > 0 else None
    digits = "".join(ch for ch in str(text) if ch.isdigit() or ch in ".,").replace(",", ".")
    try:
        v = Decimal(digits)
    except Exception:
        return None
    return v if v > 0 else None

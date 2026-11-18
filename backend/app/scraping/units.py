"""Pack sizes in listing titles ("70g", "1 кг", "6x0,5L", "10 dona") and conversion to a catalogue unit price."""
from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

_N = r"(\d+(?:[.,]\d+)?)"
_U = {
    "kg": ("kg", 1), "кг": ("kg", 1), "kilo": ("kg", 1), "килограмм": ("kg", 1),
    "g": ("kg", 0.001), "gr": ("kg", 0.001), "гр": ("kg", 0.001), "г": ("kg", 0.001), "gramm": ("kg", 0.001), "грамм": ("kg", 0.001),
    "l": ("l", 1), "л": ("l", 1), "litr": ("l", 1), "litir": ("l", 1), "литр": ("l", 1), "liter": ("l", 1),
    "ml": ("l", 0.001), "мл": ("l", 0.001),
    "dona": ("piece", 1), "ta": ("piece", 1), "шт": ("piece", 1), "pcs": ("piece", 1),
    "t": ("t", 1), "тонна": ("t", 1), "tonna": ("t", 1),
    "m": ("m", 1), "м": ("m", 1), "metr": ("m", 1), "метр": ("m", 1),
}
_UNIT_RX = "|".join(sorted((re.escape(u) for u in _U), key=len, reverse=True))
_MULTI = re.compile(rf"(\d+)\s*[x×х*]\s*{_N}\s*({_UNIT_RX})(?![\w])", re.I)
_SINGLE = re.compile(rf"(?<![\w.,]){_N}\s*({_UNIT_RX})(?![\w])", re.I)
_PER_KG = re.compile(r"(?:,\s*|\s)(?:kg|кг|вес|vazn)\s*$|\bна вес\b|\bza kg\b|\bkg uchun\b|\bза кг\b", re.I)


@dataclass
class Size:
    qty: float
    unit: str  # kg, l, piece, t, m


def _num(s: str) -> float:
    return float(s.replace(",", "."))


def parse_size(*texts: str | None) -> Size | None:
    """The pack size named in the first text that has one; `None` when no size is stated."""
    for text in texts:
        if not text:
            continue
        t = text.lower().replace("\xa0", " ")
        m = _MULTI.search(t)
        if m:
            unit, f = _U[m.group(3)]
            return Size(int(m.group(1)) * _num(m.group(2)) * f, unit)
        m = _SINGLE.search(t)
        if m:
            unit, f = _U[m.group(2)]
            q = _num(m.group(1)) * f
            if q > 0:
                return Size(q, unit)
    return None


def sold_by_weight(title: str) -> bool:
    """Titles like 'Sariq sabzi Arzon, kg' / 'Говяжий фарш, вес': the price is per kilogram."""
    return bool(_PER_KG.search(title.strip()))


def _q(v: float) -> Decimal:
    return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def unit_price(price: Decimal, size: Size | None, product_unit: str, per_kg: bool = False) -> Decimal | None:
    """Price per catalogue unit, or None when the listing's size can't be expressed in that unit."""
    if per_kg or size is None:
        # no pack size: the price is per the product's own unit (per kg for a weighed item)
        if per_kg and product_unit not in ("kg", "l"):
            return None
        return _q(float(price))
    q, u = size.qty, size.unit
    pu = product_unit
    if pu == u:
        return _q(float(price) / q) if q else None
    if pu in ("kg", "l") and u in ("kg", "l"):  # milk, oil, honey: 1 l ≈ 1 kg is close enough for price comparison
        return _q(float(price) / q)
    if pu == "t" and u == "kg":
        return _q(float(price) / q * 1000)
    if pu == "piece" and u in ("kg", "l"):  # one packed item (a 500 g loaf, a 1.5 L bottle)
        return _q(float(price))
    return None

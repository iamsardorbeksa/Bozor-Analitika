"""Offer comparison: total cost and a transparent multi-factor recommendation score.

total_cost = (quantity * unit_price) + delivery_cost

The cheapest offer is not automatically the best: the score blends cost, quality,
supplier reliability, delivery time and availability, and every recommendation
carries human-readable reasons.
"""
from __future__ import annotations

from decimal import Decimal

from app.analytics.price_stats import q2
from app.models import Offer, Quality

WEIGHTS = {"cost": 0.45, "quality": 0.15, "reliability": 0.20, "delivery": 0.10, "availability": 0.10}
QUALITY_SCORE = {Quality.premium: 1.0, Quality.first: 0.8, Quality.standard: 0.6, Quality.economy: 0.35}


def total_cost(offer: Offer, quantity: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    subtotal = q2(quantity * offer.unit_price)
    delivery = q2(offer.delivery_price) if offer.delivery_available else Decimal("0.00")
    return subtotal, delivery, q2(subtotal + delivery)


def reliability(offer: Offer) -> float:
    b = offer.business
    rating = float(b.rating or 0) / 5.0
    deals = min(b.completed_deals or 0, 100) / 100.0
    verified = 1.0 if b.is_verified else 0.0
    return round(0.5 * rating + 0.2 * deals + 0.3 * verified, 4)


def compare(offers: list[Offer], quantity: Decimal) -> list[dict]:
    if not offers:
        return []
    rows = []
    for o in offers:
        sub, deliv, total = total_cost(o, quantity)
        rows.append({"offer": o, "subtotal": sub, "delivery_cost": deliv, "total_cost": total})

    totals = [float(r["total_cost"]) for r in rows]
    lo, hi = min(totals), max(totals)
    days = [r["offer"].delivery_days if r["offer"].delivery_available else 3 for r in rows]
    dmax = max(days) or 1

    for r, d in zip(rows, days):
        o: Offer = r["offer"]
        cost_s = 1.0 if hi == lo else 1 - (float(r["total_cost"]) - lo) / (hi - lo)
        # stock not stated (public listings) = assume the seller can fill a normal order
        enough = o.available_qty is None or o.available_qty >= quantity
        meets_moq = quantity >= o.min_order_qty
        avail_s = (1.0 if enough else float((o.available_qty or 0) / quantity) if quantity else 0) * (1.0 if meets_moq else 0.5)
        parts = {
            "cost": round(cost_s, 4),
            "quality": QUALITY_SCORE.get(o.quality, 0.5),
            "reliability": reliability(o),
            "delivery": round(1 - d / (dmax + 1), 4) if o.delivery_available else 0.2,
            "availability": round(min(avail_s, 1.0), 4),
        }
        r["score_breakdown"] = parts
        r["score"] = round(sum(WEIGHTS[k] * v for k, v in parts.items()) * 100, 1)
        r["enough_stock"] = enough
        r["meets_moq"] = meets_moq

    cheapest = min(rows, key=lambda r: r["total_cost"])
    eligible = [r for r in rows if r["enough_stock"] and r["meets_moq"]] or rows
    best = max(eligible, key=lambda r: r["score"])
    for r in rows:
        r["is_cheapest"] = r is cheapest
        r["is_recommended"] = r is best
        r["reasons"] = reasons(r, cheapest)
    rows.sort(key=lambda r: r["score"], reverse=True)
    return rows


def reasons(r: dict, cheapest: dict) -> list[str]:
    """Reason codes; the frontend translates them (keys under compare.reasons.*)."""
    o: Offer = r["offer"]
    out = []
    if r is cheapest:
        out.append("lowest_total")
    else:
        gap = r["total_cost"] - cheapest["total_cost"]
        out.append(f"more_expensive:{int(gap)}")
    if o.business.is_verified:
        out.append("verified_supplier")
    if float(o.business.rating) >= 4.5:
        out.append(f"high_rating:{o.business.rating}")
    if o.quality in (Quality.premium, Quality.first):
        out.append(f"quality:{o.quality.value}")
    if o.delivery_available:
        out.append(f"delivery_days:{o.delivery_days}")
    else:
        out.append("pickup_only")
    if not r["enough_stock"]:
        out.append("insufficient_stock")
    if not r["meets_moq"]:
        out.append(f"below_moq:{o.min_order_qty.normalize()}")
    return out

"""AGENT 2 - Dallol, the price scout.

For each product, looks at active offers in the searched regions and ranks them by total delivered cost:
    total = quantity x unit_price + delivery (when the supplier delivers)
Eligible = enough stock (available_qty >= quantity) and the order meets the supplier's minimum (quantity >= MOQ).
Best = lowest total among eligible offers, skipping offers flagged suspiciously cheap (>20% below the median).
"""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.agents.common import SUSPICIOUS_LOW_PCT, f, vs_pct
from app.analytics import scoring
from app.models import Offer, OfferStatus
from app.repositories.offers import base_query


def offers_for(db: Session, product_id: UUID, region_ids: list[UUID]) -> list[Offer]:
    q = base_query().where(Offer.product_id == product_id, Offer.status == OfferStatus.active)
    if region_ids:
        q = q.where(Offer.region_id.in_(region_ids))
    return list(db.scalars(q.order_by(Offer.unit_price, Offer.id)).unique().all())


def offer_out(o: Offer, qty: Decimal) -> dict:
    _, delivery, total = scoring.total_cost(o, qty)
    return {
        "offer_id": str(o.id),
        "supplier": o.business.name,
        "business_id": str(o.business_id),
        "verified": o.business.is_verified,
        "rating": float(o.business.rating or 0),
        "region_name": o.region.name_uz,
        "market_name": o.market.name if o.market else None,
        "unit": o.unit,
        "unit_price": f(o.unit_price),
        "delivery_price": f(delivery),
        "delivery_days": o.delivery_days,
        "total_cost": f(total),
        "available_qty": f(o.available_qty),
        "min_order_qty": f(o.min_order_qty),
        "quality": o.quality.value,
        "updated_at": o.updated_at.isoformat(),
        "source_site": o.source_site,
        "source_url": o.source_url,
        "location_note": o.location_note,
    }


def scout_item(product_id: UUID, quantity: float, offers: list[Offer], median_price: Decimal | None) -> dict:
    qty = Decimal(str(quantity))
    rows = []
    for o in offers:
        total = scoring.total_cost(o, qty)[2]
        eligible = (o.available_qty is None or o.available_qty >= qty) and qty >= o.min_order_qty
        d = vs_pct(o.unit_price, median_price) if median_price else None
        suspicious = d is not None and d < SUSPICIOUS_LOW_PCT
        rows.append((total, o, eligible, suspicious))
    rows.sort(key=lambda r: (r[0], str(r[1].id)))
    trusted = [r for r in rows if r[2] and not r[3]]
    best = trusted[0] if trusted else None
    if best:
        alternatives = trusted[1:5]
        cheaper_than = len(trusted) - 1
    else:  # nothing meets stock + MOQ: show the cheapest offers so the buyer can adjust the quantity
        alternatives = [r for r in rows if not r[3]][:4]
        cheaper_than = 0
    return {
        "product_id": str(product_id),
        "quantity": float(qty),
        "best": offer_out(best[1], qty) if best else None,
        "alternatives": [offer_out(r[1], qty) for r in alternatives],
        "offers_considered": len(offers),
        "cheaper_than": cheaper_than,
    }

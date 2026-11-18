"""Supply and demand indicators.

Observed metrics (counts straight from the database) are kept separate from the
*estimated* demand index. Views and inquiries are interest signals on this platform,
not measurements of real market demand.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Offer, OfferStatus, Product, ProductView, PurchaseRequest, PurchaseRequestItem, SearchLog


def _since(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _metrics(product_id: UUID, days: int, active: int, total_qty, inquiries: int, views: int, searches: int) -> dict:
    ratio = round(inquiries / active, 2) if active else None
    # Estimated interest index (0-100): weighted interest signals per active offer.
    interest = inquiries * 5 + searches * 2 + views * 0.5
    per_offer = interest / max(active, 1)
    demand_index = round(min(per_offer / 20 * 100, 100), 1)
    supply_level = "none" if active == 0 else "low" if active < 3 else "medium" if active < 8 else "high"
    if active == 0 and (searches or inquiries):
        signal = "demand_gap"
    elif demand_index > 60 and supply_level in ("low", "none"):
        signal = "undersupplied"
    elif demand_index < 15 and supply_level == "high":
        signal = "oversupplied"
    else:
        signal = "balanced"
    return {
        "product_id": str(product_id),
        "period_days": days,
        "observed": {
            "active_offers": active,
            "total_available_qty": float(total_qty or 0),
            "purchase_inquiries": inquiries,
            "offer_views": views,
            "searches": searches,
            "inquiry_to_offer_ratio": ratio,
        },
        "estimated": {
            "interest_index": demand_index,
            "supply_level": supply_level,
            "signal": signal,
            "disclaimer": "Estimated from on-platform activity only; not a measurement of total market demand.",
        },
    }


def _grouped(db: Session, days: int, product_ids: list[UUID] | None = None) -> dict[str, dict]:
    """All supply/interest counts per product in five grouped queries."""
    since = _since(days)

    def scope(q, col):
        return q.where(col.in_(product_ids)) if product_ids else q

    supply = db.execute(scope(
        select(Offer.product_id, func.count(Offer.id), func.sum(Offer.available_qty))
        .where(Offer.status == OfferStatus.active).group_by(Offer.product_id), Offer.product_id)).all()
    inquiries = db.execute(scope(
        select(PurchaseRequestItem.product_id, func.count(PurchaseRequestItem.id))
        .join(PurchaseRequest, PurchaseRequest.id == PurchaseRequestItem.request_id)
        .where(PurchaseRequest.created_at >= since).group_by(PurchaseRequestItem.product_id), PurchaseRequestItem.product_id)).all()
    views = db.execute(scope(
        select(ProductView.product_id, func.count(ProductView.id)).where(ProductView.created_at >= since)
        .group_by(ProductView.product_id), ProductView.product_id)).all()
    searches = db.execute(scope(
        select(SearchLog.product_id, func.count(SearchLog.id)).where(SearchLog.product_id.is_not(None), SearchLog.created_at >= since)
        .group_by(SearchLog.product_id), SearchLog.product_id)).all()
    return {
        "supply": {pid: (n, qty) for pid, n, qty in supply},
        "inquiries": dict(inquiries),
        "views": dict(views),
        "searches": dict(searches),
    }


def analyze(db: Session, product_id: UUID, days: int = 30) -> dict:
    return analyze_many(db, [product_id], days)[product_id]


def analyze_many(db: Session, product_ids: list[UUID], days: int = 30) -> dict[UUID, dict]:
    g = _grouped(db, days, list(product_ids))
    out = {}
    for pid in product_ids:
        n, qty = g["supply"].get(pid, (0, Decimal(0)))
        out[pid] = _metrics(pid, days, n, qty, g["inquiries"].get(pid, 0), g["views"].get(pid, 0), g["searches"].get(pid, 0))
    return out


def overview(db: Session, days: int = 30) -> list[dict]:
    g = _grouped(db, days)
    rows = []
    for pid, slug, uz, ru, en, unit, emoji in db.execute(
        select(Product.id, Product.slug, Product.name_uz, Product.name_ru, Product.name_en, Product.unit, Product.emoji)
    ).all():
        n, qty = g["supply"].get(pid, (0, Decimal(0)))
        a = _metrics(pid, days, n, qty, g["inquiries"].get(pid, 0), g["views"].get(pid, 0), g["searches"].get(pid, 0))
        rows.append({"product_id": str(pid), "slug": slug, "name_uz": uz, "name_ru": ru, "name_en": en, "unit": unit, "emoji": emoji, **a})
    return rows


def demand_gaps(db: Session, days: int = 14, max_offers: int = 3) -> list[dict]:
    """Products people searched for recently that have fewer than `max_offers` active offers."""
    since = _since(days)
    searched = (
        select(SearchLog.product_id.label("pid"), func.count(SearchLog.id).label("n"))
        .where(SearchLog.product_id.is_not(None), SearchLog.created_at >= since)
        .group_by(SearchLog.product_id)
        .subquery()
    )
    active = (
        select(Offer.product_id.label("pid"), func.count(Offer.id).label("n"))
        .where(Offer.status == OfferStatus.active).group_by(Offer.product_id).subquery()
    )
    n_active = func.coalesce(active.c.n, 0)
    rows = db.execute(
        select(Product.id, Product.slug, Product.name_uz, Product.name_ru, Product.name_en, Product.emoji, searched.c.n, n_active)
        .join(searched, searched.c.pid == Product.id)
        .outerjoin(active, active.c.pid == Product.id)
        .where(n_active < max_offers)
    ).all()
    out = [{"product_id": str(pid), "slug": slug, "name_uz": uz, "name_ru": ru, "name_en": en, "emoji": emoji, "searches": n, "active_offers": a}
           for pid, slug, uz, ru, en, emoji, n, a in rows]
    out.sort(key=lambda r: r["searches"], reverse=True)
    return out

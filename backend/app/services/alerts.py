"""Database-backed price alert evaluation.

Alerts are evaluated (a) whenever an offer is created or its price changes and
(b) on demand via POST /api/alerts/check. Triggered alerts create in-app notifications.
A cooldown prevents the same alert from firing repeatedly.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.price_stats import pct_change, q2
from app.models import AlertCondition, Offer, OfferStatus, PriceAlert
from app.services.common import notify

COOLDOWN = timedelta(hours=6)


def _fmt(v: Decimal) -> str:
    return f"{int(v):,}".replace(",", " ")


def _cooling(alert: PriceAlert) -> bool:
    if not alert.last_triggered_at:
        return False
    last = alert.last_triggered_at if alert.last_triggered_at.tzinfo else alert.last_triggered_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - last < COOLDOWN


def current_avg(db: Session, product_id, region_id=None) -> Decimal | None:
    q = select(Offer.unit_price).where(Offer.product_id == product_id, Offer.status == OfferStatus.active)
    if region_id:
        q = q.where(Offer.region_id == region_id)
    prices = db.scalars(q).all()
    return q2(sum(prices) / len(prices)) if prices else None


def _fire(db: Session, alert: PriceAlert, title: str, body: str, link: str) -> None:
    alert.last_triggered_at = datetime.now(timezone.utc)
    notify(db, alert.user_id, "price_alert", title, body, link)


def evaluate_for_offer(db: Session, offer: Offer, previous_price: Decimal | None) -> int:
    if offer.status != OfferStatus.active:
        return 0
    alerts = db.scalars(select(PriceAlert).where(PriceAlert.product_id == offer.product_id, PriceAlert.is_active.is_(True))).all()
    fired = 0
    name = offer.product.name_uz if offer.product else "Mahsulot"
    for a in alerts:
        if a.region_id and a.region_id != offer.region_id:
            continue
        if _cooling(a):
            continue
        link = f"/app/market/{offer.id}"
        if a.condition == AlertCondition.below and a.threshold and offer.unit_price < a.threshold:
            _fire(db, a, f"{name}: {_fmt(offer.unit_price)} so'm", f"Narx {_fmt(a.threshold)} so'mdan pastga tushdi — {offer.business.name}.", link)
            fired += 1
        elif a.condition == AlertCondition.above and a.threshold and offer.unit_price > a.threshold:
            _fire(db, a, f"{name}: {_fmt(offer.unit_price)} so'm", f"Narx {_fmt(a.threshold)} so'mdan oshdi — {offer.business.name}.", link)
            fired += 1
        elif a.condition == AlertCondition.verified_listing and previous_price is None and offer.business.is_verified:
            _fire(db, a, f"{name}: yangi tasdiqlangan taklif", f"{offer.business.name} {_fmt(offer.unit_price)} so'm narxda taklif joyladi.", link)
            fired += 1
        elif a.condition == AlertCondition.change_pct and a.threshold:
            avg = current_avg(db, a.product_id, a.region_id)
            change = pct_change(avg, a.baseline_price)
            if change is not None and abs(change) >= float(a.threshold):
                _fire(db, a, f"{name}: {change:+.1f}%", f"O'rtacha narx {_fmt(a.baseline_price)} → {_fmt(avg)} so'm.", f"/app/analytics?product={a.product_id}")
                a.baseline_price = avg
                fired += 1
    return fired


def check_user_alerts(db: Session, user_id) -> int:
    """Evaluate all of a user's active alerts against the current market state."""
    alerts = db.scalars(select(PriceAlert).where(PriceAlert.user_id == user_id, PriceAlert.is_active.is_(True))).all()
    fired = 0
    for a in alerts:
        if _cooling(a):
            continue
        q = select(Offer).where(Offer.product_id == a.product_id, Offer.status == OfferStatus.active)
        if a.region_id:
            q = q.where(Offer.region_id == a.region_id)
        offers = db.scalars(q).all()
        if not offers:
            continue
        name = a.product.name_uz
        cheapest = min(offers, key=lambda o: o.unit_price)
        priciest = max(offers, key=lambda o: o.unit_price)
        if a.condition == AlertCondition.below and a.threshold and cheapest.unit_price < a.threshold:
            _fire(db, a, f"{name}: {_fmt(cheapest.unit_price)} so'm", f"Narx {_fmt(a.threshold)} so'mdan past — {cheapest.business.name}.", f"/app/market/{cheapest.id}")
            fired += 1
        elif a.condition == AlertCondition.above and a.threshold and priciest.unit_price > a.threshold:
            _fire(db, a, f"{name}: {_fmt(priciest.unit_price)} so'm", f"Narx {_fmt(a.threshold)} so'mdan yuqori.", f"/app/market/{priciest.id}")
            fired += 1
        elif a.condition == AlertCondition.change_pct and a.threshold:
            avg = current_avg(db, a.product_id, a.region_id)
            change = pct_change(avg, a.baseline_price)
            if change is not None and abs(change) >= float(a.threshold):
                _fire(db, a, f"{name}: {change:+.1f}%", f"O'rtacha narx {_fmt(a.baseline_price)} → {_fmt(avg)} so'm.", f"/app/analytics?product={a.product_id}")
                a.baseline_price = avg
                fired += 1
    db.commit()
    return fired

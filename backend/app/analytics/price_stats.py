"""Deterministic price intelligence. Every number here is computed from database rows."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from statistics import median
from uuid import UUID

import numpy as np
import pandas as pd
from sqlalchemy import Float, String, and_, func, select, type_coerce
from sqlalchemy.orm import Session

from app.analytics import cache
from app.models import Offer, OfferPriceHistory, OfferStatus, Product, ProductCategory, Region


def pct_change(current: float | Decimal | None, previous: float | Decimal | None) -> float | None:
    """((current - previous) / previous) * 100, safe for missing data and zero."""
    if current is None or previous is None:
        return None
    prev = float(previous)
    if prev == 0:
        return None
    return round((float(current) - prev) / prev * 100, 2)


def q2(v: Decimal | float) -> Decimal:
    return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def active_offers_q(product_id: UUID | None = None, region_id: UUID | None = None):
    q = select(Offer).where(Offer.status == OfferStatus.active)
    if product_id:
        q = q.where(Offer.product_id == product_id)
    if region_id:
        q = q.where(Offer.region_id == region_id)
    return q


OUTLIER_HI, OUTLIER_LO = Decimal("2.5"), Decimal("0.4")


def robust(prices: list[Decimal]) -> tuple[list[Decimal], int]:
    """Drop outliers (above 2.5x or below 0.4x the median) once there are enough offers to judge.
    Outliers stay visible in listings and go to the admin review queue; they just don't move the index."""
    if len(prices) < 4:
        return prices, 0
    med = Decimal(str(median(prices)))
    kept = [p for p in prices if OUTLIER_LO * med <= p <= OUTLIER_HI * med]
    return kept, len(prices) - len(kept)


def outlier_offer_ids(db: Session, product_ids: list[UUID] | None = None) -> set[UUID]:
    """Active offers whose price is an outlier against the product's *national* median.
    Used so that regional slices (often < 4 offers) are protected too."""
    q = select(Offer.id, Offer.product_id, Offer.unit_price).where(Offer.status == OfferStatus.active)
    if product_ids:
        q = q.where(Offer.product_id.in_(product_ids))
    by_p: dict[UUID, list[tuple[UUID, Decimal]]] = {}
    for oid, pid, price in db.execute(q).all():
        by_p.setdefault(pid, []).append((oid, price))
    out: set[UUID] = set()
    for rows in by_p.values():
        if len(rows) < 4:
            continue
        med = Decimal(str(median([p for _, p in rows])))
        out |= {oid for oid, p in rows if not (OUTLIER_LO * med <= p <= OUTLIER_HI * med)}
    return out


def snapshot(prices: list[Decimal]) -> dict:
    prices, excluded = robust(list(prices))
    if not prices:
        return {"count": 0, "avg": None, "min": None, "max": None, "median": None, "excluded_outliers": excluded}
    return {
        "excluded_outliers": excluded,
        "count": len(prices),
        "avg": q2(sum(prices) / len(prices)),
        "min": min(prices),
        "max": max(prices),
        "median": q2(median(prices)),
    }


def _raw_key(v) -> str:
    """Normalise a UUID column value read without SQLAlchemy type processing (hex str on SQLite, uuid on PostgreSQL)."""
    return v.hex if isinstance(v, UUID) else str(v).replace("-", "").lower()


def daily_index(db: Session, product_ids: list[UUID] | None = None, days: int = 30, region_id: UUID | None = None) -> pd.DataFrame:
    """Daily market price index per product.

    For each offer we carry its last known price forward day by day, then average across offers.
    Returns columns: product_id, date, avg, min, max, count.

    Only the rows inside the window plus each offer's last row before it are read (that is all the
    carry-forward needs), and id/timestamp columns skip ORM type processing; everything else is vectorised.
    """
    cols = ["product_id", "date", "avg", "min", "max", "count"]
    now = datetime.now(timezone.utc)
    today = pd.Timestamp(now.date())
    start = today - pd.Timedelta(days=days - 1)
    win_start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    since = now - timedelta(days=days + 45)
    H = OfferPriceHistory
    raw = (type_coerce(H.offer_id, String), type_coerce(H.product_id, String), type_coerce(H.price, Float), type_coerce(H.recorded_at, String))

    def scoped(q):
        if product_ids:
            q = q.where(H.product_id.in_(product_ids))
        if region_id:
            q = q.where(H.region_id == region_id)
        return q

    prior = scoped(select(H.offer_id.label("oid"), func.max(H.recorded_at).label("mx"))
                   .where(H.recorded_at >= since, H.recorded_at < win_start).group_by(H.offer_id)).subquery()
    rows = db.execute(scoped(select(*raw).where(H.recorded_at >= win_start))).all()
    rows += db.execute(select(*raw).join(prior, and_(prior.c.oid == H.offer_id, prior.c.mx == H.recorded_at))).all()
    if not rows:
        return pd.DataFrame(columns=cols)
    df = pd.DataFrame(rows, columns=["offer_id", "product_id", "price", "recorded_at"])
    df["offer_id"] = df["offer_id"].map(_raw_key)
    excluded = {u.hex for u in outlier_offer_ids(db, product_ids)}
    if excluded:
        df = df[~df["offer_id"].isin(excluded)]
    if df.empty:
        return pd.DataFrame(columns=cols)
    df["price"] = df["price"].astype(float)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, format="mixed")
    df["date"] = df["recorded_at"].dt.tz_localize(None).dt.normalize()

    # A (date x offer) matrix of each offer's last price that day, carried forward over the window.
    df = df.sort_values("recorded_at")
    wide = df.groupby(["date", "offer_id"])["price"].last().unstack("offer_id")
    full = pd.date_range(min(wide.index.min(), start), today, freq="D")
    wide = wide.reindex(full).ffill()
    wide = wide.loc[wide.index >= start]
    vals = wide.to_numpy()
    mask = ~np.isnan(vals)
    if not mask.any():
        return pd.DataFrame(columns=cols)
    r_idx, c_idx = np.nonzero(mask)
    offer_product = df.drop_duplicates("offer_id").set_index("offer_id")["product_id"]
    pid_of_col = offer_product.reindex(wide.columns).to_numpy()
    long = pd.DataFrame({"date": wide.index.to_numpy()[r_idx], "product_id": pid_of_col[c_idx], "price": vals[r_idx, c_idx]})
    # Same outlier rule as snapshot(), applied per day, for products with >= 4 offers.
    n_offers = df.groupby("product_id")["offer_id"].nunique()
    med = long.groupby(["product_id", "date"])["price"].transform("median")
    big = long["product_id"].map(n_offers) >= 4
    keep = ~big | ((long["price"] <= med * float(OUTLIER_HI)) & (long["price"] >= med * float(OUTLIER_LO)))
    long = long[keep]
    agg = long.groupby(["product_id", "date"], sort=True)["price"].agg(["mean", "min", "max", "count"]).reset_index()
    agg = agg.rename(columns={"mean": "avg"})
    to_uuid = {k: UUID(_raw_key(k)) for k in agg["product_id"].unique()}
    agg["product_id"] = agg["product_id"].map(to_uuid)
    return agg[cols]


def series_for(db: Session, product_id: UUID, days: int = 30, region_id: UUID | None = None) -> list[dict]:
    df = daily_index(db, [product_id], days, region_id)
    return [
        {
            "date": r.date.strftime("%Y-%m-%d"),
            "avg": round(r.avg, 0),
            "min": round(r.min, 0),
            "max": round(r.max, 0),
            "count": int(r.count),
        }
        for r in df.itertuples()
    ]


def product_stats(db: Session, product_id: UUID, region_id: UUID | None = None) -> dict:
    excluded = outlier_offer_ids(db, [product_id])
    offers = [o for o in db.scalars(active_offers_q(product_id, region_id)).all() if o.id not in excluded]
    snap = snapshot([o.unit_price for o in offers])
    snap["excluded_outliers"] += len(excluded)
    series = series_for(db, product_id, 31, region_id)
    prev_7 = series[-8]["avg"] if len(series) >= 8 else None
    prev_30 = series[0]["avg"] if len(series) >= 30 else None
    cur = float(snap["avg"]) if snap["avg"] is not None else None
    last_updated = max((o.updated_at for o in offers), default=None)
    return {
        **snap,
        "change_7d_pct": pct_change(cur, prev_7),
        "change_30d_pct": pct_change(cur, prev_30),
        "total_qty": sum((o.available_qty for o in offers if o.available_qty is not None), Decimal(0)),
        "verified_count": sum(1 for o in offers if o.business.is_verified),
        "last_updated": last_updated,
        "history_days": len(series),
    }


def regional_comparison(db: Session, product_id: UUID) -> list[dict]:
    excluded = outlier_offer_ids(db, [product_id])
    offers = [o for o in db.scalars(active_offers_q(product_id)).all() if o.id not in excluded]
    by_region: dict[UUID, list[Offer]] = {}
    for o in offers:
        by_region.setdefault(o.region_id, []).append(o)
    national = snapshot([o.unit_price for o in offers])
    nat_avg = national["avg"]
    result = []
    for rid, items in by_region.items():
        region = db.get(Region, rid)
        snap = snapshot([o.unit_price for o in items])
        result.append(
            {
                "region_id": str(rid),
                "region_code": region.code,
                "region_name_uz": region.name_uz,
                "region_name_ru": region.name_ru,
                "region_name_en": region.name_en,
                "lat": region.lat,
                "lng": region.lng,
                **snap,
                "diff_vs_national_pct": pct_change(snap["avg"], nat_avg),
                "last_updated": max(o.updated_at for o in items),
            }
        )
    result.sort(key=lambda r: r["avg"])
    return result


def _all_movers(db: Session, days: int) -> list[dict]:
    """Every product with at least two daily index points, ranked by |change| over `days`."""
    df = daily_index(db, None, days + 1)
    if df.empty:
        return []
    df = df.sort_values(["product_id", "date"])
    g = df.groupby("product_id", sort=False)["avg"]
    summary = pd.DataFrame({"first": g.first(), "last": g.last(), "n": g.size(), "spark": g.agg(list)})
    summary = summary[summary["n"] >= 2]
    meta = {
        pid: (slug, uz, ru, en, unit, emoji, cslug)
        for pid, slug, uz, ru, en, unit, emoji, cslug in db.execute(
            select(Product.id, Product.slug, Product.name_uz, Product.name_ru, Product.name_en, Product.unit, Product.emoji, ProductCategory.slug)
            .join(ProductCategory, ProductCategory.id == Product.category_id)
        ).all()
    }
    counts = dict(
        db.execute(select(Offer.product_id, func.count(Offer.id)).where(Offer.status == OfferStatus.active).group_by(Offer.product_id)).all()
    )
    rows = []
    for pid, first, last, _, spark in summary.itertuples():
        m = meta.get(pid)
        change = pct_change(last, first)
        if not m or change is None:
            continue
        slug, uz, ru, en, unit, emoji, cslug = m
        rows.append(
            {
                "product_id": str(pid),
                "slug": slug,
                "name_uz": uz,
                "name_ru": ru,
                "name_en": en,
                "unit": unit,
                "emoji": emoji,
                "category_slug": cslug,
                "offers": int(counts.get(pid, 0)),
                "current_avg": round(float(last), 0),
                "previous_avg": round(float(first), 0),
                "change_pct": change,
                "spark": [round(float(v), 0) for v in spark],
            }
        )
    rows.sort(key=lambda r: abs(r["change_pct"]), reverse=True)
    return rows


def market_movers(db: Session, days: int = 7, limit: int = 10, category: str | None = None) -> list[dict]:
    """Products ranked by price change over `days`, from the daily index (cached market-wide for 60 s)."""
    rows = cache.cached(db, ("movers", days), lambda: _all_movers(db, days))
    if category:
        rows = [r for r in rows if r["category_slug"] == category]
    return [dict(r) for r in rows[:limit]]



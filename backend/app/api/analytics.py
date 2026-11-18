from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.ai.tools import jsonable
from app.analytics import cache, forecasting, price_stats, scoring, supply_demand
from app.core.deps import get_current_user, get_seller_business, require_buyer
from app.database.session import get_db
from app.models import (
    Business, Notification, Offer, OfferPriceHistory, OfferStatus, PriceAlert, Product, ProductCategory, ProductView,
    PurchaseRequest, RequestStatus, User,
)
from app.repositories import offers as repo

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _product(db: Session, product_id: UUID) -> Product:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.get("/products/{product_id}/stats")
def stats(product_id: UUID, region_id: UUID | None = None, db: Session = Depends(get_db)):
    _product(db, product_id)
    return jsonable(price_stats.product_stats(db, product_id, region_id))


@router.get("/products/{product_id}/history")
def history(product_id: UUID, days: int = Query(30, ge=2, le=180), region_id: UUID | None = None, db: Session = Depends(get_db)):
    _product(db, product_id)
    s = price_stats.series_for(db, product_id, days, region_id)
    return {"series": s, "change_pct": price_stats.pct_change(s[-1]["avg"], s[0]["avg"]) if len(s) > 1 else None}


@router.get("/products/{product_id}/regional")
def regional(product_id: UUID, db: Session = Depends(get_db)):
    _product(db, product_id)
    return jsonable(price_stats.regional_comparison(db, product_id))


@router.get("/products/{product_id}/forecast")
def forecast(product_id: UUID, horizon: int = Query(7, ge=1, le=14), db: Session = Depends(get_db)):
    _product(db, product_id)
    return forecasting.forecast(price_stats.series_for(db, product_id, 60), horizon)


@router.get("/products/{product_id}/supply-demand")
def supply(product_id: UUID, db: Session = Depends(get_db)):
    _product(db, product_id)
    return supply_demand.analyze(db, product_id)


@router.get("/movers")
def movers(days: int = Query(7, ge=1, le=60), limit: int = Query(10, ge=1, le=700),
           category: str | None = Query(None, max_length=40), db: Session = Depends(get_db)):
    return price_stats.market_movers(db, days, limit, category)


def _overview(db: Session) -> dict:
    active_q = select(
        func.count(Offer.id), func.count(func.distinct(Offer.business_id)), func.count(func.distinct(Offer.product_id)),
        func.sum(case((Offer.is_demo.is_(True), 1), else_=0)), func.max(Offer.updated_at),
    ).where(Offer.status == OfferStatus.active)
    active, suppliers, products, demo, last = db.execute(active_q).one()
    records = db.scalar(select(func.count(OfferPriceHistory.id))) or 0
    demo = int(demo or 0)
    if last is not None and last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return {
        "active_offers": active or 0, "active_suppliers": suppliers or 0, "products_tracked": products or 0, "price_records": records,
        "demo_offers": demo, "is_demo_data": demo > 0, "last_updated": last.isoformat() if last else None,
        "movers": price_stats.market_movers(db, 7, 12),
    }


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    """Public market summary used by the landing page and the analytics page (cached for 60 s)."""
    return cache.cached(db, ("overview",), lambda: _overview(db))


@router.get("/supply-demand")
def supply_overview(db: Session = Depends(get_db)):
    rows = supply_demand.overview(db)
    return {"rows": rows, "demand_gaps": supply_demand.demand_gaps(db)}


@router.get("/buyer-dashboard")
def buyer_dashboard(user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    active_f = Offer.status == OfferStatus.active
    total, avg_price, n_suppliers, demo = db.execute(
        select(func.count(Offer.id), func.avg(Offer.unit_price), func.count(func.distinct(Offer.business_id)),
               func.sum(case((Offer.is_demo.is_(True), 1), else_=0))).where(active_f)
    ).one()
    avg_price_change = price_stats.market_movers(db, 7, 40)
    # Potential savings: for each product, gap between average and cheapest price for 100 units.
    per_product = db.execute(
        select(Offer.product_id, func.count(Offer.id), func.avg(Offer.unit_price), func.min(Offer.unit_price), func.sum(Offer.views_count))
        .where(active_f).group_by(Offer.product_id)
    ).all()
    savings = sum(((Decimal(str(a)) - Decimal(str(m))) * 100 for _, n, a, m, _ in per_product if n > 1), Decimal(0))
    savings_avg = price_stats.q2(savings / max(len(per_product), 1))
    favs = repo.favorite_ids(db, user.id)
    top_viewed = [pid for pid, *_ in sorted(per_product, key=lambda r: -(r[4] or 0))[:6]]
    candidates = db.scalars(repo.base_query().where(active_f, Offer.product_id.in_(top_viewed))).unique().all() if top_viewed else []
    by_product: dict[UUID, list[Offer]] = {}
    for o in candidates:
        by_product.setdefault(o.product_id, []).append(o)
    recommended = []
    for pid in top_viewed:
        rows = scoring.compare(by_product.get(pid, []), Decimal("100"))
        best = next((r for r in rows if r["is_recommended"]), None)
        if best:
            recommended.append({**repo.to_out(best["offer"], favs).model_dump(mode="json"), "score": best["score"], "reasons": best["reasons"]})
    popular = db.execute(
        select(Product, ProductCategory.slug, func.sum(Offer.views_count).label("views"), func.count(Offer.id).label("offers"), func.min(Offer.unit_price).label("min_price"))
        .join(Offer, Offer.product_id == Product.id).join(ProductCategory, ProductCategory.id == Product.category_id).where(active_f)
        .group_by(Product.id, ProductCategory.slug).order_by(func.sum(Offer.views_count).desc()).limit(6)
    ).all()
    recent = db.scalars(repo.base_query().where(active_f).order_by(Offer.updated_at.desc()).limit(8)).unique().all()
    alerts = db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.kind == "price_alert").order_by(Notification.created_at.desc()).limit(5)).all()
    my_requests = db.scalar(select(func.count(PurchaseRequest.id)).where(PurchaseRequest.buyer_id == user.id, PurchaseRequest.status.in_([RequestStatus.pending, RequestStatus.countered]))) or 0
    top = avg_price_change[:4]
    series = price_stats.daily_index(db, [UUID(m["product_id"]) for m in top], 30) if top else None
    def _series(pid: str) -> list[dict]:
        if series is None or series.empty:
            return []
        g = series[series["product_id"] == UUID(pid)]
        return [{"date": r.date.strftime("%Y-%m-%d"), "avg": round(r.avg, 0), "min": round(r.min, 0), "max": round(r.max, 0), "count": int(r.count)}
                for r in g.itertuples()]
    return jsonable({
        "kpis": {
            "total_offers": total or 0,
            "avg_price": price_stats.q2(avg_price) if avg_price is not None else None,
            "active_suppliers": n_suppliers or 0,
            "potential_savings_per_100_units": savings_avg,
            "open_requests": my_requests,
            "active_alerts": db.scalar(select(func.count(PriceAlert.id)).where(PriceAlert.user_id == user.id, PriceAlert.is_active.is_(True))) or 0,
        },
        "movers": avg_price_change[:8],
        "chart_products": [{"product_id": m["product_id"], "name_uz": m["name_uz"], "name_ru": m["name_ru"], "name_en": m["name_en"],
                            "emoji": m["emoji"], "series": _series(m["product_id"])} for m in top],
        "popular": [{"product_id": str(p.id), "name_uz": p.name_uz, "name_ru": p.name_ru, "name_en": p.name_en, "unit": p.unit,
                     "emoji": p.emoji, "category_slug": cslug, "image_url": p.image_url, "views": int(v or 0), "offers": int(n), "min_price": mp}
                    for p, cslug, v, n, mp in popular],
        "recommended": recommended,
        "recent_activity": [repo.to_out(o, favs).model_dump(mode="json") for o in recent],
        "alerts": [{"id": str(a.id), "title": a.title, "body": a.body, "link": a.link, "created_at": a.created_at, "is_read": a.is_read} for a in alerts],
        "is_demo_data": bool(demo),
    })


@router.get("/seller-dashboard")
def seller_dashboard(biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    offers = db.scalars(select(Offer).where(Offer.business_id == biz.id, Offer.status != OfferStatus.removed)).all()
    active = [o for o in offers if o.status == OfferStatus.active]
    since = datetime.now(timezone.utc) - timedelta(days=30)
    ids = [o.id for o in offers]
    views_30 = db.scalar(select(func.count(ProductView.id)).where(ProductView.offer_id.in_(ids), ProductView.created_at >= since)) or 0 if ids else 0
    daily_views = db.execute(
        select(func.date(ProductView.created_at), func.count(ProductView.id))
        .where(ProductView.offer_id.in_(ids), ProductView.created_at >= since).group_by(func.date(ProductView.created_at))
    ).all() if ids else []
    reqs = db.scalars(select(PurchaseRequest).where(PurchaseRequest.business_id == biz.id).order_by(PurchaseRequest.created_at.desc())).all()
    competitiveness = []
    pids = list({o.product_id for o in active})
    market_prices: dict[UUID, list[Decimal]] = {}
    if pids:
        for pid, price in db.execute(select(Offer.product_id, Offer.unit_price).where(Offer.product_id.in_(pids), Offer.status == OfferStatus.active)).all():
            market_prices.setdefault(pid, []).append(price)
    demand = supply_demand.analyze_many(db, pids) if pids else {}
    for o in active:
        snap = price_stats.snapshot(market_prices.get(o.product_id, [o.unit_price]))
        diff = price_stats.pct_change(o.unit_price, snap["avg"])
        competitiveness.append({
            "offer_id": str(o.id), "product_id": str(o.product_id), "emoji": o.product.emoji, "title": o.title,
            "product_name_uz": o.product.name_uz, "product_name_ru": o.product.name_ru, "product_name_en": o.product.name_en,
            "unit": o.unit, "your_price": o.unit_price, "market_avg": snap["avg"], "market_min": snap["min"], "market_max": snap["max"],
            "competitors": snap["count"] - 1, "diff_vs_avg_pct": diff,
            "position": "cheapest" if snap["min"] is not None and o.unit_price <= snap["min"] else "below_avg" if diff is not None and diff < 0 else "above_avg",
            "views": o.views_count, "inquiries": sum(1 for r in reqs if r.offer_id == o.id),
            "demand": demand[o.product_id]["estimated"],
        })
    return jsonable({
        "business": {"id": biz.id, "name": biz.name, "verification_status": biz.verification_status.value, "rating": biz.rating, "completed_deals": biz.completed_deals},
        "kpis": {
            "active_products": len({o.product_id for o in active}), "active_offers": len(active), "paused_offers": sum(1 for o in offers if o.status == OfferStatus.paused),
            "incoming_inquiries": sum(1 for r in reqs if r.status == RequestStatus.pending), "total_views": sum(o.views_count for o in offers), "views_30d": views_30,
            "avg_listed_price": price_stats.q2(sum(o.unit_price for o in active) / len(active)) if active else None,
            "completed_deals": biz.completed_deals,
        },
        "views_series": [{"date": str(d), "views": n} for d, n in sorted(daily_views, key=lambda r: str(r[0]))],
        "most_viewed": [{"offer_id": o.id, "title": o.title, "views": o.views_count, "unit_price": o.unit_price, "unit": o.unit} for o in sorted(offers, key=lambda o: -o.views_count)[:5]],
        "competitiveness": competitiveness,
        "recent_requests": [{"id": r.id, "status": r.status.value, "buyer": r.buyer.full_name, "product": r.items[0].product.name_uz if r.items else None,
                             "quantity": r.items[0].quantity if r.items else None, "created_at": r.created_at} for r in reqs[:6]],
    })


@router.get("/whoami-role")
def role_probe(user: User = Depends(get_current_user)):
    return {"role": user.role.value}

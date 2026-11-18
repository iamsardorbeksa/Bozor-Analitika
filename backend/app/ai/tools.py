"""Backend-controlled tools for the AI Market Analyst.

The language model never sees the database directly: it can only call these
functions, and every number in an answer must come from their output.
"""
from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics import forecasting, price_stats, scoring, supply_demand
from app.models import Business, Offer, OfferStatus, Product, Region, VerificationStatus
from app.repositories import offers as offer_repo

LIMIT = 10


def _norm(s: str) -> str:
    s = s.lower().replace("ʻ", "'").replace("ʼ", "'").replace("‘", "'").replace("’", "'").replace("`", "'")
    return re.sub(r"\s+", " ", s).strip()


def resolve_product(db: Session, name: str | None) -> Product | None:
    if not name:
        return None
    n = _norm(name)
    tokens = set(re.findall(r"\w[\w']*", n))
    products = db.scalars(select(Product)).all()
    best, best_len = None, 0
    for p in products:
        names = [p.slug, p.name_uz, p.name_ru, p.name_en, *(p.aliases or [])]
        for cand in names:
            c = _norm(cand)
            if not c:
                continue
            if c == n:
                return p
            if len(c) <= 3:  # very short names ("un") must match a whole word
                hit, score = c in tokens, len(c)
            else:
                # stem match at a word start: "kartoshka" ~ "kartoshkaning", "томаты" ~ "томат"
                stem = c[: max(4, len(c) - 2)]
                if stem in n and re.search(r"(^|[^\w'])" + re.escape(stem), n):
                    hit, score = True, len(stem)
                elif len(n) >= 4 and c.startswith(n):  # typed prefix: rank by what was typed, so the base product wins
                    hit, score = True, len(n)
                else:
                    hit = False
            if hit and score > best_len:
                best, best_len = p, score
    return best


def find_products_in_text(db: Session, text: str) -> list[Product]:
    t = _norm(text)
    found = []
    for p in db.scalars(select(Product)).all():
        for cand in [p.name_uz, p.name_ru, p.name_en, *(p.aliases or [])]:
            c = _norm(cand)
            stem = c[: max(4, len(c) - 2)]
            if len(stem) >= 3 and stem in t and re.search(r"(^|[^\w])" + re.escape(stem), t):
                found.append(p)
                break
    return found


def resolve_region(db: Session, name: str | None) -> Region | None:
    if not name:
        return None
    n = _norm(name)
    for r in db.scalars(select(Region)).all():
        for c in (r.code, r.name_uz, r.name_ru, r.name_en):
            stem = _norm(c)[:5]
            # word-start match only: "kartoshka" must not match "toshkent"
            if stem and re.search(r"(^|[^\w'])" + re.escape(stem), n):
                return r
    return None


def _pmeta(p: Product) -> dict:
    """Product identity for tool output: uz name under "product" (compatibility) plus localized names and emoji."""
    return {"product": p.name_uz, "product_name_ru": p.name_ru, "product_name_en": p.name_en, "emoji": p.emoji}


def _offer_brief(o: Offer) -> dict:
    return {
        "offer_id": str(o.id),
        "title": o.title,
        "product": o.product.name_uz,
        "product_name_ru": o.product.name_ru,
        "product_name_en": o.product.name_en,
        "product_emoji": o.product.emoji,
        "supplier": o.business.name,
        "supplier_verified": o.business.is_verified,
        "supplier_rating": float(o.business.rating),
        "unit": o.unit,
        "unit_price_uzs": float(o.unit_price),
        "available_qty": float(o.available_qty) if o.available_qty is not None else None,
        "min_order_qty": float(o.min_order_qty),
        "quality": o.quality.value,
        "region": o.region.name_uz,
        "market": o.market.name if o.market else None,
        "delivery": {"available": o.delivery_available, "price_uzs": float(o.delivery_price), "days": o.delivery_days},
        "source": o.source.value,
        "is_demo_data": o.is_demo,
        "observed_on_site": o.source_site,  # e.g. korzinka.uz / olx.uz: a real public price, contact the seller there
        "source_url": o.source_url,
        "last_updated": o.updated_at.isoformat(),
    }


def _not_found(name: str | None) -> dict:
    return {"error": "product_not_found", "query": name, "hint": "Use a product name from the catalogue, e.g. kartoshka, piyoz, pomidor, guruch, sement."}


def _data_note(offers: list[Offer]) -> dict:
    return {
        "offers_considered": len(offers),
        "includes_demo_data": any(o.is_demo for o in offers),
        "last_updated": max((o.updated_at for o in offers), default=None),
    }


# ---------------------------------------------------------------- tool implementations

def search_products(db: Session, query: str | None = None, category: str | None = None, region: str | None = None,
                    max_price: float | None = None, verified_only: bool = False, sort: str = "price_asc", limit: int = LIMIT) -> dict:
    product = resolve_product(db, query) if query else None
    reg = resolve_region(db, region)
    items, total = offer_repo.search(
        db,
        q=None if product else query,
        product_id=product.id if product else None,
        category=category,
        region_id=reg.id if reg else None,
        max_price=Decimal(str(max_price)) if max_price else None,
        verified_only=verified_only,
        sort=sort if sort in offer_repo.SORTS else "price_asc",
        page_size=min(limit, 20),
    )
    return {"total_matches": total, **(_pmeta(product) if product else {"product": None}), "region": reg.name_uz if reg else None,
            "offers": [_offer_brief(o) for o in items], **_data_note(items)}


def compare_offers(db: Session, product: str, quantity: float = 100, region: str | None = None) -> dict:
    p = resolve_product(db, product)
    if not p:
        return _not_found(product)
    reg = resolve_region(db, region)
    offers, _ = offer_repo.search(db, product_id=p.id, region_id=reg.id if reg else None, page_size=50, sort="price_asc")
    qty = Decimal(str(quantity))
    rows = scoring.compare(offers, qty)
    avg_total = sum((r["total_cost"] for r in rows), Decimal(0)) / len(rows) if rows else None
    best = next((r for r in rows if r["is_recommended"]), None)
    return {
        **_pmeta(p), "unit": p.unit, "quantity": float(qty), "region": reg.name_uz if reg else "all",
        "formula": "total_cost = quantity * unit_price + delivery_cost",
        "rows": [
            {**_offer_brief(r["offer"]), "subtotal_uzs": float(r["subtotal"]), "delivery_cost_uzs": float(r["delivery_cost"]),
             "total_cost_uzs": float(r["total_cost"]), "score": r["score"], "is_recommended": r["is_recommended"],
             "is_cheapest": r["is_cheapest"], "reasons": r["reasons"], "enough_stock": r["enough_stock"], "meets_moq": r["meets_moq"]}
            for r in rows[:LIMIT]
        ],
        "average_total_uzs": float(price_stats.q2(avg_total)) if avg_total else None,
        "savings_vs_average_uzs": float(price_stats.q2(avg_total - best["total_cost"])) if best and avg_total else None,
        **_data_note(offers),
    }


def get_price_history(db: Session, product: str, days: int = 7, region: str | None = None) -> dict:
    p = resolve_product(db, product)
    if not p:
        return _not_found(product)
    reg = resolve_region(db, region)
    days = max(2, min(int(days), 90))
    series = price_stats.series_for(db, p.id, days, reg.id if reg else None)
    change = price_stats.pct_change(series[-1]["avg"], series[0]["avg"]) if len(series) >= 2 else None
    return {**_pmeta(p), "unit": p.unit, "region": reg.name_uz if reg else "all", "days": days, "series": series,
            "change_pct": change, "points": len(series),
            "method": "Daily average of each active offer's latest recorded price (carried forward)."}


def get_market_statistics(db: Session, product: str | None = None, region: str | None = None) -> dict:
    reg = resolve_region(db, region)
    if product:
        p = resolve_product(db, product)
        if not p:
            return _not_found(product)
        s = price_stats.product_stats(db, p.id, reg.id if reg else None)
        return {**_pmeta(p), "unit": p.unit, "region": reg.name_uz if reg else "all", **{k: (float(v) if isinstance(v, Decimal) else v) for k, v in s.items()}}
    active = db.scalar(select(func.count(Offer.id)).where(Offer.status == OfferStatus.active)) or 0
    suppliers = db.scalar(select(func.count(func.distinct(Offer.business_id))).where(Offer.status == OfferStatus.active)) or 0
    movers = price_stats.market_movers(db, 7, 20)
    return {
        "active_offers": active, "active_suppliers": suppliers,
        "largest_increases_7d": [m for m in movers if m["change_pct"] > 0][:5],
        "largest_decreases_7d": sorted([m for m in movers if m["change_pct"] < 0], key=lambda m: m["change_pct"])[:5],
    }


def analyze_supply_demand(db: Session, product: str | None = None) -> dict:
    if product:
        p = resolve_product(db, product)
        if not p:
            return _not_found(product)
        return {**_pmeta(p), **supply_demand.analyze(db, p.id)}
    rows = supply_demand.overview(db)
    rows.sort(key=lambda r: (r["observed"]["active_offers"], -r["estimated"]["interest_index"]))
    return {
        "lowest_supply": [{"product": r["name_uz"], "product_name_ru": r["name_ru"], "product_name_en": r["name_en"], "emoji": r["emoji"], "unit": r["unit"], **r["observed"], "signal": r["estimated"]["signal"], "interest_index": r["estimated"]["interest_index"]} for r in rows[:8]],
        "demand_gaps": supply_demand.demand_gaps(db),
        "disclaimer": "Interest index is estimated from platform activity, not total market demand.",
    }


def recommend_suppliers(db: Session, product: str | None = None, quantity: float = 100, region: str | None = None) -> dict:
    reg = resolve_region(db, region)
    if product:
        result = compare_offers(db, product, quantity, region)
        if "error" in result:
            return result
        return {**{k: result[k] for k in ("product", "product_name_ru", "product_name_en", "emoji")}, "quantity": quantity, "recommended": result["rows"][:5], "basis": "score = 45% total cost, 20% reliability, 15% quality, 10% delivery, 10% availability"}
    q = select(Business).where(Business.verification_status == VerificationStatus.verified)
    if reg:
        q = q.where(Business.region_id == reg.id)
    bizs = db.scalars(q.order_by(Business.rating.desc(), Business.completed_deals.desc()).limit(8)).all()
    return {"suppliers": [{"name": b.name, "rating": float(b.rating), "completed_deals": b.completed_deals, "verified": True,
                           "region": b.region.name_uz if b.region else None, "category": b.category} for b in bizs]}


def calculate_purchase_cost(db: Session, items: list[dict] | None = None, budget: float | None = None, region: str | None = None) -> dict:
    reg = resolve_region(db, region)
    lines, total = [], Decimal(0)
    for it in items or []:
        p = resolve_product(db, it.get("product"))
        if not p:
            lines.append(_not_found(it.get("product")))
            continue
        qty = Decimal(str(it.get("quantity") or 1))
        offers, _ = offer_repo.search(db, product_id=p.id, region_id=reg.id if reg else None, page_size=50)
        eligible = [o for o in offers if (o.available_qty is None or o.available_qty >= qty) and qty >= o.min_order_qty] or offers
        if not eligible:
            lines.append({**_pmeta(p), "error": "no_active_offers"})
            continue
        best = min(eligible, key=lambda o: scoring.total_cost(o, qty)[2])
        sub, deliv, tot = scoring.total_cost(best, qty)
        total += tot
        lines.append({**_pmeta(p), "quantity": float(qty), "unit": best.unit, "offer": _offer_brief(best),
                      "subtotal_uzs": float(sub), "delivery_uzs": float(deliv), "total_uzs": float(tot)})
    result: dict[str, Any] = {"lines": lines, "grand_total_uzs": float(total)}
    if budget:
        b = Decimal(str(budget))
        result["budget_uzs"] = float(b)
        if items:
            result["within_budget"] = total <= b
            result["remaining_uzs"] = float(b - total)
        else:
            # Budget planner: spread the budget over products whose prices fell this week.
            movers = [m for m in price_stats.market_movers(db, 7, 30) if m["change_pct"] < 0][:4]
            share = b / max(len(movers), 1)
            plan = []
            for m in movers:
                offers, _ = offer_repo.search(db, product_id=UUID(m["product_id"]), region_id=reg.id if reg else None, page_size=30, sort="price_asc")
                if not offers:
                    continue
                o = offers[0]
                qty = int((share - (o.delivery_price if o.delivery_available else 0)) / o.unit_price)
                if o.available_qty is not None:
                    qty = min(qty, int(o.available_qty))
                if qty < o.min_order_qty:
                    continue
                sub, deliv, tot = scoring.total_cost(o, Decimal(qty))
                plan.append({"product": m["name_uz"], "product_name_ru": m["name_ru"], "product_name_en": m["name_en"], "emoji": m["emoji"],
                             "price_change_7d_pct": m["change_pct"], "quantity": qty, "unit": o.unit,
                             "offer": _offer_brief(o), "total_uzs": float(tot)})
            result["budget_plan"] = plan
            result["planned_total_uzs"] = sum(p["total_uzs"] for p in plan)
            result["strategy"] = "Equal budget split across up to 4 products with falling 7-day prices, cheapest eligible offer each."
    return result


def get_regional_comparison(db: Session, product: str) -> dict:
    p = resolve_product(db, product)
    if not p:
        return _not_found(product)
    rows = price_stats.regional_comparison(db, p.id)
    for r in rows:
        for k in ("avg", "min", "max", "median"):
            r[k] = float(r[k]) if r[k] is not None else None
    spread = price_stats.pct_change(rows[-1]["avg"], rows[0]["avg"]) if len(rows) >= 2 else None
    return {**_pmeta(p), "unit": p.unit, "regions": rows, "cheapest_region": rows[0]["region_name_uz"] if rows else None,
            "spread_cheapest_to_priciest_pct": spread}


def get_price_forecast(db: Session, product: str, horizon_days: int = 7) -> dict:
    p = resolve_product(db, product)
    if not p:
        return _not_found(product)
    series = price_stats.series_for(db, p.id, 45)
    fc = forecasting.forecast(series, max(1, min(int(horizon_days), 14)))
    fc["history"] = fc["history"][-21:]
    return {**_pmeta(p), "unit": p.unit, **fc}


# ---------------------------------------------------------------- registry + Claude schemas

def _obj(props: dict, required: list[str] | None = None) -> dict:
    return {"type": "object", "properties": props, "required": required or [], "additionalProperties": False}


S, N, B = {"type": "string"}, {"type": "number"}, {"type": "boolean"}

TOOL_SPECS = [
    ("search_products", search_products, "Search active wholesale offers. Use for 'where to buy X', 'cheapest X', filtering by region, price or verified suppliers.",
     _obj({"query": {**S, "description": "Product name in any language (kartoshka / картофель / potato)"}, "category": S,
           "region": {**S, "description": "Region name, e.g. Toshkent, Samarqand"}, "max_price": N, "verified_only": B,
           "sort": {"type": "string", "enum": ["price_asc", "price_desc", "newest", "qty_desc"]}, "limit": {"type": "integer"}})),
    ("compare_offers", compare_offers, "Compare all offers for one product at a quantity: total cost (quantity*unit_price + delivery) and recommendation score with reasons.",
     _obj({"product": S, "quantity": N, "region": S}, ["product"])),
    ("get_price_history", get_price_history, "Daily average price series for a product over N days, with % change.",
     _obj({"product": S, "days": {"type": "integer"}, "region": S}, ["product"])),
    ("get_market_statistics", get_market_statistics, "Price statistics (avg/min/max/median, 7d and 30d change) for a product, or market-wide movers when no product is given.",
     _obj({"product": S, "region": S})),
    ("analyze_supply_demand", analyze_supply_demand, "Observed supply metrics and estimated interest for a product, or the lowest-supply products and demand gaps when no product is given.",
     _obj({"product": S})),
    ("recommend_suppliers", recommend_suppliers, "Recommend suppliers for a product (ranked offers) or top verified suppliers in a region.",
     _obj({"product": S, "quantity": N, "region": S})),
    ("calculate_purchase_cost", calculate_purchase_cost, "Total purchase cost for a basket of items using the best eligible offers; with only a budget, builds a plan from products whose prices fell.",
     _obj({"items": {"type": "array", "items": _obj({"product": S, "quantity": N}, ["product", "quantity"])}, "budget": N, "region": S})),
    ("get_regional_comparison", get_regional_comparison, "Compare a product's price across regions.",
     _obj({"product": S}, ["product"])),
    ("get_price_forecast", get_price_forecast, "Statistical short-term price forecast with confidence and data-sufficiency flag.",
     _obj({"product": S, "horizon_days": {"type": "integer"}}, ["product"])),
]

REGISTRY = {name: fn for name, fn, _, _ in TOOL_SPECS}
CLAUDE_TOOLS = [{"name": n, "description": d, "input_schema": s} for n, _, d, s in TOOL_SPECS]


def run_tool(db: Session, name: str, args: dict) -> dict:
    fn = REGISTRY.get(name)
    if not fn:
        return {"error": f"unknown tool {name}"}
    try:
        return jsonable(fn(db, **args))
    except TypeError as e:
        return {"error": f"bad arguments: {e}"}


def jsonable(v: Any) -> Any:
    if isinstance(v, dict):
        return {k: jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, UUID):
        return str(v)
    return v

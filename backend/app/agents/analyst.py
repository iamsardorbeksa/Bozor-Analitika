"""AGENT 3 - Tarozibon ota, the market analyst.

Robust market average (outliers removed) in the searched regions (national if none), 7/30-day change,
a 30-point sparkline, a short statistical forecast and a buy-now / wait / stable signal.
Flags offers more than 25% above the median (overpriced) or 20% below it (suspiciously cheap).
"""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.agents.common import OVERPRICED_PCT, SUSPICIOUS_LOW_PCT, f, vs_pct
from app.analytics import forecasting, price_stats
from app.models import Offer

SIGNAL_PCT = 1.5   # forecast moves under 1.5% count as "stable"


def horizon_for(deadline_days: int | None) -> int:
    return max(1, min(14, deadline_days if deadline_days is not None else 14))


def analyse_item(db: Session, product_id: UUID, quantity: float, offers: list[Offer], ref: dict, best: dict | None,
                 region_ids: list[UUID], deadline_days: int | None) -> dict:
    market_avg = ref["avg"]
    med = ref["median"]
    # one region: its own daily index (if it has history); several or none: national index
    series: list[dict] = []
    if len(region_ids) == 1:
        series = price_stats.series_for(db, product_id, 45, region_ids[0])
    if len(series) < 8:
        series = price_stats.series_for(db, product_id, 45)
    last31 = series[-31:]
    spark = [float(p["avg"]) for p in last31[-30:]]
    cur = last31[-1]["avg"] if last31 else None
    change_7d = price_stats.pct_change(cur, last31[-8]["avg"]) if len(last31) >= 8 else None
    change_30d = price_stats.pct_change(cur, last31[0]["avg"]) if len(last31) >= 30 else None

    horizon = horizon_for(deadline_days)
    fc = forecasting.forecast(series, horizon)
    exp = fc.get("expected_change_pct") if fc["sufficient"] else None
    forecast = {"sufficient": fc["sufficient"], "horizon_days": horizon, "expected_change_pct": exp, "confidence": fc["confidence"]}

    signal, wait_days, saving = "stable", None, None
    best_unit = best["unit_price"] if best else None
    if exp is not None and exp <= -SIGNAL_PCT and fc["confidence"] != "insufficient" and (deadline_days is None or deadline_days > 3):
        signal, wait_days = "wait", horizon
        if best_unit is not None:
            saving = round(quantity * best_unit * abs(exp) / 100, 0)
    elif exp is not None and exp >= SIGNAL_PCT:
        signal = "buy_now"

    flagged = []
    if med:
        for o in offers:
            d = vs_pct(o.unit_price, med)
            if d is None:
                continue
            kind = "overpriced" if d > OVERPRICED_PCT else "suspicious_cheap" if d < SUSPICIOUS_LOW_PCT else None
            if kind:
                flagged.append({"offer_id": str(o.id), "supplier": o.business.name, "unit_price": f(o.unit_price),
                                "vs_median_pct": d, "kind": kind})
        flagged.sort(key=lambda x: -abs(x["vs_median_pct"]))

    return {
        "product_id": str(product_id),
        "market_avg": f(market_avg),
        "best_vs_avg_pct": price_stats.pct_change(Decimal(str(best_unit)), market_avg) if best_unit is not None and market_avg else None,
        "change_7d_pct": change_7d,
        "change_30d_pct": change_30d,
        "spark": spark,
        "forecast": forecast,
        "signal": signal,
        "wait_days": wait_days,
        "expected_saving": saving,
        "flagged": flagged,
    }

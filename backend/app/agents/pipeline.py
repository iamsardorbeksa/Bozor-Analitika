"""Runs the four agents in order and assembles the /api/agents/run response (docs/AGENTS_CONTRACT.md)."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents import analyst, final, finance, planner, scout
from app.agents.common import market_reference
from app.ai import gemini
from app.analytics import price_stats
from app.models import Region


def run(db: Session, message: str, region_ids: list[UUID], language: str) -> dict:
    use_gemini = gemini.available()
    if region_ids:
        regions = list(db.scalars(select(Region).where(Region.id.in_(region_ids))).all())
        if len(regions) != len(set(region_ids)):
            raise ValueError("Unknown region id")
        regions.sort(key=lambda r: r.name_uz)
    else:
        regions = list(db.scalars(select(Region).order_by(Region.name_uz)).all())
    rids = list(set(region_ids))

    plan, engine = planner.run(db, message, regions, language, use_gemini)
    pids = [UUID(it["product_id"]) for it in plan["items"]]
    excluded = price_stats.outlier_offer_ids(db, pids) if pids else set()

    scout_items, analyst_items, fin_lines = [], [], []
    for it, pid in zip(plan["items"], pids):
        offers = scout.offers_for(db, pid, rids)
        ref = market_reference(db, pid, offers, excluded)
        sc = scout.scout_item(pid, it["quantity"], offers, ref["median"])
        an = analyst.analyse_item(db, pid, it["quantity"], offers, ref, sc["best"], rids, plan["deadline_days"])
        scout_items.append(sc)
        analyst_items.append(an)
        if sc["best"]:
            fin_lines.append({"total": sc["best"]["total_cost"], "expected_change_pct": an["forecast"]["expected_change_pct"]})

    # A category price list ("eng arzon sabzavotlar") is shown cheapest first, by the price the scout really chose
    if plan.get("mode") == "price_list" and scout_items:
        order = sorted(range(len(scout_items)),
                       key=lambda i: scout_items[i]["best"]["unit_price"] if scout_items[i]["best"] else float("inf"))
        plan["items"] = [plan["items"][i] for i in order]
        scout_items = [scout_items[i] for i in order]
        analyst_items = [analyst_items[i] for i in order]

    fin = finance.advise(fin_lines, plan["cash"], plan["deadline_days"], analyst.horizon_for(plan["deadline_days"]), language)
    scout_out, analyst_out = {"items": scout_items}, {"items": analyst_items}
    fin_out = final.build(plan, scout_out, analyst_out, fin, language, use_gemini)
    if fin_out["explanation_engine"] == "gemini":
        engine = "gemini"
    return {"engine": engine, "planner": plan, "scout": scout_out, "analyst": analyst_out, "finance": fin, "final": fin_out}

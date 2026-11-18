from decimal import Decimal

from app.analytics.forecasting import forecast
from app.analytics.price_stats import pct_change, robust, snapshot


def test_pct_change_is_safe():
    assert pct_change(110, 100) == 10.0
    assert pct_change(90, 100) == -10.0
    assert pct_change(100, 0) is None
    assert pct_change(None, 100) is None
    assert pct_change(100, None) is None


def test_outliers_excluded_from_snapshot():
    prices = [Decimal(p) for p in (5000, 5100, 4900, 5050, 16500)]
    kept, excluded = robust(prices)
    assert excluded == 1 and Decimal(16500) not in kept
    s = snapshot(prices)
    assert s["max"] == Decimal(5100) and s["excluded_outliers"] == 1


def test_forecast_refuses_with_insufficient_history():
    series = [{"date": f"2026-11-{d:02d}", "avg": 1000 + d, "min": 0, "max": 0, "count": 1} for d in range(1, 8)]
    f = forecast(series)
    assert f["sufficient"] is False and f["forecast"] == [] and f["confidence"] == "insufficient"


def test_forecast_with_history():
    series = [{"date": f"2026-10-{d:02d}", "avg": 1000 + d * 10, "min": 0, "max": 0, "count": 3} for d in range(1, 31)]
    f = forecast(series, 7)
    assert f["sufficient"] and len(f["forecast"]) == 7
    assert f["forecast"][-1]["value"] > series[-1]["avg"]  # upward trend continues
    assert all(p["lower"] <= p["value"] <= p["upper"] for p in f["forecast"])


def test_analytics_endpoints(client, ids):
    pid = ids["products"]["pomidor"]
    stats = client.get(f"/api/analytics/products/{pid}/stats").json()
    assert stats["count"] > 0 and stats["min"] <= stats["median"] <= stats["max"]
    hist = client.get(f"/api/analytics/products/{pid}/history?days=30").json()
    assert len(hist["series"]) >= 25
    sd = client.get(f"/api/analytics/products/{pid}/supply-demand").json()
    assert "observed" in sd and "estimated" in sd and "disclaimer" in sd["estimated"]
    ov = client.get("/api/analytics/overview").json()
    assert ov["is_demo_data"] is True and ov["movers"]


def test_catalogue_and_emoji_contract(client):
    products = client.get("/api/products").json()
    assert 550 <= len(products) <= 650 and all(p["emoji"] for p in products)
    assert len({p["slug"] for p in products}) == len(products)
    movers = client.get("/api/analytics/movers?category=fruits&limit=700").json()
    assert movers and all(r["category_slug"] == "fruits" and r["emoji"] and r["offers"] >= 1 for r in movers)
    offers = client.get("/api/offers?page_size=50").json()["items"]
    assert all(o["product_emoji"] for o in offers)
    assert not any("demo" in (o["description"] or "").lower() for o in offers)  # internal flag only, never shown
    markets = client.get("/api/markets").json()
    assert any(m["top_offers"] for m in markets) and all("product_emoji" in t for m in markets for t in m["top_offers"])


AI_CASES = [
    ("Which market currently has the cheapest potatoes?", {"get_regional_comparison"}),
    ("Compare tomato prices across Tashkent", {"compare_offers"}),
    ("What products have experienced the largest price increases?", {"get_market_statistics"}),
    ("Which products have low supply?", {"analyze_supply_demand"}),
    ("What should I buy with a budget of 10 million UZS?", {"calculate_purchase_cost"}),
    ("Analyze the wholesale market for onions", {"get_market_statistics", "analyze_supply_demand", "get_price_forecast"}),
    ("Which suppliers offer the best value?", {"recommend_suppliers"}),
    ("How have potato prices changed over the last seven days?", {"get_price_history"}),
    ("Kartoshka narxi oxirgi 7 kunda qanday o'zgardi?", {"get_price_history"}),
    ("Какие товары в дефиците?", {"analyze_supply_demand"}),
]


def test_ai_analyst_uses_database_tools(client, buyer):
    status = client.get("/api/ai/status").json()
    assert status["ai_available"] is False and status["mode"] == "deterministic"
    for question, expected in AI_CASES:
        r = client.post("/api/ai/chat", json={"message": question, "language": "en"}, headers=buyer)
        assert r.status_code == 200, question
        msg = r.json()["message"]
        names = {c["name"] for c in msg["tool_calls"]}
        assert expected <= names, (question, names)
        assert msg["mode"] == "deterministic" and msg["content"]


def test_ai_unknown_product_is_reported_not_invented(client, buyer):
    from app.ai.tools import compare_offers
    from app.database.session import SessionLocal

    with SessionLocal() as db:
        out = compare_offers(db, "unobtainium", 10)
    assert out["error"] == "product_not_found"


def test_ai_conversation_privacy(client, buyer, seller):
    r = client.post("/api/ai/chat", json={"message": "Analyze onions", "language": "uz"}, headers=buyer)
    cid = r.json()["conversation_id"]
    assert client.get(f"/api/ai/conversations/{cid}", headers=buyer).status_code == 200
    assert client.get(f"/api/ai/conversations/{cid}", headers=seller).status_code == 404

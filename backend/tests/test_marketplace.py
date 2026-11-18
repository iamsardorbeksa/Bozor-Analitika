from decimal import Decimal
from uuid import UUID

from app.database.session import SessionLocal
from app.models import OfferPriceHistory


def _offer_body(ids, **kw):
    return {"product_id": ids["products"]["kartoshka"], "title": "Kartoshka test", "unit": "kg", "unit_price": 4700,
            "available_qty": 5000, "min_order_qty": 100, "quality": "first", "delivery_available": True,
            "delivery_price": 150000, "delivery_days": 2, "region_id": ids["region"], **kw}


def _history(offer_id):
    with SessionLocal() as db:
        return [h.price for h in db.query(OfferPriceHistory).filter_by(offer_id=UUID(offer_id)).order_by(OfferPriceHistory.recorded_at)]


def test_create_update_keeps_price_history(client, seller, ids):
    r = client.post("/api/offers", json=_offer_body(ids), headers=seller)
    assert r.status_code == 201, r.text
    oid = r.json()["id"]
    assert _history(oid) == [Decimal("4700.00")]
    r = client.patch(f"/api/offers/{oid}", json={"unit_price": 4500}, headers=seller)
    assert r.status_code == 200 and r.json()["unit_price"] == 4500
    hist = _history(oid)
    assert hist == [Decimal("4700.00"), Decimal("4500.00")]  # never overwritten
    # title-only edits do not create history rows
    client.patch(f"/api/offers/{oid}", json={"title": "Renamed"}, headers=seller)
    assert len(_history(oid)) == 2


def test_moq_cannot_exceed_stock(client, seller, ids):
    assert client.post("/api/offers", json=_offer_body(ids, available_qty=10, min_order_qty=50), headers=seller).status_code == 422


def test_pause_activate_and_soft_delete(client, seller, ids):
    oid = client.post("/api/offers", json=_offer_body(ids), headers=seller).json()["id"]
    assert client.post(f"/api/offers/{oid}/status", json={"status": "paused"}, headers=seller).json()["status"] == "paused"
    assert client.get(f"/api/offers/{oid}").status_code == 404  # paused offers are hidden from the public
    assert client.post(f"/api/offers/{oid}/status", json={"status": "active"}, headers=seller).json()["status"] == "active"
    assert client.delete(f"/api/offers/{oid}", headers=seller).status_code == 200
    assert client.get(f"/api/offers/{oid}").status_code == 404
    assert len(_history(oid)) == 1  # history survives deletion


def test_search_filters_and_sorting(client, ids):
    pid = ids["products"]["pomidor"]
    items = client.get(f"/api/offers?product_id={pid}&sort=price_asc&page_size=100").json()["items"]
    prices = [i["unit_price"] for i in items]
    assert prices == sorted(prices) and all(i["product_id"] == pid for i in items)
    verified = client.get("/api/offers?verified_only=true&page_size=100").json()["items"]
    assert verified and all(i["business"]["verification_status"] == "verified" for i in verified)
    cheap = client.get("/api/offers?max_price=5000&page_size=100").json()["items"]
    assert all(i["unit_price"] <= 5000 for i in cheap)
    assert client.get("/api/offers?q=kartoshka").json()["total"] >= 1
    for i in client.get("/api/offers?page_size=100").json()["items"]:
        assert i["is_demo"] == (i["source"] == "demo")  # demo data is always flagged


def test_compare_total_cost_formula(client, ids):
    pid = ids["products"]["piyoz"]
    data = client.get(f"/api/offers/compare?product_id={pid}&quantity=250").json()
    assert data["rows"]
    for row in data["rows"]:
        o = row["offer"]
        delivery = o["delivery_price"] if o["delivery_available"] else 0
        assert abs(row["total_cost"] - (250 * o["unit_price"] + delivery)) < 0.01
        assert row["reasons"]
    assert sum(r["is_recommended"] for r in data["rows"]) == 1
    assert sum(r["is_cheapest"] for r in data["rows"]) == 1


def test_purchase_request_flow(client, buyer, seller):
    offer = client.get("/api/offers/mine?status=active", headers=seller).json()["items"][0]
    too_small = {"offer_id": offer["id"], "quantity": float(offer["min_order_qty"]) / 2}
    assert client.post("/api/requests", json=too_small, headers=buyer).status_code == 422
    r = client.post("/api/requests", json={"offer_id": offer["id"], "quantity": offer["min_order_qty"]}, headers=buyer)
    assert r.status_code == 201
    rid = r.json()["id"]
    # buyer cannot accept their own pending request; seller can't cancel
    assert client.post(f"/api/requests/{rid}/action", json={"action": "accept"}, headers=buyer).status_code == 409
    assert client.post(f"/api/requests/{rid}/action", json={"action": "cancel"}, headers=seller).status_code == 403
    r = client.post(f"/api/requests/{rid}/action", json={"action": "counter", "counter_price": offer["unit_price"] * 0.95}, headers=seller)
    assert r.json()["status"] == "countered"
    assert client.post(f"/api/requests/{rid}/action", json={"action": "accept"}, headers=buyer).json()["status"] == "accepted"
    assert client.post(f"/api/requests/{rid}/action", json={"action": "complete"}, headers=seller).json()["status"] == "completed"
    assert client.post(f"/api/requests/{rid}/action", json={"action": "cancel"}, headers=buyer).status_code == 409


def test_favorites(client, buyer):
    oid = client.get("/api/offers?page_size=1").json()["items"][0]["id"]
    assert client.post(f"/api/favorites/{oid}", headers=buyer).status_code == 201
    assert client.post(f"/api/favorites/{oid}", headers=buyer).status_code == 201  # idempotent
    assert any(f["offer"]["id"] == oid for f in client.get("/api/favorites", headers=buyer).json())
    client.delete(f"/api/favorites/{oid}", headers=buyer)
    assert not any(f["offer"]["id"] == oid for f in client.get("/api/favorites", headers=buyer).json())


def test_price_alert_triggers_notification(client, buyer, seller, ids):
    pid = ids["products"]["sabzi"]
    a = client.post("/api/alerts", json={"product_id": pid, "condition": "below", "threshold": 1000}, headers=buyer)
    assert a.status_code == 201
    before = client.get("/api/notifications/unread-count", headers=buyer).json()["count"]
    client.post("/api/offers", json=_offer_body(ids, product_id=pid, unit_price=900, title="Sabzi arzon"), headers=seller)
    after = client.get("/api/notifications/unread-count", headers=buyer).json()["count"]
    assert after == before + 1
    assert client.post("/api/alerts", json={"product_id": pid, "condition": "below"}, headers=buyer).status_code == 422


def test_admin_moderation_and_audit(client, admin, buyer):
    users = client.get("/api/admin/users?role=buyer&q=buyer3", headers=admin).json()["items"]
    uid = users[0]["id"]
    assert client.post(f"/api/admin/users/{uid}/active", json={"is_active": False}, headers=admin).status_code == 200
    assert client.post("/api/auth/login", json={"email": "buyer3@demo.bozor.uz", "password": "Demo12345"}).status_code == 403
    client.post(f"/api/admin/users/{uid}/active", json={"is_active": True}, headers=admin)
    pend = client.get("/api/admin/verifications?status=pending", headers=admin).json()
    if pend:
        assert client.post(f"/api/admin/verifications/{pend[0]['id']}/approve", json={"note": "ok"}, headers=admin).status_code == 200
        assert client.post(f"/api/admin/verifications/{pend[0]['id']}/approve", json={}, headers=admin).status_code == 409
    flagged = client.get("/api/admin/offers?flagged=true", headers=admin).json()["items"]
    assert any(o["suspicious"] for o in flagged)
    actions = [a["action"] for a in client.get("/api/admin/audit-logs", headers=admin).json()]
    assert "user.suspend" in actions and "user.reactivate" in actions

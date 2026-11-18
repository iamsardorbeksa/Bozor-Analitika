"""Buyer request -> producer offers -> e-signed contract."""
from datetime import datetime, timedelta, timezone


def _iso(days: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def _region(client):
    return client.get("/api/regions").json()[0]["id"]


def _post(client, buyer, **kw):
    body = {"category": "other", "title": "1 000 dona sharikli ruchka", "quantity": 1000, "unit": "piece", "target_price": 1500,
            "delivery_region_id": _region(client), "needed_by": _iso(15), "closes_at": _iso(5), "payment_terms": "on_delivery"} | kw
    r = client.post("/api/tenders", json=body, headers=buyer)
    assert r.status_code == 201, r.text
    return r.json()


BID = {"unit_price": 1350, "delivery_price": 0, "lead_time_days": 7, "payment_terms": "prepay_50", "comment": "Omborda bor"}


def test_full_flow(client, buyer, seller, seller2):
    t = _post(client, buyer)
    assert t["status"] == "open" and t["number"].startswith("T-") and t["bids_count"] == 0

    # producers see it on the board and answer
    board = client.get("/api/tenders", params={"sort": "qty_asc"}, headers=seller).json()
    assert any(x["id"] == t["id"] for x in board["items"])
    assert client.post(f"/api/tenders/{t['id']}/bid", json=BID, headers=seller).status_code == 200
    r = client.post(f"/api/tenders/{t['id']}/bid", json=BID | {"unit_price": 1250, "lead_time_days": 12, "payment_terms": "deferred_30"}, headers=seller2)
    assert r.status_code == 200
    # a producer sees only its own offer
    seen = client.get(f"/api/tenders/{t['id']}", headers=seller).json()
    assert seen["bids"] == [] and seen["my_bid"]["unit_price"] == 1350

    # the buyer compares
    d = client.get(f"/api/tenders/{t['id']}", headers=buyer).json()
    assert d["bids_count"] == 2 and len(d["bids"]) == 2
    cheapest = next(b for b in d["bids"] if "cheapest" in b["badges"])
    assert cheapest["unit_price"] == 1250 and cheapest["total"] == 1_250_000
    assert all(b["score"] is not None for b in d["bids"])
    chosen = next(b for b in d["bids"] if b["unit_price"] == 1350)

    # award = contract signed by the buyer
    award = {"bid_id": chosen["id"], "buyer_company": "“Test Restoran” MChJ", "signer_title": "Direktor",
             "delivery_address": "Toshkent, Amir Temur 1", "pin": "123456"}
    assert client.post(f"/api/tenders/{t['id']}/award", json=award | {"pin": "12"}, headers=buyer).status_code == 422
    c = client.post(f"/api/tenders/{t['id']}/award", json=award, headers=buyer)
    assert c.status_code == 201, c.text
    c = c.json()
    assert c["status"] == "awaiting_seller" and c["number"].startswith("BA-") and c["total_amount"] == 1_350_000
    assert c["terms"]["payment"]["prepay_pct"] == 50 and c["terms"]["seller"]["stir"]
    # no new offers once awarded
    assert client.post(f"/api/tenders/{t['id']}/bid", json=BID, headers=seller2).status_code == 409

    # the other producer can't see or sign the contract
    assert client.get(f"/api/contracts/{c['id']}", headers=seller2).status_code == 404
    signed = client.post(f"/api/contracts/{c['id']}/sign", json={"signer_name": "Akmal Karimov", "signer_title": "Direktor", "pin": "1234"}, headers=seller)
    assert signed.status_code == 200, signed.text
    s = signed.json()
    assert s["status"] == "signed" and s["verification"]["buyer_valid"] and s["verification"]["seller_valid"]
    assert client.get(f"/api/tenders/{t['id']}", headers=buyer).json()["status"] == "contracted"
    lost = client.get(f"/api/tenders/{t['id']}", headers=seller2).json()["my_bid"]
    assert lost["status"] == "rejected"


def test_decline_reopens(client, buyer, seller):
    t = _post(client, buyer, title="Ofis uchun 10 ta stepler", quantity=10, target_price=None)
    b = client.post(f"/api/tenders/{t['id']}/bid", json=BID, headers=seller).json()
    c = client.post(f"/api/tenders/{t['id']}/award", json={"bid_id": b["id"], "buyer_company": "X MChJ", "signer_title": "Direktor",
                                                            "delivery_address": "Toshkent", "pin": "1111"}, headers=buyer).json()
    r = client.post(f"/api/contracts/{c['id']}/decline", json={"reason": "Narx o‘zgardi"}, headers=seller)
    assert r.status_code == 200 and r.json()["status"] == "declined"
    assert client.get(f"/api/tenders/{t['id']}", headers=buyer).json()["status"] == "open"


def test_rules(client, buyer, seller):
    # deadline after delivery date
    r = client.post("/api/tenders", json={"category": "other", "title": "Qalam", "quantity": 5, "unit": "piece",
                                          "delivery_region_id": _region(client), "needed_by": _iso(2), "closes_at": _iso(4)}, headers=buyer)
    assert r.status_code == 422
    t = _post(client, buyer, title="Marker 100 dona", quantity=100)
    # buyers can't bid or browse the producer board; producers can't post
    assert client.post(f"/api/tenders/{t['id']}/bid", json=BID, headers=buyer).status_code == 403
    assert client.get("/api/tenders", headers=buyer).status_code == 403
    assert client.post("/api/tenders", json={}, headers=seller).status_code in (403, 422)
    # filters
    small = client.get("/api/tenders", params={"max_qty": 100, "sort": "budget_asc"}, headers=seller).json()["items"]
    assert small and all(x["quantity"] <= 100 for x in small)
    # cancel
    assert client.post(f"/api/tenders/{t['id']}/cancel", headers=buyer).json()["status"] == "closed"
    assert client.get("/api/tenders/summary", headers=buyer).status_code == 200

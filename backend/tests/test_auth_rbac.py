import uuid


def _reg(client, ids, role="buyer", **kw):
    body = {"full_name": "Test User", "email": f"t{uuid.uuid4().hex[:8]}@example.com", "phone": "+998 90 111 22 33",
            "password": "Secret123", "role": role, "region_id": ids["region"], **kw}
    return client.post("/api/auth/register", json=body)


def test_register_buyer_and_me(client, ids):
    r = _reg(client, ids)
    assert r.status_code == 201
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["role"] == "buyer"
    assert "password_hash" not in me.json()


def test_register_seller_requires_business_and_gets_pending_verification(client, ids):
    assert _reg(client, ids, role="seller").status_code == 422
    r = _reg(client, ids, role="seller", business_name="Test Agro")
    assert r.status_code == 201
    assert r.json()["user"]["business"]["verification_status"] == "pending"


def test_cannot_self_register_admin(client, ids):
    assert _reg(client, ids, role="admin").status_code == 422


def test_weak_password_and_duplicate_email(client, ids):
    assert _reg(client, ids, password="onlyletters").status_code == 422
    r = _reg(client, ids)
    email = r.json()["user"]["email"]
    dup = client.post("/api/auth/register", json={"full_name": "X Y", "email": email, "phone": "+998901112233",
                                                    "password": "Secret123", "role": "buyer", "region_id": ids["region"]})
    assert dup.status_code == 409


def test_login_wrong_password(client):
    assert client.post("/api/auth/login", json={"email": "buyer@demo.bozor.uz", "password": "nope"}).status_code == 401


def test_unauthenticated_and_role_checks(client, buyer, seller):
    assert client.get("/api/favorites").status_code == 401
    assert client.get("/api/admin/dashboard", headers=buyer).status_code == 403
    assert client.get("/api/admin/dashboard", headers=seller).status_code == 403
    assert client.get("/api/analytics/seller-dashboard", headers=buyer).status_code == 403
    assert client.get("/api/favorites", headers=seller).status_code == 403


def test_buyer_cannot_create_offer(client, buyer, ids):
    body = {"product_id": ids["products"]["kartoshka"], "title": "x", "unit": "kg", "unit_price": 1000, "available_qty": 10,
            "min_order_qty": 1, "region_id": ids["region"]}
    assert client.post("/api/offers", json=body, headers=buyer).status_code == 403


def test_seller_cannot_modify_other_sellers_offer(client, seller, seller2):
    mine = client.get("/api/offers/mine", headers=seller2).json()["items"][0]
    r = client.patch(f"/api/offers/{mine['id']}", json={"unit_price": 1}, headers=seller)
    assert r.status_code == 404
    assert client.delete(f"/api/offers/{mine['id']}", headers=seller).status_code == 404


def test_tampered_token_rejected(client):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 401

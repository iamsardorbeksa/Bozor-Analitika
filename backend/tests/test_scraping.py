"""Real-price import: page decoding, pack sizes, catalogue matching rules and the importer (no network)."""
import json
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models import Offer, OfferPriceHistory, OfferStatus
from app.scraping import korzinka, olx
from app.scraping.base import Listing, money
from app.scraping.importer import Matcher, import_listings
from app.scraping.nuxt import decode
from app.scraping.units import parse_size, sold_by_weight, unit_price

NOW = datetime(2026, 11, 18, tzinfo=timezone.utc)


def _korzinka_html(statements: str = "") -> str:
    product = ('{id:7,title_uz:"Sariq sabzi Arzon, kg",title_ru:a,title_en:a,prices:{is_discount:true,'
               'actual_price:"3 990",old_price:"7 790",product_type:"Весовой"},weight_param:"1 кг",small_image_url:b}')
    milk = ('{id:8,title_uz:"Sut Musaffo 3,2% 1L",title_ru:"Молоко Musaffo 1л",title_en:c,prices:{is_discount:false,'
            'actual_price:"12 490",old_price:null,product_type:"Штучный"},weight_param:"1л",small_image_url:void 0}')
    return ("<script>window.__NUXT__=(function(a,b,c,d){" + statements +
            "return {data:[{categories:[{products:[" + product + "," + milk + "]}]}],extra:d}}"
            '("Морковь желтая","https://img/x.png",null,[]));</script>')


def test_nuxt_decode_with_statements_before_return():
    state = decode(_korzinka_html("d[0]={question:a,answer:b};"))
    assert state["extra"] == [{"question": "Морковь желтая", "answer": "https://img/x.png"}]
    p = state["data"][0]["categories"][0]["products"][0]
    assert p["title_ru"] == "Морковь желтая" and p["prices"]["actual_price"] == "3 990"


def test_korzinka_parse():
    items = korzinka.parse_page(_korzinka_html(), "https://korzinka.uz/uz/catalog", NOW)
    carrot, milk = items
    assert carrot.per_kg and carrot.price == Decimal("3990") and carrot.old_price == Decimal("7790")
    assert milk.size_text == "1л" and not milk.per_kg and milk.titles[0].startswith("Молоко")


def test_olx_parse_keeps_no_personal_data():
    state = {"listing": {"listing": {"totalPages": 3, "ads": [
        {"id": 1, "title": "Kartoshka sotiladi +998 90 123 45 67", "url": "https://www.olx.uz/d/1",
         "price": {"regularPrice": {"value": 6000, "currencyCode": "UZS"}},
         "location": {"cityName": "Самарканд", "regionId": 33}, "lastRefreshTime": "2026-11-17T09:00:00+05:00",
         "isBusiness": False, "user": {"name": "Ali"}, "contact": {"phone": True}},
        {"id": 2, "title": "USD narx", "price": {"regularPrice": {"value": 5, "currencyCode": "USD"}}, "location": {}},
    ]}}}
    html = "<script>window.__PRERENDERED_STATE__= " + json.dumps(json.dumps(state)) + ";</script>"
    items, pages = olx.parse_page(html)
    assert pages == 3 and len(items) == 1
    it = items[0]
    assert "998" not in it.title and it.region_code == "samarqand" and it.seller_kind == "private"
    assert it.observed_at == datetime(2026, 11, 17, 4, 0, tzinfo=timezone.utc)
    assert "Ali" not in repr(it)


def test_sizes_and_unit_prices():
    assert parse_size("Lay's chipslari 70g").qty == 0.07
    s = parse_size("Suv 6x0,5L")
    assert (s.unit, round(s.qty, 2)) == ("l", 3.0)
    assert parse_size("Sut 3,2% 1L").unit == "l"
    assert parse_size("Tuxum 30 dona").qty == 30
    assert parse_size("Olma Pink Lady") is None
    assert sold_by_weight("Sariq sabzi Arzon, kg") and sold_by_weight("Говяжий фарш, вес")
    assert unit_price(Decimal("8490"), parse_size("400g"), "kg") == Decimal("21225.00")
    assert unit_price(Decimal("49800"), parse_size("30 dona"), "piece") == Decimal("1660.00")
    assert unit_price(Decimal("5000"), parse_size("1 kg"), "m") is None


def _l(title, price, **kw):
    return Listing(site=kw.pop("site", "korzinka.uz"), external_id=kw.pop("eid", title), title=title,
                   price=Decimal(price), url="https://korzinka.uz/uz/catalog", observed_at=NOW, **kw)


def test_matcher_rules():
    with SessionLocal() as db:
        m = Matcher(db)
        ok = m.match(_l("Sariq sabzi Arzon, kg", "3990", per_kg=True))
        assert ok and ok.product.slug == "sabzi" and ok.unit_price == Decimal("3990.00")
        assert m.match(_l("Sut Musaffo 3,2% 1L", "12490")).product.slug == "sut"
        # flavours, abbreviations, jars and quoted names don't name the product
        assert m.match(_l("Lay's chipslari piyoz 70g", "10490")) is None
        assert m.match(_l("Sharbat Bliss yashil olma PP, 1L", "10490")).product.slug != "olma"
        assert m.match(_l("Pomidor 365 kun Cherry 720ml", "14890")) is None
        assert m.match(_l('Karamel "Лимонная" kg', "49990", titles=["Карамель Лимонная"])) is None
        # implausible unit price (a whole sack priced as one kilo) is skipped
        assert m.match(_l("Kartoshka", "450000", site="olx.uz")) is None


def test_import_upserts_history_and_expires():
    with SessionLocal() as db:
        a = _l("Sariq sabzi Arzon, kg", "3990", per_kg=True, eid="t-1", site="test.uz")
        b = _l("Sut Musaffo 3,2% 1L", "12490", eid="t-2", site="test.uz")
        from app.scraping import importer
        importer.SOURCES["test.uz"] = importer.SOURCES["olx.uz"]
        s1 = import_listings(db, "test.uz", [a, b])
        assert (s1.matched, s1.created) == (2, 2)
        a2 = _l("Sariq sabzi Arzon, kg", "4290", per_kg=True, eid="t-1", site="test.uz")
        s2 = import_listings(db, "test.uz", [a2])
        assert (s2.price_changed, s2.expired) == (1, 1)
        offer = db.scalar(select(Offer).where(Offer.source_site == "test.uz", Offer.external_id == "t-1"))
        assert offer.unit_price == Decimal("4290.00") and offer.available_qty is None
        hist = db.scalars(select(OfferPriceHistory.price).where(OfferPriceHistory.offer_id == offer.id)).all()
        assert sorted(hist) == [Decimal("3990.00"), Decimal("4290.00")]
        milk = db.scalar(select(Offer).where(Offer.source_site == "test.uz", Offer.external_id == "t-2"))
        assert milk.status == OfferStatus.expired


def test_external_offer_cannot_be_requested(client, buyer):
    with SessionLocal() as db:
        offer = db.scalar(select(Offer).where(Offer.source_site == "test.uz", Offer.status == OfferStatus.active))
    r = client.post("/api/requests", json={"offer_id": str(offer.id), "quantity": 5}, headers=buyer)
    assert r.status_code == 422 and "test.uz" in r.text


def test_money():
    assert money("8 490") == Decimal("8490") and money("20 000 сум") == Decimal("20000") and money(0) is None


def test_admin_sources(client, admin):
    r = client.get("/api/admin/sources", headers=admin)
    assert r.status_code == 200 and "uzum.uz" in r.json()["unavailable"]

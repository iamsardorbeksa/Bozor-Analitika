"""Four agents (POST /api/agents/run), Gemini helpers (schema conversion, mocked function calling) and voice endpoints.
No API key is used: Gemini and VoiceLab are switched off (or mocked) here."""
import json

import httpx
import pytest

from app.agents import finance, planner
from app.ai import gemini
from app.ai.tools import CLAUDE_TOOLS
from app.core.config import get_settings


@pytest.fixture(autouse=True)
def no_keys(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "gemini_api_key", None)
    monkeypatch.setattr(s, "gemini_model", None)
    monkeypatch.setattr(s, "anthropic_api_key", None)
    monkeypatch.setattr(s, "voicelab_api_key", None)

    def no_network(*a, **kw):
        raise AssertionError("no network calls in tests")

    monkeypatch.setattr(httpx.Client, "post", no_network)
    monkeypatch.setattr(httpx.AsyncClient, "get", no_network)
    monkeypatch.setattr(httpx.AsyncClient, "post", no_network)


def _run(client, message, language="uz", region_ids=None):
    r = client.post("/api/agents/run", json={"message": message, "region_ids": region_ids or [], "language": language})
    assert r.status_code == 200, r.text
    return r.json()


ORDERS = [
    ("uz", "Choyxonam uchun 200 kg guruch va 100 litr yog' kerak, qo'limda 4 mln so'm bor",
     {"guruch": 200, "kungaboqar-yogi": 100}, 4_000_000, None),
    ("ru", "Нужно 50 кг риса, 30 литров подсолнечного масла и 100 кг лука, есть 3 млн сум, до завтра",
     {"guruch": 50, "kungaboqar-yogi": 30, "piyoz": 100}, 3_000_000, 1),
    ("en", "I need 40 kg of beef, 300 eggs, 50 kg sugar and 2 tonna flour within a week, budget 25 000 000 so'm",
     {"mol-goshti": 40, "tuxum": 300, "shakar": 50, "un": 2000}, 25_000_000, 7),
]


@pytest.mark.parametrize("lang,message,expected,cash,deadline", ORDERS)
def test_agents_run_orders(client, lang, message, expected, cash, deadline):
    out = _run(client, message, lang)
    assert out["engine"] == "deterministic"
    p = out["planner"]
    assert {i["slug"]: i["quantity"] for i in p["items"]} == expected
    assert p["cash"] == cash and p["deadline_days"] == deadline
    assert len(p["regions"]) > 1  # empty region_ids = all regions
    for it in p["items"]:
        assert {"product_id", "slug", "name_uz", "name_ru", "name_en", "emoji", "unit", "category_slug", "quantity"} <= set(it)

    products_total = delivery_total = 0.0
    for it, sc, an in zip(p["items"], out["scout"]["items"], out["analyst"]["items"]):
        assert sc["product_id"] == it["product_id"] == an["product_id"]
        b = sc["best"]
        assert b is not None, it["slug"]
        q = it["quantity"]
        # total = qty * price + delivery; best meets stock + MOQ and is the cheapest such trusted offer
        assert b["total_cost"] == pytest.approx(q * b["unit_price"] + b["delivery_price"], abs=0.02)
        assert b["available_qty"] >= q >= b["min_order_qty"]
        assert all(a["total_cost"] >= b["total_cost"] for a in sc["alternatives"])
        assert len(sc["alternatives"]) <= 4 and sc["offers_considered"] >= 1 + len(sc["alternatives"])
        assert b["offer_id"] not in {f["offer_id"] for f in an["flagged"] if f["kind"] == "suspicious_cheap"}
        products_total += q * b["unit_price"]
        delivery_total += b["delivery_price"]
        # analyst
        assert an["signal"] in ("buy_now", "wait", "stable") and len(an["spark"]) <= 30
        assert an["forecast"]["horizon_days"] == min(14, deadline if deadline is not None else 14)
        for f in an["flagged"]:
            assert (f["kind"] == "overpriced" and f["vs_median_pct"] > 25) or (f["kind"] == "suspicious_cheap" and f["vs_median_pct"] < -20)

    fin, fl = out["finance"], out["final"]
    assert fin["total"] == pytest.approx(products_total + delivery_total, abs=0.1)
    assert fl["grand_total"] == pytest.approx(fin["total"], abs=0.1)
    assert fl["products_total"] == pytest.approx(products_total, abs=0.1)
    assert fl["delivery_total"] == pytest.approx(delivery_total, abs=0.1)
    if fin["total"] <= cash:
        assert fin["verdict"] == "enough" and fin["shortfall"] == 0 and fin["loan"] is None
    else:
        assert fin["verdict"] in ("borrow", "wait_and_save", "partial")
        assert fin["shortfall"] == pytest.approx(fin["total"] - cash, abs=0.1)
        assert fin["loan"]["type"] == "working_capital" and fin["loan"]["as_of"] == "2026-10-19" and fin["loan"]["source"] == "cbu.uz"
    assert "2026" in fin["tax_note"] and "4%" in fin["tax_note"]
    assert len(fl["lines"]) == len(p["items"]) and all(l["text"] for l in fl["lines"])
    assert fl["explanation"] and fl["explanation_engine"] == "template"
    if lang == "uz":
        assert "'" not in fl["explanation"]  # Uzbek typography: oʻ gʻ ʼ


def test_agents_region_filter(client, ids):
    region = ids["region"]
    out = _run(client, "100 kg piyoz kerak", "uz", [region])
    assert [r["id"] for r in out["planner"]["regions"]] == [region]
    best = out["scout"]["items"][0]["best"]
    if best:
        regions = {r["id"]: r["name_uz"] for r in client.get("/api/regions").json()}
        assert best["region_name"] == regions[region]
    r = client.post("/api/agents/run", json={"message": "piyoz", "region_ids": ["00000000-0000-0000-0000-000000000000"], "language": "uz"})
    assert r.status_code == 422


def test_agents_empty_and_unknown_message(client):
    for msg in ("", "   ", "salom, qalaysiz?"):
        out = _run(client, msg)
        assert out["planner"]["items"] == [] and out["planner"]["note"]
        assert out["finance"]["verdict"] == "unknown_cash" and out["final"]["lines"] == []
    out = _run(client, "50 kg xyzmeva va 20 kg shakar", "uz")
    assert out["planner"]["unmatched"] == ["xyzmeva"]
    assert [i["slug"] for i in out["planner"]["items"]] == ["shakar"]


def test_agents_default_quantity_and_unmatched(client):
    out = _run(client, "piyoz kerak, yana 30 kg xyzmeva", "en")
    item = out["planner"]["items"][0]
    assert item["slug"] == "piyoz" and item["quantity"] > 0
    assert out["planner"]["note"] and "piyoz" not in out["planner"]["unmatched"]
    assert "xyzmeva" in out["planner"]["unmatched"]


def test_planner_parsers():
    assert planner.parse_cash("qo'limda 4 mln so'm bor") == 4_000_000
    assert planner.parse_cash("есть 2,5 млн сум") == 2_500_000
    assert planner.parse_cash("budget 12 500 000 so'm") == 12_500_000
    assert planner.parse_cash("800 ming so'm") == 800_000
    assert planner.parse_cash("200 kg guruch") is None
    assert planner.parse_deadline("bugun kerak") == 0
    assert planner.parse_deadline("ertaga") == 1
    assert planner.parse_deadline("bir haftada") == 7
    assert planner.parse_deadline("в течение месяца") == 30
    assert planner.parse_deadline("3 kun ichida") == 3
    assert planner.parse_deadline("Choyxonam uchun guruch") is None


def test_planner_product_matching(client):
    from app.database.session import SessionLocal
    from app.models import Product

    db = SessionLocal()
    try:
        def slugs(text):
            return [db.get(Product, h["product_id"]).slug for h in planner.match_products(db, text)]

        assert slugs("guruch") == ["guruch"]                       # generic word -> base product
        assert slugs("guruchni olaman") == ["guruch"]
        assert slugs("yog' va piyoz") == ["kungaboqar-yogi", "piyoz"]
        assert slugs("kungaboqar yog'i") == ["kungaboqar-yogi"]
        assert slugs("paxta yog'i") == ["paxta-yogi"]
        assert slugs("mol go'shti va tuxum") == ["mol-goshti", "tuxum"]
        assert slugs("shakar, un") == ["shakar", "un"]
        assert slugs("Choyxonam uchun") == []                      # "choy" must not match "choyxona"
        assert slugs("unga aytdim") == []                          # "un" only as a whole word
        assert slugs("риса и муки") == ["guruch", "un"]
    finally:
        db.close()


def test_finance_verdicts():
    lines = [{"total": 1_000_000, "expected_change_pct": 3.0}]
    assert finance.advise(lines, None, None, 14, "uz")["verdict"] == "unknown_cash"
    assert finance.advise(lines, 2_000_000, None, 14, "uz")["verdict"] == "enough"
    # +3% in 14 days ~ 6.4%/month > 22.8%/12 = 1.9%/month, needed soon -> borrow
    b = finance.advise(lines, 400_000, 2, 14, "uz")
    assert b["verdict"] == "borrow" and b["shortfall"] == 600_000
    assert b["loan"]["annual_rate_pct"] == 22.8 and b["loan"]["best_bank"] == "Apex bank" and b["loan"]["best_bank_rate_pct"] == 19.8
    assert b["loan"]["monthly_interest"] == round(600_000 * 0.228 / 12)
    # falling prices -> wait and save
    assert finance.advise([{"total": 1_000_000, "expected_change_pct": -2.0}], 400_000, None, 14, "ru")["verdict"] == "wait_and_save"
    # rising, deadline far -> buy part now
    assert finance.advise(lines, 400_000, 30, 14, "en")["verdict"] == "partial"
    assert "2026" in finance.tax_note("ru") and "1%" in finance.tax_note("en")


# ------------------------------------------------------------------ Gemini

def test_gemini_schema_conversion_strips_additional_properties():
    decls = gemini.function_declarations(CLAUDE_TOOLS)
    assert len(decls) == len(CLAUDE_TOOLS)
    assert "additionalProperties" not in json.dumps(decls)
    s = gemini.to_gemini_schema(planner.PARSE_SCHEMA)
    assert "additionalProperties" not in json.dumps(s)
    assert s["properties"]["cash_som"] == {"type": "number", "nullable": True}
    item = s["properties"]["items"]["items"]
    assert item["properties"]["quantity"]["nullable"] is True and item["required"] == ["product", "quantity", "unit"]


def _gemini_response(parts):
    return {"candidates": [{"content": {"role": "model", "parts": parts}, "finishReason": "STOP"}]}


def test_gemini_function_calling_loop(client, buyer, monkeypatch):
    monkeypatch.setattr(get_settings(), "gemini_api_key", "test-key")
    sent = []

    def fake_post(self, url, json=None, headers=None, timeout=None, **kw):
        assert headers["x-goog-api-key"] == "test-key" and "key=" not in url
        sent.append(__import__("json").loads(__import__("json").dumps(json)))  # snapshot: the loop keeps appending
        if len(sent) == 1:
            body = _gemini_response([{"functionCall": {"name": "get_market_statistics", "args": {"product": "guruch"}}, "thoughtSignature": "sig"}])
        else:
            body = _gemini_response([{"text": "Guruch narxi barqaror."}])
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    assert client.get("/api/ai/status").json()["engine"] == "gemini"
    r = client.post("/api/ai/chat", json={"message": "Guruch bozori qanday?", "language": "uz"}, headers=buyer)
    assert r.status_code == 200, r.text
    msg = r.json()["message"]
    assert msg["mode"] == "gemini" and msg["content"] == "Guruch narxi barqaror."
    assert msg["tool_calls"][0]["name"] == "get_market_statistics"
    assert msg["tool_calls"][0]["input"] == {"product": "guruch"} and "avg" in msg["tool_calls"][0]["output"]
    # second request carried the model turn (with its thought signature) and the functionResponse
    contents = sent[1]["contents"]
    assert contents[-2]["parts"][0]["thoughtSignature"] == "sig"
    assert contents[-1]["parts"][0]["functionResponse"]["name"] == "get_market_statistics"
    assert "functionDeclarations" in sent[0]["tools"][0]


def test_gemini_error_falls_back_to_deterministic(client, buyer, monkeypatch):
    monkeypatch.setattr(get_settings(), "gemini_api_key", "test-key")

    def busy(self, url, **kw):
        return httpx.Response(503, json={"error": {}}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", busy)
    r = client.post("/api/ai/chat", json={"message": "Guruch narxi qancha?", "language": "uz"}, headers=buyer)
    assert r.status_code == 200 and r.json()["message"]["mode"] == "deterministic"
    # agents: Gemini busy -> keyword parser + template, still 200
    out = _run(client, "200 kg guruch kerak")
    assert out["engine"] == "deterministic" and out["final"]["explanation_engine"] == "template"
    assert out["planner"]["items"][0]["slug"] == "guruch"


def test_agents_with_mocked_gemini(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "gemini_api_key", "test-key")

    def fake_post(self, url, json=None, **kw):
        if json["generationConfig"].get("responseMimeType") == "application/json":
            parsed = {"in_scope": True, "items": [{"product": "guruch", "quantity": 0.2, "unit": "tonna"}],
                      "cash_som": 5000000, "deadline_days": None}
            body = _gemini_response([{"text": __import__("json").dumps(parsed)}])
        else:
            body = _gemini_response([{"text": "Guruchni hozir oling."}])
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    out = _run(client, "ikki yuz kilo guruch, besh million bor")
    assert out["engine"] == "gemini"
    assert out["planner"]["items"][0]["slug"] == "guruch" and out["planner"]["items"][0]["quantity"] == 200
    assert out["planner"]["cash"] == 5_000_000
    assert out["final"]["explanation"] == "Guruchni hozir oling." and out["final"]["explanation_engine"] == "gemini"


# ------------------------------------------------------------------ voice

def test_voice_without_key(client):
    assert client.get("/api/voice/status").json() == {"stt": False, "tts": False, "provider": None}
    r = client.post("/api/voice/tts", json={"text": "Salom", "language": "uz"})
    assert r.status_code == 503 and r.json()["detail"]
    r = client.post("/api/voice/stt", files={"audio": ("a.webm", b"\x1a\x45", "audio/webm")}, data={"language": "uz"})
    assert r.status_code == 503 and r.json()["detail"]


def test_voice_validation(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "voicelab_api_key", "test-key")
    r = client.post("/api/voice/tts", json={"text": "Salom", "language": "uz", "voice_id": "bad id"})
    assert r.status_code == 422
    r = client.post("/api/voice/stt", files={"audio": ("a.txt", b"hello", "text/plain")}, data={"language": "uz"})
    assert r.status_code == 415
    r = client.post("/api/voice/stt", files={"audio": ("a.webm", b"0" * (10 * 1024 * 1024 + 1), "audio/webm")}, data={"language": "uz"})
    assert r.status_code == 413


def test_elevenlabs_provider_and_voice_mapping(client, monkeypatch):
    from app.api import elevenlabs as eleven
    from app.core.config import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "voicelab_api_key", None)
    monkeypatch.setattr(s, "elevenlabs_api_key", "test-key")

    async def fake_check(_k):
        return True

    async def fake_tts(_k, text, lang, voice, speed):
        assert voice == eleven.VOICE_BY_ROLE["analyst"] and 0.7 <= max(0.7, min(1.2, speed))
        return b"ID3fake-mp3"

    monkeypatch.setattr(eleven, "check", fake_check)
    monkeypatch.setattr(eleven, "text_to_speech", fake_tts)
    st = client.get("/api/voice/status").json()
    assert st["provider"] == "elevenlabs" and st["stt"] and st["tts"]
    # the analyst agent's VoiceLab id is mapped to its ElevenLabs voice; answer is mp3
    r = client.post("/api/voice/tts", json={"text": "Narx barqaror.", "language": "uz",
                                            "voice_id": "voice_ba303813-3023-48aa-a454-4b5705669d35", "speed": 0.88})
    assert r.status_code == 200 and r.headers["content-type"].startswith("audio/mpeg")
    assert eleven.voice_for(None) == eleven.VOICE_BY_ROLE["narrator"]


def test_category_request_lists_cheapest_products_not_one_product(client):
    msg = "Choyxona ochmoqchiman. Eee, 10 ming-- 10 million so'm pulim bor. Menga eng arzon sabzavotlar narxini chiqarib ber."
    d = client.post("/api/agents/run", json={"message": msg, "region_ids": [], "language": "uz"}).json()
    p = d["planner"]
    assert [c["slug"] for c in p["categories"]] == ["vegetables"]
    assert p["mode"] == "price_list" and len(p["items"]) >= 5            # many vegetables, not just "sabzi"
    assert all(i["category_slug"] == "vegetables" for i in p["items"])
    bases = [i["name_uz"].split(" (")[0] for i in p["items"]]
    assert len(bases) == len(set(bases))                                  # one per kind, variants collapsed
    assert p["cash"] == 10_000_000                                        # self-correction: last amount wins
    for lang, q in (("ru", "Покажи самые дешёвые овощи"), ("en", "show me the cheapest vegetables")):
        r = client.post("/api/agents/run", json={"message": q, "region_ids": [], "language": lang}).json()["planner"]
        assert r["mode"] == "price_list" and r["items"]


def test_named_product_still_wins_over_category_words(client):
    d = client.post("/api/agents/run", json={"message": "50 kg sabzi kerak", "region_ids": [], "language": "uz"}).json()
    assert [(i["slug"], i["quantity"]) for i in d["planner"]["items"]] == [("sabzi", 50.0)]
    assert d["planner"]["mode"] == "order" and d["planner"]["categories"] == []


def test_parse_cash_uses_last_corrected_amount():
    from app.agents.planner import parse_cash
    assert parse_cash("10 ming-- 10 million so'm pulim bor") == 10_000_000
    assert parse_cash("5 mln emas, 3 mln so'm bor") == 3_000_000
    assert parse_cash("4 mln so'm bor") == 4_000_000

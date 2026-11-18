"""AI Market Analyst orchestration.

Mode "claude": Claude plans and calls the backend tools in a tool-use loop, then writes
the answer from tool output only.
Mode "deterministic": when no API key is configured (or the API fails), a rule-based
intent router calls the same tools and renders a templated answer. Nothing is invented
in either mode: the frontend renders the raw tool output next to the text.
"""
from __future__ import annotations

import json
import logging
import re

from sqlalchemy.orm import Session

from app.ai import tools as T
from app.core.config import get_settings

log = logging.getLogger("bozor.ai")
MAX_STEPS = 6

SYSTEM_PROMPT = """You are the Market Analyst inside Bozor-Analitika, a B2B wholesale market intelligence platform for Uzbekistan.

Your job: help buyers and sellers make purchasing decisions from the platform's structured market data.

Rules:
- Every price, supplier name, quantity, statistic or trend you mention must come from a tool result in this conversation. If no tool returned it, you do not know it. Call tools before answering any data question.
- Prices are in Uzbek soum. Write amounts like "1 250 000 so'm" (or "сум" in Russian, "UZS" in English).
- Total cost = quantity x unit price + delivery cost. Do not assume the cheapest offer is the best; use the recommendation score and its reasons.
- Name products in the user's language: use product_name_ru / product_name_en (or name_ru / name_en) for Russian / English answers, and the Uzbek name ("product" / name_uz) for Uzbek.
- Mention when the data was last updated, and state limitations (few offers, short history, forecast confidence, estimated demand).
- Offers with observed_on_site (korzinka.uz = supermarket shelf price, olx.uz = classified ad) are real public prices collected from that website; say which site a price is from. Their stock is unknown and the buyer contacts the seller on that site. Price history starts on the day collection began, so trends over short periods are limited.
- Product views and inquiries are platform interest signals, not real market demand. Forecasts are statistical estimates, not guarantees.
- If a product is not in the catalogue, say so and suggest close alternatives from tool output.
- Answer in the user's language: {language}. Be concise and structured: a one-line answer first, then 2-5 short bullet points with the supporting numbers, then a recommendation. Use plain Markdown (bold, bullets). No tables: the interface renders tool data as tables and charts next to your answer."""

LANG_NAME = {"uz": "Uzbek (Latin script)", "ru": "Russian", "en": "English"}


def answer(db: Session, message: str, history: list[dict], language: str) -> dict:
    """Engine order: Gemini (GEMINI_API_KEY) -> Claude (ANTHROPIC_API_KEY) -> deterministic.
    Any API error falls back to the deterministic engine with a notice."""
    engine = get_settings().ai_engine
    if engine != "deterministic":
        try:
            return _gemini(db, message, history, language) if engine == "gemini" else _claude(db, message, history, language)
        except Exception as e:  # network, auth, rate limit: keep the platform working
            log.warning("%s unavailable, falling back to deterministic analytics: %s", engine, type(e).__name__)
            out = deterministic(db, message, language)
            out["notice"] = "ai_unavailable"
            return out
    return deterministic(db, message, language)


# ------------------------------------------------------------------ Gemini function-calling loop

def _gemini(db: Session, message: str, history: list[dict], language: str) -> dict:
    from app.ai import gemini

    decls = gemini.function_declarations(T.CLAUDE_TOOLS)
    contents: list[dict] = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in history[-10:] if m.get("content")
    ]
    contents.append({"role": "user", "parts": [{"text": message}]})
    system = SYSTEM_PROMPT.format(language=LANG_NAME.get(language, "Uzbek"))
    calls: list[dict] = []
    for _ in range(MAX_STEPS):
        content = gemini.chat_step(system, contents, decls)
        contents.append(content)  # sent back verbatim (keeps thought signatures)
        fcalls = [p["functionCall"] for p in content.get("parts", []) if p.get("functionCall")]
        if not fcalls:
            text = "".join(p.get("text", "") for p in content.get("parts", []) if not p.get("thought")).strip()
            return {"content": text or _t(language, "empty"), "tool_calls": calls, "mode": "gemini"}
        parts = []
        for fc in fcalls:
            name = fc.get("name", "")
            args = fc.get("args") or {}
            if not isinstance(args, dict):
                args = {}
            out = T.run_tool(db, name, args)
            calls.append({"name": name, "input": args, "output": out})
            payload = json.dumps(out, ensure_ascii=False)
            fr: dict = {"name": name, "response": out if len(payload) <= 30000 else {"content": payload[:30000]}}
            if fc.get("id"):
                fr["id"] = fc["id"]
            parts.append({"functionResponse": fr})
        contents.append({"role": "user", "parts": parts})
    return {"content": _t(language, "too_many_steps"), "tool_calls": calls, "mode": "gemini"}


# ------------------------------------------------------------------ Claude tool-use loop

# Models that accept the `effort` setting and server-side refusal fallbacks.
# Older models (e.g. claude-haiku-4-5) reject these parameters, so they are sent only where supported.
_EFFORT_MODELS = ("claude-opus-5", "claude-sonnet-5", "claude-haiku-5", "claude-fable-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-4-6")
_FALLBACK_MODELS = ("claude-opus-5", "claude-sonnet-5-5", "claude-fable-5")


def _model_options(model: str) -> dict:
    opts: dict = {}
    if model.startswith(_EFFORT_MODELS):
        opts["output_config"] = {"effort": "medium"}
    if model.startswith(_FALLBACK_MODELS):
        opts["betas"] = ["server-side-fallback-2026-07-01"]
        opts["fallbacks"] = "default"
    return opts


def _claude(db: Session, message: str, history: list[dict], language: str) -> dict:
    import anthropic

    s = get_settings()
    client = anthropic.Anthropic(api_key=s.anthropic_api_key, timeout=90.0)
    messages: list = [*history[-10:], {"role": "user", "content": message}]
    calls: list[dict] = []
    for _ in range(MAX_STEPS):
        resp = client.beta.messages.create(
            model=s.anthropic_model,
            max_tokens=4096,
            system=SYSTEM_PROMPT.format(language=LANG_NAME.get(language, "Uzbek")),
            tools=T.CLAUDE_TOOLS,
            messages=messages,
            **_model_options(s.anthropic_model),
        )
        if resp.stop_reason == "refusal":
            return {"content": _t(language, "refusal"), "tool_calls": calls, "mode": "claude"}
        messages.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason == "pause_turn":
            continue
        uses = [b for b in resp.content if b.type == "tool_use"]
        if not uses:
            text = "\n".join(b.text for b in resp.content if b.type == "text").strip()
            return {"content": text or _t(language, "empty"), "tool_calls": calls, "mode": "claude"}
        results = []
        for u in uses:
            args = u.input if isinstance(u.input, dict) else json.loads(u.input or "{}")
            out = T.run_tool(db, u.name, args)
            calls.append({"name": u.name, "input": args, "output": out})
            results.append({"type": "tool_result", "tool_use_id": u.id, "content": json.dumps(out, ensure_ascii=False)[:30000],
                            "is_error": "error" in out})
        messages.append({"role": "user", "content": results})
    return {"content": _t(language, "too_many_steps"), "tool_calls": calls, "mode": "claude"}


# ------------------------------------------------------------------ deterministic engine

INTENTS = [
    ("budget", r"budjet|budget|бюджет|million|mln|миллион|so'm bilan|nima olsam|что купить|what should i buy"),
    ("forecast", r"prognoz|forecast|прогноз|predict|kelajak|будущ"),
    ("increase", r"oshgan|oshdi|qimmatla|increase|rose|рост|подорож|вырос|largest price"),
    ("low_supply", r"taklif kam|kam taklif|low supply|дефицит|мало предлож|tanqis|supply"),
    ("history", r"o'zgar|ozgar|history|changed|over the last|измен|динамик|oxirgi|last \d+|за последн|kun ichida|tarix"),
    ("suppliers", r"yetkazib beruvchi|ta'minotchi|supplier|поставщик|best value|eng yaxshi"),
    ("regional", r"hudud|viloyat|region|регион|across|bo'ylab|по област|qaysi bozor|which market|какой рынок|где дешевле"),
    ("cheapest", r"arzon|cheap|дешев|lowest|eng past"),
    ("compare", r"solishtir|taqqosla|compare|сравн"),
    ("analyze", r"tahlil|analy|анализ|bozor holati|market for"),
]


def _detect(message: str) -> set[str]:
    m = T._norm(message)
    return {name for name, rx in INTENTS if re.search(rx, m)}


def _numbers(message: str) -> dict:
    m = T._norm(message).replace(" ", " ")
    out: dict = {}
    mm = re.search(r"(\d+(?:[.,]\d+)?)\s*(million|mln|миллион|млн)", m)
    if mm:
        out["budget"] = float(mm.group(1).replace(",", ".")) * 1_000_000
    else:
        big = re.search(r"(\d[\d ]{5,})\s*(so'm|som|сум|uzs)", m)
        if big:
            out["budget"] = float(big.group(1).replace(" ", ""))
    q = re.search(r"(\d+(?:[.,]\d+)?)\s*(kg|кг|t\b|tonna|тонн|dona|шт|piece|qop|litr|l\b)", m)
    if q:
        qty = float(q.group(1).replace(",", "."))
        if q.group(2) in ("t", "tonna", "тонн"):
            qty *= 1000
        out["quantity"] = qty
    d = re.search(r"(\d+)\s*(kun|day|дн|дня|дней)", m)
    if d:
        out["days"] = int(d.group(1))
    elif re.search(r"hafta|week|недел", m):
        out["days"] = 7
    elif re.search(r"\boy\b|month|месяц", m):
        out["days"] = 30
    return out


def deterministic(db: Session, message: str, language: str) -> dict:
    intents = _detect(message)
    nums = _numbers(message)
    products = T.find_products_in_text(db, message)
    region = T.resolve_region(db, message)
    rname = region.name_uz if region else None
    p = products[0].name_uz if products else None
    calls: list[dict] = []

    def call(name: str, **args):
        args = {k: v for k, v in args.items() if v is not None}
        out = T.run_tool(db, name, args)
        calls.append({"name": name, "input": args, "output": out})
        return out

    if "budget" in intents or ("budget" in nums and not p):
        items = [{"product": x.name_uz, "quantity": nums.get("quantity", 100)} for x in products] or None
        call("calculate_purchase_cost", items=items, budget=nums.get("budget"), region=rname)
    elif "forecast" in intents and p:
        call("get_price_forecast", product=p)
    elif "low_supply" in intents:
        call("analyze_supply_demand", product=p)
    elif "increase" in intents and not p:
        call("get_market_statistics")
    elif "history" in intents and p:
        call("get_price_history", product=p, days=nums.get("days", 7), region=rname)
    elif "suppliers" in intents:
        call("recommend_suppliers", product=p, quantity=nums.get("quantity", 100), region=rname)
    elif p and ("regional" in intents or ("compare" in intents and not nums.get("quantity"))) and not region:
        call("get_regional_comparison", product=p)
        if "cheapest" in intents:
            call("search_products", query=p, sort="price_asc", limit=5)
    elif p and ("cheapest" in intents or "compare" in intents):
        call("compare_offers", product=p, quantity=nums.get("quantity", 100), region=rname)
    elif p and "analyze" in intents:
        call("get_market_statistics", product=p, region=rname)
        call("analyze_supply_demand", product=p)
        call("get_price_forecast", product=p)
    elif p:
        call("get_market_statistics", product=p, region=rname)
        call("compare_offers", product=p, quantity=nums.get("quantity", 100), region=rname)
    else:
        call("get_market_statistics")

    return {"content": render(calls, language), "tool_calls": calls, "mode": "deterministic"}


def _som(v, lang: str) -> str:
    if v is None:
        return "—"
    s = f"{round(float(v)):,}".replace(",", " ")
    return f"{s} " + {"uz": "so'm", "ru": "сум", "en": "UZS"}[lang]


def _pct(v) -> str:
    return "—" if v is None else f"{v:+.1f}%"


L = {
    "uz": {
        "refusal": "Bu so'rovga javob bera olmayman. Bozor narxlari, takliflar yoki ta'minotchilar haqida so'rang.",
        "empty": "Javob tayyorlab bo'lmadi. Savolni boshqacha yozib ko'ring.",
        "too_many_steps": "Savol juda murakkab bo'ldi. Iltimos, uni bir nechta qisqaroq savolga bo'ling.",
        "not_found": "«{q}» katalogda topilmadi. Masalan: kartoshka, piyoz, pomidor, guruch, sement.",
        "updated": "Oxirgi yangilanish: {d}.",
        "compare_head": "**{p}** — {q} {u} uchun {n} ta taklif solishtirildi.",
        "best": "Tavsiya: **{s}** ({r}) — jami {t}, ball {sc}/100.",
        "cheapest": "Eng arzon jami narx: **{s}** — {t}.",
        "save": "O'rtacha taklifga nisbatan tejash: {v}.",
        "stats_head": "**{p}** bo'yicha bozor holati ({n} ta faol taklif):",
        "stats_line": "O'rtacha {a}, mediana {m}, oraliq {lo} – {hi}. 7 kunlik o'zgarish {c7}, 30 kunlik {c30}.",
        "history_head": "**{p}** narxi oxirgi {d} kunda {c} o'zgardi: {a} → {b} (o'rtacha, 1 {u} uchun).",
        "regional_head": "**{p}** eng arzon hudud — **{r}** (o'rtacha {a}). Eng qimmat hudud bilan farq {s}.",
        "movers_up": "7 kunda eng ko'p qimmatlaganlar:",
        "movers_down": "Eng ko'p arzonlaganlar:",
        "market": "Bozorda {o} ta faol taklif, {s} ta ta'minotchi.",
        "supply_head": "Taklifi eng kam mahsulotlar:",
        "gaps": "Talab bor, taklif kam (qidirilgan, lekin 3 tadan kam taklif): {x}.",
        "sd_one": "**{p}**: {o} ta faol taklif, jami {q} mavjud; 30 kunda {i} ta so'rov, {v} ta ko'rish. Taxminiy qiziqish indeksi {ix}/100 — signal: {sg}.",
        "est": "_Qiziqish indeksi platformadagi faollikdan taxmin qilingan, umumiy bozor talabi emas._",
        "fc_none": "**{p}** uchun prognoz qilishga tarixiy ma'lumot yetarli emas ({n} kun, kamida {m} kun kerak).",
        "fc": "**{p}** uchun {h} kunlik statistik prognoz: {v} atrofida ({c}), ishonchlilik: **{conf}**. Usul: {meth}.",
        "fc_warn": "_Prognoz kafolat emas — u tarixiy narxlardan hisoblangan statistik baho._",
        "budget_head": "{b} byudjet uchun reja (7 kunda narxi tushgan mahsulotlar, eng arzon mos taklif):",
        "budget_line": "• {p}: {q} {u} × {pr} — jami {t} ({s}, {c} haftada)",
        "budget_total": "Rejalashtirilgan jami: {t}.",
        "basket_total": "Savat bo'yicha jami: {t}{w}.",
        "within": " — byudjet ichida",
        "over": " — byudjetdan oshadi",
        "sup_head": "Tavsiya etilgan ta'minotchilar:",
        "verified": "tasdiqlangan",
        "unverified": "tasdiqlanmagan",
        "rec": "**Xulosa:** {x}",
    },
    "ru": {
        "refusal": "Не могу ответить на этот запрос. Спросите о ценах, предложениях или поставщиках.",
        "empty": "Не удалось сформировать ответ. Попробуйте переформулировать вопрос.",
        "too_many_steps": "Вопрос оказался слишком сложным. Разбейте его на несколько коротких.",
        "not_found": "«{q}» нет в каталоге. Например: картофель, лук, помидоры, рис, цемент.",
        "updated": "Последнее обновление: {d}.",
        "compare_head": "**{p}** — сравнено {n} предложений для {q} {u}.",
        "best": "Рекомендация: **{s}** ({r}) — итого {t}, балл {sc}/100.",
        "cheapest": "Самая низкая итоговая цена: **{s}** — {t}.",
        "save": "Экономия относительно среднего предложения: {v}.",
        "stats_head": "Рынок **{p}** ({n} активных предложений):",
        "stats_line": "Средняя {a}, медиана {m}, диапазон {lo} – {hi}. За 7 дней {c7}, за 30 дней {c30}.",
        "history_head": "Цена **{p}** за последние {d} дн. изменилась на {c}: {a} → {b} (в среднем за 1 {u}).",
        "regional_head": "Самый дешёвый регион для **{p}** — **{r}** (в среднем {a}). Разница с самым дорогим: {s}.",
        "movers_up": "Больше всего подорожали за 7 дней:",
        "movers_down": "Больше всего подешевели:",
        "market": "На рынке {o} активных предложений от {s} поставщиков.",
        "supply_head": "Товары с наименьшим предложением:",
        "gaps": "Есть спрос, мало предложений (искали, но < 3 предложений): {x}.",
        "sd_one": "**{p}**: {o} активных предложений, всего {q}; за 30 дней {i} запросов, {v} просмотров. Оценочный индекс интереса {ix}/100 — сигнал: {sg}.",
        "est": "_Индекс интереса оценён по активности на платформе, а не по общему спросу рынка._",
        "fc_none": "Недостаточно истории для прогноза **{p}** ({n} дн., нужно минимум {m}).",
        "fc": "Статистический прогноз **{p}** на {h} дн.: около {v} ({c}), уверенность: **{conf}**. Метод: {meth}.",
        "fc_warn": "_Прогноз — статистическая оценка по истории цен, а не гарантия._",
        "budget_head": "План на бюджет {b} (товары, подешевевшие за 7 дней, самое выгодное подходящее предложение):",
        "budget_line": "• {p}: {q} {u} × {pr} — итого {t} ({s}, {c} за неделю)",
        "budget_total": "Итого по плану: {t}.",
        "basket_total": "Итого по корзине: {t}{w}.",
        "within": " — в рамках бюджета",
        "over": " — превышает бюджет",
        "sup_head": "Рекомендуемые поставщики:",
        "verified": "проверен",
        "unverified": "не проверен",
        "rec": "**Вывод:** {x}",
    },
    "en": {
        "refusal": "I can't help with that request. Ask about prices, offers or suppliers.",
        "empty": "I couldn't produce an answer. Try rephrasing the question.",
        "too_many_steps": "That question needed too many steps. Please split it into shorter questions.",
        "not_found": "\"{q}\" is not in the catalogue. Try: potato, onion, tomato, rice, cement.",
        "updated": "Last updated: {d}.",
        "compare_head": "**{p}** — compared {n} offers for {q} {u}.",
        "best": "Recommended: **{s}** ({r}) — total {t}, score {sc}/100.",
        "cheapest": "Lowest total cost: **{s}** — {t}.",
        "save": "Saving versus the average offer: {v}.",
        "stats_head": "**{p}** market snapshot ({n} active offers):",
        "stats_line": "Average {a}, median {m}, range {lo} – {hi}. 7-day change {c7}, 30-day {c30}.",
        "history_head": "**{p}** moved {c} over the last {d} days: {a} → {b} (average per {u}).",
        "regional_head": "Cheapest region for **{p}** is **{r}** (avg {a}). Gap to the most expensive region: {s}.",
        "movers_up": "Largest 7-day increases:",
        "movers_down": "Largest decreases:",
        "market": "{o} active offers from {s} suppliers on the market.",
        "supply_head": "Products with the lowest supply:",
        "gaps": "Demand gaps (searched, but fewer than 3 offers): {x}.",
        "sd_one": "**{p}**: {o} active offers, {q} available in total; {i} inquiries and {v} views in 30 days. Estimated interest index {ix}/100 — signal: {sg}.",
        "est": "_The interest index is estimated from platform activity, not total market demand._",
        "fc_none": "Not enough history to forecast **{p}** ({n} days, at least {m} needed).",
        "fc": "{h}-day statistical forecast for **{p}**: around {v} ({c}), confidence: **{conf}**. Method: {meth}.",
        "fc_warn": "_A forecast is a statistical estimate from past prices, not a guarantee._",
        "budget_head": "Plan for a {b} budget (products whose price fell this week, best eligible offer each):",
        "budget_line": "• {p}: {q} {u} × {pr} — total {t} ({s}, {c} this week)",
        "budget_total": "Planned total: {t}.",
        "basket_total": "Basket total: {t}{w}.",
        "within": " — within budget",
        "over": " — over budget",
        "sup_head": "Recommended suppliers:",
        "verified": "verified",
        "unverified": "unverified",
        "rec": "**Bottom line:** {x}",
    },
}


def uz_typo(s: str) -> str:
    """Uzbek Latin typography: o' -> oʻ, g' -> gʻ, other letter' -> ʼ (tutuq belgisi)."""
    s = re.sub(r"([oOgG])['‘’`]", r"\1ʻ", s)
    return re.sub(r"(?<=[A-Za-z])['’](?=[A-Za-z])", "ʼ", s)


L["uz"] = {k: uz_typo(v) for k, v in L["uz"].items()}


def _t(lang: str, key: str, **kw) -> str:
    return L.get(lang, L["uz"])[key].format(**kw)


def _date(iso: str | None) -> str:
    return iso[:16].replace("T", " ") if iso else "—"


def _pn(o: dict, lang: str) -> str:
    """Product name in the answer language (tool output carries uz under "product" plus product_name_ru/en)."""
    if lang in ("ru", "en"):
        return o.get(f"product_name_{lang}") or o.get(f"name_{lang}") or o.get("product") or ""
    return o.get("product") or o.get("name_uz") or ""


def render(calls: list[dict], lang: str) -> str:
    lang = lang if lang in L else "uz"
    out: list[str] = []
    updated = None
    for c in calls:
        o = c["output"]
        if o.get("error") == "product_not_found":
            out.append(_t(lang, "not_found", q=o.get("query")))
            continue
        updated = o.get("last_updated") or updated
        n = c["name"]
        if n == "compare_offers" and o.get("rows"):
            rows = o["rows"]
            best = next((r for r in rows if r["is_recommended"]), rows[0])
            cheap = next((r for r in rows if r["is_cheapest"]), rows[0])
            out.append(_t(lang, "compare_head", p=_pn(o, lang), q=f"{o['quantity']:g}", u=o["unit"], n=len(rows)))
            out.append("- " + _t(lang, "best", s=best["supplier"], r=best["region"], t=_som(best["total_cost_uzs"], lang), sc=best["score"]))
            if cheap is not best:
                out.append("- " + _t(lang, "cheapest", s=cheap["supplier"], t=_som(cheap["total_cost_uzs"], lang)))
            if o.get("savings_vs_average_uzs") and o["savings_vs_average_uzs"] > 0:
                out.append("- " + _t(lang, "save", v=_som(o["savings_vs_average_uzs"], lang)))
        elif n == "get_market_statistics" and "product" in o:
            out.append(_t(lang, "stats_head", p=_pn(o, lang), n=o.get("count", 0)))
            out.append("- " + _t(lang, "stats_line", a=_som(o.get("avg"), lang), m=_som(o.get("median"), lang), lo=_som(o.get("min"), lang),
                                  hi=_som(o.get("max"), lang), c7=_pct(o.get("change_7d_pct")), c30=_pct(o.get("change_30d_pct"))))
        elif n == "get_market_statistics":
            out.append(_t(lang, "market", o=o["active_offers"], s=o["active_suppliers"]))
            if o["largest_increases_7d"]:
                out.append(_t(lang, "movers_up"))
                out += [f"- {m['name_' + lang]}: {_pct(m['change_pct'])} ({_som(m['current_avg'], lang)}/{m['unit']})" for m in o["largest_increases_7d"]]
            if o["largest_decreases_7d"]:
                out.append(_t(lang, "movers_down"))
                out += [f"- {m['name_' + lang]}: {_pct(m['change_pct'])} ({_som(m['current_avg'], lang)}/{m['unit']})" for m in o["largest_decreases_7d"]]
        elif n == "get_price_history" and o.get("series"):
            s = o["series"]
            out.append(_t(lang, "history_head", p=_pn(o, lang), d=o["days"], c=_pct(o.get("change_pct")), a=_som(s[0]["avg"], lang), b=_som(s[-1]["avg"], lang), u=o["unit"]))
        elif n == "get_regional_comparison" and o.get("regions"):
            r0 = o["regions"][0]
            out.append(_t(lang, "regional_head", p=_pn(o, lang), r=r0[f"region_name_{lang}"], a=_som(r0["avg"], lang), s=_pct(o.get("spread_cheapest_to_priciest_pct"))))
            out += [f"- {r[f'region_name_{lang}']}: {_som(r['avg'], lang)} ({r['count']})" for r in o["regions"]]
        elif n == "search_products" and o.get("offers"):
            out += [f"- {x['supplier']} ({x['region']}): {_som(x['unit_price_uzs'], lang)}/{x['unit']}" for x in o["offers"][:5]]
        elif n == "analyze_supply_demand" and "observed" in o:
            ob, es = o["observed"], o["estimated"]
            out.append(_t(lang, "sd_one", p=_pn(o, lang), o=ob["active_offers"], q=f"{ob['total_available_qty']:,.0f}".replace(",", " "),
                          i=ob["purchase_inquiries"], v=ob["offer_views"], ix=es["interest_index"], sg=es["signal"]))
            out.append(_t(lang, "est"))
        elif n == "analyze_supply_demand":
            out.append(_t(lang, "supply_head"))
            out += [f"- {_pn(r, lang)}: {r['active_offers']} / " + f"{r['total_available_qty']:,.0f}".replace(",", " ") + f" {r['unit']}" for r in o["lowest_supply"][:6]]
            if o.get("demand_gaps"):
                out.append(_t(lang, "gaps", x=", ".join(g[f"name_{lang}"] for g in o["demand_gaps"][:5])))
            out.append(_t(lang, "est"))
        elif n == "get_price_forecast":
            if not o.get("sufficient"):
                out.append(_t(lang, "fc_none", p=_pn(o, lang), n=o.get("points", 0), m=o.get("min_points", 14)))
            else:
                last = o["forecast"][-1]
                out.append(_t(lang, "fc", p=_pn(o, lang), h=len(o["forecast"]), v=_som(last["value"], lang), c=_pct(o.get("expected_change_pct")),
                              conf=o["confidence"], meth=o["method"]))
                out.append(_t(lang, "fc_warn"))
        elif n == "calculate_purchase_cost":
            if o.get("budget_plan") is not None:
                out.append(_t(lang, "budget_head", b=_som(o.get("budget_uzs"), lang)))
                for pl in o["budget_plan"]:
                    out.append(_t(lang, "budget_line", p=_pn(pl, lang), q=pl["quantity"], u=pl["unit"], pr=_som(pl["offer"]["unit_price_uzs"], lang),
                                  t=_som(pl["total_uzs"], lang), s=pl["offer"]["supplier"], c=_pct(pl["price_change_7d_pct"])))
                out.append(_t(lang, "budget_total", t=_som(o.get("planned_total_uzs"), lang)))
            else:
                for ln in o["lines"]:
                    if "offer" in ln:
                        out.append(f"- {_pn(ln, lang)}: {ln['quantity']:g} {ln['unit']} — {_som(ln['total_uzs'], lang)} ({ln['offer']['supplier']})")
                w = "" if "within_budget" not in o else _t(lang, "within") if o["within_budget"] else _t(lang, "over")
                out.append(_t(lang, "basket_total", t=_som(o["grand_total_uzs"], lang), w=w))
        elif n == "recommend_suppliers":
            out.append(_t(lang, "sup_head"))
            for r in o.get("recommended", []):
                out.append(f"- **{r['supplier']}** — {_som(r['total_cost_uzs'], lang)}, ★{r['supplier_rating']}, {_t(lang, 'verified') if r['supplier_verified'] else _t(lang, 'unverified')}")
            for r in o.get("suppliers", []):
                out.append(f"- **{r['name']}** — ★{r['rating']}, {r['completed_deals']} deals, {r.get('region') or ''}")
    if updated:
        out.append(_t(lang, "updated", d=_date(updated)))
    text = "\n".join(out) if out else _t(lang, "empty")
    return uz_typo(text) if lang == "uz" else text

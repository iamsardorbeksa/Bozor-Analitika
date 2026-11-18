"""AGENT 1 - Mirzo, the planner.

Reads the buyer's sentence (Uzbek, Russian, English) and finds products + quantities, cash on hand
and the deadline. With GEMINI_API_KEY it asks Gemini for a structured parse (products as free text,
mapped to the catalogue here); otherwise - or when Gemini fails / is slow - a keyword parser does it.
"""
from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass, field
from decimal import Decimal
from statistics import median
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.agents.common import num, uz_typo, unit_name
from app.ai.tools import resolve_product
from app.models import Offer, OfferStatus, Product, Region

log = logging.getLogger("bozor.agents")

# ------------------------------------------------------------------ text normalisation + keyword index


def norm(text: str) -> str:
    s = str(text).lower()
    for ch in "ʻʼ‘’`´":
        s = s.replace(ch, "'")
    s = s.replace("ё", "е").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


_CYR = re.compile(r"[а-я]")
# endings allowed after a short (<= 3 letters) keyword word: guruch -> n/a, "yog'" "yog'i", "риса", "eggs"
_SHORT_SUFFIXES = ["'", "'i", "'ni", "'ini", "ni", "ning", "dan", "ga", "da", "lar", "larni", "s", "es",
                   "а", "у", "ом", "ы", "и", "е", "я", "о", "ой", "ей", "ов"]
_SUFFIX_RE = "(?:" + "|".join(re.escape(x) for x in sorted(_SHORT_SUFFIXES, key=len, reverse=True)) + ")?"
_LATIN_SUFFIXES = ["s", "es", "ni", "ning", "ga", "ka", "qa", "da", "dan", "lar", "larni", "larning", "lardan", "larga",
                   "im", "imni", "imiz", "ing", "ingiz", "i", "si", "ini", "dek", "gacha", "cha", "'", "'i", "'ni"]
_LATIN_SUFFIX_RE = "(?:" + "|".join(re.escape(x) for x in sorted(_LATIN_SUFFIXES, key=len, reverse=True)) + ")?"


def _word_pattern(w: str) -> str:
    if len(w) <= 2:            # "un": whole word only ("unga", "unda" are pronouns)
        return re.escape(w)
    if len(w) == 3:
        return re.escape(w) + _SUFFIX_RE
    if _CYR.search(w):         # Russian inflects the ending: подсолнечное -> подсолнечного, масло -> масла
        if len(w) >= 6:
            return re.escape(w[:-2]) + r"[\w']{0,4}"
        # short words keep their consonant ending: "карп" -> карпа, not "карамель"
        stem = w[:-1] if w[-1] in "аеёиоуыэюяй" else w
        return re.escape(stem) + r"[\w']{0,3}"
    # Uzbek / English add known suffixes (guruchni, tuxumlar, onions) - but "choy" must not match "choyxona"
    return re.escape(w) + _LATIN_SUFFIX_RE


def _keyword_regex(kw: str) -> re.Pattern:
    parts = [_word_pattern(w) for w in kw.split(" ")]
    return re.compile(r"(?<![\w'])" + r"\s+".join(parts) + r"(?![\w'])")


@dataclass
class _Kw:
    kw: str
    prio: int          # 0 = exact alias / full name, 1 = name without its "(variant)" part
    product_id: UUID
    slug: str
    rx: re.Pattern = field(repr=False)


_index_cache: dict = {}
_index_lock = threading.Lock()


def keyword_index(db: Session) -> list[_Kw]:
    key = (str(db.get_bind().url), db.scalar(select(func.count(Product.id))), db.scalar(select(func.max(Product.slug))))
    with _index_lock:
        if key in _index_cache:
            return _index_cache[key]
    best: dict[str, tuple[int, int, UUID, str]] = {}
    for p in db.scalars(select(Product)).all():
        cands: list[tuple[str, int]] = [(p.slug.replace("-", " "), 0)]
        for name in (p.name_uz, p.name_ru, p.name_en):
            cands.append((name, 0))
            stripped = re.sub(r"\([^)]*\)", " ", name)
            if stripped.strip() != name.strip():
                cands.append((stripped, 1))
        cands += [(a, 0) for a in (p.aliases or [])]
        for raw, prio in cands:
            kw = re.sub(r"[^\w' -]", " ", norm(raw))
            kw = re.sub(r"\s+", " ", kw).strip(" -")
            if len(kw) < 2:
                continue
            rank = (prio, len(p.slug))
            if kw not in best or rank < best[kw][:2]:
                best[kw] = (prio, len(p.slug), p.id, p.slug)
    out = [_Kw(kw, prio, pid, slug, _keyword_regex(kw)) for kw, (prio, _, pid, slug) in best.items()]
    out.sort(key=lambda k: (-len(k.kw), k.prio, len(k.slug)))
    with _index_lock:
        _index_cache.clear()
        _index_cache[key] = out
    return out


# ------------------------------------------------------------------ category words ("sabzavotlar", "овощи", "vegetables")
# A buyer asking about a whole group must not be matched to one product ("sabzavotlar" is not "sabzi").
# Patterns match word starts so Uzbek/Russian endings are covered (sabzavotlarni, овощей, vegetables).
CATEGORY_WORDS: dict[str, list[str]] = {
    "vegetables": [r"sabzavot", r"сабзавот", r"овощ", r"vegetable", r"veggie", r"ko'katlar"],
    "fruits": [r"mevalar", r"meva(?:\b|lar|ni|dan)", r"мева", r"фрукт", r"fruits?\b"],
    "dried-fruits-nuts": [r"quruq meva", r"yong'oqlar", r"сухофрукт", r"орех", r"dried fruit", r"\bnuts\b"],
    "grains": [r"don mahsulot", r"yormalar", r"крупы", r"крупа", r"зерно", r"grains?\b", r"cereals?"],
    "meat-dairy": [r"go'sht mahsulot", r"sut mahsulot", r"мяс\w* продукт", r"молочн", r"\bdairy\b", r"meat products"],
    "oils-grocery": [r"bakaleya", r"бакале", r"grocer"],
    "beverages": [r"ichimlik", r"напит", r"beverage", r"\bdrinks\b"],
    "spices": [r"ziravor", r"специ", r"пряност", r"spices?\b"],
    "construction": [r"qurilish material", r"стройматериал", r"строительн\w* материал", r"construction material", r"building material"],
    "textiles": [r"tekstil", r"to'qimachilik", r"текстил", r"ткани\b", r"textile", r"fabrics\b"],
    "electronics": [r"elektronika", r"электроник", r"electronics"],
    "household": [r"maishiy kimyo", r"бытов\w* хими", r"household", r"cleaning products"],
}
_CAT_RX = {slug: re.compile(r"(?<![\w'])(?:" + "|".join(pats) + r")[\w']*") for slug, pats in CATEGORY_WORDS.items()}
_CHEAP_RX = re.compile(r"arzon|дешев|дёшев|cheap|lowest|eng past")


def find_categories(text: str) -> list[tuple[str, int, int]]:
    """[(category_slug, start, end)] for category words in the text (normalised positions)."""
    t = norm(text)
    out = []
    for slug, rx in _CAT_RX.items():
        for m in rx.finditer(t):
            out.append((slug, m.start(), m.end()))
    return sorted(out, key=lambda x: x[1])


def match_products(db: Session, text: str) -> list[dict]:
    """Products named in `text`, in order of appearance: [{product_id, start, end}].
    Longest keyword first, so "kungaboqar yog'i" wins over "yog'" and "guruch uni" over "guruch";
    for a generic word shared by several variants the base product (exact alias, shortest slug) wins.
    Category words ("sabzavotlar") are blocked first so they never count as a product."""
    t = norm(text)
    used = [False] * len(t)
    for _, s, e in find_categories(text):
        for i in range(s, e):
            used[i] = True
    found: dict[UUID, dict] = {}
    for k in keyword_index(db):
        if k.kw[:2] not in t and not _CYR.search(k.kw):
            continue  # cheap pre-filter
        for m in k.rx.finditer(t):
            s, e = m.span()
            if any(used[s:e]):
                continue
            for i in range(s, e):
                used[i] = True
            if k.product_id not in found:
                found[k.product_id] = {"product_id": k.product_id, "start": s, "end": e}
    return sorted(found.values(), key=lambda x: x["start"])


# ------------------------------------------------------------------ numbers: quantities, cash, deadline

NUM = r"(\d+(?:[.,]\d+)?)"
UNITS = (r"kg|kilogramm?\w*|kilo|кг|килограмм\w*|litr\w*|liter\w*|litre\w*|литр\w*|l|л|dona|ta|шт\w*|pcs|pieces?|"
         r"qop\w*|мешо?к\w*|sacks?|bags?|tonna\w*|тонн\w*|tons?|t|т")
_MONEY_AFTER = re.compile(r"^\s*(mlrd|млрд|milliard|миллиард|mln|млн|million|миллион|ming|тыс|so'm|som|sum|сум|сўм|uzs)")
_BEFORE = re.compile(rf"(?<![\w.,]){NUM}\s*(?:({UNITS})\.?(?![\w']))?\s*(?:of\s+)?$")
_AFTER = re.compile(rf"^\s*[:\-–—]?\s*{NUM}\s*(?:({UNITS})(?![\w']))?")


def _to_qty(n: str, unit_word: str | None, product_unit: str) -> float:
    q = float(n.replace(",", "."))
    u = (unit_word or "").lower()
    if re.match(r"^(tonna|тонн|tons?$|t$|т$)", u) and product_unit == "kg":
        q *= 1000
    return q


def parse_cash(text: str) -> float | None:
    """Money the buyer has. When they correct themselves ("10 ming-- 10 million"), the LAST amount wins."""
    t = norm(text)
    found: list[tuple[int, float]] = []
    for m in re.finditer(r"(?<![\w.,])(\d+(?:[.,]\d+)?)\s*(mlrd|млрд|milliard\w*|миллиард\w*|mln|млн|million\w*|миллион\w*)(?![a-zа-я])", t):
        mult = 1e9 if re.match(r"^(mlrd|млрд|milliard|миллиард)", m.group(2)) else 1e6
        found.append((m.start(), float(m.group(1).replace(",", ".")) * mult))
    for m in re.finditer(r"(?<![\w.,])(\d+(?:[.,]\d+)?)\s*(ming|тыс\w*)(?:\s*(so'm|som|sum|сум|сўм|uzs))?(?![a-zа-я])", t):
        # "10 ming" without so'm only counts as money when another amount follows (a self-correction)
        if m.group(3) or found or re.search(r"pul|деньг|money|bor\b|есть", t):
            found.append((m.start(), float(m.group(1).replace(",", ".")) * 1e3))
    for m in re.finditer(r"(?<![\w.,])(\d{1,3}(?:[ .,]\d{3})+|\d{5,})\s*(so'm|som|sum|сум|сўм|uzs)", t):
        found.append((m.start(), float(re.sub(r"[ .,]", "", m.group(1)))))
    return max(found)[1] if found else None


def parse_deadline(text: str) -> int | None:
    t = norm(text)
    if m := re.search(r"(\d+)\s*(kun|день|дня|дней|days?)", t):
        return int(m.group(1))
    if m := re.search(r"(\d+)\s*(hafta|недел\w*|weeks?)", t):
        return int(m.group(1)) * 7
    if re.search(r"bugun|today|сегодня", t):
        return 0
    if re.search(r"ertaga|tomorrow|завтра", t):
        return 1
    if re.search(r"hafta|недел|week", t):
        return 7
    if re.search(r"(?<![\w'])oy(?:da|ga|gacha| ichida)?(?![\w'])|month|месяц", t):
        return 30
    return None


_STOP = {"of", "va", "и", "and", "kerak", "нужно", "need", "bor", "uchun", "для", "for", "dan", "из", "from", "so'm", "сум", "sum", "som"}


def keyword_parse(db: Session, text: str) -> dict:
    """Deterministic parser. Returns {items: [{product_id, quantity|None}], cash, deadline_days, unmatched}."""
    t = norm(text)
    hits = match_products(db, text)
    units = dict(db.execute(select(Product.id, Product.unit).where(Product.id.in_([h["product_id"] for h in hits]))).all()) if hits else {}
    consumed: set[int] = set()
    items = []
    for h in hits:
        qty = None
        before = _BEFORE.search(t[max(0, h["start"] - 40):h["start"]])
        if before:
            pos = max(0, h["start"] - 40) + before.start(1)
            if pos not in consumed:
                consumed.add(pos)
                qty = _to_qty(before.group(1), before.group(2), units[h["product_id"]])
        if qty is None:
            after = _AFTER.match(t[h["end"]:])
            if after and not _MONEY_AFTER.match(t[h["end"] + after.end():]):
                pos = h["end"] + after.start(1)
                if pos not in consumed:
                    consumed.add(pos)
                    qty = _to_qty(after.group(1), after.group(2), units[h["product_id"]])
        items.append({"product_id": h["product_id"], "quantity": qty if qty and qty > 0 else None})

    # "50 kg banan": a quantity + unit followed by a word that is not a catalogue product
    spans = [(h["start"], h["end"]) for h in hits]
    unmatched = []
    for m in re.finditer(rf"(?<![\w.,]){NUM}\s*(?:{UNITS})(?![\w'])\s+(?:of\s+)?([^\W\d_][\w']{{2,}})", t):
        if m.start(1) in consumed or _MONEY_AFTER.match(t[m.end(1):]):
            continue
        w0, w1 = m.span(2)
        word = m.group(2)
        if word in _STOP or any(s <= w0 < e for s, e in spans):
            continue
        if word not in unmatched:
            unmatched.append(word)
    categories = list(dict.fromkeys(slug for slug, _, _ in find_categories(text)))
    return {"items": items, "cash": parse_cash(text), "deadline_days": parse_deadline(text), "unmatched": unmatched,
            "categories": categories}


# ------------------------------------------------------------------ Gemini structured parse

PARSE_SCHEMA = {
    "type": "object",
    "properties": {
        "in_scope": {"type": "boolean"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "product": {"type": "string", "description": "Product as the buyer wrote it, short (e.g. guruch, kungaboqar yog'i, beef)"},
                    "quantity": {"type": ["number", "null"]},
                    "unit": {"type": ["string", "null"], "description": "kg, l, piece, sack or tonna as written"},
                },
                "required": ["product", "quantity", "unit"],
                "additionalProperties": False,
            },
        },
        "categories": {
            "type": "array",
            "description": "Whole product groups the buyer asks about (e.g. 'sabzavotlar' -> vegetables)",
            "items": {"type": "string", "enum": list(CATEGORY_WORDS)},
        },
        "cash_som": {"type": ["number", "null"]},
        "deadline_days": {"type": ["number", "null"]},
    },
    "required": ["in_scope", "items", "categories", "cash_som", "deadline_days"],
    "additionalProperties": False,
}

PARSE_SYSTEM = (
    "You read wholesale purchase orders from small businesses in Uzbekistan, written in Uzbek (Latin or Cyrillic), "
    "Russian or English. Set in_scope to true only if the message is about buying, pricing or stocking goods, or about "
    "cash or loans for such a purchase (price questions like 'where is rice cheapest?' are in scope). Otherwise set "
    "in_scope false, items [], cash_som and deadline_days null, and never answer the off-topic question. "
    "List every product the buyer wants, as the short product name they used (keep the language). If the buyer says just "
    "\"yog'\" / \"масло\" / \"oil\" without a type, write \"kungaboqar yog'i\". quantity is the number they gave (null if none) "
    "and unit the unit word (kg, l, piece, sack, tonna). "
    "If the buyer asks about a whole group of goods instead of a specific product - e.g. \"sabzavotlar\" / \"овощи\" / "
    "\"vegetables\", \"mevalar\" / \"фрукты\", \"ziravorlar\", \"qurilish materiallari\" - put the group's slug in categories "
    "(vegetables, fruits, dried-fruits-nuts, grains, meat-dairy, oils-grocery, beverages, spices, construction, textiles, "
    "electronics, household) and do NOT list the group word as a product. A group word is never a product: "
    "\"sabzavotlar\" means all vegetables, not carrots (sabzi). "
    "cash_som is the money the buyer says they have (\"4 mln\" = 4000000), else null; spoken messages may contain "
    "hesitations and self-corrections (\"10 ming-- 10 million\") - always use the amount the buyer settles on (the last one). "
    "deadline_days: days until needed (bugun = 0, ertaga = 1, bir hafta = 7, bir oy = 30), else null. JSON only."
)


def gemini_parse(db: Session, text: str) -> dict | None:
    from app.ai import gemini

    data = gemini.structured(PARSE_SYSTEM, text[:600], PARSE_SCHEMA, timeout=4.5, budget=5.0)
    if data.get("in_scope") is False:
        return {"items": [], "cash": None, "deadline_days": None, "unmatched": [], "off_topic": True}
    items, unmatched = [], []
    categories = [c for c in (data.get("categories") or []) if c in CATEGORY_WORDS]
    for it in data.get("items") or []:
        if not isinstance(it, dict):
            continue
        name = str(it.get("product") or "").strip()[:80]
        if not name:
            continue
        cats = find_categories(name)
        if cats:  # the model listed a group word as a product: treat it as a category, never fuzzy-match it
            categories += [c for c, _, _ in cats if c not in categories]
            continue
        hits = match_products(db, name)
        p = db.get(Product, hits[0]["product_id"]) if hits else resolve_product(db, name)
        if not p:
            unmatched.append(name)
            continue
        if any(x["product_id"] == p.id for x in items):
            continue
        q = it.get("quantity")
        qty = _to_qty(str(q), it.get("unit"), p.unit) if isinstance(q, (int, float)) and q > 0 else None
        items.append({"product_id": p.id, "quantity": qty})
    cash = data.get("cash_som")
    dl = data.get("deadline_days")
    return {
        "items": items,
        "cash": float(cash) if isinstance(cash, (int, float)) and cash > 0 else None,
        "deadline_days": int(dl) if isinstance(dl, (int, float)) and 0 <= dl <= 365 else None,
        "unmatched": unmatched,
        "categories": list(dict.fromkeys(categories)),
    }


# ------------------------------------------------------------------ agent entry point

NOTES = {
    "no_product": {
        "uz": "Katalogdan mahsulot topilmadi. Masalan: \"200 kg guruch va 100 litr yog' kerak, 4 mln so'm bor\".",
        "ru": "Товар из каталога не распознан. Например: «Нужно 200 кг риса и 100 л подсолнечного масла, есть 4 млн сум».",
        "en": "No catalogue product recognised. Try: \"I need 200 kg of rice and 100 l of sunflower oil, I have 4 mln so'm\".",
    },
    "off_topic": {
        "uz": "Men faqat xarid, narx va pul masalalarida yordam beraman. Qaysi mahsulot va qancha kerakligini yozing.",
        "ru": "Я помогаю только с закупками, ценами и деньгами на закупку. Напишите, какой товар и сколько нужно.",
        "en": "I only help with purchases, prices and money for them. Tell me which products and how much you need.",
    },
    "category_cheap": {
        "uz": "{cats}: eng arzon {n} ta mahsulot (har turdan bittadan), har biri odatiy minimal buyurtma miqdorida narxlandi.",
        "ru": "{cats}: {n} самых дешёвых товаров (по одному каждого вида), каждый посчитан по типичному минимальному заказу.",
        "en": "{cats}: the {n} cheapest products (one of each kind), each priced at its typical minimum order.",
    },
    "category": {
        "uz": "{cats}: eng mos {n} ta mahsulot tanlandi, har biri odatiy minimal buyurtma miqdorida narxlandi.",
        "ru": "{cats}: выбрано {n} подходящих товаров, каждый посчитан по типичному минимальному заказу.",
        "en": "{cats}: picked {n} matching products, each priced at its typical minimum order.",
    },
    "default_qty": {
        "uz": "{name} miqdori aytilmadi: odatiy minimal buyurtma {qty} {unit} olindi.",
        "ru": "Количество для «{name}» не указано: взят типичный минимальный заказ {qty} {unit}.",
        "en": "No quantity for {name}: using the typical minimum order of {qty} {unit}.",
    },
}


def _note(key: str, lang: str, **kw) -> str:
    s = NOTES[key].get(lang, NOTES[key]["uz"]).format(**kw)
    return uz_typo(s) if lang == "uz" else s


CATEGORY_LIMIT = 8


def expand_category(db: Session, slug: str, region_ids: list[UUID], cheapest: bool, skip: set[UUID]) -> list[UUID]:
    """Representative products for a category request: one per product type (variants like
    "Kartoshka (Sante)" / "Kartoshka (Gala)" collapse to their cheapest variant), ranked by lowest unit
    price when the buyer asked for the cheapest, otherwise by how many offers exist."""
    from app.models import ProductCategory

    q = (select(Product.id, Product.name_uz, Product.unit, func.min(Offer.unit_price), func.count(Offer.id))
         .join(Offer, Offer.product_id == Product.id).join(ProductCategory, ProductCategory.id == Product.category_id)
         .where(ProductCategory.slug == slug, Offer.status == OfferStatus.active)
         .group_by(Product.id, Product.name_uz, Product.unit))
    if region_ids:
        q = q.where(Offer.region_id.in_(region_ids))
    rows_all = db.execute(q).all()
    # Prices are only comparable within one unit (corn per piece vs onions per kg): rank the category's main unit.
    unit_counts: dict[str, int] = {}
    for r in rows_all:
        unit_counts[r[2]] = unit_counts.get(r[2], 0) + 1
    main_unit = max(unit_counts, key=unit_counts.get) if unit_counts else None
    best: dict[str, tuple] = {}
    for pid, name, unit, min_price, n in rows_all:
        if pid in skip or unit != main_unit:
            continue
        base = re.sub(r"\s*\(.*?\)\s*", " ", name).strip().lower()
        cur = best.get(base)
        if cur is None or min_price < cur[1]:
            best[base] = (pid, min_price, (cur[2] if cur else 0) + n)
        else:
            best[base] = (cur[0], cur[1], cur[2] + n)
    rows = sorted(best.values(), key=(lambda r: r[1]) if cheapest else (lambda r: -r[2]))
    return [r[0] for r in rows[:CATEGORY_LIMIT]]


def default_quantity(db: Session, product_id: UUID) -> float:
    moqs = [m for m in db.scalars(select(Offer.min_order_qty).where(Offer.product_id == product_id, Offer.status == OfferStatus.active)).all() if m]
    return float(Decimal(str(median(moqs)))) if moqs else 1.0


def run(db: Session, message: str, regions: list[Region], language: str, use_gemini: bool) -> tuple[dict, str]:
    """Returns (planner output, engine). engine = "gemini" when Gemini's parse was used."""
    message = (message or "").strip()
    engine = "deterministic"
    parsed = keyword_parse(db, message) if message else {"items": [], "cash": None, "deadline_days": None, "unmatched": []}
    if use_gemini and message:
        try:
            g = gemini_parse(db, message)
            if g and g.get("off_topic"):
                if not parsed["items"]:   # off-topic, unless the sentence names catalogue products (a price question)
                    parsed = g
                    engine = "gemini"
            elif g and (g["items"] or g["categories"]):
                g["cash"] = g["cash"] if g["cash"] is not None else parsed["cash"]
                g["deadline_days"] = g["deadline_days"] if g["deadline_days"] is not None else parsed["deadline_days"]
                g["categories"] = list(dict.fromkeys(g["categories"] + parsed.get("categories", [])))
                parsed, engine = g, "gemini"
        except Exception as e:  # noqa: BLE001 - any Gemini problem: keep the keyword parse
            log.warning("Gemini parse failed, using the keyword parser: %s", type(e).__name__)

    # Category requests ("eng arzon sabzavotlar"): add the category's representative products,
    # unless the buyer already named products from that category.
    categories = parsed.get("categories") or []
    expanded: dict[UUID, str] = {}
    if categories:
        named = {i["product_id"] for i in parsed["items"]}
        named_cats = set(db.scalars(select(Product.category_id).where(Product.id.in_(named))).all()) if named else set()
        from app.models import ProductCategory
        cat_rows = {c.slug: c for c in db.scalars(select(ProductCategory).where(ProductCategory.slug.in_(categories))).all()}
        cheapest = bool(_CHEAP_RX.search(norm(message)))
        for slug in categories:
            c = cat_rows.get(slug)
            if not c or c.id in named_cats:
                continue
            for pid in expand_category(db, slug, [r.id for r in regions], cheapest, named | set(expanded)):
                expanded[pid] = slug
                parsed["items"].append({"product_id": pid, "quantity": None})

    products = {p.id: p for p in db.scalars(select(Product).options(joinedload(Product.category))
                                            .where(Product.id.in_([i["product_id"] for i in parsed["items"]]))).all()} if parsed["items"] else {}
    items, notes = [], []
    if expanded:
        cat_names = [getattr(cat_rows[s], f"name_{language}", cat_rows[s].name_uz) for s in dict.fromkeys(expanded.values())]
        notes.append(_note("category_cheap" if cheapest else "category", language, cats=", ".join(cat_names), n=len(expanded)))
    for it in parsed["items"]:
        p = products.get(it["product_id"])
        if not p:
            continue
        qty = it["quantity"]
        if not qty:
            qty = default_quantity(db, p.id)
            if p.id not in expanded:  # category items are explained once by the "category" note
                notes.append(_note("default_qty", language, name=getattr(p, f"name_{language}", p.name_uz), qty=num(qty), unit=unit_name(p.unit, language)))
        items.append({"product_id": str(p.id), "slug": p.slug, "name_uz": p.name_uz, "name_ru": p.name_ru, "name_en": p.name_en,
                      "emoji": p.emoji or "📦", "unit": p.unit, "category_slug": p.category.slug, "quantity": round(float(qty), 3)})
    if not items:
        notes.insert(0, _note("off_topic" if parsed.get("off_topic") else "no_product", language))
    from app.models import ProductCategory
    cat_out = [{"slug": c.slug, "name_uz": c.name_uz, "name_ru": c.name_ru, "name_en": c.name_en}
               for c in db.scalars(select(ProductCategory).where(ProductCategory.slug.in_(categories))).all()] if categories else []
    return {
        "mode": "price_list" if expanded and len(expanded) == len(items) else "order",
        "categories": cat_out,
        "items": items,
        "cash": parsed["cash"],
        "deadline_days": parsed["deadline_days"],
        "regions": [{"id": str(r.id), "name_uz": r.name_uz, "name_ru": r.name_ru, "name_en": r.name_en} for r in regions],
        "unmatched": parsed.get("unmatched") or [],
        "note": " ".join(notes) or None,
    }, engine

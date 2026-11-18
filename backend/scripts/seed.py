"""Seed a national-scale wholesale marketplace. Every generated offer is flagged is_demo=True / source=demo internally.

Usage (from backend/):  python -m scripts.seed            # only if the DB is empty
                        python -m scripts.seed --reset    # drop everything and reseed
Prices are plausible but fictional; they are not real market prices. The catalogue lives in scripts/catalogue.py.
"""
from __future__ import annotations

import random
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import insert, select

from app.core.security import hash_password
from app.database.session import Base, SessionLocal, engine
from app.models import (
    AlertCondition, AuditLog, Business, DataSource, Favorite, Market, MarketType, Notification, Offer, OfferPriceHistory,
    OfferStatus, PriceAlert, Product, ProductCategory, ProductView, PurchaseRequest, PurchaseRequestItem, Quality, Region,
    Report, RequestStatus, Role, SearchLog, SellerVerification, User, VerificationStatus,
)
from scripts.catalogue import CATEGORIES, PRODUCTS as CATALOGUE

rng = random.Random(19)
NOW = datetime.now(timezone.utc).replace(second=0, microsecond=0)
DEMO_PASSWORD = "Demo12345"
ADMIN_PASSWORD = "Admin12345"
HISTORY_DAYS = 45

REGIONS = [
    ("toshkent", "Toshkent", "Ташкент", "Tashkent", 41.2995, 69.2401, 1.08),
    ("samarqand", "Samarqand", "Самарканд", "Samarkand", 39.6542, 66.9597, 0.97),
    ("fargona", "Farg'ona", "Фергана", "Fergana", 40.3894, 71.7864, 0.93),
    ("andijon", "Andijon", "Андижан", "Andijan", 40.7821, 72.3442, 0.92),
    ("buxoro", "Buxoro", "Бухара", "Bukhara", 39.7681, 64.4556, 1.00),
    ("namangan", "Namangan", "Наманган", "Namangan", 40.9983, 71.6726, 0.95),
    ("qashqadaryo", "Qashqadaryo", "Кашкадарья", "Kashkadarya", 38.8610, 65.7847, 0.98),
]

# Approximate coordinates (flagged approximate_location=True).
MARKETS = [
    ("Chorsu bozori", "toshkent", MarketType.bazaar, 41.3264, 69.2353, "Eski shahar, Chorsu"),
    ("Oloy bozori", "toshkent", MarketType.bazaar, 41.3175, 69.2836, "Amir Temur ko'chasi"),
    ("Qo'yliq dehqon bozori", "toshkent", MarketType.wholesale, 41.2425, 69.3343, "Bektemir tumani"),
    ("Toshkent ulgurji savdo markazi", "toshkent", MarketType.wholesale, 41.2340, 69.2010, "Chilonzor tumani"),
    ("Sergeli qurilish bozori", "toshkent", MarketType.warehouse, 41.2210, 69.2190, "Sergeli tumani"),
    ("Siyob bozori", "samarqand", MarketType.bazaar, 39.6610, 66.9800, "Registon yaqinida"),
    ("Farg'ona dehqon bozori", "fargona", MarketType.bazaar, 40.3790, 71.7880, "Markaz"),
    ("Andijon Jahon bozori", "andijon", MarketType.wholesale, 40.7800, 72.3550, "Andijon shahri"),
    ("Buxoro markaziy bozori", "buxoro", MarketType.bazaar, 39.7700, 64.4300, "Buxoro shahri"),
    ("Namangan Chorsu bozori", "namangan", MarketType.bazaar, 41.0000, 71.6700, "Namangan shahri"),
    ("Qarshi ulgurji ombori", "qashqadaryo", MarketType.warehouse, 38.8600, 65.7900, "Qarshi shahri"),
]
REGION_MARKETS = {"toshkent": [0, 1, 2, 3, 4], "samarqand": [5], "fargona": [6], "andijon": [7], "buxoro": [8], "namangan": [9], "qashqadaryo": [10]}

# Long-standing suppliers (the first one owns seller@demo.bozor.uz, the second seller1@demo.bozor.uz, ...).
SELLERS = [
    ("Chorsu Agro Savdo", "vegetables", "toshkent", 0), ("Qo'yliq Ulgurji Sabzavot", "vegetables", "toshkent", 2),
    ("Oloy Meva Markazi", "fruits", "toshkent", 1), ("Farg'ona Meva Eksport", "fruits", "fargona", 6),
    ("Zarafshon Don", "grains", "samarqand", 5), ("Andijon Don Mahsulotlari", "grains", "andijon", 7),
    ("Buxoro Go'sht Kombinati", "meat-dairy", "buxoro", 8), ("Toshkent Sut Fermasi", "meat-dairy", "toshkent", 3),
    ("Sergeli Qurilish Materiallari", "construction", "toshkent", 4), ("Qarshi Sement Savdo", "construction", "qashqadaryo", 10),
    ("Namangan To'qimachilik", "textiles", "namangan", 9), ("Marg'ilon Atlas Uyi", "textiles", "fargona", 6),
    ("Elektro Savdo Toshkent", "electronics", "toshkent", 3), ("Quyosh Energiya Yechimlari", "electronics", "samarqand", 5),
    ("Samarqand Dehqon Kooperativi", "vegetables", "samarqand", 5), ("Andijon Bog'lari", "fruits", "andijon", 7),
    ("Namangan Sabzavot Fermasi", "vegetables", "namangan", 9), ("Buxoro Don Savdo", "grains", "buxoro", 8),
    ("Farg'ona Parranda", "meat-dairy", "fargona", 6), ("Qashqadaryo Chorvachilik", "meat-dairy", "qashqadaryo", 10),
    ("Toshkent Ulgurji Oziq-ovqat", "oils-grocery", "toshkent", 3), ("Yog' Zavodi Samarqand", "oils-grocery", "samarqand", 5),
    ("Chilonzor Choy Savdo", "beverages", "toshkent", 3), ("Andijon Armatura", "construction", "andijon", 7),
    ("Fergana Textile Group", "textiles", "fargona", 6), ("Oloy Elektro", "electronics", "toshkent", 1),
    ("Bektemir Agro", "vegetables", "toshkent", 2), ("Siyob Meva Savdo", "fruits", "samarqand", 5),
    ("Namangan Un Kombinati", "grains", "namangan", 9), ("Buxoro Qurilish Ombori", "construction", "buxoro", 8),
    ("Qarshi Sabzavot Ulgurji", "vegetables", "qashqadaryo", 10), ("Toshkent Go'sht Savdo", "meat-dairy", "toshkent", 0),
]
SELLER_TARGET = {"vegetables": 16, "fruits": 14, "dried-fruits-nuts": 9, "grains": 12, "meat-dairy": 14, "oils-grocery": 13,
                 "beverages": 8, "spices": 7, "construction": 14, "textiles": 9, "electronics": 11, "household": 8, "other": 5}
TOPONYMS = {
    "toshkent": ["Chorsu", "Oloy", "Yunusobod", "Chilonzor", "Sergeli", "Yangiobod", "Bektemir", "Olmazor", "Mirobod", "Yakkasaroy", "Toshkent", "Qo'yliq", "Yangiyo'l"],
    "samarqand": ["Zarafshon", "Siyob", "Urgut", "Registon", "Kattaqo'rg'on", "Samarqand", "Bulung'ur"],
    "fargona": ["Marg'ilon", "Quva", "Qo'qon", "Rishton", "Farg'ona", "Oltiariq"],
    "andijon": ["Asaka", "Xonobod", "Shahrixon", "Andijon", "Paxtaobod"],
    "buxoro": ["Buxoro", "G'ijduvon", "Kogon", "Romitan", "Vobkent"],
    "namangan": ["Chust", "Pop", "Kosonsoy", "Namangan", "Uchqo'rg'on"],
    "qashqadaryo": ["Qarshi", "Shahrisabz", "Kitob", "G'uzor", "Koson"],
}
CAT_WORDS = {
    "vegetables": ["Agro", "Sabzavot", "Dehqon", "Agro Fermer", "Hosil", "Yashil Bozor"],
    "fruits": ["Meva", "Bog'lari", "Meva Eksport", "Fruit", "Bog'", "Agro Meva"],
    "dried-fruits-nuts": ["Quruq Meva", "Mayiz", "Yong'oq", "Dried Fruits", "Bodom"],
    "grains": ["Don", "Un", "Don Mahsulotlari", "Guruch", "Grain", "Un Kombinati"],
    "meat-dairy": ["Go'sht", "Sut", "Parranda", "Chorvachilik", "Sut Fermasi", "Meat"],
    "oils-grocery": ["Oziq-ovqat", "Yog'", "Bakaleya", "Food", "Oziq-ovqat Ulgurji"],
    "beverages": ["Ichimliklar", "Choy", "Suv", "Beverages", "Sharbat"],
    "spices": ["Ziravor", "Ziravorlar", "Spice", "Bozor Ziravor"],
    "construction": ["Qurilish", "Qurilish Materiallari", "Stroy", "Sement", "Metall", "Build"],
    "textiles": ["To'qimachilik", "Textile", "Mato", "Ip", "Tekstil"],
    "electronics": ["Elektro", "Elektronika", "Texno", "Energiya", "Electric", "Solar"],
    "household": ["Maishiy Kimyo", "Gigiyena", "Kimyo Savdo", "Home", "Tozalik"],
    "other": ["Qadoqlash", "Paket", "Upakovka", "Pack", "Karton"],
}
SUFFIXES = ["Savdo", "Ulgurji", "Group", "Trade", "Invest", "Servis", "Markazi", "Ombori", "Plus", "Distribution", "", "Baraka", "Lyuks"]
CAT_DESC = {
    "vegetables": "sabzavot va ko'katlar", "fruits": "meva va poliz mahsulotlari", "dried-fruits-nuts": "quruq meva va yong'oqlar",
    "grains": "don, un va yormalar", "meat-dairy": "go'sht va sut mahsulotlari", "oils-grocery": "yog' va bakaleya mahsulotlari",
    "beverages": "ichimliklar va choy", "spices": "ziravorlar", "construction": "qurilish materiallari", "textiles": "mato va tayyor kiyim",
    "electronics": "elektr jihozlari va maishiy texnika", "household": "maishiy kimyo va gigiyena vositalari", "other": "qadoqlash materiallari",
}
SECOND_CAT = {"vegetables": "fruits", "fruits": "vegetables", "dried-fruits-nuts": "spices", "grains": "oils-grocery",
              "meat-dairy": "oils-grocery", "oils-grocery": "beverages", "beverages": "oils-grocery", "spices": "dried-fruits-nuts",
              "construction": "household", "textiles": "household", "electronics": "construction", "household": "other",
              "other": "household"}

# Must exist with exactly these slugs (tests and analytics refer to them).
KEY = {"kartoshka", "piyoz", "sabzi", "pomidor", "bodring", "olma", "guruch", "un", "mol-goshti", "sement", "tovuq", "tuxum",
       "sut", "limon", "qoy-goshti", "shakar", "kungaboqar-yogi", "choy", "uzum", "armatura", "gisht"}
SCARCE = {"mosh": 2, "sariyog": 2, "atlas": 1, "quyosh-paneli": 2}
POPULAR = ["pomidor", "kartoshka", "piyoz", "guruch", "sement", "mol-goshti", "un", "tuxum", "sabzi", "olma", "tovuq", "shakar"]

FIRST = ["Akmal", "Dilshod", "Sardor", "Jasur", "Bekzod", "Rustam", "Otabek", "Sherzod", "Nodira", "Gulnora", "Madina", "Zarina",
         "Aziz", "Bobur", "Farhod", "Ulug'bek", "Shahnoza", "Kamola", "Javlon", "Sanjar", "Islom", "Dilfuza", "Murod", "Lola"]
LAST = ["Karimov", "Rahimov", "Tursunov", "Yusupov", "Aliyev", "Qodirov", "Nazarov", "Ergashev", "Saidova", "Abdullayeva",
        "Ismoilov", "Mirzayev", "Xolmatov", "Sobirov", "Hasanova", "Usmonov", "Jo'rayev", "Raxmatullayev"]

QUALITY_MULT = {Quality.premium: 1.15, Quality.first: 1.05, Quality.standard: 1.0, Quality.economy: 0.88}
QLABEL = {Quality.premium: "Premium", Quality.first: "1-nav", Quality.standard: "Standart", Quality.economy: "Ekonom"}
DESCRIPTIONS = [
    "{p}. {r} ({m}). Ulgurji savdo, sifat kafolatlangan.",
    "{p} — ulgurji narxda. Yetkazib berish shartlari kelishiladi.",
    "{p}, {q} sifat. Doimiy mijozlarga chegirma.",
    "Omborda mavjud: {p}. {m}, {r}.",
    "{p} katta hajmda. Hujjatlar va hisob-faktura bilan.",
    "{p}. Har kuni yangi partiya, {m}.",
]


def money(v: float) -> Decimal:
    step = 1 if v < 5000 else 50 if v < 50000 else 500 if v < 500000 else 5000
    return Decimal(int(round(v / step) * step)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def name() -> str:
    return f"{rng.choice(FIRST)} {rng.choice(LAST)}"


def phone() -> str:
    return f"+998 {rng.choice([90, 91, 93, 94, 97, 99, 88, 33])} {rng.randint(100, 999)} {rng.randint(10, 99)} {rng.randint(10, 99)}"


def qty_and_moq(unit: str, price: float) -> tuple[Decimal, Decimal]:
    if unit == "t":
        lo, hi, moqs = 20, 2000, [1, 5, 10, 20]
    elif unit == "sack":
        lo, hi, moqs = 100, 5000, [10, 20, 50]
    elif unit == "kg":
        lo, hi, moqs = (500, 40000, [50, 100, 200, 500]) if price < 20000 else (100, 5000, [10, 20, 50, 100]) if price < 100000 else (50, 2000, [5, 10, 20])
    elif unit == "l":
        lo, hi, moqs = 300, 15000, [20, 50, 100]
    elif unit == "m":
        lo, hi, moqs = 200, 20000, [50, 100, 200]
    else:  # piece
        lo, hi, moqs = ((1000, 200000, [100, 500, 1000]) if price < 5000 else (200, 20000, [10, 20, 50, 100]) if price < 100000
                        else (20, 2000, [2, 5, 10]) if price < 1000000 else (5, 300, [1, 2, 5]))
    q = int(rng.uniform(lo, hi) / 10) * 10 or lo
    return Decimal(q), Decimal(rng.choice(moqs))


def generate_sellers() -> list[tuple[str, str, str, int]]:
    out = list(SELLERS)
    names = {s[0] for s in out}
    have: dict[str, int] = {}
    for s in out:
        have[s[1]] = have.get(s[1], 0) + 1
    region_codes = [r[0] for r in REGIONS]
    region_w = [5, 2, 2, 2, 1.5, 1.5, 1.5]
    for cat_slug, target in SELLER_TARGET.items():
        while have.get(cat_slug, 0) < target:
            rc = rng.choices(region_codes, weights=region_w)[0]
            nm = " ".join(x for x in (rng.choice(TOPONYMS[rc]), rng.choice(CAT_WORDS[cat_slug]), rng.choice(SUFFIXES)) if x)
            if nm in names:
                continue
            names.add(nm)
            mkts = REGION_MARKETS[rc]
            if cat_slug in ("construction", "electronics") and rc == "toshkent":
                mi = rng.choice([3, 4, 4])
            else:
                mi = rng.choice(mkts)
            out.append((nm, cat_slug, rc, mi))
            have[cat_slug] = have.get(cat_slug, 0) + 1
    return out


def run(reset: bool = False) -> None:
    t0 = time.perf_counter()
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    if db.scalar(select(User).limit(1)):
        print("Database already seeded. Use --reset to reseed.")
        return
    pw_demo, pw_admin = hash_password(DEMO_PASSWORD), hash_password(ADMIN_PASSWORD)

    regions = {code: Region(code=code, name_uz=uz, name_ru=ru, name_en=en, lat=lat, lng=lng) for code, uz, ru, en, lat, lng, _ in REGIONS}
    db.add_all(regions.values())
    rmult = {r[0]: r[6] for r in REGIONS}
    markets = [Market(name=nm, region=regions[rc], type=mt, lat=lat, lng=lng, address=addr, approximate_location=True)
               for nm, rc, mt, lat, lng, addr in MARKETS]
    db.add_all(markets)
    cats = {slug: ProductCategory(slug=slug, name_uz=uz, name_ru=ru, name_en=en, icon=icon, sort_order=i)
            for i, (slug, uz, ru, en, icon) in enumerate(CATEGORIES)}
    db.add_all(cats.values())
    products: dict[str, Product] = {}
    meta: dict[str, object] = {}
    for c in CATALOGUE:
        products[c.slug] = Product(id=uuid.uuid4(), slug=c.slug, category=cats[c.category], name_uz=c.name_uz, name_ru=c.name_ru,
                                   name_en=c.name_en, unit=c.unit, aliases=c.aliases, emoji=c.emoji)
        meta[c.slug] = c
    db.add_all(products.values())
    db.flush()

    # --- users
    admin = User(email="admin@demo.bozor.uz", full_name="Platforma Administratori", phone="+998 71 200 00 00", password_hash=pw_admin,
                 role=Role.admin, region=regions["toshkent"], is_demo=True, created_at=NOW - timedelta(days=60))
    buyer = User(email="buyer@demo.bozor.uz", full_name="Dilnoza Rashidova", phone="+998 90 123 45 67", password_hash=pw_demo,
                 role=Role.buyer, region=regions["toshkent"], business_category="Restoran", is_demo=True, created_at=NOW - timedelta(days=40))
    db.add_all([admin, buyer])
    buyers = [buyer]
    for i in range(24):
        buyers.append(User(email=f"buyer{i + 1}@demo.bozor.uz", full_name=name(), phone=phone(), password_hash=pw_demo, role=Role.buyer,
                           region=rng.choice(list(regions.values())),
                           business_category=rng.choice(["Supermarket", "Restoran", "Do'kon", "Ishlab chiqarish", "Kafe", "Qurilish firmasi", "Mehmonxona"]),
                           is_demo=True, created_at=NOW - timedelta(days=rng.randint(1, 50))))
    db.add_all(buyers[1:])

    businesses: list[Business] = []
    for i, (bname, cat, rc, mi) in enumerate(generate_sellers()):
        email = "seller@demo.bozor.uz" if i == 0 else f"seller{i}@demo.bozor.uz"
        u = User(id=uuid.uuid4(), email=email, full_name="Akmal Karimov" if i == 0 else name(), phone=phone(), password_hash=pw_demo,
                 role=Role.seller, region=regions[rc], business_category=cat, is_demo=True, created_at=NOW - timedelta(days=rng.randint(30, 58)))
        roll = rng.random()
        vs = (VerificationStatus.verified if i == 0 or roll < 0.68 else VerificationStatus.pending if roll < 0.84
              else VerificationStatus.unverified if roll < 0.95 else VerificationStatus.rejected)
        biz = Business(id=uuid.uuid4(), owner=u, name=bname, category=cat, phone=u.phone, region=regions[rc], market=markets[mi],
                       description=f"{bname} — {CAT_DESC[cat]} bo'yicha ulgurji yetkazib beruvchi. {regions[rc].name_uz} va qo'shni viloyatlarga yetkazib beramiz.",
                       rating=Decimal(str(round(rng.uniform(3.6, 4.95), 2))), completed_deals=rng.randint(3, 140),
                       verification_status=vs, verified_at=NOW - timedelta(days=20) if vs == VerificationStatus.verified else None,
                       created_at=u.created_at)
        db.add_all([u, biz])
        businesses.append(biz)
        if vs != VerificationStatus.unverified:
            db.add(SellerVerification(business=biz, status=vs, document_note="STIR va guvohnoma nusxasi yuklandi",
                                      review_note="Hujjatlar tekshirildi" if vs == VerificationStatus.verified else "Hujjat o'qilmaydi" if vs == VerificationStatus.rejected else None,
                                      reviewed_by=admin.id if vs in (VerificationStatus.verified, VerificationStatus.rejected) else None,
                                      reviewed_at=NOW - timedelta(days=20) if vs in (VerificationStatus.verified, VerificationStatus.rejected) else None,
                                      created_at=NOW - timedelta(days=rng.randint(1, 25))))
    db.flush()
    by_cat: dict[str, list[Business]] = {}
    for b in businesses:
        by_cat.setdefault(b.category, []).append(b)

    # --- offers + append-only price history (bulk-inserted)
    offers: list[Offer] = []
    history: list[dict] = []
    start_t = NOW - timedelta(days=HISTORY_DAYS)

    def make_offer(biz: Business, slug: str, quality: Quality | None = None) -> Offer:
        c = meta[slug]
        p = products[slug]
        quality = quality or rng.choices(list(Quality), weights=[2, 4, 5, 2])[0]
        market = biz.market
        mm = 0.94 if market.type != MarketType.bazaar else 1.0
        final = c.price * rmult[biz.region.code] * mm * QUALITY_MULT[quality] * rng.uniform(0.92, 1.08)
        qty, moq = qty_and_moq(p.unit, c.price)
        updated = NOW - timedelta(hours=rng.choice([1, 3, 6, 10, 20, 30, 45, 70, 100, 150]))
        delivery = rng.random() < 0.7
        o = Offer(
            id=uuid.uuid4(), business=biz, product=p, market=market, region=biz.region,
            title=f"{p.name_uz} — {QLABEL[quality]}",
            description=rng.choice(DESCRIPTIONS).format(p=p.name_uz, r=biz.region.name_uz, m=market.name, q=QLABEL[quality].lower()),
            unit=p.unit, unit_price=money(final), available_qty=qty, min_order_qty=moq, quality=quality,
            delivery_available=delivery, delivery_price=money(rng.choice([80000, 120000, 150000, 200000, 250000, 350000])) if delivery else Decimal("0"),
            delivery_days=rng.choice([1, 1, 2, 2, 3, 4]) if delivery else 0, location_note=market.name,
            valid_until=NOW + timedelta(days=rng.randint(5, 30)), status=OfferStatus.active, source=DataSource.demo, is_demo=True,
            created_at=start_t, updated_at=updated,
        )
        db.add(o)
        # Random walk ending at the current price, following the product's 30-day trend.
        steps = [1, 2, 2, 3] if slug in KEY else [2, 3, 3, 4]
        t = start_t + timedelta(hours=rng.randint(0, 30))
        start = final / (1 + c.trend * 1.5)
        while t < updated - timedelta(hours=12):
            frac = (t - start_t) / timedelta(days=HISTORY_DAYS)
            v = (start + (final - start) * frac) * rng.uniform(0.97, 1.03)
            history.append(dict(id=uuid.uuid4(), offer_id=o.id, product_id=p.id, region_id=biz.region.id, market_id=market.id,
                                price=money(v), available_qty=qty, recorded_at=t, source=DataSource.demo))
            t += timedelta(days=rng.choice(steps), hours=rng.randint(0, 8))
        history.append(dict(id=uuid.uuid4(), offer_id=o.id, product_id=p.id, region_id=biz.region.id, market_id=market.id,
                            price=o.unit_price, available_qty=qty, recorded_at=updated, source=DataSource.demo))
        offers.append(o)
        return o

    for c in CATALOGUE:
        slug = c.slug
        if slug in SCARCE:
            n = SCARCE[slug]
        elif slug in KEY:
            n = rng.randint(6, 9)
        else:
            n = rng.choices([2, 3, 4, 5, 6], weights=[1, 3, 4, 3, 2])[0]
        primary = list(by_cat.get(c.category, []))
        secondary = [b for b in businesses if SECOND_CAT.get(b.category) == c.category]
        rng.shuffle(primary)
        rng.shuffle(secondary)
        pool = primary + secondary[:2]
        chosen: list[Business] = []
        # the main demo seller always carries the core vegetables
        if c.category == "vegetables" and "-" not in slug and businesses[0] in pool and rng.random() < 0.6:
            chosen.append(businesses[0])
        for b in pool:
            if len(chosen) >= n:
                break
            if b not in chosen:
                chosen.append(b)
        for b in chosen:
            make_offer(b, slug)
    if sum(1 for o in offers if o.business is businesses[1]) == 0:
        make_offer(businesses[1], "piyoz")

    # a few paused offers (never on scarce products, never dropping a product below 2 active offers)
    count: dict[str, int] = {}
    for o in offers:
        count[o.product.slug] = count.get(o.product.slug, 0) + 1
    paused = 0
    for o in rng.sample(offers, len(offers)):
        if paused >= 40:
            break
        if count[o.product.slug] >= 4 and o.business is not businesses[0]:
            o.status = OfferStatus.paused
            count[o.product.slug] -= 1
            paused += 1

    # one deliberately suspicious price for the moderation queue
    sus_biz = businesses[-1]
    sus = Offer(id=uuid.uuid4(), business=sus_biz, product=products["kartoshka"], market=sus_biz.market, region=sus_biz.region,
                title="Kartoshka — Premium, saralangan", description="Saralangan premium kartoshka, yirik kalibr. Narx kelishiladi.",
                unit="kg", unit_price=Decimal("16500.00"), available_qty=Decimal("900"), min_order_qty=Decimal("50"), quality=Quality.premium,
                status=OfferStatus.active, source=DataSource.demo, is_demo=True, created_at=NOW - timedelta(days=2), updated_at=NOW - timedelta(hours=5))
    db.add(sus)
    offers.append(sus)
    history.append(dict(id=uuid.uuid4(), offer_id=sus.id, product_id=sus.product.id, region_id=sus_biz.region.id, market_id=sus_biz.market.id,
                        price=sus.unit_price, available_qty=sus.available_qty, recorded_at=sus.updated_at, source=DataSource.demo))
    db.flush()
    for i in range(0, len(history), 5000):
        db.execute(insert(OfferPriceHistory), history[i:i + 5000])
    db.add(Report(offer_id=sus.id, reporter_id=buyer.id, reason="price_suspicious", details="Narx bozor o'rtachasidan 3 baravar yuqori.", created_at=NOW - timedelta(hours=3)))
    db.add(Report(offer_id=offers[7].id, reporter_id=buyers[2].id, reason="wrong_info", details="Telefon raqami javob bermaydi.", created_at=NOW - timedelta(days=1)))

    # --- views and search logs (interest signals)
    active = [o for o in offers if o.status == OfferStatus.active]
    weights = [6 if o.product.slug in POPULAR else 2 if "-" not in o.product.slug else 1 for o in active]
    views = []
    for o in rng.choices(active, weights=weights, k=7000):
        o.views_count += 1
        views.append(dict(id=uuid.uuid4(), offer_id=o.id, product_id=o.product.id, user_id=rng.choice(buyers).id if rng.random() < 0.6 else None,
                          created_at=NOW - timedelta(days=rng.uniform(0, 30))))
    db.execute(insert(ProductView), views)
    hot = ["pomidor", "kartoshka", "piyoz", "guruch", "mosh", "sariyog", "atlas", "quyosh-paneli", "sement", "un", "tuxum"]
    searches = []
    for _ in range(520):
        slug = rng.choices(hot, weights=[6, 6, 5, 4, 4, 3, 2, 3, 3, 3, 2])[0]
        searches.append((slug, rng.uniform(0, 13)))
    other_slugs = [c.slug for c in CATALOGUE]
    for _ in range(480):
        searches.append((rng.choice(other_slugs), rng.uniform(0, 30)))
    db.execute(insert(SearchLog), [dict(id=uuid.uuid4(), user_id=rng.choice(buyers).id, query=products[s].name_uz.lower(), product_id=products[s].id,
                                        channel=rng.choice(["explorer", "explorer", "ai"]), created_at=NOW - timedelta(days=d)) for s, d in searches])

    # --- purchase requests
    statuses = [RequestStatus.pending] * 10 + [RequestStatus.accepted] * 6 + [RequestStatus.completed] * 8 + [RequestStatus.rejected] * 3 + \
               [RequestStatus.countered] * 4 + [RequestStatus.cancelled] * 3
    seller0_offers = [o for o in active if o.business_id == businesses[0].id]
    for i, st in enumerate(statuses):
        o = seller0_offers[i % len(seller0_offers)] if i < 9 else rng.choice(active)
        by = buyer if i % 3 == 0 else rng.choice(buyers)
        qty = o.min_order_qty * rng.choice([1, 2, 3, 5])
        created = NOW - timedelta(days=rng.uniform(0, 25))
        db.add(PurchaseRequest(buyer=by, business=o.business, offer=o, status=st, delivery_region_id=by.region_id,
                               requirements=rng.choice([None, "Ertalab 9:00 gacha yetkazish kerak", "Sifat sertifikati bilan", "Qadoqlangan holda"]),
                               counter_price=money(float(o.unit_price) * 0.97) if st == RequestStatus.countered else None,
                               seller_message="Ulgurji hajm uchun 3% chegirma taklif qilamiz" if st == RequestStatus.countered else None,
                               created_at=created, updated_at=created + timedelta(hours=rng.randint(1, 30)),
                               items=[PurchaseRequestItem(product_id=o.product_id, quantity=qty, preferred_price=money(float(o.unit_price) * 0.95) if rng.random() < 0.5 else None)]))

    # --- favorites, alerts, notifications for the main buyer
    for o in rng.sample(active, 8):
        db.add(Favorite(user_id=buyer.id, offer_id=o.id, created_at=NOW - timedelta(days=rng.randint(0, 10))))

    def avg(slug, region=None):
        ps = [o.unit_price for o in active if o.product.slug == slug and (region is None or o.region_id == region.id)]
        return (sum(ps) / len(ps)).quantize(Decimal("0.01")) if ps else None

    db.add_all([
        PriceAlert(user_id=buyer.id, product=products["kartoshka"], condition=AlertCondition.below, threshold=Decimal("4500"), baseline_price=avg("kartoshka")),
        PriceAlert(user_id=buyer.id, product=products["piyoz"], condition=AlertCondition.change_pct, threshold=Decimal("10"), baseline_price=avg("piyoz")),
        PriceAlert(user_id=buyer.id, product=products["pomidor"], region=regions["toshkent"], condition=AlertCondition.verified_listing, baseline_price=avg("pomidor", regions["toshkent"])),
    ])
    notes = [
        ("price_alert", "Kartoshka: 4 400 so'm", "Narx 4 500 so'mdan pastga tushdi — Farg'ona Meva Eksport.", "/app/market", 2),
        ("price_alert", "Pomidor: +18% (30 kun)", "Pomidor narxi oy davomida sezilarli oshdi.", "/app/analytics", 20),
        ("request", "So'rov qabul qilindi", "Chorsu Agro Savdo so'rovingizni qabul qildi.", "/app/requests", 30),
    ]
    for kind, title, body, link, hours in notes:
        db.add(Notification(user_id=buyer.id, kind=kind, title=title, body=body, link=link, created_at=NOW - timedelta(hours=hours)))
    seller_user = businesses[0].owner
    db.add(Notification(user_id=seller_user.id, kind="request", title="Yangi so'rov: Pomidor", body="Dilnoza Rashidova 500 kg so'radi.", link="/app/seller/requests", created_at=NOW - timedelta(hours=4)))
    db.add(Notification(user_id=seller_user.id, kind="verification", title="Biznes tasdiqlandi", body="Profilingiz tasdiqlangan ta'minotchi belgisini oldi.", link="/app/seller/profile", created_at=NOW - timedelta(days=20)))
    db.add(AuditLog(actor_id=admin.id, action="seller.approve", entity_type="business", entity_id=str(businesses[0].id), details={"business": businesses[0].name}, created_at=NOW - timedelta(days=20)))
    db.commit()
    print(f"Seeded: {len(regions)} regions, {len(markets)} markets, {len(cats)} categories, {len(products)} products, "
          f"{len(businesses)} sellers, {len(offers)} offers ({len(active)} active), {len(history)} price-history rows, "
          f"{len(buyers)} buyers in {time.perf_counter() - t0:.1f}s.")
    print(f"Logins: buyer@demo.bozor.uz / seller@demo.bozor.uz  (password {DEMO_PASSWORD}),  admin@demo.bozor.uz ({ADMIN_PASSWORD})")


if __name__ == "__main__":
    run(reset="--reset" in sys.argv)

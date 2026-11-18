"""Turn scraped listings into offers: match each one to a catalogue product, convert its price to the product's
unit, keep an append-only price history and expire listings that disappeared from the site.

A listing is kept only when
  * a catalogue product is named in its title (the earliest product word wins: "Sharbat Bliss Olcha" is juice),
  * its pack size converts to the product's unit (g -> kg, ml -> l, "10 dona" -> piece), and
  * the resulting unit price is plausible for that product (0.35x - 3.5x the catalogue reference price),
which filters out flavours ("chips with onion" is not onion) and ads priced per box or per tonne.
"""
from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.agents.planner import match_products, norm
from app.core.security import hash_password
from app.models import (
    Business, DataSource, Offer, OfferPriceHistory, OfferStatus, Product, Quality, Region, Role, User, VerificationStatus,
)
from app.scraping.base import Listing
from app.scraping.units import parse_size, sold_by_weight, unit_price

# Regions OLX ads come from that the first version of the platform didn't have.
EXTRA_REGIONS = [
    ("toshkent-viloyati", "Toshkent viloyati", "Ташкентская область", "Tashkent region", 41.0167, 69.6000),
    ("navoiy", "Navoiy", "Навои", "Navoi", 40.1039, 65.3739),
    ("xorazm", "Xorazm", "Хорезм", "Khorezm", 41.5500, 60.6333),
    ("surxondaryo", "Surxondaryo", "Сурхандарья", "Surkhandarya", 37.2242, 67.2783),
    ("qoraqalpogiston", "Qoraqalpog'iston", "Каракалпакстан", "Karakalpakstan", 42.4600, 59.6100),
    ("jizzax", "Jizzax", "Джизак", "Jizzakh", 40.1158, 67.8422),
    ("sirdaryo", "Sirdaryo", "Сырдарья", "Syrdarya", 40.4897, 68.7842),
]

SOURCES = {
    "korzinka.uz": {"name": "Korzinka", "category": "Supermarket", "rating": Decimal("4.60"), "verified": True,
                    "description": "Korzinka supermarketlar tarmog'ining korzinka.uz saytidagi ochiq narxlari."},
    "olx.uz": {"name": "OLX.uz e'lonlari", "category": "E'lonlar", "rating": Decimal("4.00"), "verified": False,
               "description": "OLX.uz saytidagi ochiq e'lonlar narxlari (sotuvchi bilan OLX orqali bog'laniladi)."},
}
RATIO_MIN, RATIO_MAX = 0.35, 3.5


@dataclass
class Match:
    product: Product
    unit_price: Decimal


@dataclass
class ImportStats:
    site: str
    seen: int = 0
    matched: int = 0
    created: int = 0
    price_changed: int = 0
    unchanged: int = 0
    expired: int = 0

    def __str__(self):
        return (f"{self.site}: {self.seen} listings, {self.matched} matched to the catalogue "
                f"({self.created} new, {self.price_changed} price changes, {self.unchanged} unchanged), {self.expired} expired")


def reference_prices() -> dict[str, float]:
    try:
        from scripts.catalogue import PRODUCTS
    except Exception:  # running without the scripts package: no plausibility check
        return {}
    return {p.slug: p.price for p in PRODUCTS}


def ensure_regions(db: Session) -> dict[str, Region]:
    have = {r.code: r for r in db.scalars(select(Region)).all()}
    for code, uz, ru, en, lat, lng in EXTRA_REGIONS:
        if code not in have:
            have[code] = Region(code=code, name_uz=uz, name_ru=ru, name_en=en, lat=lat, lng=lng)
            db.add(have[code])
    db.flush()
    return have


def source_business(db: Session, site: str, region: Region) -> Business:
    """One business per source site and region ("OLX.uz e'lonlari (Samarqand)"), owned by an inactive system user."""
    meta = SOURCES[site]
    single = site == "korzinka.uz"
    name = meta["name"] if single else f"{meta['name']} ({region.name_uz})"
    email = f"{site.split('.')[0]}{'' if single else '-' + region.code}@sources.bozor.uz"
    user = db.scalar(select(User).where(User.email == email))
    if user and user.business:
        return user.business
    if not user:
        user = User(email=email, full_name=name, password_hash=hash_password(secrets.token_urlsafe(24)), role=Role.seller,
                    region_id=region.id, is_active=False, business_category=meta["category"])
        db.add(user)
        db.flush()
    biz = Business(owner_id=user.id, name=name, category=meta["category"], description=meta["description"],
                   region_id=region.id, rating=meta["rating"],
                   verification_status=VerificationStatus.verified if meta["verified"] else VerificationStatus.unverified,
                   verified_at=datetime.now(timezone.utc) if meta["verified"] else None)
    db.add(biz)
    db.flush()
    return biz


_FRESH = {"vegetables", "fruits", "dried-fruits-nuts"}
# words that turn fresh produce into something else: jam, pickles, juice, flavour ("olma ta'mli"), dried, canned
_PROCESSED = re.compile(
    r"marinad|konserv|tuzlangan|shinni|murabbo|\bjem\b|джем|варень|sharbat|сок\b|ta['`ʼ’]?mli|вкус|aroma|ароматом|"
    r"\bsuti\b|sirka|уксус|sirop|сироп|молоко|qoqi|quritilgan|сушен|сушён|вялен|chips|чипс|pyure|пюре|sous|соус|ichimlik|напиток|limonad|лимонад", re.I)
# ready meals are not raw meat ("Tovuqli o'rama", "Куриное филе хрустящее", "Chuchvara")
_READY = re.compile(r"o['ʻ’`]?rama|ролл|\broll|chuchvara|чучвар|пельмен|pelmen|kotlet|котлет|nagget|наггет|хрустящ|панир|"
                    r"sosiska|сосиск|kolbasa|колбас|\bugra|lapsha|kurka.*pauch|felix|whiskas|корм|ozuqa|yem\b", re.I)
_LEAD = re.compile(r"^[^\w]+")
_QUOTED = re.compile(r"[\"«“„][^\"»”“]*[\"»”“]")
_DERIVED = ("li", "dan", "ная", "ный", "ное", "ные", "ая", "ый", "ое", "ой", "ого")
_COSMETIC = re.compile(r"для лица|для волос|yuz uchun|soch uchun|loreal|l'oreal|garnier|nivea|gial", re.I)
# what each site can plausibly sell (a supermarket has no tiles or solar panels)
SITE_CATEGORIES = {"korzinka.uz": {"vegetables", "fruits", "dried-fruits-nuts", "grains", "meat-dairy", "oils-grocery",
                                   "beverages", "spices", "household", "other"}}


class Matcher:
    def __init__(self, db: Session):
        self.db = db
        self.products = {p.id: p for p in db.scalars(select(Product).options(joinedload(Product.category))).all()}
        self.ref = reference_prices()

    _REJECTED = object()

    def first_product(self, text: str, max_word: int = 1):
        """The product named at the head of the title (its first `max_word + 1` words); None when no product word
        is in the text at all, _REJECTED when there is one but it doesn't name what is sold:
        "Sharbat Bliss olma" is juice, not apples; "Plit. Ritter Sport" (an abbreviation) is not a tile."""
        text = _LEAD.sub("", _QUOTED.sub(" ", text))  # 'Karamel "Лимонная"': a quoted name is a brand/flavour
        found = match_products(self.db, text)
        if not found:
            return None
        f = found[0]
        t = norm(text)
        if t[: f["start"]].count(" ") > max_word:
            return self._REJECTED
        if t[f["end"]: f["end"] + 1] == ".":  # abbreviated word ("Yog." is yogurt, not oil)
            return self._REJECTED
        p = self.products.get(f["product_id"])
        word = t[f["start"]: f["end"]].split(" ")[-1]
        if p and len(word) > 4 and word.endswith(_DERIVED):  # "tovuqli", "malinadan", "лимонная" = made with / from
            own = {w for n in (p.name_uz, p.name_ru, p.name_en, *(p.aliases or [])) for w in norm(n).split(" ")}
            if word not in own:
                return self._REJECTED
        return p

    def match(self, it: Listing) -> Match | None:
        max_word = 2 if it.site == "olx.uz" else 1
        product = None
        for text in [it.title, *it.titles]:  # other languages only when the title names no product at all
            product = self.first_product(text, max_word)
            if product is not None:
                break
        if product is None or product is self._REJECTED:
            return None
        texts = [it.title, *it.titles]
        allowed = SITE_CATEGORIES.get(it.site)
        if allowed and product.category.slug not in allowed:
            return None
        if product.category.slug in _FRESH and any(_PROCESSED.search(x) for x in texts):
            return None
        if product.slug.startswith("tibbiy-niqob") and any(_COSMETIC.search(x) for x in texts):
            return None
        if product.category.slug == "meat-dairy" and any(_READY.search(x) for x in texts) \
                and not _READY.search(f"{product.name_uz} {product.name_ru} {product.slug}"):
            return None
        per_kg = it.per_kg or sold_by_weight(it.title)
        size = None if per_kg else parse_size(it.size_text, it.title, *it.titles)
        if product.category.slug in _FRESH and size and size.unit == "l":
            return None  # produce in a jar (720 ml) is preserved, not fresh
        up = unit_price(it.price, size, product.unit, per_kg)
        if up is None or up <= 0:
            return None
        ref = self.ref.get(product.slug)
        if ref and not (RATIO_MIN <= float(up) / ref <= RATIO_MAX):
            return None
        return Match(product, up)


def _description(it: Listing) -> str | None:
    if it.site == "korzinka.uz":
        if it.old_price and it.old_price > it.price:
            return f"Aksiya narxi. Oddiy narx: {int(it.old_price):,} so'm".replace(",", " ")
        return None
    return "Biznes e'loni" if it.seller_kind == "business" else "Xususiy e'lon"


def import_listings(db: Session, site: str, listings: list[Listing], expire_missing: bool = True) -> ImportStats:
    stats = ImportStats(site=site, seen=len(listings))
    regions = ensure_regions(db)
    matcher = Matcher(db)
    existing = {o.external_id: o for o in db.scalars(select(Offer).where(Offer.source_site == site)).all()}
    businesses: dict[str, Business] = {}
    seen_ids: set[str] = set()
    for it in listings:
        m = matcher.match(it)
        if not m:
            continue
        stats.matched += 1
        seen_ids.add(it.external_id)
        region = regions.get(it.region_code) or regions["toshkent"]
        offer = existing.get(it.external_id)
        if offer is None:
            biz = businesses.get(region.code) or source_business(db, site, region)
            businesses[region.code] = biz
            offer = Offer(
                business_id=biz.id, product_id=m.product.id, region_id=region.id, title=it.title,
                description=_description(it), image_url=(it.image_url or None) and it.image_url[:300], unit=m.product.unit,
                unit_price=m.unit_price, available_qty=None, min_order_qty=Decimal("1"), quality=Quality.standard,
                delivery_available=False, delivery_price=Decimal("0"), delivery_days=0,
                location_note=(it.place or "")[:160] or None, status=OfferStatus.active, source=DataSource.web,
                is_demo=False, source_site=site, source_url=it.url[:500], external_id=it.external_id,
                created_at=it.observed_at, updated_at=it.observed_at,
            )
            db.add(offer)
            db.flush()
            existing[it.external_id] = offer
            stats.created += 1
            changed = True
        else:
            changed = offer.unit_price != m.unit_price or offer.product_id != m.product.id
            offer.title, offer.description = it.title, _description(it)
            offer.product_id, offer.unit, offer.region_id = m.product.id, m.product.unit, region.id
            offer.status = OfferStatus.active
            offer.source_url = it.url[:500]
            if changed:
                offer.unit_price = m.unit_price
                offer.updated_at = it.observed_at
                stats.price_changed += 1
            else:
                stats.unchanged += 1
        if changed:
            db.add(OfferPriceHistory(offer_id=offer.id, product_id=m.product.id, region_id=region.id, price=m.unit_price,
                                     available_qty=None, recorded_at=it.observed_at, source=DataSource.web))
    if expire_missing:
        for ext_id, offer in existing.items():
            if ext_id not in seen_ids and offer.status == OfferStatus.active:
                offer.status = OfferStatus.expired
                stats.expired += 1
    db.commit()
    return stats

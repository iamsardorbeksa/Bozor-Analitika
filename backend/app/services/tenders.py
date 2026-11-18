"""Buyer requests (tenders), producer bids and the contract between them.

Flow
  1. buyer posts a tender (what, how much, by when, where, budget)      -> producers in that category are notified
  2. producers send bids (price, delivery, lead time, payment, terms)    -> the buyer is notified of each bid
  3. buyer compares bids and awards one: a contract is generated from both sides' data and signed by the buyer
  4. producer signs (contract in force, other bids rejected) or declines (the tender reopens)

Electronic signatures are a demonstration: a SHA-256 over the frozen contract terms, signer and time, with a
per-user demo certificate number. They look and verify like real ones inside the platform but have no legal force.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.analytics.price_stats import q2
from app.models import (
    Bid, BidStatus, Business, Contract, ContractStatus, Offer, OfferStatus, PaymentTerms, Product, ProductCategory, Role,
    Tender, TenderStatus, User,
)
from app.services.common import audit, notify

# How attractive each payment term is for the buyer (later payment = better for the buyer's cash flow).
PAYMENT_SCORE = {
    PaymentTerms.deferred_30: 1.0, PaymentTerms.deferred_15: 0.85, PaymentTerms.on_delivery: 0.7,
    PaymentTerms.prepay_30: 0.5, PaymentTerms.prepay_50: 0.3, PaymentTerms.prepay_100: 0.0,
}
PREPAY_PCT = {
    PaymentTerms.prepay_100: 100, PaymentTerms.prepay_50: 50, PaymentTerms.prepay_30: 30,
    PaymentTerms.on_delivery: 0, PaymentTerms.deferred_15: 0, PaymentTerms.deferred_30: 0,
}
QUALITY_RANK = {"economy": 0, "standard": 1, "first": 2, "premium": 3}


def now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


# ------------------------------------------------------------------ numbering & housekeeping

def next_number(db: Session, model, prefix: str, width: int, sep: str = "-") -> str:
    year = now().year
    head = f"{prefix}{sep}{year}{sep}"
    last = db.scalar(select(func.max(model.number)).where(model.number.like(head + "%")))
    n = int(last[len(head):]) + 1 if last else 1
    return f"{head}{n:0{width}d}"


def refresh_expired(db: Session) -> None:
    """Open tenders whose bid deadline passed become expired (they can still be awarded if bids exist)."""
    db.execute(update(Tender).where(Tender.status == TenderStatus.open, Tender.closes_at < now())
               .values(status=TenderStatus.expired))
    db.commit()


# ------------------------------------------------------------------ producers who should see a tender

def matching_businesses(db: Session, category: ProductCategory) -> list[Business]:
    """Active producers whose profile category or offers belong to the tender's category."""
    names = {category.slug, category.name_uz.lower(), category.name_ru.lower(), category.name_en.lower()}
    by_offers = select(Offer.business_id).join(Product, Product.id == Offer.product_id).where(
        Product.category_id == category.id, Offer.status == OfferStatus.active, Offer.source_site.is_(None))
    q = (select(Business).join(User, User.id == Business.owner_id)
         .where(User.is_active.is_(True), User.role == Role.seller,
                or_(func.lower(Business.category).in_(names), Business.id.in_(by_offers))))
    return list(db.scalars(q).unique().all())


def matches_business(db: Session, tender: Tender, biz: Business) -> bool:
    return any(b.id == biz.id for b in matching_businesses(db, tender.category))


# ------------------------------------------------------------------ comparing bids

def bid_total(tender: Tender, bid: Bid) -> Decimal:
    return q2(tender.quantity * bid.unit_price + (bid.delivery_price or Decimal(0)))


def rank_bids(tender: Tender, bids: list[Bid]) -> dict[UUID, dict]:
    """Per bid: total, score 0-100 and badges (cheapest, fastest, recommended).
    Score: total cost 50 %, lead time 20 %, producer reliability 15 %, payment terms for the buyer 15 %."""
    live = [b for b in bids if b.status in (BidStatus.submitted, BidStatus.accepted)]
    out: dict[UUID, dict] = {}
    if not live:
        return out
    totals = {b.id: bid_total(tender, b) for b in live}
    lo, hi = min(totals.values()), max(totals.values())
    fast, slow = min(b.lead_time_days for b in live), max(b.lead_time_days for b in live)
    deadline_days = max(1, (_aware(tender.needed_by) - _aware(tender.created_at)).days)
    for b in live:
        cost = 1.0 if hi == lo else float((hi - totals[b.id]) / (hi - lo))
        speed = 1.0 if slow == fast else (slow - b.lead_time_days) / (slow - fast)
        rel = min(1.0, float(b.business.rating or 0) / 5 * 0.7 + (0.3 if b.business.is_verified else 0))
        pay = PAYMENT_SCORE.get(b.payment_terms, 0.5)
        score = 100 * (0.5 * cost + 0.2 * speed + 0.15 * rel + 0.15 * pay)
        late = b.lead_time_days > deadline_days
        if late:
            score *= 0.75
        if tender.quality and QUALITY_RANK[b.quality.value] < QUALITY_RANK[tender.quality.value]:
            score *= 0.85
        out[b.id] = {"total": totals[b.id], "score": round(score, 1), "meets_deadline": not late,
                     "within_budget": tender.target_price is None or b.unit_price <= tender.target_price, "badges": []}
    cheapest = min(live, key=lambda b: (totals[b.id], b.lead_time_days))
    fastest = min(live, key=lambda b: (b.lead_time_days, totals[b.id]))
    best = max(live, key=lambda b: out[b.id]["score"])
    out[cheapest.id]["badges"].append("cheapest")
    out[fastest.id]["badges"].append("fastest")
    out[best.id]["badges"].append("recommended")
    return out


# ------------------------------------------------------------------ demo requisites & signatures

def _digits(seed: str, n: int) -> str:
    h = hashlib.sha256(seed.encode()).hexdigest()
    return str(int(h, 16))[:n].rjust(n, "1")


BANKS = ["“Kapitalbank” ATB", "“Hamkorbank” ATB", "“Ipak Yo‘li” ATIB", "“Asakabank” AJ", "“Orient Finans” XATB", "“Aloqabank” ATB"]


def requisites(seed: str, name: str, region: str | None, address: str | None, phone: str | None, director: str) -> dict:
    """Demonstration company details (STIR, bank account...) derived from the id: realistic-looking, not real."""
    return {
        "name": name,
        "address": address or f"{region or 'Toshkent'} sh.",
        "region": region,
        "stir": "3" + _digits("stir" + seed, 8),  # company taxpayer numbers start with 2 or 3
        "oked": _digits("oked" + seed, 5),
        "bank": BANKS[int(_digits("bank" + seed, 4)) % len(BANKS)],
        "mfo": "0" + _digits("mfo" + seed, 4),
        "account": "20208000" + _digits("acc" + seed, 12),
        "phone": phone,
        "director": director,
    }


def cert_serial(user_id: UUID) -> str:
    return "UZ" + hashlib.sha256(f"cert:{user_id}".encode()).hexdigest()[:14].upper()


def _canonical(terms: dict) -> str:
    return json.dumps(terms, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def signature(terms: dict, role: str, user_id: UUID, signer: str, signed_at: datetime) -> str:
    raw = f"{_canonical(terms)}|{role}|{user_id}|{signer}|{_aware(signed_at).isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def verify(c: Contract) -> dict:
    buyer_ok = c.buyer_signature == signature(c.terms, "buyer", c.buyer_id, c.buyer_signer, c.buyer_signed_at)
    seller_ok = None
    if c.seller_signature:
        seller_ok = c.seller_signature == signature(c.terms, "seller", c.business.owner_id, c.seller_signer or "", c.seller_signed_at)
    return {"buyer_valid": buyer_ok, "seller_valid": seller_ok,
            "document_hash": hashlib.sha256(_canonical(c.terms).encode()).hexdigest()}


def check_pin(pin: str) -> None:
    if not pin or not pin.isdigit() or len(pin) < 4:
        raise HTTPException(422, "Enter the key PIN (at least 4 digits)")


# ------------------------------------------------------------------ the contract text data

def build_terms(tender: Tender, bid: Bid, buyer: User, buyer_company: str, buyer_title: str, delivery_address: str,
                extra_terms: str | None, number: str, date: datetime) -> dict:
    biz = bid.business
    total = bid_total(tender, bid)
    goods = q2(tender.quantity * bid.unit_price)
    prepay = PREPAY_PCT[bid.payment_terms]
    delivery_date = _aware(date) + timedelta(days=bid.lead_time_days)
    product = tender.product
    return {
        "number": number,
        "date": _aware(date).date().isoformat(),
        "city": tender.delivery_region.name_uz,
        "tender_number": tender.number,
        "buyer": requisites(str(buyer.id), buyer_company, tender.delivery_region.name_uz, delivery_address, buyer.phone, buyer.full_name)
                 | {"signer_title": buyer_title},
        "seller": requisites(str(biz.id), biz.name, biz.region.name_uz if biz.region else None, None, biz.phone, biz.owner.full_name),
        "item": {
            "title": tender.title,
            "product_uz": product.name_uz if product else None,
            "product_ru": product.name_ru if product else None,
            "product_en": product.name_en if product else None,
            "category_uz": tender.category.name_uz, "category_ru": tender.category.name_ru, "category_en": tender.category.name_en,
            "description": tender.description,
            "quantity": float(tender.quantity),
            "unit": tender.unit,
            "quality": bid.quality.value,
            "unit_price": float(bid.unit_price),
            "goods_amount": float(goods),
        },
        "delivery": {
            "price": float(bid.delivery_price or 0),
            "included": not bid.delivery_price,
            "address": delivery_address,
            "region": tender.delivery_region.name_uz,
            "lead_time_days": bid.lead_time_days,
            "date": delivery_date.date().isoformat(),
            "needed_by": _aware(tender.needed_by).date().isoformat(),
        },
        "payment": {
            "terms": bid.payment_terms.value,
            "prepay_pct": prepay,
            "prepay_amount": float(q2(total * prepay / 100)),
            "rest_amount": float(q2(total - total * prepay / 100)),
            "deferral_days": {"deferred_15": 15, "deferred_30": 30}.get(bid.payment_terms.value, 0),
        },
        "total_amount": float(total),
        "vat_note": "QQS hisobga olinmagan",
        "warranty_months": bid.warranty_months,
        "penalty_pct_per_day": 0.1,
        "penalty_cap_pct": 10,
        "seller_conditions": bid.comment,
        "buyer_extra_terms": extra_terms,
        "demo": True,
    }

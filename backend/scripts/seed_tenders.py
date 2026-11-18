"""Sample buyer requests, producer offers and contracts, so the request -> offer -> contract flow can be shown.

    python -m scripts.seed_tenders           # adds the sample (skips if requests already exist)
    python -m scripts.seed_tenders --reset   # deletes all requests/offers/contracts first

Also adds catalogue products that are missing from the database (e.g. the stationery group) and four sample
producer accounts (sellerN@demo.bozor.uz / Demo12345). Everything here is demonstration data.
"""
from __future__ import annotations

import argparse
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models import (
    Bid, BidStatus, Business, Contract, ContractStatus, PaymentTerms, Product, ProductCategory, Quality, Region, Role,
    Tender, TenderStatus, User, VerificationStatus,
)
from app.services import tenders as svc
from scripts.catalogue import CATEGORIES, PRODUCTS

NOW = datetime.now(timezone.utc).replace(second=0, microsecond=0)
PRODUCERS = [  # email, owner, business, category slug, region, rating, verified, phone
    ("seller1@demo.bozor.uz", "Jasur Tursunov", "Toshkent Kanselyariya Savdo", "other", "toshkent", "4.70", True, "+998 71 245 10 20"),
    ("seller2@demo.bozor.uz", "Sherzod Aliyev", "Ofis Plus Distribution", "other", "toshkent", "4.40", True, "+998 90 911 22 33"),
    ("seller3@demo.bozor.uz", "Nodira Saidova", "Samarqand Agro Fermer", "vegetables", "samarqand", "4.55", True, "+998 66 233 44 55"),
    ("seller4@demo.bozor.uz", "Bekzod Qodirov", "Qurilish Materiallari Markazi", "construction", "toshkent", "4.20", False, "+998 95 140 70 80"),
]
BUYER2 = ("buyer2@demo.bozor.uz", "Rustam Nazarov", "Mehmonxona", "samarqand", "+998 91 555 12 12")


def sync_catalogue(db) -> int:
    cats = {c.slug: c for c in db.scalars(select(ProductCategory)).all()}
    for i, (slug, uz, ru, en, icon) in enumerate(CATEGORIES):
        if slug not in cats:
            cats[slug] = ProductCategory(slug=slug, name_uz=uz, name_ru=ru, name_en=en, icon=icon, sort_order=i)
            db.add(cats[slug])
    db.flush()
    have = set(db.scalars(select(Product.slug)).all())
    added = 0
    for p in PRODUCTS:
        if p.slug not in have:
            db.add(Product(slug=p.slug, category_id=cats[p.category].id, name_uz=p.name_uz, name_ru=p.name_ru, name_en=p.name_en,
                           unit=p.unit, aliases=p.aliases, emoji=p.emoji))
            added += 1
    db.flush()
    return added


def user(db, email, name, role, region, category=None, phone=None) -> User:
    u = db.scalar(select(User).where(User.email == email))
    if not u:
        u = User(email=email, full_name=name, password_hash=hash_password("Demo12345"), role=role, region_id=region.id,
                 business_category=category, phone=phone, is_demo=True, created_at=NOW - timedelta(days=40))
        db.add(u)
        db.flush()
    return u


def run(reset: bool) -> None:
    db = SessionLocal()
    added = sync_catalogue(db)
    if reset:
        for m in (Contract, Bid, Tender):
            db.execute(delete(m))
        db.commit()
    elif db.scalar(select(Tender.id).limit(1)):
        db.commit()
        print(f"catalogue: {added} products added; requests already exist (use --reset to recreate the sample)")
        return
    regions = {r.code: r for r in db.scalars(select(Region)).all()}
    cats = {c.slug: c for c in db.scalars(select(ProductCategory)).all()}
    prod = {p.slug: p for p in db.scalars(select(Product)).all()}

    buyer = db.scalar(select(User).where(User.email == "buyer@demo.bozor.uz"))
    seller_u = db.scalar(select(User).where(User.email == "seller@demo.bozor.uz"))
    if not buyer or not seller_u:
        sys.exit("Run `python -m scripts.seed` first (needs the buyer@ and seller@ demo accounts).")
    b2 = user(db, BUYER2[0], BUYER2[1], Role.buyer, regions[BUYER2[3]], BUYER2[2], BUYER2[4])
    biz = {"seller": db.scalar(select(Business).where(Business.owner_id == seller_u.id))}
    for i, (email, owner, name, cat, rc, rating, verified, phone) in enumerate(PRODUCERS, 1):
        u = user(db, email, owner, Role.seller, regions[rc], cat, phone)
        b = db.scalar(select(Business).where(Business.owner_id == u.id))
        if not b:
            b = Business(owner_id=u.id, name=name, category=cat, phone=phone, region_id=regions[rc].id, rating=Decimal(rating),
                         completed_deals=12 + i * 7, verification_status=VerificationStatus.verified if verified else VerificationStatus.pending,
                         verified_at=NOW - timedelta(days=30) if verified else None, description=f"{name}: ulgurji yetkazib beruvchi.")
            db.add(b)
            db.flush()
        biz[f"s{i}"] = b

    def tender(owner, slug, title, qty, target, days_open, needed_in, region, created_ago_h, desc=None, quality=None,
               pay=None, address=None, status=TenderStatus.open):
        p = prod[slug]
        t = Tender(number=svc.next_number(db, Tender, "T", 5), buyer_id=owner.id, category_id=p.category_id, product_id=p.id,
                   title=title, description=desc, quantity=Decimal(qty), unit=p.unit,
                   target_price=Decimal(target) if target else None, quality=quality, payment_terms=pay, delivery_required=True,
                   delivery_region_id=regions[region].id, delivery_address=address,
                   created_at=NOW - timedelta(hours=created_ago_h), closes_at=NOW + timedelta(days=days_open),
                   needed_by=NOW + timedelta(days=needed_in), status=status, views_count=int(created_ago_h * 1.7) + 3)
        db.add(t)
        db.flush()
        db.refresh(t)
        return t

    def bid(t, b, price, lead, pay, delivery=0, quality=Quality.standard, warranty=0, comment=None, ago_h=2, status=BidStatus.submitted):
        x = Bid(tender_id=t.id, business_id=b.id, unit_price=Decimal(price), delivery_price=Decimal(delivery), lead_time_days=lead,
                payment_terms=pay, quality=quality, warranty_months=warranty, valid_days=14, comment=comment, status=status,
                created_at=NOW - timedelta(hours=ago_h), updated_at=NOW - timedelta(hours=ago_h))
        db.add(x)
        db.flush()
        return x

    def contract(t, x, company, title, address, signed_by_seller: bool):
        db.refresh(t)
        at = NOW - timedelta(hours=20)
        number = svc.next_number(db, Contract, "BA", 5)
        owner = db.get(User, t.buyer_id)
        terms = svc.build_terms(t, x, owner, company, title, address, None, number, at)
        c = Contract(number=number, tender_id=t.id, bid_id=x.id, buyer_id=owner.id, business_id=x.business_id,
                     status=ContractStatus.awaiting_seller, total_amount=Decimal(str(terms["total_amount"])), terms=terms,
                     buyer_signer=owner.full_name, buyer_signer_title=title, buyer_signed_at=at,
                     buyer_signature=svc.signature(terms, "buyer", owner.id, owner.full_name, at), buyer_cert=svc.cert_serial(owner.id),
                     created_at=at)
        x.status, t.status = BidStatus.accepted, TenderStatus.awarded
        if signed_by_seller:
            s_at = at + timedelta(hours=3)
            s_user = db.get(User, x.business.owner_id)
            c.seller_signer, c.seller_signer_title, c.seller_signed_at = s_user.full_name, "Direktor", s_at
            c.seller_signature = svc.signature(terms, "seller", s_user.id, s_user.full_name, s_at)
            c.seller_cert, c.status, t.status = svc.cert_serial(s_user.id), ContractStatus.signed, TenderStatus.contracted
        db.add(c)
        db.flush()
        return c

    # 1. the mentor's example: 1 000 pens, three producers competing
    t1 = tender(buyer, "sharikli-ruchka", "1 000 dona ko‘k sharikli ruchka (ofis uchun)", 1000, 1500, 5, 16, "toshkent", 30,
                "Ko‘k siyohli, 0,7 mm, plastik korpusli. Qadoqlash: 50 donalik qutilarda. Logotip shart emas.",
                Quality.standard, PaymentTerms.on_delivery, "Toshkent sh., Yunusobod t., Amir Temur ko‘chasi 107")
    bid(t1, biz["s1"], 1350, 7, PaymentTerms.prepay_50, 0, warranty=0, comment="Narx 1 000 donadan boshlab. Brend: Erich Krause analog. Ombordan 3 kunda tayyor, qadoqlash bilan 7 kun.", ago_h=26)
    bid(t1, biz["s2"], 1250, 12, PaymentTerms.prepay_100, 60000, comment="Eng arzon narx — 100% oldindan to‘lov sharti bilan. Yetkazish 60 000 so‘m.", ago_h=20)
    bid(t1, biz["seller"], 1480, 3, PaymentTerms.deferred_15, 0, quality=Quality.first, warranty=0, comment="Omborda bor, 3 kunda yetkazamiz. To‘lov yetkazilgandan keyin 15 kun ichida.", ago_h=6)
    # 2. restaurant: potatoes every week
    t2 = tender(buyer, "kartoshka", "Restoran uchun 500 kg kartoshka", 500, 6500, 3, 7, "toshkent", 18,
                "O‘rta kattalikdagi, yuvilgan. Haftalik yetkazib berish imkoniyati bo‘lsa yaxshi.", Quality.first, PaymentTerms.on_delivery,
                "Toshkent sh., Chilonzor t., Bunyodkor ko‘chasi 12")
    bid(t2, biz["seller"], 6200, 2, PaymentTerms.on_delivery, 50000, quality=Quality.first, comment="Har dushanba yetkazib berishimiz mumkin.", ago_h=10)
    bid(t2, biz["s3"], 5400, 4, PaymentTerms.prepay_30, 250000, comment="Samarqanddan fura bilan, 4 kunda.", ago_h=5)
    # 3-4. open, no offers yet (for producers to answer)
    tender(b2, "sement", "Mehmonxona ta’miri uchun sement M400", 120, None, 6, 20, "samarqand", 8,
           "M400, 50 kg qoplarda. Yetkazish Samarqand shahriga.", None, PaymentTerms.prepay_30, "Samarqand sh., Registon ko‘chasi 5")
    tender(b2, "ofis-kreslo", "Ofis uchun 40 ta kreslo", 40, 900000, 2, 12, "samarqand", 4,
           "Qora rang, g‘ildirakli, qo‘ltiqli. 12 oy kafolat talab qilinadi.", Quality.first, PaymentTerms.deferred_15)
    tender(buyer, "a4-qogoz", "A4 qog‘oz — 200 pachka", 200, 52000, 4, 10, "toshkent", 2, "80 g/m², oq, 500 varaqli pachka.",
           None, PaymentTerms.on_delivery)
    # 5. awarded: contract signed by the buyer, waiting for seller@ (demo: log in as seller and sign)
    t5 = tender(buyer, "piyoz", "Oshxona uchun 300 kg piyoz", 300, 4500, 4, 9, "toshkent", 50,
                "Sariq piyoz, quruq, qoplarda.", Quality.standard, PaymentTerms.on_delivery, "Toshkent sh., Chilonzor t., Bunyodkor ko‘chasi 12")
    x5 = bid(t5, biz["seller"], 4300, 2, PaymentTerms.on_delivery, 40000, comment="Qoplab, 2 kunda yetkazamiz.", ago_h=40)
    bid(t5, biz["s3"], 3900, 5, PaymentTerms.prepay_50, 300000, ago_h=30)
    contract(t5, x5, "“Dilnoza Taomlari” MChJ", "Direktor", "Toshkent sh., Chilonzor t., Bunyodkor ko‘chasi 12", signed_by_seller=False)
    # 6. finished: contract signed by both
    t6 = tender(buyer, "daftar", "Xodimlar uchun 500 ta daftar", 500, 5000, -3, 2, "toshkent", 120, None, None, PaymentTerms.on_delivery,
                "Toshkent sh., Yunusobod t., Amir Temur ko‘chasi 107")
    x6 = bid(t6, biz["s1"], 4200, 5, PaymentTerms.on_delivery, 0, comment="Yetkazish bepul.", ago_h=100)
    bid(t6, biz["s2"], 4600, 3, PaymentTerms.prepay_50, 0, ago_h=90)
    contract(t6, x6, "“Dilnoza Taomlari” MChJ", "Direktor", "Toshkent sh., Yunusobod t., Amir Temur ko‘chasi 107", signed_by_seller=True)
    for t in (t6,):
        for b in t.bids:
            if b.status == BidStatus.submitted:
                b.status = BidStatus.rejected
    db.commit()
    print(f"catalogue: {added} products added; sample: {db.query(Tender).count()} requests, {db.query(Bid).count()} offers, "
          f"{db.query(Contract).count()} contracts; producers seller1-4@demo.bozor.uz, buyer2@demo.bozor.uz (password Demo12345)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    run(ap.parse_args().reset)

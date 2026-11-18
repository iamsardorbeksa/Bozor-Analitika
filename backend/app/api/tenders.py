"""Buyer requests (tenders) -> producer bids -> e-signed contract. See app/services/tenders.py for the flow."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.analytics.price_stats import active_offers_q, snapshot
from app.core.deps import get_current_user, require_buyer, require_seller
from app.database.session import get_db
from app.models import (
    Bid, BidStatus, Business, Contract, ContractStatus, Product, ProductCategory, Region, Role, Tender, TenderStatus, User,
)
from app.repositories.offers import page_of
from app.schemas.tender import (
    AwardIn, BidderBrief, BidIn, BidOut, ContractOut, DeclineIn, ExtendIn, Named, SignIn, TenderDetail, TenderIn, TenderOut,
)
from app.services import tenders as svc
from app.services.common import audit, notify

router = APIRouter(prefix="/api", tags=["tenders"])

SORTS = {
    "newest": (Tender.created_at.desc(),),
    "closing_soon": (Tender.closes_at.asc(),),
    "needed_soon": (Tender.needed_by.asc(),),
    "qty_asc": (Tender.quantity.asc(),),
    "qty_desc": (Tender.quantity.desc(),),
    "budget_asc": (Tender.target_price.is_(None), Tender.target_price.asc()),
    "budget_desc": (Tender.target_price.is_(None), Tender.target_price.desc()),
    "value_desc": (Tender.target_price.is_(None), (Tender.quantity * Tender.target_price).desc()),
    "fewest_bids": (),  # handled with a subquery
}
LIVE_BIDS = (BidStatus.submitted, BidStatus.accepted)


def _utc(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _seller_biz(db: Session, user: User) -> Business:
    biz = db.scalar(select(Business).where(Business.owner_id == user.id))
    if not biz:
        raise HTTPException(404, "Business profile not found")
    return biz


def _named(x, emoji: str | None = None) -> Named:
    return Named(id=x.id, slug=getattr(x, "slug", None), name_uz=x.name_uz, name_ru=x.name_ru, name_en=x.name_en, emoji=emoji)


def _market_price(db: Session, product_id: UUID | None) -> Decimal | None:
    if not product_id:
        return None
    return snapshot([o.unit_price for o in db.scalars(active_offers_q(product_id)).all()])["median"]


def _buyer_label(u: User) -> str:
    parts = u.full_name.split()
    short = parts[0] + (f" {parts[1][0]}." if len(parts) > 1 else "")
    return f"{u.business_category} · {short}" if u.business_category else short


def bid_out(b: Bid, rank: dict | None = None, show_phone: bool = False) -> BidOut:
    biz = b.business
    r = rank or {}
    return BidOut(
        id=b.id, tender_id=b.tender_id,
        business=BidderBrief(id=biz.id, name=biz.name, rating=biz.rating, verified=biz.is_verified, completed_deals=biz.completed_deals,
                             region=biz.region.name_uz if biz.region else None, phone=biz.phone if show_phone else None),
        unit_price=b.unit_price, delivery_price=b.delivery_price, total=r.get("total") or svc.bid_total(b.tender, b),
        lead_time_days=b.lead_time_days, ready_date=_utc(b.updated_at) + timedelta(days=b.lead_time_days),
        payment_terms=b.payment_terms, quality=b.quality, warranty_months=b.warranty_months, valid_days=b.valid_days,
        valid_until=_utc(b.updated_at) + timedelta(days=b.valid_days), min_quantity=b.min_quantity, comment=b.comment,
        status=b.status, created_at=b.created_at, updated_at=b.updated_at,
        score=r.get("score"), badges=r.get("badges", []), meets_deadline=r.get("meets_deadline"), within_budget=r.get("within_budget"),
    )


def tender_out(db: Session, t: Tender, user: User | None, cls=TenderOut, biz: Business | None = None, **extra):
    market = _market_price(db, t.product_id)
    basis = t.target_price or market
    live = [b for b in t.bids if b.status in LIVE_BIDS]
    my = next((b for b in t.bids if biz and b.business_id == biz.id), None)
    contract_id = db.scalar(select(Contract.id).where(Contract.tender_id == t.id, Contract.status.in_(
        [ContractStatus.awaiting_seller, ContractStatus.signed])).order_by(Contract.created_at.desc()))
    return cls(
        id=t.id, number=t.number, title=t.title, description=t.description,
        category=_named(t.category), product=_named(t.product, t.product.emoji) if t.product else None,
        quantity=t.quantity, unit=t.unit, target_price=t.target_price,
        estimated_value=(t.quantity * basis).quantize(Decimal("0.01")) if basis else None, market_price=market,
        quality=t.quality, payment_terms=t.payment_terms, delivery_required=t.delivery_required,
        region=_named(t.delivery_region), delivery_address=t.delivery_address, needed_by=t.needed_by, closes_at=t.closes_at,
        status=t.status, created_at=t.created_at, views_count=t.views_count, bids_count=len(live),
        buyer_label=_buyer_label(t.buyer), is_mine=bool(user and t.buyer_id == user.id),
        my_bid=bid_out(my) if my else None, contract_id=contract_id, **extra,
    )


def _load(db: Session, tid: UUID) -> Tender:
    t = db.scalar(select(Tender).where(Tender.id == tid).options(
        joinedload(Tender.bids).joinedload(Bid.business), joinedload(Tender.category), joinedload(Tender.product),
        joinedload(Tender.delivery_region), joinedload(Tender.buyer)))
    if not t:
        raise HTTPException(404, "Request not found")
    return t


# ================================================================== buyer: post & manage requests

@router.post("/tenders", response_model=TenderOut, status_code=201)
def create_tender(data: TenderIn, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    cat = db.scalar(select(ProductCategory).where(ProductCategory.slug == data.category))
    if not cat:
        raise HTTPException(422, "Unknown category")
    unit = data.unit
    if data.product_id:
        p = db.get(Product, data.product_id)
        if not p or p.category_id != cat.id:
            raise HTTPException(422, "The product is not in this category")
        unit = p.unit
    if not db.get(Region, data.delivery_region_id):
        raise HTTPException(422, "Unknown region")
    now = svc.now()
    if _utc(data.closes_at) < now + timedelta(hours=1):
        raise HTTPException(422, "The offers deadline must be at least 1 hour from now")
    t = Tender(number=svc.next_number(db, Tender, "T", 5), buyer_id=user.id, category_id=cat.id, product_id=data.product_id,
               title=data.title.strip(), description=data.description, quantity=data.quantity, unit=unit,
               target_price=data.target_price, quality=data.quality, payment_terms=data.payment_terms,
               delivery_required=data.delivery_required, delivery_region_id=data.delivery_region_id,
               delivery_address=data.delivery_address, needed_by=data.needed_by, closes_at=data.closes_at)
    db.add(t)
    db.flush()
    for biz in svc.matching_businesses(db, cat):
        notify(db, biz.owner_id, "tender", f"Yangi buyurtma: {t.title}",
               f"{t.quantity.normalize():f} {unit} · {cat.name_uz}. Takliflar {_utc(t.closes_at):%d.%m.%Y} gacha.",
               f"/app/seller/tenders/{t.id}")
    audit(db, user.id, "tender.create", "tender", t.id, number=t.number)
    db.commit()
    return tender_out(db, _load(db, t.id), user)


@router.get("/tenders/mine", response_model=list[TenderOut])
def my_tenders(status: TenderStatus | None = None, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    svc.refresh_expired(db)
    q = select(Tender).where(Tender.buyer_id == user.id).options(joinedload(Tender.bids).joinedload(Bid.business)).order_by(Tender.created_at.desc())
    if status:
        q = q.where(Tender.status == status)
    return [tender_out(db, t, user) for t in db.scalars(q).unique().all()]


@router.post("/tenders/{tid}/cancel", response_model=TenderOut)
def cancel_tender(tid: UUID, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    t = _load(db, tid)
    if t.buyer_id != user.id:
        raise HTTPException(404, "Request not found")
    if t.status not in (TenderStatus.open, TenderStatus.expired):
        raise HTTPException(409, "Only an open request can be closed")
    t.status = TenderStatus.closed
    for b in t.bids:
        if b.status == BidStatus.submitted:
            b.status = BidStatus.rejected
            notify(db, b.business.owner_id, "tender", f"Buyurtma yopildi: {t.title}", "Xaridor buyurtmani bekor qildi.", f"/app/seller/tenders/{t.id}")
    db.commit()
    return tender_out(db, _load(db, tid), user)


@router.post("/tenders/{tid}/extend", response_model=TenderOut)
def extend_tender(tid: UUID, data: ExtendIn, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    t = _load(db, tid)
    if t.buyer_id != user.id:
        raise HTTPException(404, "Request not found")
    if t.status not in (TenderStatus.open, TenderStatus.expired):
        raise HTTPException(409, "Only an open or expired request can be extended")
    if _utc(data.closes_at) < svc.now() + timedelta(hours=1) or _utc(data.closes_at) > _utc(t.needed_by):
        raise HTTPException(422, "The new deadline must be in the future and before the delivery date")
    t.closes_at, t.status = data.closes_at, TenderStatus.open
    db.commit()
    return tender_out(db, _load(db, tid), user)


@router.post("/tenders/{tid}/award", response_model=ContractOut, status_code=201)
def award(tid: UUID, data: AwardIn, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    """Choose a bid: generates the contract from both sides' data and signs it with the buyer's (demo) e-signature."""
    svc.check_pin(data.pin)
    t = _load(db, tid)
    if t.buyer_id != user.id:
        raise HTTPException(404, "Request not found")
    if t.status not in (TenderStatus.open, TenderStatus.expired):
        raise HTTPException(409, "A contract for this request already exists")
    bid = next((b for b in t.bids if b.id == data.bid_id), None)
    if not bid or bid.status != BidStatus.submitted:
        raise HTTPException(404, "Offer not available")
    signed_at = svc.now().replace(microsecond=0)
    number = svc.next_number(db, Contract, "BA", 5, sep="-")
    terms = svc.build_terms(t, bid, user, data.buyer_company.strip(), data.signer_title.strip(), data.delivery_address.strip(),
                            data.extra_terms, number, signed_at)
    c = Contract(number=number, tender_id=t.id, bid_id=bid.id, buyer_id=user.id, business_id=bid.business_id,
                 status=ContractStatus.awaiting_seller, total_amount=Decimal(str(terms["total_amount"])), terms=terms,
                 buyer_signer=user.full_name, buyer_signer_title=data.signer_title.strip(), buyer_signed_at=signed_at,
                 buyer_signature=svc.signature(terms, "buyer", user.id, user.full_name, signed_at), buyer_cert=svc.cert_serial(user.id))
    db.add(c)
    bid.status = BidStatus.accepted
    t.status = TenderStatus.awarded
    db.flush()
    notify(db, bid.business.owner_id, "contract", f"Shartnoma imzolash uchun: {number}",
           f"Xaridor “{t.title}” bo‘yicha taklifingizni tanladi va shartnomani imzoladi. Ko‘rib chiqing va imzolang.",
           f"/app/contracts/{c.id}")
    audit(db, user.id, "contract.create", "contract", c.id, number=number, bid=str(bid.id))
    db.commit()
    return contract_out(db, c, user)


# ================================================================== producers: the request board and bids

@router.get("/tenders")
def board(
    q: str | None = None, category: str | None = None, region_id: UUID | None = None,
    min_qty: Decimal | None = None, max_qty: Decimal | None = None, max_budget: Decimal | None = None,
    min_budget: Decimal | None = None, matching: bool = False, hide_mine: bool = False, closing_days: int | None = None,
    status: TenderStatus | None = TenderStatus.open, sort: str = "newest", page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=60),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Open buyer requests for producers, with filters and sorting (cheapest budget, smallest quantity...)."""
    if user.role not in (Role.seller, Role.admin):
        raise HTTPException(403, "Only producers can browse buyer requests")
    svc.refresh_expired(db)
    biz = db.scalar(select(Business).where(Business.owner_id == user.id)) if user.role == Role.seller else None
    stmt = select(Tender).join(Tender.category)
    if status:
        stmt = stmt.where(Tender.status == status)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.outerjoin(Tender.product).where(or_(func.lower(Tender.title).like(like), func.lower(Tender.description).like(like),
                                                       func.lower(Product.name_uz).like(like), func.lower(Product.name_ru).like(like)))
    if category:
        stmt = stmt.where(ProductCategory.slug == category)
    if region_id:
        stmt = stmt.where(Tender.delivery_region_id == region_id)
    if min_qty is not None:
        stmt = stmt.where(Tender.quantity >= min_qty)
    if max_qty is not None:
        stmt = stmt.where(Tender.quantity <= max_qty)
    if max_budget is not None:
        stmt = stmt.where(Tender.target_price <= max_budget)
    if min_budget is not None:
        stmt = stmt.where(Tender.target_price >= min_budget)
    if closing_days:
        stmt = stmt.where(Tender.closes_at <= svc.now() + timedelta(days=closing_days))
    my_cats: set = set()
    if biz:
        my_cats = {c.id for c in db.scalars(select(ProductCategory)).all() if any(b.id == biz.id for b in svc.matching_businesses(db, c))}
        if matching:
            stmt = stmt.where(Tender.category_id.in_(my_cats))
        if hide_mine:
            stmt = stmt.where(~Tender.id.in_(select(Bid.tender_id).where(Bid.business_id == biz.id)))
    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Tender.id).order_by(None).subquery())) or 0
    if sort == "fewest_bids":
        cnt = select(func.count(Bid.id)).where(Bid.tender_id == Tender.id, Bid.status.in_(LIVE_BIDS)).correlate(Tender).scalar_subquery()
        order = (cnt.asc(), Tender.closes_at.asc())
    else:
        order = SORTS.get(sort, SORTS["newest"])
    rows = db.scalars(stmt.order_by(*order, Tender.id).offset((page - 1) * page_size).limit(page_size)
                      .options(joinedload(Tender.bids).joinedload(Bid.business))).unique().all()
    items = [tender_out(db, t, user, biz=biz, matches_me=(t.category_id in my_cats) if biz else None) for t in rows]
    return page_of(items, total, page, page_size)


@router.get("/tenders/summary")
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Counts for dashboards."""
    svc.refresh_expired(db)
    if user.role == Role.buyer:
        mine = db.scalars(select(Tender).where(Tender.buyer_id == user.id)).all()
        ids = [t.id for t in mine]
        new_bids = db.scalar(select(func.count(Bid.id)).where(Bid.tender_id.in_(ids), Bid.status == BidStatus.submitted)) if ids else 0
        return {"open": sum(t.status == TenderStatus.open for t in mine), "awaiting_choice": sum(
            t.status in (TenderStatus.open, TenderStatus.expired) and any(b.status == BidStatus.submitted for b in t.bids) for t in mine),
            "bids": new_bids or 0,
            "contracts_awaiting": db.scalar(select(func.count(Contract.id)).where(Contract.buyer_id == user.id, Contract.status == ContractStatus.awaiting_seller)) or 0,
            "contracts_signed": db.scalar(select(func.count(Contract.id)).where(Contract.buyer_id == user.id, Contract.status == ContractStatus.signed)) or 0}
    if user.role == Role.seller:
        biz = _seller_biz(db, user)
        open_ids = [c.id for c in db.scalars(select(ProductCategory)).all() if any(b.id == biz.id for b in svc.matching_businesses(db, c))]
        return {"open_matching": db.scalar(select(func.count(Tender.id)).where(Tender.status == TenderStatus.open, Tender.category_id.in_(open_ids))) or 0,
                "open_all": db.scalar(select(func.count(Tender.id)).where(Tender.status == TenderStatus.open)) or 0,
                "my_bids": db.scalar(select(func.count(Bid.id)).where(Bid.business_id == biz.id, Bid.status == BidStatus.submitted)) or 0,
                "won": db.scalar(select(func.count(Bid.id)).where(Bid.business_id == biz.id, Bid.status == BidStatus.accepted)) or 0,
                "to_sign": db.scalar(select(func.count(Contract.id)).where(Contract.business_id == biz.id, Contract.status == ContractStatus.awaiting_seller)) or 0}
    return {}


@router.get("/tenders/{tid}", response_model=TenderDetail)
def tender_detail(tid: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    svc.refresh_expired(db)
    t = _load(db, tid)
    if user.role == Role.buyer:
        if t.buyer_id != user.id:
            raise HTTPException(404, "Request not found")
        rank = svc.rank_bids(t, t.bids)
        signed = t.status == TenderStatus.contracted
        bids = sorted((bid_out(b, rank.get(b.id), show_phone=signed and b.status == BidStatus.accepted)
                       for b in t.bids if b.status != BidStatus.withdrawn),
                      key=lambda b: (b.status not in (BidStatus.submitted, BidStatus.accepted), -(b.score or 0)))
        return tender_out(db, t, user, cls=TenderDetail, bids=bids)
    if user.role == Role.seller:
        biz = _seller_biz(db, user)
        t.views_count = (t.views_count or 0) + 1
        db.commit()
        return tender_out(db, _load(db, tid), user, cls=TenderDetail, biz=biz, matches_me=svc.matches_business(db, t, biz))
    rank = svc.rank_bids(t, t.bids)  # admin
    return tender_out(db, t, user, cls=TenderDetail, bids=[bid_out(b, rank.get(b.id)) for b in t.bids])


@router.post("/tenders/{tid}/bid", response_model=BidOut)
def place_bid(tid: UUID, data: BidIn, user: User = Depends(require_seller), db: Session = Depends(get_db)):
    biz = _seller_biz(db, user)
    t = _load(db, tid)
    if t.status != TenderStatus.open or _utc(t.closes_at) < svc.now():
        raise HTTPException(409, "This request no longer accepts offers")
    if data.min_quantity and data.min_quantity > t.quantity:
        raise HTTPException(422, "Minimum quantity cannot exceed the requested quantity")
    bid = next((b for b in t.bids if b.business_id == biz.id), None)
    fields = data.model_dump()
    if bid:
        if bid.status in (BidStatus.accepted, BidStatus.rejected):
            raise HTTPException(409, "This offer can no longer be changed")
        updated = bid.status == BidStatus.submitted
        for k, v in fields.items():
            setattr(bid, k, v)
        bid.status = BidStatus.submitted
    else:
        updated = False
        bid = Bid(tender_id=t.id, business_id=biz.id, **fields)
        db.add(bid)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already sent an offer for this request")
    total = svc.bid_total(t, bid)
    notify(db, t.buyer_id, "bid", f"{'Taklif yangilandi' if updated else 'Yangi taklif'}: {t.title}",
           f"{biz.name}: {int(total):,} so‘m, {bid.lead_time_days} kunda.".replace(",", " "), f"/app/tenders/{t.id}")
    db.commit()
    db.refresh(bid)
    return bid_out(bid)


@router.post("/tenders/{tid}/bid/withdraw", response_model=BidOut)
def withdraw_bid(tid: UUID, user: User = Depends(require_seller), db: Session = Depends(get_db)):
    biz = _seller_biz(db, user)
    bid = db.scalar(select(Bid).where(Bid.tender_id == tid, Bid.business_id == biz.id))
    if not bid or bid.status != BidStatus.submitted:
        raise HTTPException(409, "Only a pending offer can be withdrawn")
    bid.status = BidStatus.withdrawn
    db.commit()
    db.refresh(bid)
    return bid_out(bid)


@router.get("/bids/mine")
def my_bids(status: BidStatus | None = None, user: User = Depends(require_seller), db: Session = Depends(get_db)):
    biz = _seller_biz(db, user)
    svc.refresh_expired(db)
    q = select(Bid).where(Bid.business_id == biz.id).order_by(Bid.updated_at.desc())
    if status:
        q = q.where(Bid.status == status)
    out = []
    for b in db.scalars(q).all():
        t = _load(db, b.tender_id)
        out.append({"bid": bid_out(b).model_dump(mode="json"), "tender": tender_out(db, t, user, biz=biz).model_dump(mode="json")})
    return out


# ================================================================== contracts

def contract_out(db: Session, c: Contract, user: User, with_verify: bool = False) -> ContractOut:
    role = "buyer" if c.buyer_id == user.id else "seller" if c.business.owner_id == user.id else "admin"
    return ContractOut(
        id=c.id, number=c.number, status=c.status, tender_id=c.tender_id, tender_number=c.tender.number, tender_title=c.tender.title,
        bid_id=c.bid_id, total_amount=c.total_amount, terms=c.terms,
        buyer_signer=c.buyer_signer, buyer_signer_title=c.buyer_signer_title, buyer_signed_at=c.buyer_signed_at,
        buyer_signature=c.buyer_signature, buyer_cert=c.buyer_cert,
        seller_signer=c.seller_signer, seller_signer_title=c.seller_signer_title, seller_signed_at=c.seller_signed_at,
        seller_signature=c.seller_signature, seller_cert=c.seller_cert, decline_reason=c.decline_reason,
        created_at=c.created_at, updated_at=c.updated_at, my_role=role,
        counterparty=c.business.name if role == "buyer" else c.terms.get("buyer", {}).get("name", c.buyer.full_name),
        verification=svc.verify(c) if with_verify else None,
    )


def _contract(db: Session, cid: UUID, user: User) -> Contract:
    c = db.get(Contract, cid)
    if not c or (user.role != Role.admin and c.buyer_id != user.id and c.business.owner_id != user.id):
        raise HTTPException(404, "Contract not found")
    return c


@router.get("/contracts", response_model=list[ContractOut])
def contracts(status: ContractStatus | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(Contract).order_by(Contract.created_at.desc())
    if user.role == Role.buyer:
        q = q.where(Contract.buyer_id == user.id)
    elif user.role == Role.seller:
        q = q.where(Contract.business_id == _seller_biz(db, user).id)
    if status:
        q = q.where(Contract.status == status)
    return [contract_out(db, c, user) for c in db.scalars(q).all()]


@router.get("/contracts/{cid}", response_model=ContractOut)
def contract(cid: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return contract_out(db, _contract(db, cid, user), user, with_verify=True)


@router.post("/contracts/{cid}/sign", response_model=ContractOut)
def sign_contract(cid: UUID, data: SignIn, user: User = Depends(require_seller), db: Session = Depends(get_db)):
    svc.check_pin(data.pin)
    c = _contract(db, cid, user)
    if c.business.owner_id != user.id:
        raise HTTPException(404, "Contract not found")
    if c.status != ContractStatus.awaiting_seller:
        raise HTTPException(409, "This contract is not waiting for your signature")
    at = svc.now().replace(microsecond=0)
    c.seller_signer, c.seller_signer_title, c.seller_signed_at = data.signer_name.strip(), data.signer_title.strip(), at
    c.seller_signature = svc.signature(c.terms, "seller", user.id, c.seller_signer, at)
    c.seller_cert = svc.cert_serial(user.id)
    c.status = ContractStatus.signed
    t = c.tender
    t.status = TenderStatus.contracted
    c.business.completed_deals = (c.business.completed_deals or 0) + 1
    for b in t.bids:
        if b.status == BidStatus.submitted:
            b.status = BidStatus.rejected
            notify(db, b.business.owner_id, "tender", f"Buyurtma yakunlandi: {t.title}", "Xaridor boshqa taklifni tanladi.", f"/app/seller/tenders/{t.id}")
    notify(db, c.buyer_id, "contract", f"Shartnoma imzolandi: {c.number}", f"{c.business.name} shartnomani imzoladi. Shartnoma kuchga kirdi.", f"/app/contracts/{c.id}")
    audit(db, user.id, "contract.sign", "contract", c.id, number=c.number)
    db.commit()
    return contract_out(db, c, user, with_verify=True)


def _reopen(db: Session, c: Contract) -> None:
    t = c.tender
    t.status = TenderStatus.open if _utc(t.closes_at) > svc.now() else TenderStatus.expired


@router.post("/contracts/{cid}/decline", response_model=ContractOut)
def decline_contract(cid: UUID, data: DeclineIn, user: User = Depends(require_seller), db: Session = Depends(get_db)):
    c = _contract(db, cid, user)
    if c.business.owner_id != user.id or c.status != ContractStatus.awaiting_seller:
        raise HTTPException(409, "This contract is not waiting for your signature")
    c.status, c.decline_reason = ContractStatus.declined, data.reason.strip()
    c.bid.status = BidStatus.rejected
    _reopen(db, c)
    notify(db, c.buyer_id, "contract", f"Shartnoma rad etildi: {c.number}",
           f"{c.business.name}: {c.decline_reason}. Buyurtmangiz boshqa takliflar uchun qayta ochildi.", f"/app/tenders/{c.tender_id}")
    db.commit()
    return contract_out(db, c, user, with_verify=True)


@router.post("/contracts/{cid}/cancel", response_model=ContractOut)
def cancel_contract(cid: UUID, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    c = _contract(db, cid, user)
    if c.buyer_id != user.id or c.status != ContractStatus.awaiting_seller:
        raise HTTPException(409, "Only a contract that the producer has not signed yet can be withdrawn")
    c.status = ContractStatus.cancelled
    c.bid.status = BidStatus.submitted
    _reopen(db, c)
    notify(db, c.business.owner_id, "contract", f"Shartnoma bekor qilindi: {c.number}", "Xaridor shartnomani imzolashdan oldin qaytarib oldi.", f"/app/contracts/{c.id}")
    db.commit()
    return contract_out(db, c, user, with_verify=True)

from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.analytics.price_stats import q2
from app.models import Business, Offer, OfferStatus, PurchaseRequest, PurchaseRequestItem, RequestStatus, Role, User
from app.schemas.misc import RequestAction, RequestIn, RequestItemOut, RequestOut
from app.services.common import notify

# Allowed transitions: who may move a request from which state to which.
SELLER_ACTIONS = {
    "accept": ({RequestStatus.pending, RequestStatus.countered}, RequestStatus.accepted),
    "reject": ({RequestStatus.pending, RequestStatus.countered}, RequestStatus.rejected),
    "counter": ({RequestStatus.pending}, RequestStatus.countered),
    "complete": ({RequestStatus.accepted}, RequestStatus.completed),
}
BUYER_ACTIONS = {
    "cancel": ({RequestStatus.pending, RequestStatus.countered, RequestStatus.accepted}, RequestStatus.cancelled),
    "accept": ({RequestStatus.countered}, RequestStatus.accepted),  # buyer accepts a counteroffer
}


def create(db: Session, buyer: User, data: RequestIn) -> PurchaseRequest:
    offer = db.get(Offer, data.offer_id)
    if not offer or offer.status != OfferStatus.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not available")
    if offer.source_site:  # a public listing on another site: the seller is not on this platform
        raise HTTPException(422, f"This is a public listing on {offer.source_site}; contact the seller there")
    if data.quantity < offer.min_order_qty:
        raise HTTPException(422, f"Minimum order is {offer.min_order_qty.normalize()} {offer.unit}")
    req = PurchaseRequest(
        buyer_id=buyer.id,
        business_id=offer.business_id,
        offer_id=offer.id,
        delivery_region_id=data.delivery_region_id or buyer.region_id,
        requirements=data.requirements,
        items=[PurchaseRequestItem(product_id=offer.product_id, quantity=data.quantity, preferred_price=data.preferred_price)],
    )
    db.add(req)
    db.flush()
    notify(
        db,
        offer.business.owner_id,
        "request",
        f"Yangi so'rov: {offer.product.name_uz}",
        f"{buyer.full_name} {data.quantity.normalize()} {offer.unit} so'radi.",
        "/app/seller/requests",
    )
    db.commit()
    db.refresh(req)
    return req


def act(db: Session, user: User, req: PurchaseRequest, data: RequestAction) -> PurchaseRequest:
    if user.role == Role.seller:
        biz = db.query(Business).filter(Business.owner_id == user.id).one_or_none()
        if not biz or req.business_id != biz.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
        table = SELLER_ACTIONS
        recipient = req.buyer_id
        link = "/app/requests"
    elif user.role == Role.buyer:
        if req.buyer_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
        table = BUYER_ACTIONS
        recipient = req.business.owner_id
        link = "/app/seller/requests"
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")

    if data.action not in table:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Action not allowed for your role")
    sources, target = table[data.action]
    if req.status not in sources:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot {data.action} a request that is {req.status.value}")
    if data.action == "counter":
        if not data.counter_price:
            raise HTTPException(422, "Counter price is required")
        req.counter_price = data.counter_price
    if data.message:
        req.seller_message = data.message if user.role == Role.seller else req.seller_message
    req.status = target
    if target == RequestStatus.completed:
        req.business.completed_deals = (req.business.completed_deals or 0) + 1
    notify(db, recipient, "request", f"So'rov holati: {target.value}", f"{req.items[0].product.name_uz} — {target.value}", link)
    db.commit()
    db.refresh(req)
    return req


def to_out(r: PurchaseRequest) -> RequestOut:
    item = r.items[0] if r.items else None
    price = r.counter_price or (r.offer.unit_price if r.offer else None)
    est = None
    if item and price:
        delivery = r.offer.delivery_price if r.offer and r.offer.delivery_available else Decimal(0)
        est = q2(item.quantity * price + delivery)
    return RequestOut(
        id=r.id,
        status=r.status,
        requirements=r.requirements,
        counter_price=r.counter_price,
        seller_message=r.seller_message,
        created_at=r.created_at,
        updated_at=r.updated_at,
        offer_id=r.offer_id,
        delivery_region_id=r.delivery_region_id,
        items=[RequestItemOut.model_validate(i) for i in r.items],
        buyer_name=r.buyer.full_name,
        buyer_phone=r.buyer.phone,
        business_id=r.business_id,
        business_name=r.business.name,
        offer_title=r.offer.title if r.offer else None,
        offer_unit=r.offer.unit if r.offer else None,
        offer_unit_price=r.offer.unit_price if r.offer else None,
        estimated_total=est,
    )

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.analytics import cache
from app.models import Business, DataSource, Market, Offer, OfferPriceHistory, OfferStatus, Product, Region
from app.schemas.offer import OfferIn, OfferUpdate
from app.services.alerts import evaluate_for_offer


def _record_price(db: Session, offer: Offer) -> None:
    """Append a price history row. History rows are never updated or deleted by the app."""
    db.add(
        OfferPriceHistory(
            offer_id=offer.id,
            product_id=offer.product_id,
            region_id=offer.region_id,
            market_id=offer.market_id,
            price=offer.unit_price,
            available_qty=offer.available_qty,
            source=offer.source,
        )
    )


def _validate_refs(db: Session, product_id=None, region_id=None, market_id=None) -> None:
    if product_id and not db.get(Product, product_id):
        raise HTTPException(422, "Unknown product")
    if region_id and not db.get(Region, region_id):
        raise HTTPException(422, "Unknown region")
    if market_id and not db.get(Market, market_id):
        raise HTTPException(422, "Unknown market")


def create_offer(db: Session, biz: Business, data: OfferIn) -> Offer:
    _validate_refs(db, data.product_id, data.region_id, data.market_id)
    offer = Offer(business_id=biz.id, source=DataSource.seller, **data.model_dump())
    db.add(offer)
    db.flush()
    _record_price(db, offer)
    db.flush()
    evaluate_for_offer(db, offer, previous_price=None)
    db.commit()
    cache.invalidate()
    db.refresh(offer)
    return offer


def get_owned(db: Session, biz: Business, offer_id) -> Offer:
    offer = db.get(Offer, offer_id)
    if not offer or offer.status == OfferStatus.removed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    if offer.business_id != biz.id:
        # Do not leak existence of other sellers' offers
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    return offer


def update_offer(db: Session, offer: Offer, data: OfferUpdate) -> Offer:
    changes = data.model_dump(exclude_unset=True)
    _validate_refs(db, market_id=changes.get("market_id"))
    prev_price = offer.unit_price
    prev_qty = offer.available_qty
    for k, v in changes.items():
        setattr(offer, k, v)
    if offer.available_qty is not None and offer.min_order_qty > offer.available_qty and offer.available_qty > 0:
        raise HTTPException(422, "Minimum order quantity cannot exceed available quantity")
    if offer.unit_price != prev_price or offer.available_qty != prev_qty:
        _record_price(db, offer)
    db.flush()
    if offer.unit_price != prev_price:
        evaluate_for_offer(db, offer, previous_price=prev_price)
    db.commit()
    cache.invalidate()
    db.refresh(offer)
    return offer


def set_status(db: Session, offer: Offer, new_status: OfferStatus) -> Offer:
    allowed = {OfferStatus.active, OfferStatus.paused}
    if new_status not in allowed:
        raise HTTPException(422, "Sellers can only pause or activate offers")
    offer.status = new_status
    db.commit()
    cache.invalidate()
    db.refresh(offer)
    return offer


def remove_offer(db: Session, offer: Offer) -> None:
    # Soft delete keeps price history and request references intact.
    offer.status = OfferStatus.removed
    db.commit()
    cache.invalidate()

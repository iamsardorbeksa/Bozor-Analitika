from __future__ import annotations

import math
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Business, Favorite, Offer, OfferStatus, Product, ProductCategory, Quality, VerificationStatus
from app.schemas.offer import OfferOut, SupplierBrief

SORTS = {
    "price_asc": Offer.unit_price.asc(),
    "price_desc": Offer.unit_price.desc(),
    "newest": Offer.updated_at.desc(),
    "qty_desc": Offer.available_qty.desc(),
    "popular": Offer.views_count.desc(),
}


def base_query():
    return select(Offer).options(
        joinedload(Offer.business), joinedload(Offer.product).joinedload(Product.category), joinedload(Offer.region), joinedload(Offer.market)
    )


def search(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    product_id: UUID | None = None,
    region_id: UUID | None = None,
    market_id: UUID | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    min_qty: Decimal | None = None,
    quality: Quality | None = None,
    verified_only: bool = False,
    delivery_only: bool = False,
    status: OfferStatus | None = OfferStatus.active,
    business_id: UUID | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 24,
) -> tuple[list[Offer], int]:
    stmt = base_query().join(Offer.product).join(Product.category).join(Offer.business)
    if status:
        stmt = stmt.where(Offer.status == status)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Offer.title).like(like),
                func.lower(Product.name_uz).like(like),
                func.lower(Product.name_ru).like(like),
                func.lower(Product.name_en).like(like),
                func.lower(Business.name).like(like),
            )
        )
    if category:
        stmt = stmt.where(ProductCategory.slug == category)
    if product_id:
        stmt = stmt.where(Offer.product_id == product_id)
    if region_id:
        stmt = stmt.where(Offer.region_id == region_id)
    if market_id:
        stmt = stmt.where(Offer.market_id == market_id)
    if min_price is not None:
        stmt = stmt.where(Offer.unit_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Offer.unit_price <= max_price)
    if min_qty is not None:
        stmt = stmt.where(Offer.available_qty >= min_qty)
    if quality:
        stmt = stmt.where(Offer.quality == quality)
    if verified_only:
        stmt = stmt.where(Business.verification_status == VerificationStatus.verified)
    if delivery_only:
        stmt = stmt.where(Offer.delivery_available.is_(True))
    if business_id:
        stmt = stmt.where(Offer.business_id == business_id)

    total = db.scalar(select(func.count()).select_from(stmt.with_only_columns(Offer.id).order_by(None).subquery())) or 0
    stmt = stmt.order_by(SORTS.get(sort, SORTS["newest"]), Offer.id).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(stmt).unique().all()), total


def favorite_ids(db: Session, user_id: UUID | None) -> set[UUID]:
    if not user_id:
        return set()
    return set(db.scalars(select(Favorite.offer_id).where(Favorite.user_id == user_id)).all())


def to_out(o: Offer, favs: set[UUID] | None = None) -> OfferOut:
    return OfferOut(
        id=o.id,
        title=o.title,
        description=o.description,
        image_url=o.image_url or o.product.image_url,
        unit=o.unit,
        unit_price=o.unit_price,
        available_qty=o.available_qty,
        min_order_qty=o.min_order_qty,
        quality=o.quality,
        delivery_available=o.delivery_available,
        delivery_price=o.delivery_price,
        delivery_days=o.delivery_days,
        location_note=o.location_note,
        valid_until=o.valid_until,
        status=o.status,
        source=o.source.value,
        is_demo=o.is_demo,
        source_site=o.source_site,
        source_url=o.source_url,
        views_count=o.views_count,
        created_at=o.created_at,
        updated_at=o.updated_at,
        product_id=o.product_id,
        region_id=o.region_id,
        market_id=o.market_id,
        business=SupplierBrief.model_validate(o.business),
        product_name_uz=o.product.name_uz,
        product_name_ru=o.product.name_ru,
        product_name_en=o.product.name_en,
        product_emoji=o.product.emoji or "📦",
        category_slug=o.product.category.slug,
        region_name=o.region.name_uz,
        market_name=o.market.name if o.market else None,
        is_favorite=o.id in (favs or set()),
    )


def page_of(items, total: int, page: int, page_size: int) -> dict:
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": max(1, math.ceil(total / page_size))}

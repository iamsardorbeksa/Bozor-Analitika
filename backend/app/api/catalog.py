from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models import Business, Market, Offer, OfferStatus, Product, ProductCategory, Region
from app.schemas.common import CategoryOut, MarketOut, ProductOut, RegionOut

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/regions", response_model=list[RegionOut])
def regions(db: Session = Depends(get_db)):
    return db.scalars(select(Region).order_by(Region.name_uz)).all()


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    cats = db.scalars(select(ProductCategory).order_by(ProductCategory.sort_order)).all()
    counts = dict(
        db.execute(
            select(Product.category_id, func.count(Offer.id))
            .join(Offer, Offer.product_id == Product.id)
            .where(Offer.status == OfferStatus.active)
            .group_by(Product.category_id)
        ).all()
    )
    return [{**CategoryOut.model_validate(c).model_dump(mode="json"), "offer_count": counts.get(c.id, 0)} for c in cats]


@router.get("/products", response_model=list[ProductOut])
def products(category: str | None = None, db: Session = Depends(get_db)):
    q = select(Product).order_by(Product.name_uz)
    if category:
        q = q.join(Product.category).where(ProductCategory.slug == category)
    return db.scalars(q).all()


@router.get("/products/{product_id}", response_model=ProductOut)
def product(product_id: UUID, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.get("/markets")
def markets(db: Session = Depends(get_db)):
    """Markets with live offer counts and price summaries, for the map."""
    active = Offer.status == OfferStatus.active
    counts = {
        mid: (n, s)
        for mid, n, s in db.execute(
            select(Offer.market_id, func.count(Offer.id), func.count(func.distinct(Offer.business_id))).where(active).group_by(Offer.market_id)
        ).all()
    }
    # Top 6 offers per market by views, ranked in SQL with a window function.
    ranked = (
        select(Offer.id.label("oid"), func.row_number().over(partition_by=Offer.market_id, order_by=(Offer.views_count.desc(), Offer.id)).label("rn"))
        .where(active, Offer.market_id.is_not(None)).subquery()
    )
    top_rows = db.scalars(
        select(Offer).join(ranked, ranked.c.oid == Offer.id).where(ranked.c.rn <= 6)
        .options(joinedload(Offer.product), joinedload(Offer.business)).order_by(Offer.views_count.desc(), Offer.id)
    ).unique().all()
    top_by_market: dict = {}
    for o in top_rows:
        top_by_market.setdefault(o.market_id, []).append(o)
    out = []
    for m in db.scalars(select(Market).options(joinedload(Market.region))).all():
        n, s = counts.get(m.id, (0, 0))
        out.append(
            {
                **MarketOut.model_validate(m).model_dump(mode="json"),
                "region_name_uz": m.region.name_uz,
                "region_name_ru": m.region.name_ru,
                "region_name_en": m.region.name_en,
                "offer_count": n,
                "supplier_count": s,
                "top_offers": [
                    {"id": str(o.id), "product_name_uz": o.product.name_uz, "product_name_ru": o.product.name_ru, "product_name_en": o.product.name_en,
                     "product_emoji": o.product.emoji, "unit": o.unit, "unit_price": float(o.unit_price), "supplier": o.business.name,
                     "verified": o.business.is_verified}
                    for o in top_by_market.get(m.id, [])
                ],
            }
        )
    return out


@router.get("/suppliers/{business_id}")
def supplier(business_id: UUID, db: Session = Depends(get_db)):
    b = db.get(Business, business_id)
    if not b:
        raise HTTPException(404, "Supplier not found")
    active = db.scalar(select(func.count(Offer.id)).where(Offer.business_id == b.id, Offer.status == OfferStatus.active)) or 0
    return {
        "id": str(b.id), "name": b.name, "category": b.category, "description": b.description, "phone": b.phone,
        "rating": float(b.rating), "completed_deals": b.completed_deals, "verification_status": b.verification_status.value,
        "region": b.region.name_uz if b.region else None, "market": b.market.name if b.market else None,
        "active_offers": active, "member_since": b.created_at.isoformat(),
    }

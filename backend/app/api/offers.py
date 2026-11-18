from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.analytics import price_stats, scoring
from app.core.deps import get_optional_user, get_seller_business, get_current_user
from app.database.session import get_db
from app.models import Business, Offer, OfferStatus, Product, ProductView, Quality, Report, SearchLog, User
from app.repositories import offers as repo
from app.schemas.common import Msg, Page
from app.schemas.offer import CompareOut, CompareRow, OfferIn, OfferOut, OfferUpdate, ReportIn, StatusUpdate
from app.services import offers as svc

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.get("", response_model=Page[OfferOut])
def list_offers(
    q: str | None = Query(None, max_length=100),
    category: str | None = None,
    product_id: UUID | None = None,
    region_id: UUID | None = None,
    market_id: UUID | None = None,
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    min_qty: Decimal | None = Query(None, ge=0),
    quality: Quality | None = None,
    verified_only: bool = False,
    delivery_only: bool = False,
    sort: str = Query("newest", pattern="^(price_asc|price_desc|newest|qty_desc|popular)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    items, total = repo.search(
        db, q=q, category=category, product_id=product_id, region_id=region_id, market_id=market_id, min_price=min_price,
        max_price=max_price, min_qty=min_qty, quality=quality, verified_only=verified_only, delivery_only=delivery_only,
        sort=sort, page=page, page_size=page_size,
    )
    if q and len(q.strip()) >= 3 and page == 1:
        from app.ai.tools import resolve_product
        p = resolve_product(db, q)
        db.add(SearchLog(user_id=user.id if user else None, query=q.strip()[:300], product_id=p.id if p else None))
        db.commit()
    favs = repo.favorite_ids(db, user.id if user else None)
    return repo.page_of([repo.to_out(o, favs) for o in items], total, page, page_size)


@router.get("/compare", response_model=CompareOut)
def compare(
    product_id: UUID,
    quantity: Decimal = Query(Decimal("100"), gt=0, le=Decimal("100000000")),
    region_id: UUID | None = None,
    verified_only: bool = False,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")
    offers, _ = repo.search(db, product_id=product_id, region_id=region_id, verified_only=verified_only, page_size=100, sort="price_asc")
    rows = scoring.compare(offers, quantity)
    favs = repo.favorite_ids(db, user.id if user else None)
    avg_total = sum((r["total_cost"] for r in rows), Decimal(0)) / len(rows) if rows else None
    best = next((r for r in rows if r["is_recommended"]), None)
    cheap = next((r for r in rows if r["is_cheapest"]), None)
    return CompareOut(
        product_id=product_id,
        quantity=quantity,
        rows=[CompareRow(**{**{k: v for k, v in r.items() if k != "offer"}, "offer": repo.to_out(r["offer"], favs), "quantity": quantity}) for r in rows],
        recommended_offer_id=best["offer"].id if best else None,
        cheapest_offer_id=cheap["offer"].id if cheap else None,
        savings_vs_average=price_stats.q2(avg_total - best["total_cost"]) if best and avg_total else None,
        note="total_cost = quantity * unit_price + delivery_cost; score = 45% cost, 20% reliability, 15% quality, 10% delivery, 10% availability",
    )


# ------------------------------------------------------------- seller-owned offers

@router.get("/mine", response_model=Page[OfferOut])
def my_offers(
    q: str | None = None,
    status_filter: OfferStatus | None = Query(None, alias="status"),
    sort: str = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    biz: Business = Depends(get_seller_business),
    db: Session = Depends(get_db),
):
    items, total = repo.search(db, q=q, business_id=biz.id, status=status_filter, sort=sort, page=page, page_size=page_size)
    items = [o for o in items if o.status != OfferStatus.removed]
    return repo.page_of([repo.to_out(o) for o in items], total, page, page_size)


@router.post("", response_model=OfferOut, status_code=201)
def create_offer(data: OfferIn, biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    return repo.to_out(svc.create_offer(db, biz, data))


@router.patch("/{offer_id}", response_model=OfferOut)
def update_offer(offer_id: UUID, data: OfferUpdate, biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    return repo.to_out(svc.update_offer(db, svc.get_owned(db, biz, offer_id), data))


@router.post("/{offer_id}/status", response_model=OfferOut)
def change_status(offer_id: UUID, data: StatusUpdate, biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    return repo.to_out(svc.set_status(db, svc.get_owned(db, biz, offer_id), data.status))


@router.delete("/{offer_id}", response_model=Msg)
def delete_offer(offer_id: UUID, biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    svc.remove_offer(db, svc.get_owned(db, biz, offer_id))
    return Msg(message="Offer removed")


# ------------------------------------------------------------- public detail

@router.get("/{offer_id}")
def offer_detail(offer_id: UUID, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    o = db.get(Offer, offer_id)
    if not o or o.status == OfferStatus.removed:
        raise HTTPException(404, "Offer not found")
    is_owner = user is not None and o.business.owner_id == user.id
    if o.status != OfferStatus.active and not is_owner and not (user and user.role.value == "admin"):
        raise HTTPException(404, "Offer not found")
    if not is_owner:
        o.views_count += 1
        db.add(ProductView(offer_id=o.id, product_id=o.product_id, user_id=user.id if user else None))
        db.commit()
    favs = repo.favorite_ids(db, user.id if user else None)
    stats = price_stats.product_stats(db, o.product_id)
    similar, _ = repo.search(db, product_id=o.product_id, sort="price_asc", page_size=6)
    hist = [
        {"price": float(h.price), "recorded_at": h.recorded_at.isoformat()}
        for h in sorted(_offer_history(db, o.id), key=lambda h: h.recorded_at)[-30:]
    ]
    return {
        "offer": repo.to_out(o, favs).model_dump(mode="json"),
        "market_stats": {k: (float(v) if isinstance(v, Decimal) else v) for k, v in stats.items()},
        "series": price_stats.series_for(db, o.product_id, 30),
        "offer_history": hist,
        "similar": [repo.to_out(x, favs).model_dump(mode="json") for x in similar if x.id != o.id][:5],
    }


def _offer_history(db: Session, offer_id: UUID):
    from app.models import OfferPriceHistory

    return db.query(OfferPriceHistory).filter(OfferPriceHistory.offer_id == offer_id).all()


@router.post("/{offer_id}/report", response_model=Msg, status_code=201)
def report_offer(offer_id: UUID, data: ReportIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    o = db.get(Offer, offer_id)
    if not o:
        raise HTTPException(404, "Offer not found")
    db.add(Report(offer_id=o.id, reporter_id=user.id, reason=data.reason, details=data.details))
    db.commit()
    return Msg(message="Report submitted. Thank you.")

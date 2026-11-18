"""Favorites, purchase requests, notifications and price alerts."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_buyer, require_roles
from app.database.session import get_db
from app.models import (
    AlertCondition, Business, Favorite, Notification, Offer, OfferStatus, PriceAlert, Product, PurchaseRequest, Region,
    RequestStatus, Role, User,
)
from app.repositories import offers as repo
from app.schemas.common import Msg
from app.schemas.misc import AlertIn, AlertOut, AlertUpdate, FavoriteOut, NotificationOut, RequestAction, RequestIn, RequestOut
from app.services import alerts as alert_svc
from app.services import requests as req_svc

router = APIRouter(prefix="/api", tags=["buyer"])

# ------------------------------------------------------------------ favorites


@router.get("/favorites", response_model=list[FavoriteOut])
def favorites(user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    favs = db.scalars(select(Favorite).where(Favorite.user_id == user.id).order_by(Favorite.created_at.desc())).all()
    ids = {f.offer_id for f in favs}
    return [FavoriteOut(id=f.id, created_at=f.created_at, offer=repo.to_out(f.offer, ids)) for f in favs if f.offer.status != OfferStatus.removed]


@router.post("/favorites/{offer_id}", response_model=Msg, status_code=201)
def add_favorite(offer_id: UUID, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    if not db.get(Offer, offer_id):
        raise HTTPException(404, "Offer not found")
    try:
        db.add(Favorite(user_id=user.id, offer_id=offer_id))
        db.commit()
    except IntegrityError:
        db.rollback()
    return Msg(message="Saved")


@router.delete("/favorites/{offer_id}", response_model=Msg)
def remove_favorite(offer_id: UUID, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    fav = db.scalar(select(Favorite).where(Favorite.user_id == user.id, Favorite.offer_id == offer_id))
    if fav:
        db.delete(fav)
        db.commit()
    return Msg(message="Removed")


# ------------------------------------------------------------------ purchase requests


@router.get("/requests", response_model=list[RequestOut])
def list_requests(
    status: RequestStatus | None = None,
    user: User = Depends(require_roles(Role.buyer, Role.seller)),
    db: Session = Depends(get_db),
):
    q = select(PurchaseRequest).order_by(PurchaseRequest.created_at.desc())
    if user.role == Role.buyer:
        q = q.where(PurchaseRequest.buyer_id == user.id)
    else:
        biz = db.scalar(select(Business).where(Business.owner_id == user.id))
        if not biz:
            return []
        q = q.where(PurchaseRequest.business_id == biz.id)
    if status:
        q = q.where(PurchaseRequest.status == status)
    return [req_svc.to_out(r) for r in db.scalars(q).all()]


@router.post("/requests", response_model=RequestOut, status_code=201)
def create_request(data: RequestIn, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    if data.delivery_region_id and not db.get(Region, data.delivery_region_id):
        raise HTTPException(422, "Unknown region")
    return req_svc.to_out(req_svc.create(db, user, data))


@router.post("/requests/{request_id}/action", response_model=RequestOut)
def request_action(request_id: UUID, data: RequestAction, user: User = Depends(require_roles(Role.buyer, Role.seller)), db: Session = Depends(get_db)):
    req = db.get(PurchaseRequest, request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    return req_svc.to_out(req_svc.act(db, user, req, data))


# ------------------------------------------------------------------ notifications


@router.get("/notifications", response_model=list[NotificationOut])
def notifications(unread_only: bool = False, limit: int = Query(50, le=200), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    return db.scalars(q.order_by(Notification.created_at.desc()).limit(limit)).all()


@router.get("/notifications/unread-count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import func

    n = db.scalar(select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.is_read.is_(False))) or 0
    return {"count": n}


@router.post("/notifications/{nid}/read", response_model=Msg)
def mark_read(nid: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or n.user_id != user.id:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return Msg(message="ok")


@router.post("/notifications/read-all", response_model=Msg)
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(is_read=True))
    db.commit()
    return Msg(message="ok")


# ------------------------------------------------------------------ alerts


def _alert_out(db: Session, a: PriceAlert) -> AlertOut:
    out = AlertOut.model_validate(a)
    out.current_price = alert_svc.current_avg(db, a.product_id, a.region_id)
    return out


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    return [_alert_out(db, a) for a in db.scalars(select(PriceAlert).where(PriceAlert.user_id == user.id).order_by(PriceAlert.created_at.desc())).all()]


def _validate_alert(cond: AlertCondition, threshold) -> None:
    if cond != AlertCondition.verified_listing and not threshold:
        raise HTTPException(422, "Threshold is required for this alert type")
    if cond == AlertCondition.change_pct and threshold and threshold > 100:
        raise HTTPException(422, "Percentage threshold must be at most 100")


@router.post("/alerts", response_model=AlertOut, status_code=201)
def create_alert(data: AlertIn, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    if not db.get(Product, data.product_id):
        raise HTTPException(404, "Product not found")
    _validate_alert(data.condition, data.threshold)
    a = PriceAlert(user_id=user.id, **data.model_dump(), baseline_price=alert_svc.current_avg(db, data.product_id, data.region_id))
    db.add(a)
    db.commit()
    db.refresh(a)
    return _alert_out(db, a)


@router.patch("/alerts/{aid}", response_model=AlertOut)
def update_alert(aid: UUID, data: AlertUpdate, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    a = db.get(PriceAlert, aid)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Alert not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    _validate_alert(a.condition, a.threshold)
    if data.condition or data.region_id is not None:
        a.baseline_price = alert_svc.current_avg(db, a.product_id, a.region_id)
    db.commit()
    db.refresh(a)
    return _alert_out(db, a)


@router.delete("/alerts/{aid}", response_model=Msg)
def delete_alert(aid: UUID, user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    a = db.get(PriceAlert, aid)
    if not a or a.user_id != user.id:
        raise HTTPException(404, "Alert not found")
    db.delete(a)
    db.commit()
    return Msg(message="Deleted")


@router.post("/alerts/check")
def check_alerts(user: User = Depends(require_buyer), db: Session = Depends(get_db)):
    return {"triggered": alert_svc.check_user_alerts(db, user.id)}

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.ai.tools import jsonable
from app.analytics import price_stats, supply_demand
from app.core.deps import require_admin
from app.database.session import get_db
from app.models import (
    AuditLog, Business, Offer, OfferStatus, Product, ProductCategory, PurchaseRequest, Region, Report, ReportStatus,
    Role, SellerVerification, User, VerificationStatus,
)
from app.repositories import offers as repo
from app.schemas.common import Msg
from app.services.common import audit, notify

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class ReviewIn(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class ActiveIn(BaseModel):
    is_active: bool


class CategoryIn(BaseModel):
    slug: str = Field(pattern="^[a-z0-9-]{2,40}$")
    name_uz: str = Field(min_length=2, max_length=80)
    name_ru: str = Field(min_length=2, max_length=80)
    name_en: str = Field(min_length=2, max_length=80)
    icon: str = Field(default="package", max_length=40)


class ReportResolve(BaseModel):
    status: ReportStatus
    remove_offer: bool = False


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    users_by_role = dict(db.execute(select(User.role, func.count(User.id)).group_by(User.role)).all())
    since = datetime.now(timezone.utc) - timedelta(days=30)
    by_cat = db.execute(
        select(ProductCategory.slug, ProductCategory.name_uz, ProductCategory.name_ru, ProductCategory.name_en, func.count(Offer.id))
        .join(Product, Product.category_id == ProductCategory.id).join(Offer, Offer.product_id == Product.id)
        .where(Offer.status == OfferStatus.active).group_by(ProductCategory.id)
    ).all()
    by_region = db.execute(
        select(Region.code, Region.name_uz, Region.name_ru, Region.name_en, func.count(Offer.id), func.sum(Offer.views_count))
        .join(Offer, Offer.region_id == Region.id).where(Offer.status == OfferStatus.active).group_by(Region.id)
    ).all()
    signups = db.execute(select(func.date(User.created_at), func.count(User.id)).where(User.created_at >= since).group_by(func.date(User.created_at))).all()
    movers = price_stats.market_movers(db, 7, 30)
    return jsonable({
        "kpis": {
            "total_users": sum(users_by_role.values()),
            "buyers": users_by_role.get(Role.buyer, 0),
            "sellers": users_by_role.get(Role.seller, 0),
            "active_buyers": db.scalar(select(func.count(User.id)).where(User.role == Role.buyer, User.is_active.is_(True))) or 0,
            "active_sellers": db.scalar(select(func.count(User.id)).where(User.role == Role.seller, User.is_active.is_(True))) or 0,
            "verified_sellers": db.scalar(select(func.count(Business.id)).where(Business.verification_status == VerificationStatus.verified)) or 0,
            "pending_verifications": db.scalar(select(func.count(Business.id)).where(Business.verification_status == VerificationStatus.pending)) or 0,
            "total_offers": db.scalar(select(func.count(Offer.id)).where(Offer.status != OfferStatus.removed)) or 0,
            "active_offers": db.scalar(select(func.count(Offer.id)).where(Offer.status == OfferStatus.active)) or 0,
            "purchase_requests": db.scalar(select(func.count(PurchaseRequest.id))) or 0,
            "open_reports": db.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.open)) or 0,
        },
        "by_category": [{"slug": s, "name_uz": a, "name_ru": b, "name_en": c, "offers": n} for s, a, b, c, n in by_cat],
        "by_region": [{"code": s, "name_uz": a, "name_ru": b, "name_en": c, "offers": n, "views": int(v or 0)} for s, a, b, c, n, v in by_region],
        "signups": [{"date": str(d), "count": n} for d, n in sorted(signups, key=lambda r: str(r[0]))],
        "spikes": [m for m in movers if abs(m["change_pct"]) >= 8][:8],
        "demand_gaps": supply_demand.demand_gaps(db),
    })


@router.get("/users")
def users(q: str | None = None, role: Role | None = None, is_active: bool | None = None, page: int = Query(1, ge=1),
          page_size: int = Query(25, le=100), db: Session = Depends(get_db)):
    stmt = select(User)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.full_name).like(like), func.lower(User.email).like(like), User.phone.like(like)))
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [{"id": str(u.id), "full_name": u.full_name, "email": u.email, "phone": u.phone, "role": u.role.value, "is_active": u.is_active,
              "is_demo": u.is_demo, "region": u.region.name_uz if u.region else None, "created_at": u.created_at.isoformat(),
              "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
              "business": {"id": str(u.business.id), "name": u.business.name, "verification_status": u.business.verification_status.value} if u.business else None}
             for u in rows]
    return repo.page_of(items, total, page, page_size)


@router.post("/users/{uid}/active", response_model=Msg)
def set_active(uid: UUID, data: ActiveIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == admin.id:
        raise HTTPException(400, "You cannot suspend your own account")
    u.is_active = data.is_active
    if u.business and not data.is_active:
        for o in db.scalars(select(Offer).where(Offer.business_id == u.business.id, Offer.status == OfferStatus.active)):
            o.status = OfferStatus.paused
    audit(db, admin.id, "user.reactivate" if data.is_active else "user.suspend", "user", u.id, email=u.email)
    db.commit()
    return Msg(message="Updated")


@router.get("/verifications")
def verifications(status: VerificationStatus | None = VerificationStatus.pending, db: Session = Depends(get_db)):
    q = select(SellerVerification).order_by(SellerVerification.created_at.desc())
    if status:
        q = q.where(SellerVerification.status == status)
    rows = db.scalars(q.limit(200)).all()
    out = []
    for v in rows:
        b = v.business
        n_offers = db.scalar(select(func.count(Offer.id)).where(Offer.business_id == b.id, Offer.status != OfferStatus.removed)) or 0
        out.append({"id": str(v.id), "status": v.status.value, "document_note": v.document_note, "review_note": v.review_note,
                    "created_at": v.created_at.isoformat(), "reviewed_at": v.reviewed_at.isoformat() if v.reviewed_at else None,
                    "business": {"id": str(b.id), "name": b.name, "category": b.category, "phone": b.phone, "rating": float(b.rating),
                                 "region": b.region.name_uz if b.region else None, "owner": b.owner.full_name, "email": b.owner.email,
                                 "offers": n_offers, "created_at": b.created_at.isoformat()}})
    return out


def _review(db: Session, admin: User, vid: UUID, approve: bool, note: str | None):
    v = db.get(SellerVerification, vid)
    if not v:
        raise HTTPException(404, "Verification request not found")
    if v.status != VerificationStatus.pending:
        raise HTTPException(409, "Request already reviewed")
    now = datetime.now(timezone.utc)
    v.status = VerificationStatus.verified if approve else VerificationStatus.rejected
    v.review_note, v.reviewed_by, v.reviewed_at = note, admin.id, now
    v.business.verification_status = v.status
    v.business.verified_at = now if approve else None
    notify(db, v.business.owner_id, "verification", "Tasdiqlash: " + ("tasdiqlandi" if approve else "rad etildi"), note or "", "/app/seller/profile")
    audit(db, admin.id, "seller.approve" if approve else "seller.reject", "business", v.business_id, note=note, business=v.business.name)
    db.commit()


@router.post("/verifications/{vid}/approve", response_model=Msg)
def approve(vid: UUID, data: ReviewIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _review(db, admin, vid, True, data.note)
    return Msg(message="Approved")


@router.post("/verifications/{vid}/reject", response_model=Msg)
def reject(vid: UUID, data: ReviewIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _review(db, admin, vid, False, data.note)
    return Msg(message="Rejected")


@router.get("/offers")
def offers(q: str | None = None, status: OfferStatus | None = None, flagged: bool = False, page: int = Query(1, ge=1),
           page_size: int = Query(25, le=100), db: Session = Depends(get_db)):
    if flagged:  # flag first, then paginate, so pages aren't empty
        items, _ = repo.search(db, q=q, status=status, page=1, page_size=100_000, sort="newest")
    else:
        items, total = repo.search(db, q=q, status=status, page=page, page_size=page_size, sort="newest")
    out = []
    for o in items:
        snap = price_stats.snapshot([x for x in db.scalars(select(Offer.unit_price).where(Offer.product_id == o.product_id, Offer.status == OfferStatus.active)).all()])
        ratio = float(o.unit_price / snap["median"]) if snap["median"] else None
        suspicious = ratio is not None and (ratio > 2.5 or ratio < 0.4)
        reports = db.scalar(select(func.count(Report.id)).where(Report.offer_id == o.id, Report.status == ReportStatus.open)) or 0
        if flagged and not (suspicious or reports):
            continue
        out.append({**repo.to_out(o).model_dump(mode="json"), "median_ratio": round(ratio, 2) if ratio else None, "suspicious": suspicious, "open_reports": reports})
    if flagged:
        return repo.page_of(out[(page - 1) * page_size: page * page_size], len(out), page, page_size)
    return repo.page_of(out, total, page, page_size)


@router.post("/offers/{oid}/remove", response_model=Msg)
def remove_offer(oid: UUID, data: ReviewIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    o = db.get(Offer, oid)
    if not o:
        raise HTTPException(404, "Offer not found")
    o.status = OfferStatus.removed
    notify(db, o.business.owner_id, "system", "Taklif olib tashlandi", data.note or o.title, "/app/seller/products")
    audit(db, admin.id, "offer.remove", "offer", o.id, title=o.title, note=data.note)
    db.commit()
    return Msg(message="Removed")


@router.post("/offers/{oid}/restore", response_model=Msg)
def restore_offer(oid: UUID, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    o = db.get(Offer, oid)
    if not o:
        raise HTTPException(404, "Offer not found")
    o.status = OfferStatus.paused
    audit(db, admin.id, "offer.restore", "offer", o.id, title=o.title)
    db.commit()
    return Msg(message="Restored as paused")


@router.get("/reports")
def reports(status: ReportStatus | None = ReportStatus.open, db: Session = Depends(get_db)):
    q = select(Report).order_by(Report.created_at.desc())
    if status:
        q = q.where(Report.status == status)
    return [{"id": str(r.id), "reason": r.reason, "details": r.details, "status": r.status.value, "created_at": r.created_at.isoformat(),
             "offer": repo.to_out(r.offer).model_dump(mode="json")} for r in db.scalars(q.limit(200)).all()]


@router.post("/reports/{rid}/resolve", response_model=Msg)
def resolve_report(rid: UUID, data: ReportResolve, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    r = db.get(Report, rid)
    if not r:
        raise HTTPException(404, "Report not found")
    r.status, r.resolved_by = data.status, admin.id
    if data.remove_offer:
        r.offer.status = OfferStatus.removed
    audit(db, admin.id, f"report.{data.status.value}", "report", r.id, offer=r.offer.title, removed=data.remove_offer)
    db.commit()
    return Msg(message="Updated")


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    cats = db.scalars(select(ProductCategory).order_by(ProductCategory.sort_order)).all()
    return [{"id": str(c.id), "slug": c.slug, "name_uz": c.name_uz, "name_ru": c.name_ru, "name_en": c.name_en, "icon": c.icon,
             "products": db.scalar(select(func.count(Product.id)).where(Product.category_id == c.id)) or 0} for c in cats]


@router.post("/categories", response_model=Msg, status_code=201)
def create_category(data: CategoryIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.scalar(select(ProductCategory).where(ProductCategory.slug == data.slug)):
        raise HTTPException(409, "Category slug already exists")
    c = ProductCategory(**data.model_dump(), sort_order=100)
    db.add(c)
    db.flush()
    audit(db, admin.id, "category.create", "category", c.id, slug=c.slug)
    db.commit()
    return Msg(message="Created")


@router.patch("/categories/{cid}", response_model=Msg)
def update_category(cid: UUID, data: CategoryIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    c = db.get(ProductCategory, cid)
    if not c:
        raise HTTPException(404, "Category not found")
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    audit(db, admin.id, "category.update", "category", c.id, slug=c.slug)
    db.commit()
    return Msg(message="Updated")


@router.get("/price-monitoring")
def price_monitoring(db: Session = Depends(get_db)):
    movers = price_stats.market_movers(db, 7, 60)
    return {"movers": movers, "spikes": [m for m in movers if abs(m["change_pct"]) >= 8],
            "supply": supply_demand.overview(db)}


@router.get("/audit-logs")
def audit_logs(limit: int = Query(100, le=500), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()
    return [{"id": str(a.id), "action": a.action, "entity_type": a.entity_type, "entity_id": a.entity_id, "details": a.details,
             "actor": a.actor.full_name if a.actor else None, "created_at": a.created_at.isoformat()} for a in rows]


# ------------------------------------------------------------------ real prices from public websites
@router.get("/sources")
def sources(db: Session = Depends(get_db)):
    """What each source site contributes, and the state of the last refresh."""
    from app.scraping import run as scrape_run

    rows = db.execute(
        select(Offer.source_site, Offer.status, func.count(Offer.id), func.max(Offer.updated_at))
        .where(Offer.source_site.is_not(None)).group_by(Offer.source_site, Offer.status)
    ).all()
    sites: dict[str, dict] = {}
    for site, st, n, last in rows:
        s = sites.setdefault(site, {"site": site, "active": 0, "expired": 0, "last_change": None})
        s["active" if st == OfferStatus.active else "expired"] += n
        if last and (not s["last_change"] or last.isoformat() > s["last_change"]):
            s["last_change"] = last.isoformat()
    return {"sites": list(sites.values()), "unavailable": scrape_run.UNAVAILABLE, "refresh": jsonable(scrape_run.status)}


@router.post("/sources/refresh", response_model=Msg, status_code=202)
def refresh_sources(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.database.session import SessionLocal
    from app.scraping import run as scrape_run

    if not scrape_run.start_background(SessionLocal):
        raise HTTPException(409, "A refresh is already running")
    audit(db, admin.id, "sources.refresh", "offer", None)
    db.commit()
    return Msg(message="Refresh started")

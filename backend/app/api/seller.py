"""Seller business profile, verification requests and image uploads."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_seller_business
from app.database.session import get_db
from app.models import Business, Market, Region, SellerVerification, User, VerificationStatus
from app.schemas.common import Msg
from app.schemas.misc import BusinessOut, BusinessUpdate, VerificationIn

router = APIRouter(prefix="/api", tags=["seller"])

ALLOWED = {b"\xff\xd8\xff": ".jpg", b"\x89PNG\r\n\x1a\n": ".png", b"RIFF": ".webp"}


@router.get("/businesses/me", response_model=BusinessOut)
def my_business(biz: Business = Depends(get_seller_business)):
    return biz


@router.patch("/businesses/me", response_model=BusinessOut)
def update_business(data: BusinessUpdate, biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    changes = data.model_dump(exclude_unset=True)
    if changes.get("region_id") and not db.get(Region, changes["region_id"]):
        raise HTTPException(422, "Unknown region")
    if changes.get("market_id") and not db.get(Market, changes["market_id"]):
        raise HTTPException(422, "Unknown market")
    for k, v in changes.items():
        setattr(biz, k, v)
    db.commit()
    db.refresh(biz)
    return biz


@router.get("/businesses/me/verification")
def verification_history(biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    rows = db.scalars(select(SellerVerification).where(SellerVerification.business_id == biz.id).order_by(SellerVerification.created_at.desc())).all()
    return [{"id": str(r.id), "status": r.status.value, "document_note": r.document_note, "review_note": r.review_note,
             "created_at": r.created_at.isoformat(), "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None} for r in rows]


@router.post("/businesses/me/verification", response_model=Msg, status_code=201)
def request_verification(data: VerificationIn, biz: Business = Depends(get_seller_business), db: Session = Depends(get_db)):
    if biz.verification_status == VerificationStatus.verified:
        raise HTTPException(409, "Business is already verified")
    if biz.verification_status == VerificationStatus.pending:
        raise HTTPException(409, "A verification request is already pending")
    biz.verification_status = VerificationStatus.pending
    db.add(SellerVerification(business_id=biz.id, status=VerificationStatus.pending, document_note=data.document_note))
    db.commit()
    return Msg(message="Verification requested")


@router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    s = get_settings()
    data = await file.read(s.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File too large (max {s.max_upload_mb} MB)")
    ext = next((e for sig, e in ALLOWED.items() if data.startswith(sig)), None)
    if ext == ".webp" and data[8:12] != b"WEBP":
        ext = None
    if not ext:
        raise HTTPException(415, "Only JPEG, PNG or WEBP images are allowed")
    Path(s.upload_dir).mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"  # never trust the client filename
    (Path(s.upload_dir) / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}

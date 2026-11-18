from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token, hash_password, verify_password
from app.database.session import get_db
from app.models import Business, Region, Role, SellerVerification, User, VerificationStatus
from app.schemas.auth import ForgotIn, LoginIn, PasswordChange, RegisterIn, TokenOut, UserOut, UserUpdate
from app.schemas.common import Msg
from app.services.common import notify

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201, dependencies=[Depends(rate_limit("register", 10, 3600))])
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    if not db.get(Region, data.region_id):
        raise HTTPException(422, "Unknown region")
    user = User(
        email=email,
        phone=data.phone,
        full_name=data.full_name.strip(),
        password_hash=hash_password(data.password),
        role=data.role,
        region_id=data.region_id,
        business_category=data.business_category,
        language=data.language,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    if data.role == Role.seller:
        biz = Business(owner_id=user.id, name=data.business_name.strip(), category=data.business_category, phone=data.phone,
                       region_id=data.region_id, verification_status=VerificationStatus.pending)
        db.add(biz)
        db.flush()
        db.add(SellerVerification(business_id=biz.id, status=VerificationStatus.pending, document_note="Submitted at registration"))
    notify(db, user.id, "system", "Bozor-Analitikaga xush kelibsiz!", "Hisobingiz yaratildi.", "/app")
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id, user.role.value), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(rate_limit("login", 20, 300))])
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account suspended. Contact support.")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return TokenOut(access_token=create_access_token(user.id, user.role.value), user=UserOut.model_validate(user))


@router.post("/forgot-password", response_model=Msg, dependencies=[Depends(rate_limit("forgot", 5, 3600))])
def forgot_password(_: ForgotIn):
    # Same response whether or not the account exists (no user enumeration).
    # Email delivery needs an SMTP provider; see docs/DEPLOYMENT notes.
    return Msg(message="If an account exists for this email, reset instructions will be sent.")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    changes = data.model_dump(exclude_unset=True)
    if "region_id" in changes and changes["region_id"] and not db.get(Region, changes["region_id"]):
        raise HTTPException(422, "Unknown region")
    for k, v in changes.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", response_model=Msg, dependencies=[Depends(rate_limit("pwchange", 10, 3600))])
def change_password(data: PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return Msg(message="Password updated")

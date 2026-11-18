from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database.session import get_db
from app.models import Business, Role, User

bearer = HTTPBearer(auto_error=False)


def _user_from_token(creds: HTTPAuthorizationCredentials | None, db: Session) -> User | None:
    if not creds:
        return None
    payload = decode_token(creds.credentials)
    if not payload:
        return None
    try:
        user = db.get(User, UUID(payload["sub"]))
    except (KeyError, ValueError):
        return None
    if not user or not user.is_active:
        return None
    return user


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    user = _user_from_token(creds, db)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    return user


def get_optional_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User | None:
    return _user_from_token(creds, db)


def require_roles(*roles: Role):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this resource")
        return user

    return dep


require_buyer = require_roles(Role.buyer)
require_seller = require_roles(Role.seller)
require_admin = require_roles(Role.admin)


def get_seller_business(user: User = Depends(require_seller), db: Session = Depends(get_db)) -> Business:
    biz = db.query(Business).filter(Business.owner_id == user.id).one_or_none()
    if not biz:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business profile not found")
    return biz

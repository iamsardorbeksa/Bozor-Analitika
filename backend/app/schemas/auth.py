from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models import Role
from app.schemas.common import ORM


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=32, pattern=r"^\+?[0-9 ()-]{7,32}$")
    password: str = Field(min_length=8, max_length=128)
    role: Role
    business_name: str | None = Field(default=None, max_length=160)
    region_id: UUID
    business_category: str | None = Field(default=None, max_length=80)
    language: str = Field(default="uz", pattern="^(uz|ru|en)$")

    @field_validator("role")
    @classmethod
    def no_self_admin(cls, v: Role) -> Role:
        if v == Role.admin:
            raise ValueError("Admin accounts cannot be self-registered")
        return v

    @field_validator("password")
    @classmethod
    def strong_enough(cls, v: str) -> str:
        if not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
            raise ValueError("Password must contain letters and digits")
        return v

    @model_validator(mode="after")
    def seller_needs_business(self):
        if self.role == Role.seller and not (self.business_name and self.business_name.strip()):
            raise ValueError("Business name is required for sellers")
        return self


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ForgotIn(BaseModel):
    email: EmailStr


class BusinessBrief(ORM):
    id: UUID
    name: str
    verification_status: str


class UserOut(ORM):
    id: UUID
    email: str
    phone: str | None
    full_name: str
    role: Role
    region_id: UUID | None
    business_category: str | None
    language: str
    is_active: bool
    is_demo: bool
    created_at: datetime
    business: BusinessBrief | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=7, max_length=32)
    region_id: UUID | None = None
    language: str | None = Field(default=None, pattern="^(uz|ru|en)$")
    business_category: str | None = Field(default=None, max_length=80)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

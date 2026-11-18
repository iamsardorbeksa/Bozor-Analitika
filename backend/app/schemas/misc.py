from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import AlertCondition, RequestStatus
from app.schemas.common import MoneyOut, ORM, ProductOut, QtyOut
from app.schemas.offer import OfferOut


class RequestItemOut(ORM):
    id: UUID
    product_id: UUID
    quantity: QtyOut
    preferred_price: MoneyOut | None
    product: ProductOut


class RequestOut(ORM):
    id: UUID
    status: RequestStatus
    requirements: str | None
    counter_price: MoneyOut | None
    seller_message: str | None
    created_at: datetime
    updated_at: datetime
    offer_id: UUID | None
    delivery_region_id: UUID | None
    items: list[RequestItemOut]
    buyer_name: str
    buyer_phone: str | None
    business_id: UUID
    business_name: str
    offer_title: str | None
    offer_unit: str | None
    offer_unit_price: MoneyOut | None
    estimated_total: MoneyOut | None


class RequestIn(BaseModel):
    offer_id: UUID
    quantity: Decimal = Field(gt=0, le=Decimal("100000000"))
    preferred_price: Decimal | None = Field(default=None, gt=0)
    delivery_region_id: UUID | None = None
    requirements: str | None = Field(default=None, max_length=1000)


class RequestAction(BaseModel):
    action: str = Field(pattern="^(accept|reject|counter|complete|cancel)$")
    counter_price: Decimal | None = Field(default=None, gt=0)
    message: str | None = Field(default=None, max_length=1000)


class NotificationOut(ORM):
    id: UUID
    kind: str
    title: str
    body: str
    link: str | None
    is_read: bool
    created_at: datetime


class AlertIn(BaseModel):
    product_id: UUID
    region_id: UUID | None = None
    condition: AlertCondition
    threshold: Decimal | None = Field(default=None, gt=0)


class AlertUpdate(BaseModel):
    region_id: UUID | None = None
    condition: AlertCondition | None = None
    threshold: Decimal | None = Field(default=None, gt=0)
    is_active: bool | None = None


class AlertOut(ORM):
    id: UUID
    product_id: UUID
    region_id: UUID | None
    condition: AlertCondition
    threshold: MoneyOut | None
    baseline_price: MoneyOut | None
    is_active: bool
    last_triggered_at: datetime | None
    created_at: datetime
    product: ProductOut
    current_price: MoneyOut | None = None


class FavoriteOut(BaseModel):
    id: UUID
    created_at: datetime
    offer: OfferOut


class BusinessOut(ORM):
    id: UUID
    name: str
    category: str | None
    description: str | None
    phone: str | None
    region_id: UUID | None
    market_id: UUID | None
    rating: MoneyOut
    completed_deals: int
    verification_status: str
    verified_at: datetime | None
    created_at: datetime


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=32)
    region_id: UUID | None = None
    market_id: UUID | None = None


class VerificationIn(BaseModel):
    document_note: str = Field(min_length=5, max_length=1000)


class AIChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: UUID | None = None
    language: str = Field(default="uz", pattern="^(uz|ru|en)$")


class AIMessageOut(ORM):
    id: UUID
    role: str
    content: str
    tool_calls: list | None
    mode: str | None
    created_at: datetime


class AIChatOut(BaseModel):
    conversation_id: UUID
    message: AIMessageOut
    ai_available: bool


class ConversationOut(ORM):
    id: UUID
    title: str
    created_at: datetime

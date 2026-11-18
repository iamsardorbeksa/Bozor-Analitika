from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models import OfferStatus, Quality
from app.schemas.common import MoneyOut, ORM, QtyOut


class SupplierBrief(ORM):
    id: UUID
    name: str
    rating: MoneyOut
    verification_status: str
    completed_deals: int
    phone: str | None


class OfferOut(ORM):
    id: UUID
    title: str
    description: str | None
    image_url: str | None
    unit: str
    unit_price: MoneyOut
    available_qty: QtyOut | None  # None = not stated by the source
    min_order_qty: QtyOut
    quality: Quality
    delivery_available: bool
    delivery_price: MoneyOut
    delivery_days: int
    location_note: str | None
    valid_until: datetime | None
    status: OfferStatus
    source: str
    is_demo: bool
    source_site: str | None = None  # e.g. korzinka.uz, olx.uz (real price observed there)
    source_url: str | None = None
    views_count: int
    created_at: datetime
    updated_at: datetime
    product_id: UUID
    region_id: UUID
    market_id: UUID | None
    business: SupplierBrief
    product_name_uz: str
    product_name_ru: str
    product_name_en: str
    product_emoji: str
    category_slug: str
    region_name: str
    market_name: str | None
    is_favorite: bool = False


class OfferIn(BaseModel):
    product_id: UUID
    title: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=300)
    unit: str = Field(min_length=1, max_length=16)
    unit_price: Decimal = Field(gt=0, le=Decimal("1000000000"), decimal_places=2)
    available_qty: Decimal = Field(ge=0, le=Decimal("100000000"))
    min_order_qty: Decimal = Field(gt=0, le=Decimal("100000000"))
    quality: Quality = Quality.standard
    delivery_available: bool = False
    delivery_price: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("100000000"))
    delivery_days: int = Field(default=1, ge=0, le=60)
    region_id: UUID
    market_id: UUID | None = None
    location_note: str | None = Field(default=None, max_length=160)
    valid_until: datetime | None = None

    @model_validator(mode="after")
    def moq_le_stock(self):
        if self.available_qty and self.min_order_qty > self.available_qty:
            raise ValueError("Minimum order quantity cannot exceed available quantity")
        return self


class OfferUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=300)
    unit_price: Decimal | None = Field(default=None, gt=0, le=Decimal("1000000000"))
    available_qty: Decimal | None = Field(default=None, ge=0, le=Decimal("100000000"))
    min_order_qty: Decimal | None = Field(default=None, gt=0)
    quality: Quality | None = None
    delivery_available: bool | None = None
    delivery_price: Decimal | None = Field(default=None, ge=0)
    delivery_days: int | None = Field(default=None, ge=0, le=60)
    market_id: UUID | None = None
    location_note: str | None = Field(default=None, max_length=160)
    valid_until: datetime | None = None


class StatusUpdate(BaseModel):
    status: OfferStatus


class CompareRow(BaseModel):
    offer: OfferOut
    quantity: QtyOut
    subtotal: MoneyOut
    delivery_cost: MoneyOut
    total_cost: MoneyOut
    meets_moq: bool
    enough_stock: bool
    score: float
    score_breakdown: dict[str, float]
    reasons: list[str]
    is_recommended: bool
    is_cheapest: bool


class CompareOut(BaseModel):
    product_id: UUID
    quantity: QtyOut
    rows: list[CompareRow]
    recommended_offer_id: UUID | None
    cheapest_offer_id: UUID | None
    savings_vs_average: MoneyOut | None
    note: str


class ReportIn(BaseModel):
    reason: str = Field(pattern="^(price_suspicious|fake_seller|wrong_info|other)$")
    details: str | None = Field(default=None, max_length=1000)

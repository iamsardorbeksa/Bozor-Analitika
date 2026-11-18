from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models import BidStatus, ContractStatus, PaymentTerms, Quality, TenderStatus
from app.schemas.common import MoneyOut, QtyOut


class Named(BaseModel):
    id: UUID | None = None
    slug: str | None = None
    name_uz: str
    name_ru: str
    name_en: str
    emoji: str | None = None


class TenderIn(BaseModel):
    category: str = Field(min_length=2, max_length=40)  # category slug
    product_id: UUID | None = None
    title: str = Field(min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=3000)
    quantity: Decimal = Field(gt=0, le=Decimal("100000000"))
    unit: str = Field(min_length=1, max_length=16)
    target_price: Decimal | None = Field(default=None, gt=0, le=Decimal("10000000000"))
    quality: Quality | None = None
    payment_terms: PaymentTerms | None = None
    delivery_required: bool = True
    delivery_region_id: UUID
    delivery_address: str | None = Field(default=None, max_length=200)
    needed_by: datetime
    closes_at: datetime

    @model_validator(mode="after")
    def dates(self):
        if self.closes_at > self.needed_by:
            raise ValueError("The offers deadline must be before the delivery date")
        return self


class ExtendIn(BaseModel):
    closes_at: datetime


class BidIn(BaseModel):
    unit_price: Decimal = Field(gt=0, le=Decimal("10000000000"))
    delivery_price: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("10000000000"))
    lead_time_days: int = Field(ge=1, le=365)
    payment_terms: PaymentTerms
    quality: Quality = Quality.standard
    warranty_months: int = Field(default=0, ge=0, le=120)
    valid_days: int = Field(default=10, ge=1, le=90)
    min_quantity: Decimal | None = Field(default=None, gt=0)
    comment: str | None = Field(default=None, max_length=2000)


class AwardIn(BaseModel):
    bid_id: UUID
    buyer_company: str = Field(min_length=2, max_length=160)
    signer_title: str = Field(min_length=2, max_length=80)
    delivery_address: str = Field(min_length=3, max_length=200)
    extra_terms: str | None = Field(default=None, max_length=1500)
    pin: str = Field(min_length=4, max_length=12)


class SignIn(BaseModel):
    signer_name: str = Field(min_length=3, max_length=120)
    signer_title: str = Field(min_length=2, max_length=80)
    pin: str = Field(min_length=4, max_length=12)


class DeclineIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class BidderBrief(BaseModel):
    id: UUID
    name: str
    rating: MoneyOut
    verified: bool
    completed_deals: int
    region: str | None
    phone: str | None


class BidOut(BaseModel):
    id: UUID
    tender_id: UUID
    business: BidderBrief
    unit_price: MoneyOut
    delivery_price: MoneyOut
    total: MoneyOut
    lead_time_days: int
    ready_date: datetime
    payment_terms: PaymentTerms
    quality: Quality
    warranty_months: int
    valid_days: int
    valid_until: datetime
    min_quantity: QtyOut | None
    comment: str | None
    status: BidStatus
    created_at: datetime
    updated_at: datetime
    score: float | None = None
    badges: list[str] = []
    meets_deadline: bool | None = None
    within_budget: bool | None = None


class TenderOut(BaseModel):
    id: UUID
    number: str
    title: str
    description: str | None
    category: Named
    product: Named | None
    quantity: QtyOut
    unit: str
    target_price: MoneyOut | None
    estimated_value: MoneyOut | None  # quantity x (target price or market median)
    market_price: MoneyOut | None  # median of current offers for the product (real prices)
    quality: Quality | None
    payment_terms: PaymentTerms | None
    delivery_required: bool
    region: Named
    delivery_address: str | None
    needed_by: datetime
    closes_at: datetime
    status: TenderStatus
    created_at: datetime
    views_count: int
    bids_count: int
    buyer_label: str  # "Restoran · Dilnoza R." (no contact details before a contract)
    is_mine: bool = False
    matches_me: bool | None = None
    my_bid: BidOut | None = None
    contract_id: UUID | None = None


class TenderDetail(TenderOut):
    bids: list[BidOut] = []


class ContractOut(BaseModel):
    id: UUID
    number: str
    status: ContractStatus
    tender_id: UUID
    tender_number: str
    tender_title: str
    bid_id: UUID
    total_amount: MoneyOut
    terms: dict
    buyer_signer: str
    buyer_signer_title: str
    buyer_signed_at: datetime
    buyer_signature: str
    buyer_cert: str
    seller_signer: str | None
    seller_signer_title: str | None
    seller_signed_at: datetime | None
    seller_signature: str | None
    seller_cert: str | None
    decline_reason: str | None
    created_at: datetime
    updated_at: datetime
    my_role: str  # buyer / seller / admin
    counterparty: str
    verification: dict | None = None

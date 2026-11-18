"""SQLAlchemy ORM models. All money columns are Numeric (UZS), never float."""
import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

Money = Numeric(16, 2)
Qty = Numeric(14, 2)


class UTCDateTime(TypeDecorator):
    """Timezone-aware UTC datetimes on every backend (SQLite drops tzinfo)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc) if value is not None else None

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _enum(e: type[enum.Enum], name: str):
    return Enum(e, name=name, native_enum=False, length=24, values_callable=lambda x: [m.value for m in x])


class Role(str, enum.Enum):
    buyer = "buyer"
    seller = "seller"
    admin = "admin"


class VerificationStatus(str, enum.Enum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class Quality(str, enum.Enum):
    premium = "premium"
    first = "first"
    standard = "standard"
    economy = "economy"


class OfferStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    expired = "expired"
    removed = "removed"


class DataSource(str, enum.Enum):
    seller = "seller"  # posted by a registered seller
    demo = "demo"  # generated demonstration data
    field = "field"  # collected at a bazaar by the team
    web = "web"  # observed on a public website (korzinka.uz, olx.uz), see app/scraping


class RequestStatus(str, enum.Enum):
    pending = "pending"
    countered = "countered"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"
    cancelled = "cancelled"


class AlertCondition(str, enum.Enum):
    below = "below"  # price falls below threshold
    above = "above"  # price rises above threshold
    change_pct = "change_pct"  # price changes by >= threshold %
    verified_listing = "verified_listing"  # verified seller lists product in region


class MarketType(str, enum.Enum):
    bazaar = "bazaar"
    wholesale = "wholesale"
    warehouse = "warehouse"


class ReportStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    dismissed = "dismissed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)


class Region(Base):
    __tablename__ = "regions"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name_uz: Mapped[str] = mapped_column(String(80))
    name_ru: Mapped[str] = mapped_column(String(80))
    name_en: Mapped[str] = mapped_column(String(80))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)


class Market(Base):
    __tablename__ = "markets"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    region_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("regions.id"), index=True)
    type: Mapped[MarketType] = mapped_column(_enum(MarketType, "market_type"), default=MarketType.bazaar)
    address: Mapped[str | None] = mapped_column(String(200))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    approximate_location: Mapped[bool] = mapped_column(Boolean, default=True)
    region: Mapped[Region] = relationship()


class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[Role] = mapped_column(_enum(Role, "user_role"), index=True)
    region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"))
    business_category: Mapped[str | None] = mapped_column(String(80))
    language: Mapped[str] = mapped_column(String(4), default="uz")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    region: Mapped[Region | None] = relationship()
    business: Mapped["Business | None"] = relationship(back_populates="owner", uselist=False)


class Business(TimestampMixin, Base):
    __tablename__ = "businesses"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str | None] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(32))
    region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"))
    market_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("markets.id"))
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("4.00"))
    completed_deals: Mapped[int] = mapped_column(Integer, default=0)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        _enum(VerificationStatus, "verification_status"), default=VerificationStatus.unverified, index=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    owner: Mapped[User] = relationship(back_populates="business")
    region: Mapped[Region | None] = relationship()
    market: Mapped[Market | None] = relationship()

    @property
    def is_verified(self) -> bool:
        return self.verification_status == VerificationStatus.verified


class SellerVerification(TimestampMixin, Base):
    __tablename__ = "seller_verifications"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    status: Mapped[VerificationStatus] = mapped_column(_enum(VerificationStatus, "verification_status"))
    document_note: Mapped[str | None] = mapped_column(Text)
    review_note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    business: Mapped[Business] = relationship()


class ProductCategory(Base):
    __tablename__ = "product_categories"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    name_uz: Mapped[str] = mapped_column(String(80))
    name_ru: Mapped[str] = mapped_column(String(80))
    name_en: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(40), default="package")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_categories.id"), index=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    name_uz: Mapped[str] = mapped_column(String(100), index=True)
    name_ru: Mapped[str] = mapped_column(String(100))
    name_en: Mapped[str] = mapped_column(String(100))
    unit: Mapped[str] = mapped_column(String(16))  # kg, l, piece, m, t, sack
    image_url: Mapped[str | None] = mapped_column(String(300))
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list)
    emoji: Mapped[str] = mapped_column(String(16), default="📦", server_default="📦")
    category: Mapped[ProductCategory] = relationship()


class Offer(TimestampMixin, Base):
    __tablename__ = "offers"
    __table_args__ = (
        Index("ix_offers_product_status", "product_id", "status"),
        Index("ix_offers_region_status", "region_id", "status"),
        UniqueConstraint("source_site", "external_id", name="uq_offer_external"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), index=True)
    market_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("markets.id"))
    region_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("regions.id"))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(300))
    unit: Mapped[str] = mapped_column(String(16))
    unit_price: Mapped[Decimal] = mapped_column(Money)
    # NULL = not stated (public listings rarely say how much stock there is)
    available_qty: Mapped[Decimal | None] = mapped_column(Qty, nullable=True)
    min_order_qty: Mapped[Decimal] = mapped_column(Qty, default=Decimal("1"))
    quality: Mapped[Quality] = mapped_column(_enum(Quality, "quality"), default=Quality.standard)
    delivery_available: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_price: Mapped[Decimal] = mapped_column(Money, default=Decimal("0"))
    delivery_days: Mapped[int] = mapped_column(Integer, default=1)
    location_note: Mapped[str | None] = mapped_column(String(160))
    valid_until: Mapped[datetime | None] = mapped_column(UTCDateTime())
    status: Mapped[OfferStatus] = mapped_column(_enum(OfferStatus, "offer_status"), default=OfferStatus.active, index=True)
    source: Mapped[DataSource] = mapped_column(_enum(DataSource, "data_source"), default=DataSource.seller)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    # Real prices observed on public websites: where, the original listing, and its id there
    source_site: Mapped[str | None] = mapped_column(String(40), index=True)
    source_url: Mapped[str | None] = mapped_column(String(500))
    external_id: Mapped[str | None] = mapped_column(String(120))
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow, index=True)
    business: Mapped[Business] = relationship()
    product: Mapped[Product] = relationship()
    market: Mapped[Market | None] = relationship()
    region: Mapped[Region] = relationship()


class OfferPriceHistory(Base):
    """Append-only. A row is written every time an offer's price is set; rows are never updated."""

    __tablename__ = "offer_price_history"
    __table_args__ = (Index("ix_price_hist_product_time", "product_id", "recorded_at"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    region_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("regions.id"))
    market_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("markets.id"))
    price: Mapped[Decimal] = mapped_column(Money)
    available_qty: Mapped[Decimal | None] = mapped_column(Qty)
    recorded_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    source: Mapped[DataSource] = mapped_column(_enum(DataSource, "data_source"), default=DataSource.seller)


class PurchaseRequest(TimestampMixin, Base):
    __tablename__ = "purchase_requests"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    offer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("offers.id", ondelete="SET NULL"))
    status: Mapped[RequestStatus] = mapped_column(_enum(RequestStatus, "request_status"), default=RequestStatus.pending, index=True)
    delivery_region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"))
    requirements: Mapped[str | None] = mapped_column(Text)
    counter_price: Mapped[Decimal | None] = mapped_column(Money)
    seller_message: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
    buyer: Mapped[User] = relationship()
    business: Mapped[Business] = relationship()
    offer: Mapped[Offer | None] = relationship()
    delivery_region: Mapped[Region | None] = relationship()
    items: Mapped[list["PurchaseRequestItem"]] = relationship(back_populates="request", cascade="all, delete-orphan")


class PurchaseRequestItem(Base):
    __tablename__ = "purchase_request_items"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("purchase_requests.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[Decimal] = mapped_column(Qty)
    preferred_price: Mapped[Decimal | None] = mapped_column(Money)
    request: Mapped[PurchaseRequest] = relationship(back_populates="items")
    product: Mapped[Product] = relationship()


class Favorite(TimestampMixin, Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "offer_id", name="uq_favorite"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id", ondelete="CASCADE"))
    offer: Mapped[Offer] = relationship()


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))  # price_alert, request, verification, system
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(200))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class PriceAlert(TimestampMixin, Base):
    __tablename__ = "price_alerts"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    region_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("regions.id"))
    condition: Mapped[AlertCondition] = mapped_column(_enum(AlertCondition, "alert_condition"))
    threshold: Mapped[Decimal | None] = mapped_column(Money)
    baseline_price: Mapped[Decimal | None] = mapped_column(Money)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    product: Mapped[Product] = relationship()
    region: Mapped[Region | None] = relationship()


class ProductView(TimestampMixin, Base):
    __tablename__ = "product_views"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class SearchLog(TimestampMixin, Base):
    """Demand signal: what people look for (also feeds the demand-gap report)."""

    __tablename__ = "search_logs"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    query: Mapped[str] = mapped_column(String(300))
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"), index=True)
    channel: Mapped[str] = mapped_column(String(16), default="explorer")  # explorer, ai


class AIConversation(TimestampMixin, Base):
    __tablename__ = "ai_conversations"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    messages: Mapped[list["AIMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at"
    )


class AIMessage(TimestampMixin, Base):
    __tablename__ = "ai_messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user / assistant
    content: Mapped[str] = mapped_column(Text)
    tool_calls: Mapped[list | None] = mapped_column(JSON)
    mode: Mapped[str | None] = mapped_column(String(16))  # claude / deterministic
    conversation: Mapped[AIConversation] = relationship(back_populates="messages")


class Report(TimestampMixin, Base):
    __tablename__ = "reports"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id", ondelete="CASCADE"), index=True)
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reason: Mapped[str] = mapped_column(String(40))  # price_suspicious, fake_seller, wrong_info, other
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(_enum(ReportStatus, "report_status"), default=ReportStatus.open, index=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    offer: Mapped[Offer] = relationship()


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(60))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str | None] = mapped_column(String(60))
    details: Mapped[dict | None] = mapped_column(JSON)
    actor: Mapped[User | None] = relationship()


# ================================================================== buyer requests -> producer bids -> contract
# A buyer posts what they need (a tender: "1 000 ballpoint pens by 1 December"), producers in that category send
# bids (price, lead time, payment terms, conditions), the buyer picks one and both sides sign a contract with a
# (demonstration) electronic signature.


class TenderStatus(str, enum.Enum):
    open = "open"  # accepting bids
    awarded = "awarded"  # a bid was chosen, contract waiting for the producer's signature
    contracted = "contracted"  # contract signed by both sides
    closed = "closed"  # cancelled by the buyer
    expired = "expired"  # bid deadline passed without a choice


class BidStatus(str, enum.Enum):
    submitted = "submitted"
    accepted = "accepted"  # chosen by the buyer
    rejected = "rejected"  # another bid won / the producer declined the contract
    withdrawn = "withdrawn"


class ContractStatus(str, enum.Enum):
    awaiting_seller = "awaiting_seller"  # signed by the buyer, sent to the producer
    signed = "signed"  # signed by both: in force
    declined = "declined"  # the producer refused to sign
    cancelled = "cancelled"  # the buyer withdrew it before the producer signed


class PaymentTerms(str, enum.Enum):
    prepay_100 = "prepay_100"
    prepay_50 = "prepay_50"
    prepay_30 = "prepay_30"
    on_delivery = "on_delivery"
    deferred_15 = "deferred_15"
    deferred_30 = "deferred_30"


class Tender(TimestampMixin, Base):
    __tablename__ = "tenders"
    __table_args__ = (Index("ix_tenders_status_closes", "status", "closes_at"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(24), unique=True)  # T-2026-000123
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_categories.id"), index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[Decimal] = mapped_column(Qty)
    unit: Mapped[str] = mapped_column(String(16))
    target_price: Mapped[Decimal | None] = mapped_column(Money)  # max price per unit the buyer expects
    quality: Mapped[Quality | None] = mapped_column(_enum(Quality, "quality"))
    payment_terms: Mapped[PaymentTerms | None] = mapped_column(_enum(PaymentTerms, "payment_terms"))  # preferred
    delivery_required: Mapped[bool] = mapped_column(Boolean, default=True)
    delivery_region_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("regions.id"))
    delivery_address: Mapped[str | None] = mapped_column(String(200))
    needed_by: Mapped[datetime] = mapped_column(UTCDateTime())  # when the goods must be delivered
    closes_at: Mapped[datetime] = mapped_column(UTCDateTime())  # bid deadline
    status: Mapped[TenderStatus] = mapped_column(_enum(TenderStatus, "tender_status"), default=TenderStatus.open, index=True)
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
    buyer: Mapped[User] = relationship()
    category: Mapped[ProductCategory] = relationship()
    product: Mapped[Product | None] = relationship()
    delivery_region: Mapped[Region] = relationship()
    bids: Mapped[list["Bid"]] = relationship(back_populates="tender", cascade="all, delete-orphan")


class Bid(TimestampMixin, Base):
    __tablename__ = "bids"
    __table_args__ = (UniqueConstraint("tender_id", "business_id", name="uq_bid_per_business"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    tender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenders.id", ondelete="CASCADE"), index=True)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    unit_price: Mapped[Decimal] = mapped_column(Money)
    delivery_price: Mapped[Decimal] = mapped_column(Money, default=Decimal("0"))  # 0 = included
    lead_time_days: Mapped[int] = mapped_column(Integer)  # days to prepare and deliver the whole quantity
    payment_terms: Mapped[PaymentTerms] = mapped_column(_enum(PaymentTerms, "payment_terms"))
    quality: Mapped[Quality] = mapped_column(_enum(Quality, "quality"), default=Quality.standard)
    warranty_months: Mapped[int] = mapped_column(Integer, default=0)
    valid_days: Mapped[int] = mapped_column(Integer, default=10)  # how long the price holds
    min_quantity: Mapped[Decimal | None] = mapped_column(Qty)  # if the producer can only supply part / needs a minimum
    comment: Mapped[str | None] = mapped_column(Text)  # the producer's conditions and requirements
    status: Mapped[BidStatus] = mapped_column(_enum(BidStatus, "bid_status"), default=BidStatus.submitted, index=True)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
    tender: Mapped[Tender] = relationship(back_populates="bids")
    business: Mapped[Business] = relationship()


class Contract(TimestampMixin, Base):
    __tablename__ = "contracts"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(32), unique=True)  # BA-2026/00017
    tender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenders.id", ondelete="CASCADE"), index=True)
    bid_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bids.id", ondelete="CASCADE"))
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), index=True)
    status: Mapped[ContractStatus] = mapped_column(_enum(ContractStatus, "contract_status"), index=True)
    total_amount: Mapped[Decimal] = mapped_column(Money)
    terms: Mapped[dict] = mapped_column(JSON)  # frozen snapshot: parties, specification, prices, dates, clauses
    buyer_signer: Mapped[str] = mapped_column(String(120))
    buyer_signer_title: Mapped[str] = mapped_column(String(80))
    buyer_signed_at: Mapped[datetime] = mapped_column(UTCDateTime())
    buyer_signature: Mapped[str] = mapped_column(String(64))
    buyer_cert: Mapped[str] = mapped_column(String(40))
    seller_signer: Mapped[str | None] = mapped_column(String(120))
    seller_signer_title: Mapped[str | None] = mapped_column(String(80))
    seller_signed_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    seller_signature: Mapped[str | None] = mapped_column(String(64))
    seller_cert: Mapped[str | None] = mapped_column(String(40))
    decline_reason: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)
    tender: Mapped[Tender] = relationship()
    bid: Mapped[Bid] = relationship()
    buyer: Mapped[User] = relationship()
    business: Mapped[Business] = relationship()

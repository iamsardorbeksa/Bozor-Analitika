from datetime import datetime
from decimal import Decimal
from typing import Annotated, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, PlainSerializer

# Money is computed with Decimal on the server and serialised as a JSON number.
MoneyOut = Annotated[Decimal, PlainSerializer(lambda v: float(round(v, 2)), return_type=float, when_used="json")]
QtyOut = MoneyOut

T = TypeVar("T")


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class Msg(BaseModel):
    message: str


class RegionOut(ORM):
    id: UUID
    code: str
    name_uz: str
    name_ru: str
    name_en: str
    lat: float
    lng: float


class MarketOut(ORM):
    id: UUID
    name: str
    region_id: UUID
    type: str
    address: str | None
    lat: float
    lng: float
    approximate_location: bool


class CategoryOut(ORM):
    id: UUID
    slug: str
    name_uz: str
    name_ru: str
    name_en: str
    icon: str


class ProductOut(ORM):
    id: UUID
    slug: str
    category_id: UUID
    name_uz: str
    name_ru: str
    name_en: str
    unit: str
    image_url: str | None
    emoji: str


class Timestamped(ORM):
    created_at: datetime

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents import pipeline
from app.core.deps import get_optional_user
from app.core.rate_limit import rate_limit
from app.database.session import get_db
from app.models import SearchLog, User

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentsRunIn(BaseModel):
    # empty / unparseable messages are answered with 200 and planner.note (the UI shows a hint)
    message: str = Field(default="", max_length=600)
    region_ids: list[UUID] = Field(default_factory=list, max_length=30)
    language: str = Field(default="uz", pattern="^(uz|ru|en)$")


@router.post("/run", dependencies=[Depends(rate_limit("agents", 20, 300))])
def run(data: AgentsRunIn, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    """Four agents: planner (Mirzo) -> scout (Dallol) -> analyst (Tarozibon ota) -> finance (Xazinachi opa) -> final advice.
    Public; a Bearer token (optional) attributes the demand signal to the user."""
    try:
        result = pipeline.run(db, data.message, data.region_ids, data.language)
    except ValueError as e:
        raise HTTPException(422, str(e)) from None
    if result["planner"]["items"]:
        for it in result["planner"]["items"][:5]:
            db.add(SearchLog(user_id=user.id if user else None, query=data.message[:300], product_id=UUID(it["product_id"]), channel="agents"))
        db.commit()
    return result

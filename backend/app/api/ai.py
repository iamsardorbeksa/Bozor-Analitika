from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import analyst, gemini
from app.ai.tools import CLAUDE_TOOLS, find_products_in_text
from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.database.session import get_db
from app.models import AIConversation, AIMessage, SearchLog, User
from app.schemas.common import Msg
from app.schemas.misc import AIChatIn, AIChatOut, AIMessageOut, ConversationOut

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
def status():
    s = get_settings()
    engine = s.ai_engine
    model = {"gemini": (gemini.models() or [None])[0], "claude": s.anthropic_model}.get(engine)
    return {"ai_available": s.ai_enabled, "engine": engine, "model": model,
            "mode": engine, "tools": [t["name"] for t in CLAUDE_TOOLS]}


@router.post("/chat", response_model=AIChatOut, dependencies=[Depends(rate_limit("ai", 30, 300))])
def chat(data: AIChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.conversation_id:
        conv = db.get(AIConversation, data.conversation_id)
        if not conv or conv.user_id != user.id:
            raise HTTPException(404, "Conversation not found")
    else:
        conv = AIConversation(user_id=user.id, title=data.message[:80])
        db.add(conv)
        db.flush()
    history = [{"role": m.role, "content": m.content} for m in conv.messages if m.role in ("user", "assistant")]
    db.add(AIMessage(conversation_id=conv.id, role="user", content=data.message))
    for p in find_products_in_text(db, data.message)[:3]:
        db.add(SearchLog(user_id=user.id, query=data.message[:300], product_id=p.id, channel="ai"))
    result = analyst.answer(db, data.message, history, data.language)
    msg = AIMessage(conversation_id=conv.id, role="assistant", content=result["content"], tool_calls=result["tool_calls"], mode=result["mode"])
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return AIChatOut(conversation_id=conv.id, message=AIMessageOut.model_validate(msg), ai_available=get_settings().ai_enabled)


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(AIConversation).where(AIConversation.user_id == user.id).order_by(AIConversation.created_at.desc()).limit(30)).all()


@router.get("/conversations/{cid}", response_model=list[AIMessageOut])
def conversation(cid: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.get(AIConversation, cid)
    if not conv or conv.user_id != user.id:
        raise HTTPException(404, "Conversation not found")
    return conv.messages


@router.delete("/conversations/{cid}", response_model=Msg)
def delete_conversation(cid: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.get(AIConversation, cid)
    if not conv or conv.user_id != user.id:
        raise HTTPException(404, "Conversation not found")
    db.delete(conv)
    db.commit()
    return Msg(message="Deleted")

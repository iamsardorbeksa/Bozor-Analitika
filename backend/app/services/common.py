from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AuditLog, Notification


def notify(db: Session, user_id: UUID, kind: str, title: str, body: str, link: str | None = None) -> Notification:
    n = Notification(user_id=user_id, kind=kind, title=title, body=body, link=link)
    db.add(n)
    return n


def audit(db: Session, actor_id: UUID | None, action: str, entity_type: str, entity_id: str | UUID | None, **details) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, entity_type=entity_type, entity_id=str(entity_id) if entity_id else None, details=details or None))

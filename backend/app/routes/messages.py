"""Contact inbox matching the existing interface, without speculative chat."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from sqlalchemy import select, delete, or_
from app.database import get_db
from app.settings import settings
from app.models import Profile, ContactMessage
from app.routes.auth import get_current_active_user, get_current_user

router = APIRouter()


class ContactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=20000)


def response(row, user):
    return dict(
        id=row.id,
        name=row.name,
        email=row.email,
        subject=row.subject,
        message=row.message,
        timestamp=row.created_at,
        can_delete=row.recipient_id == user.id,
    )


@router.post("/contact", status_code=201)
async def contact(
    data: ContactInput, authorization: str | None = Header(None), db=Depends(get_db)
):
    if not data.name.strip() or not data.subject.strip() or not data.message.strip():
        raise HTTPException(422, "All fields are required")
    sender = None
    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(401, "Invalid credentials")
        sender = await get_current_user(authorization[7:], db)
        if not sender.is_active:
            raise HTTPException(403, "Inactive account")
    recipient_id = settings.SUPPORT_RECIPIENT_ID
    if not recipient_id:
        raise HTTPException(503, "Contact inbox is not configured")
    try:
        identity = uuid.UUID(recipient_id)
    except ValueError:
        raise HTTPException(503, "Contact inbox is not configured")
    recipient = await db.scalar(
        select(Profile).where(Profile.id == identity, Profile.is_active.is_(True))
    )
    if recipient is None or not recipient.is_admin:
        raise HTTPException(503, "Contact inbox is not configured")
    row = ContactMessage(
        sender_id=sender.id if sender else None,
        recipient_id=identity,
        **data.model_dump()
    )
    db.add(row)
    await db.commit()
    return {"message": "Message sent successfully"}


@router.get("")
async def inbox(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    rows = await db.scalars(
        select(ContactMessage)
        .where(
            or_(
                ContactMessage.recipient_id == user.id,
                ContactMessage.sender_id == user.id,
            )
        )
        .order_by(ContactMessage.created_at.desc(), ContactMessage.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [response(r, user) for r in rows]


@router.delete("")
async def clear(db=Depends(get_db), user=Depends(get_current_active_user)):
    await db.execute(
        delete(ContactMessage).where(ContactMessage.recipient_id == user.id)
    )
    await db.commit()
    return {"message": "Inbox cleared"}


@router.delete("/{identity}")
async def remove(
    identity: int, db=Depends(get_db), user=Depends(get_current_active_user)
):
    row = await db.scalar(
        select(ContactMessage).where(
            ContactMessage.id == identity, ContactMessage.recipient_id == user.id
        )
    )
    if row is None:
        raise HTTPException(404, "Message not found")
    await db.delete(row)
    await db.commit()
    return {"message": "Message deleted"}

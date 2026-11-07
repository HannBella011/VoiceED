"""Private InspireED uploads with durable cleanup references."""

from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
from fastapi import HTTPException
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select, func
from app.models import InspireAttachment
from app.services import supabase_service
from app.settings import settings

MAX_SIZE = 25 * 1024 * 1024
TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
}


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


async def private_bucket(name):
    client = supabase_service.client
    if client is None:
        raise HTTPException(503, "Attachment storage is not configured")
    try:
        metadata = await run_in_threadpool(client.storage.get_bucket, name)
        public = (
            metadata.get("public")
            if isinstance(metadata, dict)
            else getattr(metadata, "public", None)
        )
        if public is not False:
            raise HTTPException(503, "InspireED requires a private attachment bucket")
        return supabase_service.get_storage_bucket(name)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Private attachment storage is unavailable") from exc


async def upload(db, user, file):
    filename = Path((file.filename or "").replace("\\", "/")).name
    mime = TYPES.get(Path(filename).suffix.lower())
    if not filename or len(filename) > 255 or not mime or file.content_type != mime:
        raise HTTPException(422, "Choose a PNG, JPG, JPEG or PDF file")
    content = await file.read(MAX_SIZE + 1)
    if not content or len(content) > MAX_SIZE:
        raise HTTPException(422, "Each file must be nonempty and at most 25 MB")
    valid = (
        (mime == "image/png" and content.startswith(b"\x89PNG\r\n\x1a\n"))
        or (mime == "image/jpeg" and content.startswith(b"\xff\xd8\xff"))
        or (mime == "application/pdf" and content.startswith(b"%PDF-"))
    )
    if not valid:
        raise HTTPException(422, "File contents do not match the selected file type")
    bucket = await private_bucket(settings.INSPIRE_STORAGE_BUCKET)
    row = InspireAttachment(
        user_id=user.id,
        storage_bucket=settings.INSPIRE_STORAGE_BUCKET,
        # Signed URLs must not reveal an anonymous author's identity UUID.
        storage_path=f"inspire/{uuid.uuid4().hex}{Path(filename).suffix.lower()}",
        filename=filename,
        mime_type=mime,
        file_size=len(content),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    # Save the cleanup reference before touching Storage, including crash cases.
    db.add(row)
    await db.commit()
    await db.refresh(row)
    try:
        await run_in_threadpool(
            bucket.upload,
            path=row.storage_path,
            file=content,
            file_options={"content-type": mime, "upsert": "false"},
        )
    except Exception as exc:
        row.expires_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(503, "Attachment upload failed; please retry") from exc
    return metadata(row)


def metadata(row):
    return {
        "id": row.id,
        "filename": row.filename,
        "mime_type": row.mime_type,
        "file_size": row.file_size,
    }


async def attach(db, row, kind, ids, user):
    ids = list(set(ids))
    if not ids:
        return
    column = (
        InspireAttachment.story_id if kind == "stories" else InspireAttachment.quote_id
    )
    existing = await db.scalar(
        select(func.count())
        .select_from(InspireAttachment)
        .where(column == row.id, InspireAttachment.id.not_in(ids))
    )
    if existing + len(ids) > 10:
        raise HTTPException(422, "A post may have at most 10 attachments")
    attachments = list(
        await db.scalars(
            select(InspireAttachment)
            .where(InspireAttachment.id.in_(ids))
            .with_for_update()
        )
    )
    if len(attachments) != len(ids):
        raise HTTPException(422, "An attachment is no longer available")
    now = datetime.now(timezone.utc)
    for item in attachments:
        same_post = (
            item.story_id == row.id if kind == "stories" else item.quote_id == row.id
        )
        pending = item.story_id is None and item.quote_id is None
        if (
            item.user_id != user.id
            or (not pending and not same_post)
            or (pending and (item.expires_at is None or utc(item.expires_at) <= now))
        ):
            raise HTTPException(
                403, "Attachment does not belong to this post or has expired"
            )
        setattr(item, "story_id" if kind == "stories" else "quote_id", row.id)
        item.expires_at = None


async def cleanup_expired(db, limit=100):
    """Run periodically via `python -m app.services.inspire_cleanup`; bounded/retryable."""
    rows = list(
        await db.scalars(
            select(InspireAttachment)
            .where(
                InspireAttachment.story_id.is_(None),
                InspireAttachment.quote_id.is_(None),
                InspireAttachment.expires_at <= datetime.now(timezone.utc),
            )
            .order_by(InspireAttachment.expires_at, InspireAttachment.id)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    )
    removed = 0
    for row in rows:
        try:
            bucket = supabase_service.get_storage_bucket(row.storage_bucket)
            if bucket is None:
                continue
            await run_in_threadpool(bucket.remove, [row.storage_path])
            await db.delete(row)
            removed += 1
        except Exception:
            # Retain metadata for a later retry; do not lose the object reference.
            continue
    await db.commit()
    return removed

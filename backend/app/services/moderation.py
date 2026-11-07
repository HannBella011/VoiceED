"""Accountable moderation of existing content; no role-management operations."""

from datetime import datetime, timezone
from sqlalchemy import select, func, literal, union_all, or_, true
from fastapi import HTTPException
from app.models import (
    Profile,
    Report,
    ReportStatus,
    SharedMaterial,
    InspireStory,
    InspireQuote,
    InspireComment,
    InspireAttachment,
    ModerationAction,
    ContactMessage,
)
from app.settings import settings

MODELS = {
    "resource": SharedMaterial,
    "story": InspireStory,
    "quote": InspireQuote,
    "comment": InspireComment,
}


async def report_statistics(db):
    rows = (
        await db.execute(
            select(Report.status, Report.is_anonymous, func.count()).group_by(
                Report.status, Report.is_anonymous
            )
        )
    ).all()
    stats = {status.value: 0 for status in ReportStatus}
    stats.update(total=0, anonymous=0, authenticated=0)
    for status, anonymous, count in rows:
        stats[status.value] += count
        stats["total"] += count
        stats["anonymous" if anonymous else "authenticated"] += count
    return stats


async def statistics(db):
    # One aggregate scan per source, rather than rescanning for every metric.
    aggregates = {}
    for kind, model in MODELS.items():
        fields = [
            func.count().label("total"),
            func.count().filter(model.removed_at.is_not(None)).label("removed"),
        ]
        if kind == "story":
            fields.extend(
                [
                    func.count().filter(model.post_type == "story").label("stories"),
                    func.count()
                    .filter(model.post_type != "story")
                    .label("other_posts"),
                ]
            )
        aggregates[kind] = select(*fields).select_from(model).subquery()
    resource, story, quote, comment = [aggregates[key].c for key in MODELS]
    values = (
        (
            await db.execute(
                select(
                    resource.total.label("resources"),
                    story.stories,
                    quote.total.label("quotes"),
                    comment.total.label("comments"),
                    story.other_posts,
                    select(func.count())
                    .select_from(ModerationAction)
                    .scalar_subquery()
                    .label("moderation_actions"),
                    sum((item.c.removed for item in aggregates.values()), 0).label(
                        "removed_content"
                    ),
                ).select_from(
                    aggregates["resource"]
                    .join(aggregates["story"], true())
                    .join(aggregates["quote"], true())
                    .join(aggregates["comment"], true())
                )
            )
        )
        .one()
        ._mapping
    )
    return {
        "reports": await report_statistics(db),
        "content": {
            key: values[key]
            for key in ["resources", "stories", "quotes", "comments", "other_posts"]
        },
        "moderation": {
            "actions": values["moderation_actions"],
            "removed_content": values["removed_content"],
        },
    }


def collection_query(kind=None, state="visible", search="", post_type=None):
    queries = []
    for key, model in MODELS.items():
        if kind and kind != key:
            continue
        title = (
            model.title
            if key in ("resource", "story")
            else literal("Quote" if key == "quote" else "Comment")
        )
        text = (
            model.description
            if key == "resource"
            else model.quote if key == "quote" else model.content
        )
        anonymous = (
            model.is_anonymous if key in ("resource", "story") else literal(False)
        )
        subtype = model.post_type if key == "story" else literal(key)
        query = select(
            model.id.label("id"),
            literal(key).label("kind"),
            title.label("title"),
            func.substr(func.coalesce(text, ""), 1, 200).label("excerpt"),
            model.user_id.label("author_id"),
            anonymous.label("anonymous"),
            model.created_at.label("created_at"),
            model.removed_at.label("removed_at"),
            subtype.label("post_type"),
        )
        if state == "visible":
            query = query.where(model.removed_at.is_(None))
        elif state == "removed":
            query = query.where(model.removed_at.is_not(None))
        if post_type:
            if key != "story":
                continue
            query = query.where(model.post_type == post_type)
        if search.strip():
            term = (
                "%"
                + search.strip()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
                + "%"
            )
            query = query.where(
                or_(title.ilike(term, escape="\\"), text.ilike(term, escape="\\"))
            )
        queries.append(query)
    if not queries:
        raise HTTPException(422, "Post type filtering requires stories")
    return union_all(*queries).subquery()


async def list_content(
    db,
    kind=None,
    state="visible",
    search="",
    post_type=None,
    page=1,
    limit=20,
    sort="newest",
):
    combined = collection_query(kind, state, search, post_type)
    total = await db.scalar(select(func.count()).select_from(combined))
    query = select(combined, Profile.username, Profile.full_name).outerjoin(
        Profile, Profile.id == combined.c.author_id
    )
    order = (
        [combined.c.created_at.desc(), combined.c.kind, combined.c.id.desc()]
        if sort == "newest"
        else [combined.c.created_at, combined.c.kind, combined.c.id]
    )
    rows = (
        await db.execute(query.order_by(*order).offset((page - 1) * limit).limit(limit))
    ).all()
    items = [
        {
            **{
                field: getattr(row, field)
                for field in [
                    "id",
                    "kind",
                    "title",
                    "excerpt",
                    "created_at",
                    "removed_at",
                    "post_type",
                ]
            },
            "author": (
                "Anonymous"
                if row.anonymous
                else row.full_name or row.username or "Unknown"
            ),
        }
        for row in rows
    ]
    return paginated(items, total, page, limit)


def paginated(items, total, page, limit):
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "has_more": page * limit < total,
    }


async def get_content(db, kind, identity, lock=False):
    model = MODELS[kind]
    query = select(model).where(model.id == identity)
    if lock:
        query = query.with_for_update()
    row = await db.scalar(query)
    if row is None:
        raise HTTPException(404, "Content not found")
    return row


def title_for(row, kind):
    return (
        row.title
        if kind in ("story", "resource")
        else ("Quote" if kind == "quote" else "Comment") + f" #{row.id}"
    )


def audit_response(row, administrator=None):
    return {
        "id": row.id,
        "content_type": row.content_type,
        "content_id": row.content_id,
        "content_title": row.content_title,
        "administrator_id": str(row.administrator_id),
        "administrator": administrator,
        "reason": row.reason,
        "policy_reference": row.policy_reference,
        "internal_notes": row.internal_notes,
        "created_at": row.created_at,
        "notification_id": row.notification_id,
        "author_available": row.author_id is not None,
    }


async def audit(
    db, page=1, limit=20, kind=None, content_id=None, search="", actor_id=None
):
    query = select(ModerationAction)
    if actor_id:
        query = query.where(ModerationAction.administrator_id == actor_id)
    if kind:
        query = query.where(ModerationAction.content_type == kind)
    if content_id:
        query = query.where(ModerationAction.content_id == content_id)
    if search.strip():
        term = (
            "%"
            + search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
            + "%"
        )
        query = query.where(
            or_(
                ModerationAction.content_title.ilike(term, escape="\\"),
                ModerationAction.reason.ilike(term, escape="\\"),
            )
        )
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    rows = (
        await db.execute(
            query.add_columns(Profile.username)
            .join(Profile, Profile.id == ModerationAction.administrator_id)
            .order_by(ModerationAction.created_at.desc(), ModerationAction.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return paginated(
        [audit_response(row, username) for row, username in rows], total, page, limit
    )


async def detail(db, kind, identity):
    row = await get_content(db, kind, identity)
    profile = (
        (
            await db.execute(
                select(Profile.full_name, Profile.username).where(
                    Profile.id == row.user_id
                )
            )
        ).one_or_none()
        if row.user_id
        else None
    )
    result = {
        "id": row.id,
        "kind": kind,
        "title": title_for(row, kind),
        "created_at": row.created_at,
        "removed_at": row.removed_at,
        "author": (
            "Anonymous"
            if getattr(row, "is_anonymous", False)
            else (profile.full_name or profile.username) if profile else "Unknown"
        ),
        "text": (
            row.description
            if kind == "resource"
            else row.quote if kind == "quote" else row.content
        ),
    }
    if kind in ("story", "quote"):
        result["body"] = row.body
        column = (
            InspireAttachment.story_id
            if kind == "story"
            else InspireAttachment.quote_id
        )
        attachments = await db.scalars(
            select(InspireAttachment)
            .where(column == row.id)
            .order_by(InspireAttachment.id)
        )
        result["attachments"] = [
            {"id": item.id, "filename": item.filename, "mime_type": item.mime_type}
            for item in attachments
        ]
    if kind == "resource":
        result.update(
            file_url=row.file_url,
            file_type=row.file_type,
            subject=row.subject,
            download_count=row.download_count,
        )
    if kind == "story":
        result["post_type"] = row.post_type
    if kind == "comment":
        result["parent"] = {
            "kind": "story" if row.story_id is not None else "quote",
            "id": row.story_id if row.story_id is not None else row.quote_id,
        }
    result["history"] = await audit(db, kind=kind, content_id=identity, limit=10)
    return result


async def remove(db, kind, identity, data, administrator):
    row = await get_content(db, kind, identity, lock=True)
    if row.removed_at is not None:
        raise HTTPException(409, "Content is already removed")
    now = datetime.now(timezone.utc)
    row.removed_at = now
    action = ModerationAction(
        content_type=kind,
        content_id=row.id,
        content_title=title_for(row, kind),
        author_id=row.user_id,
        administrator_id=administrator.id,
        reason=data.reason,
        policy_reference=data.policy_reference,
        internal_notes=data.internal_notes,
        created_at=now,
    )
    try:
        if row.user_id is not None:
            # System message: no personal administrator details or internal notes.
            message = ContactMessage(
                sender_id=None,
                recipient_id=row.user_id,
                name="VoiceED Moderation",
                email=settings.EMAILS_FROM_EMAIL or "no-reply@voiceed.invalid",
                subject=f"Content removed: {action.content_title}"[:200],
                message=f'Your {kind} "{action.content_title}" (ID {row.id}) was removed on {now.isoformat()}.\n\nReason: {data.reason}'
                + (
                    f"\n\nPolicy explanation: {data.policy_reference}"
                    if data.policy_reference
                    else ""
                ),
            )
            db.add(message)
            await db.flush()
            action.notification_id = message.id
        db.add(action)
        await db.commit()
        await db.refresh(action)
    except Exception:
        await db.rollback()
        raise
    return audit_response(action, administrator.username)

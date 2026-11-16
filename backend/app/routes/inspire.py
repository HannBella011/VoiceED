"""Public InspireED reads, structured content and authenticated social actions."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Header, UploadFile, File
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func, delete, literal, union_all, or_, exists
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import load_only
from starlette.concurrency import run_in_threadpool
from app.database import get_db
from app.models import (
    Profile,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    InspireShare,
    InspireAttachment,
    UserActivity,
)
from app.routes.auth import get_current_active_user, get_current_user
from app.schemas.inspire import StoryInput, QuoteInput, text_body
from app.services import inspire_storage

router = APIRouter()
MODELS = {"stories": InspireStory, "quotes": InspireQuote}


async def optional_user(authorization: str | None = Header(None), db=Depends(get_db)):
    if authorization is None:
        return None
    if not authorization.startswith("Bearer ") or not authorization[7:]:
        raise HTTPException(401, "Invalid credentials")
    user = await get_current_user(authorization[7:], db)
    if not user.is_active:
        raise HTTPException(403, "Inactive account")
    return user


class CommentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=1, max_length=5000)


class ShareInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    method: str = Field(pattern="^(copy|native)$")


async def target(db, kind, identity, lock=False):
    model = MODELS.get(kind)
    if model is None:
        raise HTTPException(404, "Post not found")
    query = select(model).where(model.id == identity, model.removed_at.is_(None))
    row = await db.scalar(query.with_for_update() if lock else query)
    if row is None:
        raise HTTPException(404, "Post not found")
    return row


def target_column(model, kind):
    return model.story_id if kind == "stories" else model.quote_id


def paginated(items, total, page, limit, envelope):
    return (
        {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": page * limit < total,
        }
        if envelope
        else items
    )


async def serialize_many(db, pairs, viewer):
    # A fixed number of batch queries, independent of the number of posts.
    if not pairs:
        return []
    authors = {
        r.user_id
        for k, r in pairs
        if r.user_id and not (k == "stories" and r.is_anonymous)
    }
    profiles = (
        {
            p.id: p
            for p in await db.scalars(
                select(Profile)
                .options(
                    load_only(
                        Profile.id,
                        Profile.username,
                        Profile.full_name,
                        Profile.is_verified,
                    )
                )
                .where(Profile.id.in_(authors))
            )
        }
        if authors
        else {}
    )
    counts, liked, attached = {}, set(), {}
    for kind in MODELS:
        ids = [r.id for k, r in pairs if k == kind]
        if not ids:
            continue
        for model, key in [
            (InspireReaction, "likes"),
            (InspireComment, "comments"),
            (InspireShare, "shares"),
        ]:
            column = target_column(model, kind)
            query = select(column, func.count()).where(column.in_(ids))
            if model is InspireComment:
                query = query.where(model.removed_at.is_(None))
            for identity, count in (await db.execute(query.group_by(column))).all():
                counts.setdefault((kind, identity), {})[key] = count
        if viewer:
            column = target_column(InspireReaction, kind)
            liked.update(
                (kind, i)
                for i in await db.scalars(
                    select(column).where(
                        column.in_(ids), InspireReaction.user_id == viewer.id
                    )
                )
            )
        column = target_column(InspireAttachment, kind)
        for item in await db.scalars(
            select(InspireAttachment)
            .where(column.in_(ids))
            .order_by(InspireAttachment.id)
        ):
            attached.setdefault((kind, getattr(item, column.key)), []).append(
                inspire_storage.metadata(item)
            )
    result = []
    for kind, row in pairs:
        anonymous = kind == "stories" and row.is_anonymous
        profile = None if anonymous else profiles.get(row.user_id)
        author = (
            "Anonymous"
            if anonymous
            else (profile.full_name or profile.username) if profile else "Unknown"
        )
        quote = kind == "quotes"
        text = row.quote if quote else row.content
        result.append(
            dict(
                id=f"{kind}:{row.id}",
                record_id=row.id,
                kind=kind,
                type="quote" if quote else row.post_type,
                author=author,
                avatar=author[0],
                author_verified=bool(profile and profile.is_verified),
                time=row.created_at.isoformat(),
                created_at=row.created_at,
                updated_at=row.updated_at,
                body=row.body or text_body(text),
                attachments=attached.get((kind, row.id), []),
                content=(
                    {"text": text, "author": row.author or "Unknown"}
                    if quote
                    else {
                        "text": text,
                        "title": row.title,
                        "recipient": row.recipient_label,
                    }
                ),
                user_id=(
                    None if anonymous else str(row.user_id) if row.user_id else None
                ),
                is_anonymous=anonymous,
                userLiked=(kind, row.id) in liked,
                isUserCreated=bool(viewer and row.user_id == viewer.id),
                **{
                    key: counts.get((kind, row.id), {}).get(key, 0)
                    for key in ["likes", "comments", "shares"]
                },
            )
        )
    return result


async def serialize(db, row, viewer, kind):
    return (await serialize_many(db, [(kind, row)], viewer))[0]


@router.post("/attachments", status_code=201)
async def upload_attachment(
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    try:
        return await inspire_storage.upload(db, user, file)
    finally:
        await file.close()


@router.delete("/attachments/{identity}")
async def remove_attachment(
    identity: int, db=Depends(get_db), user=Depends(get_current_active_user)
):
    row = await db.scalar(
        select(InspireAttachment)
        .where(InspireAttachment.id == identity)
        .with_for_update()
    )
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "Attachment not found")
    row.story_id = None
    row.quote_id = None
    row.expires_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Attachment removed; storage cleanup scheduled"}


@router.get("/attachments/{identity}/access")
async def attachment_access(
    identity: int, db=Depends(get_db), user=Depends(optional_user)
):
    row = await db.scalar(
        select(InspireAttachment).where(InspireAttachment.id == identity)
    )
    if row is None:
        raise HTTPException(404, "Attachment not found")
    if row.story_id is not None or row.quote_id is not None:
        await target(
            db,
            "stories" if row.story_id is not None else "quotes",
            row.story_id if row.story_id is not None else row.quote_id,
        )
    elif (
        not user
        or row.user_id != user.id
        or row.expires_at is None
        or inspire_storage.utc(row.expires_at) <= datetime.now(timezone.utc)
    ):
        raise HTTPException(404, "Attachment not found")
    bucket = await inspire_storage.private_bucket(row.storage_bucket)
    try:
        signed = await run_in_threadpool(
            bucket.create_signed_url, row.storage_path, 300
        )
        url = signed.get("signedURL") or signed.get("signedUrl")
        if not url:
            raise ValueError("Missing signed URL")
        return {"url": url, "expires_in": 300}
    except Exception as exc:
        raise HTTPException(503, "Attachment could not be opened") from exc


@router.get("/feed")
async def feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    post_type: str | None = None,
    activity: bool = False,
    mine: bool = False,
    envelope: bool = False,
    db=Depends(get_db),
    user=Depends(optional_user),
):
    if post_type not in (None, "post", "story", "quote", "kudos", "milestone"):
        raise HTTPException(422, "Unknown post type")
    if (activity or mine) and user is None:
        raise HTTPException(401, "Sign in to view your activity")
    queries = []
    for kind, model in MODELS.items():
        if (
            post_type == "quote"
            and kind != "quotes"
            or post_type
            and post_type != "quote"
            and kind == "quotes"
        ):
            continue
        query = select(
            model.id.label("id"),
            model.created_at.label("created_at"),
            literal(kind).label("kind"),
        ).where(model.removed_at.is_(None))
        if post_type and kind == "stories":
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
            columns = (
                [model.quote, model.author]
                if kind == "quotes"
                else [model.title, model.content, model.recipient_label]
            )
            author_match = (
                select(Profile.id)
                .where(
                    Profile.id == model.user_id,
                    or_(
                        Profile.full_name.ilike(term, escape="\\"),
                        Profile.username.ilike(term, escape="\\"),
                    ),
                )
                .exists()
            )
            if kind == "stories":
                author_match = author_match & model.is_anonymous.is_(False)
            query = query.where(
                or_(
                    *(column.ilike(term, escape="\\") for column in columns),
                    author_match,
                )
            )
        if mine:
            query = query.where(model.user_id == user.id)
        if activity:
            query = query.where(
                or_(
                    model.user_id == user.id,
                    exists().where(
                        target_column(InspireReaction, kind) == model.id,
                        InspireReaction.user_id == user.id,
                    ),
                )
            )
        queries.append(query)
    combined = union_all(*queries).subquery()
    total = await db.scalar(select(func.count()).select_from(combined))
    keys = (
        await db.execute(
            select(combined)
            .order_by(
                combined.c.created_at.desc(), combined.c.kind, combined.c.id.desc()
            )
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    records = {}
    for kind, model in MODELS.items():
        ids = [k.id for k in keys if k.kind == kind]
        if ids:
            records.update(
                {
                    (kind, r.id): r
                    for r in await db.scalars(select(model).where(model.id.in_(ids)))
                }
            )
    items = await serialize_many(
        db, [(k.kind, records[(k.kind, k.id)]) for k in keys], user
    )
    return paginated(items, total, page, limit, envelope)


@router.get("/stories")
async def stories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(optional_user),
):
    rows = await db.scalars(
        select(InspireStory)
        .where(InspireStory.removed_at.is_(None))
        .order_by(InspireStory.created_at.desc(), InspireStory.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return await serialize_many(db, [("stories", r) for r in rows], user)


@router.get("/quotes")
async def quotes(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(optional_user),
):
    rows = await db.scalars(
        select(InspireQuote)
        .where(InspireQuote.removed_at.is_(None))
        .order_by(InspireQuote.created_at.desc(), InspireQuote.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return await serialize_many(db, [("quotes", r) for r in rows], user)


@router.get("/quotes/daily")
async def daily(db=Depends(get_db), user=Depends(optional_user)):
    row = await db.scalar(
        select(InspireQuote)
        .where(InspireQuote.removed_at.is_(None))
        .order_by(InspireQuote.created_at.desc(), InspireQuote.id.desc())
        .limit(1)
    )
    if row is None:
        raise HTTPException(404, "No quotes available")
    return await serialize(db, row, user, "quotes")


async def save_post(db, row, kind, data, user):
    for key, value in data.model_dump(exclude={"attachment_ids"}).items():
        setattr(row, key, value)
    db.add(row)
    await db.flush()
    await inspire_storage.attach(db, row, kind, data.attachment_ids, user)
    await db.commit()
    await db.refresh(row)
    return await serialize(db, row, user, kind)


@router.post("/stories", status_code=201)
async def create_story(
    data: StoryInput, db=Depends(get_db), user=Depends(get_current_active_user)
):
    db.add(UserActivity(user_id=user.id, action="inspire_post_created"))
    return await save_post(
        db,
        InspireStory(user_id=user.id, author_name=user.full_name or user.username),
        "stories",
        data,
        user,
    )


@router.post("/quotes", status_code=201)
async def create_quote(
    data: QuoteInput, db=Depends(get_db), user=Depends(get_current_active_user)
):
    db.add(UserActivity(user_id=user.id, action="inspire_quote_created"))
    return await save_post(db, InspireQuote(user_id=user.id), "quotes", data, user)


@router.get("/{kind}/{identity}")
async def detail(
    kind: str, identity: int, db=Depends(get_db), user=Depends(optional_user)
):
    return await serialize(db, await target(db, kind, identity), user, kind)


@router.patch("/stories/{identity}")
async def edit_story(
    identity: int,
    data: StoryInput,
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    row = await target(db, "stories", identity, True)
    if row.user_id != user.id:
        raise HTTPException(404, "Post not found")
    return await save_post(db, row, "stories", data, user)


@router.patch("/quotes/{identity}")
async def edit_quote(
    identity: int,
    data: QuoteInput,
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    row = await target(db, "quotes", identity, True)
    if row.user_id != user.id:
        raise HTTPException(404, "Post not found")
    return await save_post(db, row, "quotes", data, user)


@router.delete("/comments/{identity}")
async def delete_comment(
    identity: int, db=Depends(get_db), user=Depends(get_current_active_user)
):
    row = await db.scalar(
        select(InspireComment).where(
            InspireComment.id == identity, InspireComment.removed_at.is_(None)
        )
    )
    if row is None or (row.user_id != user.id and not user.is_admin):
        raise HTTPException(404, "Comment not found")
    if row.user_id != user.id:
        raise HTTPException(
            409, "Use the administrator moderation endpoint with a removal reason"
        )
    row.removed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Comment deleted"}


@router.delete("/{kind}/{identity}")
async def remove(
    kind: str, identity: int, db=Depends(get_db), user=Depends(get_current_active_user)
):
    row = await target(db, kind, identity, True)
    if row.user_id != user.id and not user.is_admin:
        raise HTTPException(404, "Post not found")
    if row.user_id != user.id:
        raise HTTPException(
            409, "Use the administrator moderation endpoint with a removal reason"
        )
    row.removed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Post deleted"}


@router.put("/{kind}/{identity}/reaction")
async def react(
    kind: str, identity: int, db=Depends(get_db), user=Depends(get_current_active_user)
):
    await target(db, kind, identity, True)
    column = target_column(InspireReaction, kind)
    await db.execute(
        insert(InspireReaction)
        .values(user_id=user.id, **{column.key: identity})
        .on_conflict_do_nothing(index_elements=["user_id", column.key])
    )
    await db.commit()
    return await serialize(db, await target(db, kind, identity), user, kind)


@router.delete("/{kind}/{identity}/reaction")
async def unreact(
    kind: str, identity: int, db=Depends(get_db), user=Depends(get_current_active_user)
):
    await target(db, kind, identity, True)
    await db.execute(
        delete(InspireReaction).where(
            target_column(InspireReaction, kind) == identity,
            InspireReaction.user_id == user.id,
        )
    )
    await db.commit()
    return await serialize(db, await target(db, kind, identity), user, kind)


@router.get("/{kind}/{identity}/comments")
async def comments(
    kind: str,
    identity: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    envelope: bool = False,
    db=Depends(get_db),
    user=Depends(optional_user),
):
    await target(db, kind, identity)
    condition = (
        target_column(InspireComment, kind) == identity
    ) & InspireComment.removed_at.is_(None)
    total = await db.scalar(
        select(func.count()).select_from(InspireComment).where(condition)
    )
    rows = (
        await db.execute(
            select(InspireComment, Profile)
            .join(Profile, Profile.id == InspireComment.user_id)
            .where(condition)
            .order_by(InspireComment.created_at, InspireComment.id)
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    items = [
        dict(
            id=r.id,
            content=r.content,
            author=p.full_name or p.username,
            author_verified=p.is_verified,
            created_at=r.created_at,
            owned=bool(user and r.user_id == user.id),
            can_delete=bool(user and (r.user_id == user.id or user.is_admin)),
        )
        for r, p in rows
    ]
    return paginated(items, total, page, limit, envelope)


@router.post("/{kind}/{identity}/comments", status_code=201)
async def comment(
    kind: str,
    identity: int,
    data: CommentInput,
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    await target(db, kind, identity, True)
    if not data.content.strip():
        raise HTTPException(422, "Comment is required")
    row = InspireComment(
        user_id=user.id,
        content=data.content.strip(),
        **{target_column(InspireComment, kind).key: identity},
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "content": row.content}


@router.post("/{kind}/{identity}/shares", status_code=201)
async def share(
    kind: str,
    identity: int,
    data: ShareInput,
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    # Clients call only after clipboard success or native share resolution, never on cancel.
    await target(db, kind, identity, True)
    db.add(
        InspireShare(
            user_id=user.id, **{target_column(InspireShare, kind).key: identity}
        )
    )
    await db.commit()
    return await serialize(db, await target(db, kind, identity), user, kind)

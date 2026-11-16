"""Administrator monitoring and accountable content moderation."""

from typing import Literal
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool
from app.database import get_db
from app.routes.auth import get_current_admin_user
from app.models import InspireAttachment
from app.services import moderation, inspire_storage

router = APIRouter()
Kind = Literal["resource", "story", "quote", "comment"]


class RemovalInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    reason: str = Field(min_length=1, max_length=5000)
    policy_reference: str | None = Field(default=None, max_length=1000)
    internal_notes: str | None = Field(default=None, max_length=5000)


def private_response(response: Response):
    response.headers["Cache-Control"] = "private, no-store"


@router.get("/stats")
async def stats(
    response: Response, db=Depends(get_db), user=Depends(get_current_admin_user)
):
    private_response(response)
    return await moderation.statistics(db)


@router.get("/content")
async def contents(
    response: Response,
    kind: Kind | None = None,
    state: Literal["visible", "removed", "all"] = "visible",
    search: str = Query("", max_length=200),
    post_type: Literal["story", "post", "kudos", "milestone"] | None = None,
    sort: Literal["newest", "oldest"] = "newest",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(get_current_admin_user),
):
    private_response(response)
    return await moderation.list_content(
        db, kind, state, search, post_type, page, limit, sort
    )


@router.get("/workload")
async def own_workload(
    response: Response, db=Depends(get_db), user=Depends(get_current_admin_user)
):
    from app.services.report_management import workload

    private_response(response)
    return await workload(db, user.id)


@router.get("/content/{kind}/{identity}")
async def detail(
    kind: Kind,
    identity: int,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_admin_user),
):
    private_response(response)
    return await moderation.detail(db, kind, identity)


@router.post("/content/{kind}/{identity}/remove")
async def remove(
    kind: Kind,
    identity: int,
    data: RemovalInput,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_admin_user),
):
    private_response(response)
    return await moderation.remove(db, kind, identity, data, user)


@router.get("/audit")
async def audit(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    kind: Kind | None = None,
    content_id: int | None = Query(None, ge=1),
    search: str = Query("", max_length=200),
    db=Depends(get_db),
    user=Depends(get_current_admin_user),
):
    private_response(response)
    return await moderation.audit(db, page, limit, kind, content_id, search)


@router.get("/attachments/{identity}/access")
async def attachment_access(
    identity: int,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_admin_user),
):
    private_response(response)
    item = await db.scalar(
        select(InspireAttachment).where(InspireAttachment.id == identity)
    )
    if item is None or item.story_id is None and item.quote_id is None:
        raise HTTPException(404, "Attachment not found")
    bucket = await inspire_storage.private_bucket(item.storage_bucket)
    try:
        signed = await run_in_threadpool(
            bucket.create_signed_url, item.storage_path, 300
        )
        url = signed.get("signedURL") or signed.get("signedUrl")
        if not url:
            raise ValueError("Missing signed URL")
        return {"url": url, "expires_in": 300}
    except Exception as exc:
        raise HTTPException(503, "Attachment could not be opened") from exc

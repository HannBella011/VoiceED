import uuid
from typing import Literal
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sqlalchemy import select
from app.database import get_db
from app.routes.auth import get_current_super_admin_user
from app.models import Profile, VerificationAction
from app.schemas.accounts import (
    InviteInput,
    AccountUpdate,
    StatusInput,
    VerificationInput,
    RecoverInvite,
)
from app.services import accounts, moderation

router = APIRouter()


def private(response):
    response.headers["Cache-Control"] = "private, no-store"


@router.get("/stats")
async def stats(
    response: Response, db=Depends(get_db), user=Depends(get_current_super_admin_user)
):
    private(response)
    return await accounts.statistics(db)


@router.get("/users")
async def users(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    role: Literal["student", "admin", "super_admin"] | None = None,
    verified: bool | None = None,
    active: bool | None = None,
    sort: Literal["newest", "name"] = "newest",
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.list_users(
        db, page, limit, search, role, verified, active, sort
    )


@router.get("/workloads")
async def report_workloads(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    from app.services.report_management import workloads

    private(response)
    return await workloads(db, page, limit)


@router.post("/users/invite", status_code=201)
async def invite(
    data: InviteInput,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.invite(db, data, user)


@router.get("/users/{identity}")
async def detail(
    identity: uuid.UUID,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    row = await db.scalar(select(Profile).where(Profile.id == identity))
    if not row:
        raise HTTPException(404, "User not found")
    result = accounts.user_response(row)
    reviews = (
        await db.execute(
            select(VerificationAction, Profile.username)
            .join(Profile, Profile.id == VerificationAction.administrator_id)
            .where(VerificationAction.user_id == identity)
            .order_by(
                VerificationAction.created_at.desc(), VerificationAction.id.desc()
            )
            .limit(10)
        )
    ).all()
    result["verification_history"] = [
        {
            "status": item.status,
            "notes": item.notes,
            "reviewer": reviewer,
            "created_at": item.created_at,
        }
        for item, reviewer in reviews
    ]
    return result


@router.patch("/users/{identity}")
async def edit(
    identity: uuid.UUID,
    data: AccountUpdate,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.update_account(db, identity, data, user)


@router.post("/users/{identity}/status")
async def status(
    identity: uuid.UUID,
    data: StatusInput,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.set_active(db, identity, data, user)


@router.post("/users/{identity}/verification")
async def verification(
    identity: uuid.UUID,
    data: VerificationInput,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.verify(db, identity, data, user)


@router.get("/audit")
async def audit(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    actor_id: uuid.UUID | None = None,
    target_id: uuid.UUID | None = None,
    status: Literal["pending", "applied", "failed"] | None = None,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.history(db, page, limit, actor_id, target_id, status)


@router.post("/actions/{identity}/retry")
async def retry(
    identity: uuid.UUID,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    action = await accounts.synchronize(db, identity, user)
    return {"id": str(action.id), "status": action.status}


@router.post("/actions/{identity}/recover-invitation")
async def recover(
    identity: uuid.UUID,
    data: RecoverInvite,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await accounts.recover_invitation(db, identity, data, user)


@router.get("/moderation")
async def moderation_history(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    actor_id: uuid.UUID | None = None,
    db=Depends(get_db),
    user=Depends(get_current_super_admin_user),
):
    private(response)
    return await moderation.audit(db, page=page, limit=limit, actor_id=actor_id)

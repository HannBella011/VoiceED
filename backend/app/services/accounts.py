"""Superadministrator operations. Local authorization stays fail-closed during Auth sync."""

import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select, func, update, literal
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool
from app.models import Profile, UserRole, AccountAction, VerificationAction, ApiSession
from app.services import supabase_service
from app.settings import settings
from app.services.share_search import is_postgres
from app.services.moderation import paginated


async def authority_lock(db, actor):
    if is_postgres(db):
        await db.execute(select(func.pg_advisory_xact_lock(73910527)))
    current = await db.scalar(
        select(Profile)
        .where(Profile.id == actor.id)
        .execution_options(populate_existing=True)
    )
    if not current or not current.is_active or not current.is_super_admin:
        raise HTTPException(403, "Super admin access required")


def auth_admin():
    client = supabase_service.client
    if client is None:
        raise HTTPException(503, "Supabase administrative access is not configured")
    return client.auth.admin


def user_response(row):
    return {
        field: getattr(row, field)
        for field in [
            "username",
            "email",
            "full_name",
            "school_id",
            "birthday",
            "gender",
            "avatar_url",
            "theme",
            "created_at",
            "updated_at",
            "last_login",
            "is_active",
            "is_verified",
            "verified_at",
        ]
    } | {
        "id": str(row.id),
        "role": row.role.value,
        "verified_by": str(row.verified_by) if row.verified_by else None,
    }


async def unique_fields(db, values, identity=None):
    for field in ["username", "school_id", "email"]:
        value = values.get(field)
        if not value:
            continue
        column = getattr(Profile, field)
        query = (
            select(Profile.id).where(func.lower(column) == str(value).lower())
            if field == "email"
            else select(Profile.id).where(column == value)
        )
        if identity:
            query = query.where(Profile.id != identity)
        if await db.scalar(query):
            raise HTTPException(
                409, f'{field.replace("_"," ").capitalize()} is already in use'
            )


async def statistics(db):
    row = (
        await db.execute(
            select(
                func.count().label("total"),
                func.count().filter(Profile.is_verified.is_(True)).label("verified"),
                func.count().filter(Profile.is_verified.is_(False)).label("unverified"),
                func.count()
                .filter(Profile.role == UserRole.ADMIN)
                .label("administrators"),
                func.count()
                .filter(Profile.role == UserRole.SUPER_ADMIN)
                .label("superadministrators"),
                func.count().filter(Profile.is_active.is_(False)).label("suspended"),
            ).select_from(Profile)
        )
    ).one()
    return dict(row._mapping)


async def list_users(
    db,
    page=1,
    limit=20,
    search="",
    role=None,
    verified=None,
    active=None,
    sort="newest",
):
    query = select(Profile)
    if search.strip():
        term = (
            "%"
            + search.strip()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
            + "%"
        )
        from sqlalchemy import or_

        query = query.where(
            or_(
                *(
                    getattr(Profile, field).ilike(term, escape="\\")
                    for field in ["username", "full_name", "email", "school_id"]
                )
            )
        )
    if role:
        query = query.where(Profile.role == UserRole(role))
    if verified is not None:
        query = query.where(Profile.is_verified == verified)
    if active is not None:
        query = query.where(Profile.is_active == active)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    order = (
        [Profile.created_at.desc(), Profile.id.desc()]
        if sort == "newest"
        else [func.lower(Profile.username), Profile.id]
    )
    rows = await db.scalars(
        query.order_by(*order).offset((page - 1) * limit).limit(limit)
    )
    return paginated([user_response(row) for row in rows], total, page, limit)


async def target(db, identity):
    row = await db.scalar(
        select(Profile)
        .where(Profile.id == identity)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if not row:
        raise HTTPException(404, "User not found")
    return row


async def protect_authority(db, row, actor, role=None, active=None):
    next_role = UserRole(role) if role else row.role
    next_active = row.is_active if active is None else active
    removing = (
        row.is_super_admin
        and row.is_active
        and (next_role != UserRole.SUPER_ADMIN or not next_active)
    )
    if removing:
        others = await db.scalar(
            select(func.count())
            .select_from(Profile)
            .where(
                Profile.role == UserRole.SUPER_ADMIN,
                Profile.is_active.is_(True),
                Profile.id != row.id,
            )
        )
        if not others:
            raise HTTPException(409, "Cannot remove the last active superadministrator")
    if row.id == actor.id and (not next_active or next_role != UserRole.SUPER_ADMIN):
        raise HTTPException(
            400, "Cannot deactivate or demote your own superadministrator account"
        )
    if next_role != UserRole.STUDENT and not next_active and role is not None:
        raise HTTPException(
            409, "Restore the account before changing administrative privileges"
        )


async def commit(db):
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            409, "Account fields conflict with an existing record"
        ) from exc


async def synchronize(db, action_id, actor):
    await authority_lock(db, actor)
    action = await db.scalar(
        select(AccountAction).where(AccountAction.id == action_id).with_for_update()
    )
    if not action:
        raise HTTPException(404, "Account action not found")
    if action.action == "invite":
        raise HTTPException(
            409, "Recover invitations using a verified Supabase identity ID"
        )
    if action.status == "applied":
        return action
    row = await target(db, action.target_id)
    try:
        # Reconcile the CURRENT profile, not an obsolete queued payload.
        await run_in_threadpool(
            auth_admin().update_user_by_id,
            str(row.id),
            {
                "ban_duration": "none" if row.is_active else "876000h",
                "user_metadata": {
                    "username": row.username,
                    "full_name": row.full_name,
                    "school_id": row.school_id,
                },
            },
        )
    except Exception:
        action.status = "failed"
        action.error_code = "auth_sync_failed"
        action.finished_at = datetime.now(timezone.utc)
        await commit(db)
        raise HTTPException(
            503,
            {
                "message": "Local access was updated; Supabase synchronization needs retry",
                "operation_id": str(action.id),
            },
        )
    action.status = "applied"
    action.error_code = None
    action.finished_at = datetime.now(timezone.utc)
    await commit(db)
    return action


async def update_account(db, identity, data, actor):
    await authority_lock(db, actor)
    row = await target(db, identity)
    values = data.model_dump(exclude_unset=True, exclude={"reason"})
    if not values:
        raise HTTPException(422, "Choose at least one account field to update")
    if "school_id" in values:
        values["school_id"] = values["school_id"] or None
    values = {
        key: value
        for key, value in values.items()
        if value != (row.role.value if key == "role" else getattr(row, key))
    }
    if not values:
        return user_response(row)
    await unique_fields(db, values, identity)
    await protect_authority(db, row, actor, role=values.get("role"))
    previous = {
        key: row.role.value if key == "role" else getattr(row, key) for key in values
    }
    for key, value in values.items():
        setattr(row, key, UserRole(value) if key == "role" else value)
    row.updated_at = datetime.now(timezone.utc)
    action = AccountAction(
        actor_id=actor.id,
        target_id=row.id,
        action="update",
        payload={"reason": data.reason, "before": previous, "changes": values},
        status="pending" if any(key != "role" for key in values) else "applied",
    )
    if "role" in values:
        await db.execute(
            update(ApiSession)
            .where(ApiSession.user_id == row.id, ApiSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
    db.add(action)
    await commit(db)
    await db.refresh(action)
    if action.status == "pending":
        await synchronize(db, action.id, actor)
    return user_response(row)


async def set_active(db, identity, data, actor):
    await authority_lock(db, actor)
    row = await target(db, identity)
    await protect_authority(db, row, actor, active=data.is_active)
    # Restores stay locally disabled until the external ban is cleared.
    if data.is_active:
        try:
            await run_in_threadpool(
                auth_admin().update_user_by_id, str(row.id), {"ban_duration": "none"}
            )
        except Exception as exc:
            raise HTTPException(
                503, "Account remains disabled because Supabase restoration failed"
            ) from exc
    row.is_active = data.is_active
    row.updated_at = datetime.now(timezone.utc)
    if not data.is_active:
        await db.execute(
            update(ApiSession)
            .where(ApiSession.user_id == row.id, ApiSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
    action = AccountAction(
        actor_id=actor.id,
        target_id=row.id,
        action="restore" if data.is_active else "suspend",
        status="applied" if data.is_active else "pending",
        payload={"is_active": data.is_active, "reason": data.reason},
    )
    db.add(action)
    await commit(db)
    await db.refresh(action)
    if action.status == "pending":
        await synchronize(db, action.id, actor)
    return user_response(row)


async def verify(db, identity, data, actor):
    await authority_lock(db, actor)
    row = await target(db, identity)
    row.is_verified = data.is_verified
    row.verified_at = datetime.now(timezone.utc) if data.is_verified else None
    row.verified_by = actor.id if data.is_verified else None
    db.add(
        VerificationAction(
            user_id=row.id,
            administrator_id=actor.id,
            status="verified" if data.is_verified else "unverified",
            notes=data.notes,
        )
    )
    db.add(
        AccountAction(
            actor_id=actor.id,
            target_id=row.id,
            action="verify",
            status="applied",
            finished_at=datetime.now(timezone.utc),
            payload={
                "is_verified": data.is_verified,
                "institutional_review_completed": data.institutional_review_completed,
                "notes": data.notes,
            },
        )
    )
    await commit(db)
    await db.refresh(row)
    return user_response(row)


async def finish_invitation(db, action, identity, actor, username=None):
    await authority_lock(db, actor)
    payload = dict(action.payload)
    if username:
        payload["username"] = username
    existing = await db.scalar(select(Profile).where(Profile.id == identity))
    if existing:
        if existing.email.lower() != payload["email"].lower():
            raise HTTPException(409, "Identity does not match this invitation")
    else:
        await unique_fields(db, payload)
        db.add(
            Profile(
                id=identity,
                email=payload["email"],
                username=payload["username"],
                full_name=payload["full_name"],
                school_id=payload.get("school_id") or None,
                role=UserRole.STUDENT,
                is_verified=False,
            )
        )
    action.target_id = identity
    action.payload = payload
    action.status = "applied"
    action.error_code = None
    action.finished_at = datetime.now(timezone.utc)
    await commit(db)
    return user_response(await db.scalar(select(Profile).where(Profile.id == identity)))


async def invite(db, data, actor):
    await authority_lock(db, actor)
    values = data.model_dump(mode="json", exclude={"request_id"})
    values["email"] = values["email"].lower()
    previous = await db.scalar(
        select(AccountAction).where(AccountAction.id == data.request_id)
    )
    if previous:
        if previous.actor_id != actor.id or previous.payload != values:
            raise HTTPException(
                409, "Invitation reference was already used for different data"
            )
        if previous.status == "applied":
            return user_response(await target(db, previous.target_id))
        raise HTTPException(
            409,
            {
                "message": "Invitation outcome needs reconciliation; recover it instead of sending another email",
                "operation_id": str(previous.id),
            },
        )
    await unique_fields(db, values)
    action = AccountAction(
        id=data.request_id,
        actor_id=actor.id,
        action="invite",
        payload=values,
        status="pending",
    )
    db.add(action)
    await commit(db)
    try:
        result = await run_in_threadpool(
            auth_admin().invite_user_by_email,
            values["email"],
            {
                "data": {
                    key: values[key] for key in ["username", "full_name", "school_id"]
                },
                "redirect_to": settings.FRONTEND_URL.rstrip("/") + "/auth/callback",
            },
        )
        identity = uuid.UUID(result.user.id)
        # Save the returned identity immediately; profile conflicts remain recoverable.
        action.target_id = identity
        await commit(db)
        return await finish_invitation(db, action, identity, actor)
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        action = await db.scalar(
            select(AccountAction).where(AccountAction.id == data.request_id)
        )
        action.status = "failed"
        action.error_code = "invitation_needs_reconciliation"
        await commit(db)
        raise HTTPException(
            503,
            {
                "message": "Invitation needs reconciliation; do not resend automatically",
                "operation_id": str(data.request_id),
            },
        ) from exc


async def recover_invitation(db, identity, data, actor):
    await authority_lock(db, actor)
    action = await db.scalar(
        select(AccountAction).where(AccountAction.id == identity).with_for_update()
    )
    if not action or action.action != "invite":
        raise HTTPException(404, "Invitation action not found")
    if action.status == "applied":
        return user_response(await target(db, action.target_id))
    try:
        result = await run_in_threadpool(
            auth_admin().get_user_by_id, str(data.auth_user_id)
        )
    except Exception as exc:
        raise HTTPException(503, "Unable to verify the Supabase identity") from exc
    if (
        not result.user
        or (result.user.email or "").lower() != action.payload["email"].lower()
    ):
        raise HTTPException(
            409, "Supabase identity email does not match the invitation"
        )
    return await finish_invitation(db, action, data.auth_user_id, actor, data.username)


async def history(db, page=1, limit=20, actor_id=None, target_id=None, status=None):
    query = select(AccountAction)
    if actor_id:
        query = query.where(AccountAction.actor_id == actor_id)
    if target_id:
        query = query.where(AccountAction.target_id == target_id)
    if status:
        query = query.where(AccountAction.status == status)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    rows = (
        await db.execute(
            query.add_columns(Profile.username)
            .join(Profile, Profile.id == AccountAction.actor_id)
            .order_by(AccountAction.created_at.desc(), AccountAction.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return paginated(
        [
            {
                "id": str(row.id),
                "actor_id": str(row.actor_id),
                "actor": username,
                "target_id": str(row.target_id) if row.target_id else None,
                "action": row.action,
                "status": row.status,
                "payload": row.payload,
                "error_code": row.error_code,
                "created_at": row.created_at,
            }
            for row, username in rows
        ],
        total,
        page,
        limit,
    )

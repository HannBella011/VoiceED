"""Report assignment and rejection retain ownership and accountable timeline records."""

import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select, func
from app.models import Report, ReportTimeline, ReportStatus, Profile, UserRole


async def locked_report(db, identity):
    await db.execute(
        select(Report)
        .where(Report.id == identity)
        .execution_options(populate_existing=True)
        .with_for_update()
    )
    from app.services import report_service

    report = await report_service.get_by_id(db, identity)
    if not report:
        raise HTTPException(404, "Report not found")
    return report


def require_super(actor):
    if not actor.is_super_admin:
        raise HTTPException(403, "Superadministrator access required")


async def assign(db, identity, assignee_id, actor, remarks=None):
    require_super(actor)
    report = await locked_report(db, identity)
    if report.status in (ReportStatus.RESOLVED, ReportStatus.CLOSED):
        raise HTTPException(409, "Resolved and closed reports cannot be reassigned")
    try:
        identity = uuid.UUID(str(assignee_id))
    except ValueError:
        raise HTTPException(422, "Select a valid administrator")
    assignee = await db.scalar(select(Profile).where(Profile.id == identity))
    if not assignee or not assignee.is_active or not assignee.is_admin:
        raise HTTPException(422, "Select an active administrator")
    if report.assignee_id == assignee.id:
        raise HTTPException(
            409, "This report is already assigned to that administrator"
        )
    remarks = (remarks or "").strip()
    if len(remarks.split()) > 200:
        raise HTTPException(422, "Assignment remarks cannot exceed 200 words")
    previous = str(report.assignee_id) if report.assignee_id else "Unassigned"
    report.assignee_id = assignee.id
    # The existing assignment workflow enters Assigned; ongoing work retains its stage.
    if report.status in (ReportStatus.SUBMITTED, ReportStatus.UNDER_REVIEW):
        report.status = ReportStatus.ASSIGNED
    report.updated_at = datetime.now(timezone.utc)
    message = f"Assignment: {previous} → {assignee.username} ({assignee.id})"
    if remarks:
        message += f"\n{remarks}"
    db.add(
        ReportTimeline(
            report_id=report.id,
            status=report.status,
            remarks=message,
            created_by_user_id=actor.id,
        )
    )
    await db.commit()
    from app.services import report_service

    return await report_service.get_by_id(db, report.id)


async def reject(db, identity, reason, responsibility_confirmed, actor):
    require_super(actor)
    reason = reason.strip()
    if not reason or len(reason.split()) > 240:
        raise HTTPException(422, "Enter a rejection reason of 1 to 240 words")
    if responsibility_confirmed is not True:
        raise HTTPException(422, "Confirm responsibility before rejecting this report")
    report = await locked_report(db, identity)
    if report.status in (ReportStatus.CLOSED, ReportStatus.RESOLVED):
        raise HTTPException(409, "This report is already resolved or closed")
    report.status = ReportStatus.CLOSED
    report.closed_at = report.updated_at = datetime.now(timezone.utc)
    db.add(
        ReportTimeline(
            report_id=report.id,
            status=report.status,
            remarks=f"Rejected: {reason}",
            created_by_user_id=actor.id,
        )
    )
    await db.commit()
    from app.services import report_service

    return await report_service.get_by_id(db, report.id)


async def workload(db, identity):
    rows = (
        await db.execute(
            select(Report.status, func.count())
            .where(Report.assignee_id == identity)
            .group_by(Report.status)
        )
    ).all()
    result = {status.value: 0 for status in ReportStatus}
    result.update({status.value: count for status, count in rows})
    return {"administrator_id": str(identity), "total": sum(result.values()), **result}


async def workloads(db, page=1, limit=20):
    eligible = Profile.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])
    total = (
        await db.execute(select(func.count()).select_from(Profile).where(eligible))
    ).scalar_one()
    profiles = (
        (
            await db.execute(
                select(Profile)
                .where(eligible)
                .order_by(Profile.username, Profile.id)
                .offset((page - 1) * limit)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    ids = [profile.id for profile in profiles]
    counts = (
        (
            await db.execute(
                select(Report.assignee_id, Report.status, func.count())
                .where(Report.assignee_id.in_(ids))
                .group_by(Report.assignee_id, Report.status)
            )
        ).all()
        if ids
        else []
    )
    values = {
        identity: {status.value: 0 for status in ReportStatus} for identity in ids
    }
    for identity, status, count in counts:
        values[identity][status.value] = count
    return {
        "items": [
            {
                "id": str(profile.id),
                "name": profile.full_name or profile.username,
                "is_active": profile.is_active,
                "total": sum(values[profile.id].values()),
                **values[profile.id],
            }
            for profile in profiles
        ],
        "total": total,
        "page": page,
        "total_pages": max(1, (total + limit - 1) // limit),
    }

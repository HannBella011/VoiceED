from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    Request,
    Response,
    Header,
)
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import uuid

from app.database import get_db
from app.services import report_service, profile_service
from app.schemas import (
    ReportPublicResponse,
    TrackingCodeRequest,
    TrackingCodeResponse,
    AdminStatsResponse,
    AdminUserUpdate,
    UserResponse,
    UserListResponse,
    PaginationParams,
    UserRole,
    ReportStatus,
    ReportCategory,
)
from app.routes.auth import (
    get_current_active_user,
    get_current_admin_user,
    get_current_super_admin_user,
)
from app.models import Profile, UserRole as UserRoleModel

router = APIRouter()


# ============================================================================
# Public Tracking (No Auth Required)
# ============================================================================


@router.get(
    "/track/{tracking_code}", response_model=ReportPublicResponse, tags=["tracking"]
)
async def track_report_public(
    tracking_code: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    x_report_access: Optional[str] = Header(None, max_length=256),
    authorization: Optional[str] = Header(None),
):
    from app.services.report_submission import public_tracking

    response.headers["Cache-Control"] = "no-store"
    return await public_tracking(
        db, tracking_code, x_report_access, authorization, request
    )


# ============================================================================
# Admin User Management (Super Admin Only)
# ============================================================================


@router.get("/admin/users", response_model=UserListResponse, tags=["admin"])
async def admin_list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_super_admin_user),
):
    """List all users (super admin only)."""
    users, total = await profile_service.list_profiles(db, page, limit, role, is_active)
    total_pages = (total + limit - 1) // limit

    return UserListResponse(
        items=[
            UserResponse(
                id=str(u.id),
                username=u.username,
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                is_active=u.is_active,
                is_verified=bool(u.is_verified),
                theme=u.theme,
                gender=u.gender,
                birthday=u.birthday,
                school_id=u.school_id,
                avatar_url=u.avatar_url,
                created_at=u.created_at,
                updated_at=u.updated_at,
                last_login=u.last_login,
            )
            for u in users
        ],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/admin/users/{user_id}", response_model=UserResponse, tags=["admin"])
async def admin_get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_super_admin_user),
):
    """Get a specific user (super admin only)."""
    user = await profile_service.get_by_id(db, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_verified=bool(user.is_verified),
        theme=user.theme,
        gender=user.gender,
        birthday=user.birthday,
        school_id=user.school_id,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
    )


@router.patch("/admin/users/{user_id}", response_model=UserResponse, tags=["admin"])
async def admin_update_user(
    user_id: str,
    update: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_super_admin_user),
):
    """Update user role or status (super admin only)."""
    update_data = update.model_dump(exclude_unset=True)

    # Prevent self-demotion
    if str(user_id) == str(current_user.id) and "role" in update_data:
        if update_data["role"] != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=400, detail="Cannot change your own super admin role"
            )

    user = await profile_service.update(db, uuid.UUID(user_id), update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_verified=bool(user.is_verified),
        theme=user.theme,
        gender=user.gender,
        birthday=user.birthday,
        school_id=user.school_id,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
    )


@router.delete("/admin/users/{user_id}", tags=["admin"])
async def admin_delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_super_admin_user),
):
    """Delete a user (super admin only)."""
    # Prevent self-deletion
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    success = await profile_service.delete(db, uuid.UUID(user_id))
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}


# ============================================================================
# Admin Dashboard Stats
# ============================================================================


@router.get("/admin/stats", response_model=AdminStatsResponse, tags=["admin"])
async def admin_get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Get admin dashboard statistics."""
    return await report_service.get_admin_stats(db)


# ============================================================================
# Admin Report Management
# ============================================================================


@router.get("/admin/reports", response_model=List[ReportPublicResponse], tags=["admin"])
async def admin_list_reports_simple(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_anonymous: Optional[bool] = Query(None),
    assignee_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """List all reports for admin dashboard (simplified response)."""
    parsed_status = ReportStatus(status) if status else None
    parsed_category = ReportCategory(category) if category else None
    parsed_assignee_id = uuid.UUID(assignee_id) if assignee_id else None

    reports, total = await report_service.list_reports(
        db,
        page,
        limit,
        parsed_status,
        parsed_category,
        is_anonymous,
        parsed_assignee_id,
    )
    return reports


@router.get(
    "/admin/reports/{report_id}", response_model=ReportPublicResponse, tags=["admin"]
)
async def admin_get_report_detail(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Get a specific report with full details (admin only)."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ============================================================================
# Admin Actions on Reports
# ============================================================================


@router.post("/admin/reports/{report_id}/timeline", tags=["admin"])
async def admin_add_timeline_entry(
    report_id: int,
    status: str,
    remarks: Optional[str] = None,
    attachment_ids: Optional[List[int]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Add a timeline entry to a report (admin only)."""
    # Validate status
    try:
        report_status = ReportStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    # Validate remarks length (250 words max)
    if remarks:
        word_count = len(remarks.split())
        if word_count > 250:
            raise HTTPException(
                status_code=400, detail="Remarks exceed 250 words maximum"
            )

    timeline = await report_service.add_timeline_entry(
        db, report_id, report_status, remarks, current_user.id, attachment_ids
    )
    if not timeline:
        raise HTTPException(status_code=404, detail="Report not found")

    return {"message": "Timeline entry added", "timeline_id": timeline.id}


@router.post("/admin/reports/{report_id}/assign", tags=["admin"])
async def admin_assign_report(
    report_id: int,
    assignee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Assign a report to an admin (admin only)."""
    try:
        assignee_uuid = uuid.UUID(assignee_id)
        report = await report_service.assign_report(
            db, report_id, assignee_uuid, current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {"message": "Report assigned successfully", "assignee_id": assignee_id}


@router.patch("/admin/reports/{report_id}/status", tags=["admin"])
async def admin_update_report_status(
    report_id: int,
    status: str,
    remarks: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Update report status (admin only)."""
    # Validate status
    try:
        report_status = ReportStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if remarks:
        word_count = len(remarks.split())
        if word_count > 250:
            raise HTTPException(
                status_code=400, detail="Remarks exceed 250 words maximum"
            )

    report = await report_service.update_report(
        db,
        report_id,
        {"status": report_status, "remarks": remarks},
        current_user=current_user,
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {"message": "Status updated successfully", "status": report.status.value}


# ============================================================================
# Get available admins for assignment
# ============================================================================


@router.get("/admin/assignees", response_model=List[UserResponse], tags=["admin"])
async def get_available_assignees(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Get list of admins available for report assignment."""
    users, _ = await profile_service.list_profiles(
        db, page=1, limit=100, role=UserRoleModel.ADMIN, is_active=True
    )
    # Super admins can also be assigned reports.
    super_admins, _ = await profile_service.list_profiles(
        db, page=1, limit=100, role=UserRoleModel.SUPER_ADMIN, is_active=True
    )

    all_assignees = users + super_admins
    return [
        UserResponse(
            id=str(u.id),
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            is_verified=bool(u.is_verified),
            theme=u.theme,
            gender=u.gender,
            birthday=u.birthday,
            school_id=u.school_id,
            avatar_url=u.avatar_url,
            created_at=u.created_at,
            updated_at=u.updated_at,
            last_login=u.last_login,
        )
        for u in all_assignees
    ]

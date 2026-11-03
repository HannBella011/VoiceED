from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.services import report_service, user_service
from app.schemas import (
    ReportPublicResponse, TrackingCodeRequest, TrackingCodeResponse,
    AdminStatsResponse, AdminUserUpdate, UserResponse, UserListResponse,
    PaginationParams, UserRole
)
from app.routes.auth import get_current_user, get_current_active_user
from app.models import User, UserRole as UserRoleModel

router = APIRouter()


# ============================================================================
# Dependencies
# ============================================================================

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin or super_admin role."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_super_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require super_admin role."""
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


# ============================================================================
# Public Tracking (No Auth Required)
# ============================================================================

@router.get("/track/{tracking_code}", response_model=ReportPublicResponse, tags=["tracking"])
async def track_report_public(
    tracking_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Track a report by tracking code (public access, no auth required)."""
    report = await report_service.get_by_tracking_code(db, tracking_code)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # For public tracking, we don't expose user identity for anonymous reports
    # The ReportPublicResponse schema handles this
    return report


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
    current_user: User = Depends(require_super_admin)
):
    """List all users (super admin only)."""
    users, total = await user_service.list_users(db, page, limit, role, is_active)
    total_pages = (total + limit - 1) // limit
    
    return UserListResponse(
        items=users,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/admin/users/{user_id}", response_model=UserResponse, tags=["admin"])
async def admin_get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Get a specific user (super admin only)."""
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/admin/users/{user_id}", response_model=UserResponse, tags=["admin"])
async def admin_update_user(
    user_id: int,
    update: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Update user role or status (super admin only)."""
    update_data = update.model_dump(exclude_unset=True)
    
    # Prevent self-demotion
    if user_id == current_user.id and "role" in update_data:
        if update_data["role"] != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=400, detail="Cannot change your own super admin role")
    
    user = await user_service.update(db, user_id, update_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/admin/users/{user_id}", tags=["admin"])
async def admin_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    """Delete a user (super admin only)."""
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    success = await user_service.delete(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


# ============================================================================
# Admin Dashboard Stats
# ============================================================================

@router.get("/admin/stats", response_model=AdminStatsResponse, tags=["admin"])
async def admin_get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
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
    assignee_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all reports for admin dashboard (simplified response)."""
    from app.schemas import ReportStatus, ReportCategory
    
    parsed_status = ReportStatus(status) if status else None
    parsed_category = ReportCategory(category) if category else None
    
    reports, total = await report_service.list_reports(
        db, page, limit, parsed_status, parsed_category, is_anonymous, assignee_id
    )
    return reports


@router.get("/admin/reports/{report_id}", response_model=ReportPublicResponse, tags=["admin"])
async def admin_get_report_detail(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
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
    current_user: User = Depends(require_admin)
):
    """Add a timeline entry to a report (admin only)."""
    from app.schemas import ReportStatus
    
    # Validate status
    try:
        report_status = ReportStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    # Validate remarks length (250 words max)
    if remarks:
        word_count = len(remarks.split())
        if word_count > 250:
            raise HTTPException(status_code=400, detail="Remarks exceed 250 words maximum")
    
    timeline = await report_service.add_timeline_entry(
        db, report_id, report_status, remarks, current_user.id, attachment_ids
    )
    if not timeline:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Timeline entry added", "timeline_id": timeline.id}


@router.post("/admin/reports/{report_id}/assign", tags=["admin"])
async def admin_assign_report(
    report_id: int,
    assignee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Assign a report to an admin/moderator (admin only)."""
    try:
        report = await report_service.assign_report(db, report_id, assignee_id, current_user)
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
    current_user: User = Depends(require_admin)
):
    """Update report status (admin only)."""
    from app.schemas import ReportStatus
    
    try:
        report_status = ReportStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    if remarks:
        word_count = len(remarks.split())
        if word_count > 250:
            raise HTTPException(status_code=400, detail="Remarks exceed 250 words maximum")
    
    report = await report_service.update_report(
        db, report_id, {"status": report_status, "remarks": remarks}, current_user=current_user
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
    current_user: User = Depends(require_admin)
):
    """Get list of admins/moderators available for report assignment."""
    users, _ = await user_service.list_users(
        db, page=1, limit=100, 
        role=UserRoleModel.ADMIN
    )
    # Also include moderators and super_admins
    moderators, _ = await user_service.list_users(
        db, page=1, limit=100, 
        role=UserRoleModel.MODERATOR
    )
    super_admins, _ = await user_service.list_users(
        db, page=1, limit=100, 
        role=UserRoleModel.SUPER_ADMIN
    )
    
    all_assignees = users + moderators + super_admins
    return all_assignees

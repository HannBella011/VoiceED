from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.schemas import (
    ReportCreate, ReportCreateAnonymous, ReportUpdate, ReportResponse, ReportListResponse,
    ReportPublicResponse, ReportStatusUpdate, ReportAssignment,
    ReportAttachmentResponse, FileUploadResult, FileUploadError,
    TrackingCodeRequest, TrackingCodeResponse,
    AdminStatsResponse, AdminUserUpdate, AdminReportUpdate,
    PaginationParams, ReportStatus, ReportCategory, UserRole
)
from app.services import report_service, user_service, auth_service
from app.models import User, UserRole as UserRoleModel, ReportStatus as ReportStatusModel, ReportCategory as ReportCategoryModel
import aiofiles

router = APIRouter()


# ============================================================================
# Dependencies
# ============================================================================

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(auth_service.decode_token)  # This won't work directly, need proper auth dependency
) -> User:
    """Get current authenticated user from JWT token."""
    # TODO: Implement proper JWT dependency
    # For now, return None - we'll handle auth in each endpoint
    pass


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin or super_admin role."""
    if not current_user or not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require super_admin role."""
    if not current_user or not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


# ============================================================================
# Report Submission (Public - Anonymous & Authenticated)
# ============================================================================

@router.post("/submit", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_report_authenticated(
    title: str = Form(...),
    description: str = Form(...),
    category: ReportCategory = Form(...),
    location: Optional[str] = Form(None),
    incident_date: Optional[str] = Form(None),
    is_anonymous: bool = Form(False),
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a report as an authenticated user."""
    # Parse incident_date if provided
    parsed_incident_date = None
    if incident_date:
        from datetime import datetime
        try:
            parsed_incident_date = datetime.fromisoformat(incident_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid incident_date format. Use ISO 8601.")
    
    data = {
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "incident_date": parsed_incident_date,
    }
    
    report = await report_service.create_report(
        db, data, user_id=current_user.id, is_anonymous=is_anonymous
    )
    
    # Handle file uploads
    for file in files:
        if file.filename:
            content = await file.read()
            mime_type = file.content_type or "application/octet-stream"
            try:
                await report_service.add_attachment(
                    db, report.id, content, file.filename, mime_type, uploaded_by_user_id=current_user.id
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
    
    # Reload report with attachments
    report = await report_service.get_by_id(db, report.id)
    return report


@router.post("/submit/anonymous", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_report_anonymous(
    title: str = Form(...),
    description: str = Form(...),
    category: ReportCategory = Form(...),
    location: Optional[str] = Form(None),
    incident_date: Optional[str] = Form(None),
    reporter_email: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db)
):
    """Submit a report anonymously (no authentication required)."""
    # Parse incident_date if provided
    parsed_incident_date = None
    if incident_date:
        from datetime import datetime
        try:
            parsed_incident_date = datetime.fromisoformat(incident_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid incident_date format. Use ISO 8601.")
    
    data = {
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "incident_date": parsed_incident_date,
    }
    
    report = await report_service.create_report(
        db, data, user_id=None, is_anonymous=True, reporter_email=reporter_email
    )
    
    # Handle file uploads
    for file in files:
        if file.filename:
            content = await file.read()
            mime_type = file.content_type or "application/octet-stream"
            try:
                await report_service.add_attachment(
                    db, report.id, content, file.filename, mime_type, uploaded_by_user_id=None
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
    
    # Reload report with attachments
    report = await report_service.get_by_id(db, report.id)
    return report


# ============================================================================
# Report Tracking (Public)
# ============================================================================

@router.get("/track/{tracking_code}", response_model=ReportPublicResponse)
async def track_report(
    tracking_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Track a report by tracking code (public access)."""
    report = await report_service.get_by_tracking_code(db, tracking_code)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Load timeline and attachments
    # For public tracking, we don't expose user identity for anonymous reports
    return report


# ============================================================================
# User Dashboard (Authenticated)
# ============================================================================

@router.get("/my", response_model=ReportListResponse)
async def get_my_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ReportStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reports submitted by the current authenticated user."""
    reports, total = await report_service.get_user_reports(db, current_user.id, page, limit, status)
    total_pages = (total + limit - 1) // limit
    
    return ReportListResponse(
        items=reports,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific report by ID (authenticated users only)."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check ownership or admin access
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    
    return report


# ============================================================================
# Admin Routes
# ============================================================================

@router.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get admin dashboard statistics."""
    return await report_service.get_admin_stats(db)


@router.get("/admin/reports", response_model=ReportListResponse)
async def admin_list_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ReportStatus] = Query(None),
    category: Optional[ReportCategory] = Query(None),
    is_anonymous: Optional[bool] = Query(None),
    assignee_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all reports (admin only)."""
    reports, total = await report_service.list_reports(
        db, page, limit, status, category, is_anonymous, assignee_id
    )
    total_pages = (total + limit - 1) // limit
    
    return ReportListResponse(
        items=reports,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/admin/reports/{report_id}", response_model=ReportResponse)
async def admin_get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get a specific report (admin only)."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/admin/reports/{report_id}/status", response_model=ReportResponse)
async def admin_update_report_status(
    report_id: int,
    status_update: ReportStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update report status and add timeline entry (admin only)."""
    # Validate remarks length (250 words max)
    if status_update.remarks:
        word_count = len(status_update.remarks.split())
        if word_count > 250:
            raise HTTPException(status_code=400, detail="Remarks exceed 250 words maximum")
    
    report = await report_service.update_report(
        db, report_id, 
        {"status": status_update.status, "remarks": status_update.remarks},
        current_user=current_user
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Handle attachment linking to timeline
    if status_update.attachment_ids:
        # The timeline entry was created in update_report, need to link attachments
        # This is a simplified approach - in production you'd want to get the latest timeline entry
        pass
    
    return report


@router.patch("/admin/reports/{report_id}/assign", response_model=ReportResponse)
async def admin_assign_report(
    report_id: int,
    assignment: ReportAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Assign a report to an admin/moderator (admin only)."""
    try:
        report = await report_service.assign_report(db, report_id, assignment.assignee_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report


@router.patch("/admin/reports/{report_id}", response_model=ReportResponse)
async def admin_update_report(
    report_id: int,
    update: AdminReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update report details (admin only)."""
    update_data = update.model_dump(exclude_unset=True)
    report = await report_service.update_report(db, report_id, update_data, current_user=current_user)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ============================================================================
# File Upload
# ============================================================================

@router.post("/{report_id}/attachments", response_model=FileUploadResult)
async def upload_attachments(
    report_id: int,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload attachments to a report."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to upload attachments")
    
    uploaded = []
    errors = []
    
    for file in files:
        if not file.filename:
            errors.append(FileUploadError(filename="unknown", error="No filename provided"))
            continue
        
        content = await file.read()
        mime_type = file.content_type or "application/octet-stream"
        
        try:
            attachment = await report_service.add_attachment(
                db, report_id, content, file.filename, mime_type, uploaded_by_user_id=current_user.id
            )
            if attachment:
                uploaded.append(FileUploadResponse(
                    id=str(attachment.id),
                    filename=attachment.filename,
                    stored_filename=attachment.stored_filename,
                    file_path=attachment.file_path,
                    file_size=attachment.file_size,
                    mime_type=attachment.mime_type,
                    extension=attachment.extension,
                    url=f"/uploads/reports/{report_id}/{attachment.stored_filename}"
                ))
        except ValueError as e:
            errors.append(FileUploadError(filename=file.filename, error=str(e)))
    
    return FileUploadResult(uploaded=uploaded, errors=errors)


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an attachment."""
    # Check if attachment exists and user has permission
    from sqlalchemy import select
    from app.models import ReportAttachment, Report
    
    result = await db.execute(
        select(ReportAttachment, Report)
        .join(Report, ReportAttachment.report_id == Report.id)
        .where(ReportAttachment.id == attachment_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    attachment, report = row
    
    # Check permissions
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    success = await report_service.delete_attachment(db, attachment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    return {"message": "Attachment deleted successfully"}


# ============================================================================
# Legacy CRUD (kept for compatibility)
# ============================================================================

@router.post("/", response_model=ReportResponse)
async def create_report_legacy(
    data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint for creating reports."""
    report = await report_service.create_report(
        db, data.model_dump(), user_id=current_user.id, is_anonymous=data.is_anonymous
    )
    return report


@router.get("/", response_model=ReportListResponse)
async def list_reports_legacy(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ReportStatus] = Query(None),
    category: Optional[ReportCategory] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint for listing reports."""
    if current_user.is_admin:
        reports, total = await report_service.list_reports(db, page, limit, status, category)
    else:
        reports, total = await report_service.get_user_reports(db, current_user.id, page, limit, status)
    total_pages = (total + limit - 1) // limit
    
    return ReportListResponse(
        items=reports,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report_legacy(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint for getting a report."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return report


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report_legacy(
    report_id: int,
    data: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint for updating reports."""
    update_data = data.model_dump(exclude_unset=True)
    report = await report_service.update_report(db, report_id, update_data, current_user=current_user)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}")
async def delete_report_legacy(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy endpoint for deleting reports (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.delete(report)
    await db.commit()
    return {"message": "Report deleted successfully"}

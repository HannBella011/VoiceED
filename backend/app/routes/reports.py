from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Response,
    UploadFile,
    File,
    Form,
    Query,
    Header,
    Request,
)
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import EmailStr, TypeAdapter, ValidationError, BaseModel, Field
from typing import Literal

from app.database import get_db
from app.schemas import (
    ReportCreate,
    ReportCreateAnonymous,
    ReportUpdate,
    ReportResponse,
    ReportSubmissionResponse,
    ReportListResponse,
    ReportPublicResponse,
    ReportStatusUpdate,
    ReportAssignment,
    ReportAttachmentResponse,
    FileUploadResult,
    FileUploadError,
    TrackingCodeRequest,
    TrackingCodeResponse,
    AdminStatsResponse,
    AdminUserUpdate,
    AdminReportUpdate,
    PaginationParams,
    ReportStatus,
    ReportCategory,
    UserRole,
)
from app.services import report_service, profile_service, auth_service
from app.models import (
    Profile,
    UserRole as UserRoleModel,
    ReportStatus as ReportStatusModel,
    ReportCategory as ReportCategoryModel,
)
import aiofiles

from app.services.report_submission import (
    submit as submit_receipt,
    parse_reporter,
    parse_incident,
    public_tracking,
)

router = APIRouter()


class RejectionInput(BaseModel):
    reason: str = Field(min_length=1, max_length=5000)
    responsibility_confirmed: Literal[True]


# ============================================================================
# Dependencies
# ============================================================================

from app.routes.auth import (
    get_current_active_user,
    get_current_admin_user,
    get_current_super_admin_user,
)


# ============================================================================
# Report Submission (Public - Anonymous & Authenticated)
# ============================================================================


def notification_email(value):
    if not value:
        return None
    try:
        return str(TypeAdapter(EmailStr).validate_python(value))
    except ValidationError:
        raise HTTPException(422, "Enter a valid contact email")


@router.post("/submit", response_model=ReportSubmissionResponse, status_code=201)
async def submit_report_authenticated(
    response: Response,
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=50000),
    category: ReportCategory = Form(...),
    incident_date: str = Form(...),
    location: Optional[str] = Form(None, max_length=255),
    is_anonymous: bool = Form(False),
    reporter_details: Optional[str] = Form(None),
    reporter_email: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    idempotency_key: uuid.UUID = Header(...),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    response.headers["Cache-Control"] = "no-store"
    reporter = None if is_anonymous else parse_reporter(reporter_details, current_user)
    if is_anonymous and reporter_details:
        raise HTTPException(
            422, "Anonymous reports must not include reporter information"
        )
    data = dict(
        title=title,
        description=description,
        category=category.value,
        incident_date=parse_incident(incident_date),
        location=location,
    )
    email = notification_email(reporter_email) if is_anonymous else current_user.email
    return await submit_receipt(
        db,
        data,
        files,
        idempotency_key,
        owner=None if is_anonymous else current_user.id,
        anonymous=is_anonymous,
        email=email,
        reporter=reporter,
    )


@router.post("/submit/guest", response_model=ReportSubmissionResponse, status_code=201)
async def submit_report_guest(
    response: Response,
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=50000),
    category: ReportCategory = Form(...),
    incident_date: str = Form(...),
    location: Optional[str] = Form(None, max_length=255),
    reporter_details: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    idempotency_key: uuid.UUID = Header(...),
    db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    reporter = parse_reporter(reporter_details)
    data = dict(
        title=title,
        description=description,
        category=category.value,
        incident_date=parse_incident(incident_date),
        location=location,
    )
    return await submit_receipt(
        db, data, files, idempotency_key, email=reporter["email"], reporter=reporter
    )


@router.post(
    "/submit/anonymous", response_model=ReportSubmissionResponse, status_code=201
)
async def submit_report_anonymous(
    response: Response,
    title: str = Form(..., min_length=1, max_length=200),
    description: str = Form(..., min_length=1, max_length=50000),
    category: ReportCategory = Form(...),
    incident_date: str = Form(...),
    location: Optional[str] = Form(None, max_length=255),
    reporter_email: Optional[str] = Form(None),
    reporter_details: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    idempotency_key: uuid.UUID = Header(...),
    db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    if reporter_details:
        raise HTTPException(
            422, "Anonymous reports must not include reporter information"
        )
    data = dict(
        title=title,
        description=description,
        category=category.value,
        incident_date=parse_incident(incident_date),
        location=location,
    )
    return await submit_receipt(
        db,
        data,
        files,
        idempotency_key,
        anonymous=True,
        email=notification_email(reporter_email),
    )


# ============================================================================
# Report Tracking (Public)
# ============================================================================


@router.get("/track/{tracking_code}", response_model=ReportPublicResponse)
async def track_report(
    tracking_code: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    x_report_access: Optional[str] = Header(None, max_length=256),
    authorization: Optional[str] = Header(None),
):
    response.headers["Cache-Control"] = "no-store"
    return await public_tracking(
        db, tracking_code, x_report_access, authorization, request
    )


# ============================================================================
# User Dashboard (Authenticated)
# ============================================================================


@router.get("/my", response_model=ReportListResponse)
async def get_my_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ReportStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Get reports submitted by the current authenticated user."""
    reports, total = await report_service.get_user_reports(
        db, current_user.id, page, limit, status
    )
    total_pages = (total + limit - 1) // limit

    return ReportListResponse(
        items=reports, total=total, page=page, limit=limit, total_pages=total_pages
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Get a specific report by ID (authenticated users only)."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Check ownership or admin access
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this report"
        )

    return report


# ============================================================================
# Admin Routes
# ============================================================================


@router.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
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
    assignee_id: Optional[str] = Query(None),
    search: str = Query("", max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """List all reports (admin only)."""
    assignee_uuid = uuid.UUID(assignee_id) if assignee_id else None
    reports, total = await report_service.list_reports(
        db, page, limit, status, category, is_anonymous, assignee_uuid, search
    )
    total_pages = (total + limit - 1) // limit

    return ReportListResponse(
        items=reports, total=total, page=page, limit=limit, total_pages=total_pages
    )


@router.get("/admin/reports/{report_id}", response_model=ReportResponse)
async def admin_get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Get a specific report (admin only)."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/admin/reports/{report_id}/reporter")
async def admin_get_reporter_profile(
    report_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Read the current profile linked to a named report, without account editing access."""
    response.headers["Cache-Control"] = "private, no-store"
    report = await report_service.get_by_id(db, report_id)
    if not report or report.is_anonymous or not report.user_id:
        raise HTTPException(404, "No linked reporter profile is available")
    profile = await db.get(Profile, report.user_id)
    if not profile:
        raise HTTPException(404, "Reporter profile no longer exists")
    return {
        field: getattr(profile, field)
        for field in (
            "id",
            "username",
            "full_name",
            "email",
            "school_id",
            "birthday",
            "is_verified",
            "created_at",
        )
    }


@router.patch("/admin/reports/{report_id}/status", response_model=ReportResponse)
async def admin_update_report_status(
    report_id: int,
    status_update: ReportStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Update report status and add timeline entry (admin only)."""
    # Validate remarks length (250 words max)
    if status_update.remarks:
        word_count = len(status_update.remarks.split())
        if word_count > 250:
            raise HTTPException(
                status_code=400, detail="Remarks exceed 250 words maximum"
            )

    report = await report_service.update_report(
        db,
        report_id,
        {
            "status": status_update.status,
            "remarks": status_update.remarks,
            "attachment_ids": status_update.attachment_ids,
        },
        current_user=current_user,
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return report


@router.patch("/admin/reports/{report_id}/assign", response_model=ReportResponse)
async def admin_assign_report(
    report_id: int,
    assignment: ReportAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_super_admin_user),
):
    """Assign a report through the superadministrator workflow."""
    try:
        assignee_uuid = uuid.UUID(assignment.assignee_id)
        report = await report_service.assign_report(
            db, report_id, assignee_uuid, current_user, assignment.remarks
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return report


@router.post("/admin/reports/{report_id}/reject", response_model=ReportResponse)
async def reject_report(
    report_id: int,
    data: RejectionInput,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_super_admin_user),
):
    from app.services.report_management import reject

    return await reject(
        db, report_id, data.reason, data.responsibility_confirmed, current_user
    )


@router.patch("/admin/reports/{report_id}", response_model=ReportResponse)
async def admin_update_report(
    report_id: int,
    update: AdminReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    """Update report details (admin only)."""
    update_data = update.model_dump(exclude_unset=True)
    # Convert assignee_id string to UUID if present
    if "assignee_id" in update_data and update_data["assignee_id"]:
        update_data["assignee_id"] = uuid.UUID(update_data["assignee_id"])

    report = await report_service.update_report(
        db, report_id, update_data, current_user=current_user
    )
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
    current_user: Profile = Depends(get_current_active_user),
):
    """Upload attachments to a report."""
    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Check permissions
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=403, detail="Not authorized to upload attachments"
        )

    uploaded = []
    errors = []

    for file in files:
        if not file.filename:
            errors.append(
                FileUploadError(filename="unknown", error="No filename provided")
            )
            continue

        content = await file.read()
        mime_type = file.content_type or "application/octet-stream"

        try:
            attachment = await report_service.add_attachment(
                db,
                report_id,
                content,
                file.filename,
                mime_type,
                uploaded_by_user_id=current_user.id,
            )
            if attachment:
                uploaded.append(
                    ReportAttachmentResponse(
                        id=str(attachment.id),
                        report_id=str(attachment.report_id),
                        filename=attachment.filename,
                        stored_filename=attachment.stored_filename,
                        file_path=attachment.file_path,
                        file_size=attachment.file_size,
                        mime_type=attachment.mime_type,
                        extension=attachment.extension,
                        uploaded_by_user_id=(
                            str(attachment.uploaded_by_user_id)
                            if attachment.uploaded_by_user_id
                            else None
                        ),
                        created_at=attachment.created_at,
                    )
                )
        except ValueError as e:
            errors.append(FileUploadError(filename=file.filename, error=str(e)))

    return FileUploadResult(uploaded=uploaded, errors=errors)


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
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
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this attachment"
        )

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
    current_user: Profile = Depends(get_current_active_user),
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
    current_user: Profile = Depends(get_current_active_user),
):
    """Legacy endpoint for listing reports."""
    if current_user.is_admin:
        reports, total = await report_service.list_reports(
            db, page, limit, status, category
        )
    else:
        reports, total = await report_service.get_user_reports(
            db, current_user.id, page, limit, status
        )
    total_pages = (total + limit - 1) // limit

    return ReportListResponse(
        items=reports, total=total, page=page, limit=limit, total_pages=total_pages
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report_legacy(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
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
    current_user: Profile = Depends(get_current_active_user),
):
    """Legacy endpoint for updating reports."""
    update_data = data.model_dump(exclude_unset=True)
    report = await report_service.update_report(
        db, report_id, update_data, current_user=current_user
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}")
async def delete_report_legacy(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Retain report evidence and audit history; use the existing closure workflow."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    report = await report_service.get_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    raise HTTPException(
        status_code=409,
        detail="Close reports through the administrator status workflow to retain their history",
    )


@router.post("/admin/reports/{report_id}/timeline", response_model=ReportResponse)
async def admin_timeline(
    report_id: int,
    data: ReportStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_admin_user),
):
    report = await report_service.update_report(
        db, report_id, data.model_dump(), current_user
    )
    if report is None:
        raise HTTPException(404, "Report not found")
    return report

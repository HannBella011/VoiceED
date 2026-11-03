from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MODERATOR = "moderator"
    SUPER_ADMIN = "super_admin"


class ReportStatus(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    AWAITING_ADDITIONAL_INFO = "awaiting_additional_info"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ReportCategory(str, Enum):
    ACADEMIC = "academic"
    HARASSMENT = "harassment"
    SAFETY = "safety"
    DISCRIMINATION = "discrimination"
    MENTAL_HEALTH = "mental_health"
    VIOLENCE = "violence"
    OTHER = "other"


class Gender(str, Enum):
    FEMALE = "female"
    MALE = "male"
    LGBTQ = "lgbtq+"


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    role: UserRole
    gender: Optional[Gender] = None
    birthday: Optional[datetime] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    limit: int
    total_pages: int


# Report Attachment schemas
class ReportAttachmentBase(BaseModel):
    filename: str
    file_size: int
    mime_type: str
    extension: str


class ReportAttachmentCreate(ReportAttachmentBase):
    pass


class ReportAttachmentResponse(ReportAttachmentBase):
    id: str
    report_id: str
    stored_filename: str
    file_path: str
    uploaded_by_user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Report Timeline schemas
class ReportTimelineBase(BaseModel):
    status: ReportStatus
    remarks: Optional[str] = None


class ReportTimelineCreate(ReportTimelineBase):
    pass


class ReportTimelineUpdate(BaseModel):
    remarks: Optional[str] = None


class ReportTimelineAttachmentResponse(BaseModel):
    id: str
    timeline_id: str
    attachment_id: str
    attachment: ReportAttachmentResponse
    created_at: datetime

    class Config:
        from_attributes = True


class ReportTimelineResponse(ReportTimelineBase):
    id: str
    report_id: str
    created_by_user_id: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    attachments: List[ReportTimelineAttachmentResponse] = []

    class Config:
        from_attributes = True


# Report schemas
class ReportBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: ReportCategory
    is_anonymous: bool = False
    location: Optional[str] = None
    incident_date: Optional[datetime] = None


class ReportCreate(ReportBase):
    # For anonymous submissions, email is optional
    reporter_email: Optional[EmailStr] = None


class ReportCreateAnonymous(ReportBase):
    # Anonymous submission - no auth required
    reporter_email: Optional[EmailStr] = None


class ReportUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ReportStatus] = None
    category: Optional[ReportCategory] = None
    assignee_id: Optional[int] = None
    location: Optional[str] = None
    incident_date: Optional[datetime] = None


class ReportStatusUpdate(BaseModel):
    status: ReportStatus
    remarks: Optional[str] = Field(None, max_length=1500)  # ~250 words
    attachment_ids: Optional[List[int]] = None


class ReportAssignment(BaseModel):
    assignee_id: int


class ReportResponse(ReportBase):
    id: str
    tracking_code: str
    status: ReportStatus
    user_id: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    reporter_email: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    attachments: List[ReportAttachmentResponse] = []
    timeline: List[ReportTimelineResponse] = []

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class ReportPublicResponse(BaseModel):
    """Public tracking response - no user identity info for anonymous reports"""
    id: str
    tracking_code: str
    title: str
    category: ReportCategory
    status: ReportStatus
    is_anonymous: bool
    location: Optional[str] = None
    incident_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    timeline: List[ReportTimelineResponse] = []

    class Config:
        from_attributes = True


# Tracking Code schemas
class TrackingCodeRequest(BaseModel):
    tracking_code: str = Field(..., pattern=r"^VED-[A-Z0-9]{4}-[A-Z0-9]{4}$")


class TrackingCodeResponse(BaseModel):
    tracking_code: str
    report: ReportPublicResponse


# Email schemas
class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    html_content: str
    text_content: Optional[str] = None


class ReportNotificationEmail(BaseModel):
    tracking_code: str
    report_title: str
    submission_date: datetime
    tracking_url: str
    is_anonymous: bool


# File Upload schemas
class FileUploadResponse(BaseModel):
    id: str
    filename: str
    stored_filename: str
    file_path: str
    file_size: int
    mime_type: str
    extension: str
    url: str


class FileUploadError(BaseModel):
    filename: str
    error: str


class FileUploadResult(BaseModel):
    uploaded: List[FileUploadResponse]
    errors: List[FileUploadError]


# Admin schemas
class AdminStatsResponse(BaseModel):
    total_reports: int
    pending_reports: int
    in_progress_reports: int
    resolved_reports: int
    anonymous_reports: int
    authenticated_reports: int
    total_users: int
    total_admins: int


class AdminUserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class AdminReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    assignee_id: Optional[int] = None
    category: Optional[ReportCategory] = None


# Audit Log schemas
class AuditLogEntry(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogEntry]
    total: int
    page: int
    limit: int
    total_pages: int


# Wellness schemas
class WellnessTipBase(BaseModel):
    title: str
    content: str
    category: str


class WellnessTipCreate(WellnessTipBase):
    pass


class WellnessTipResponse(WellnessTipBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class JournalEntryBase(BaseModel):
    title: str
    content: str
    mood: Optional[str] = None


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryResponse(JournalEntryBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Inspire schemas
class InspireStoryBase(BaseModel):
    title: str
    content: str
    author_name: Optional[str] = None
    is_anonymous: bool = False


class InspireStoryCreate(InspireStoryBase):
    pass


class InspireStoryResponse(InspireStoryBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InspireQuoteBase(BaseModel):
    quote: str
    author: Optional[str] = None


class InspireQuoteCreate(InspireQuoteBase):
    pass


class InspireQuoteResponse(InspireQuoteBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Share schemas
class SharedMaterialBase(BaseModel):
    title: str
    description: Optional[str] = None
    subject: str
    file_url: str
    file_type: str


class SharedMaterialCreate(SharedMaterialBase):
    pass


class SharedMaterialResponse(SharedMaterialBase):
    id: str
    user_id: str
    download_count: int = 0
    is_anonymous: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# Pagination
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


# Health Check
class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
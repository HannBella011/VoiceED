# VoiceED Backend - Database Models
# Compatible with Supabase Auth (auth.users) and Session Pooler

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, ForeignKey, Index, UniqueConstraint, UUID as SQLUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid


class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MODERATOR = "moderator"
    SUPER_ADMIN = "super_admin"


class ReportStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    AWAITING_ADDITIONAL_INFO = "awaiting_additional_info"
    RESOLVED = "resolved"
    CLOSED = "closed"


class ReportCategory(str, enum.Enum):
    ACADEMIC = "academic"
    HARASSMENT = "harassment"
    SAFETY = "safety"
    DISCRIMINATION = "discrimination"
    MENTAL_HEALTH = "mental_health"
    VIOLENCE = "violence"
    OTHER = "other"


class Gender(str, enum.Enum):
    FEMALE = "female"
    MALE = "male"
    LGBTQ = "lgbtq+"


class Profile(Base):
    """User profile linked to Supabase Auth (auth.users).

    Supabase Auth manages authentication (auth.users table).
    This table stores application-specific profile data.
    The 'id' matches the Supabase Auth user ID (UUID).
    """
    __tablename__ = "profiles"

    id = Column(SQLUUID(as_uuid=True), primary_key=True, index=True)  # Matches auth.users.id
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    gender = Column(Enum(Gender), nullable=True)
    birthday = Column(DateTime, nullable=True)
    school_id = Column(String(50), unique=True, index=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan", foreign_keys="Report.user_id")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    stories = relationship("InspireStory", back_populates="user", cascade="all, delete-orphan")
    materials = relationship("SharedMaterial", back_populates="user", cascade="all, delete-orphan")
    assigned_reports = relationship("Report", back_populates="assignee", foreign_keys="Report.assignee_id")
    uploaded_attachments = relationship("ReportAttachment", back_populates="uploaded_by", foreign_keys="ReportAttachment.uploaded_by_user_id")
    created_timeline_entries = relationship("ReportTimeline", back_populates="created_by", foreign_keys="ReportTimeline.created_by_user_id")

    def __repr__(self):
        return f"<Profile(id={self.id}, username={self.username}, email={self.email}, role={self.role})>"

    @property
    def is_admin(self) -> bool:
        return self.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)

    @property
    def is_super_admin(self) -> bool:
        return self.role == UserRole.SUPER_ADMIN


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    tracking_code = Column(String(20), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(ReportCategory), nullable=False)
    status = Column(Enum(ReportStatus), default=ReportStatus.SUBMITTED, nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    location = Column(String(255), nullable=True)
    incident_date = Column(DateTime(timezone=True), nullable=True)
    user_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    assignee_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    reporter_email = Column(String(255), nullable=True)  # For anonymous reports with email
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("Profile", back_populates="reports", foreign_keys=[user_id])
    assignee = relationship("Profile", back_populates="assigned_reports", foreign_keys=[assignee_id])
    attachments = relationship("ReportAttachment", back_populates="report", cascade="all, delete-orphan")
    timeline_entries = relationship("ReportTimeline", back_populates="report", cascade="all, delete-orphan", order_by="ReportTimeline.created_at")

    # Indexes
    __table_args__ = (
        Index("ix_reports_status_category", "status", "category"),
        Index("ix_reports_user_created", "user_id", "created_at"),
        Index("ix_reports_tracking_code", "tracking_code"),
        Index("ix_reports_assignee_status", "assignee_id", "status"),
    )

    def __repr__(self):
        return f"<Report(id={self.id}, tracking_code={self.tracking_code}, title={self.title}, status={self.status})>"


class ReportAttachment(Base):
    __tablename__ = "report_attachments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)  # UUID-based stored name
    file_path = Column(String(500), nullable=False)  # Supabase Storage path
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    extension = Column(String(20), nullable=False)
    uploaded_by_user_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)  # Who uploaded (admin or user)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    report = relationship("Report", back_populates="attachments")
    uploaded_by = relationship("Profile", back_populates="uploaded_attachments", foreign_keys=[uploaded_by_user_id])

    def __repr__(self):
        return f"<ReportAttachment(id={self.id}, report_id={self.report_id}, filename={self.filename})>"


class ReportTimeline(Base):
    __tablename__ = "report_timeline"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(ReportStatus), nullable=False)
    remarks = Column(Text, nullable=True)  # Admin remarks (max 250 words)
    created_by_user_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)  # Admin who made the update
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    report = relationship("Report", back_populates="timeline_entries")
    created_by = relationship("Profile", back_populates="created_timeline_entries", foreign_keys=[created_by_user_id])

    def __repr__(self):
        return f"<ReportTimeline(id={self.id}, report_id={self.report_id}, status={self.status})>"


class ReportTimelineAttachment(Base):
    """Association table for timeline entries and attachments"""
    __tablename__ = "report_timeline_attachments"

    id = Column(Integer, primary_key=True, index=True)
    timeline_id = Column(Integer, ForeignKey("report_timeline.id", ondelete="CASCADE"), nullable=False)
    attachment_id = Column(Integer, ForeignKey("report_attachments.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("timeline_id", "attachment_id", name="uq_timeline_attachment"),
    )

    def __repr__(self):
        return f"<ReportTimelineAttachment(timeline_id={self.timeline_id}, attachment_id={self.attachment_id})>"


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    mood = Column(String(50), nullable=True)
    user_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    user = relationship("Profile", back_populates="journal_entries")

    def __repr__(self):
        return f"<JournalEntry(id={self.id}, title={self.title})>"


class WellnessTip(Base):
    __tablename__ = "wellness_tips"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<WellnessTip(id={self.id}, title={self.title})>"


class InspireStory(Base):
    __tablename__ = "inspire_stories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author_name = Column(String(255), nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    user_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("Profile", back_populates="stories")

    def __repr__(self):
        return f"<InspireStory(id={self.id}, title={self.title})>"


class InspireQuote(Base):
    __tablename__ = "inspire_quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote = Column(Text, nullable=False)
    author = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<InspireQuote(id={self.id}, quote={self.quote[:50]}...)>"


class SharedMaterial(Base):
    __tablename__ = "shared_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=False, index=True)
    file_url = Column(String(500), nullable=False)  # Supabase Storage public URL
    file_type = Column(String(50), nullable=False)
    user_id = Column(SQLUUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("Profile", back_populates="materials")

    # Indexes
    __table_args__ = (
        Index("ix_shared_materials_subject_created", "subject", "created_at"),
    )

    def __repr__(self):
        return f"<SharedMaterial(id={self.id}, title={self.title})>"

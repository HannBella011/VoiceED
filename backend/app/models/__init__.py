# VoiceED Backend - Database Models

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MODERATOR = "moderator"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"


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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    gender = Column(Enum(Gender), nullable=True)
    birthday = Column(DateTime, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    stories = relationship("InspireStory", back_populates="user", cascade="all, delete-orphan")
    materials = relationship("SharedMaterial", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(Enum(ReportCategory), nullable=False)
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    location = Column(String(255), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    user = relationship("User", back_populates="reports")

    # Indexes
    __table_args__ = (
        Index("ix_reports_status_category", "status", "category"),
        Index("ix_reports_user_created", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<Report(id={self.id}, title={self.title}, status={self.status})>"


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    mood = Column(String(50), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    user = relationship("User", back_populates="journal_entries")

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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="stories")

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
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="materials")

    # Indexes
    __table_args__ = (
        Index("ix_shared_materials_subject_created", "subject", "created_at"),
    )

    def __repr__(self):
        return f"<SharedMaterial(id={self.id}, title={self.title})>"
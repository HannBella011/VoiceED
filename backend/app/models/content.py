"""Additive content metadata; API authorization is implemented in later phases."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Index,
    UniqueConstraint,
    UUID,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class InspireAttachment(Base):
    __tablename__ = "inspire_attachments"
    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    story_id = Column(Integer, ForeignKey("inspire_stories.id", ondelete="RESTRICT"))
    quote_id = Column(Integer, ForeignKey("inspire_quotes.id", ondelete="RESTRICT"))
    storage_bucket = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Unattached uploads expire; cleanup workers delete the object before its row.
    expires_at = Column(DateTime(timezone=True), nullable=True)
    story = relationship("InspireStory", back_populates="attachments")
    quote = relationship("InspireQuote", back_populates="attachments")
    __table_args__ = (
        CheckConstraint(
            "(story_id IS NULL OR quote_id IS NULL)",
            name="ck_inspire_attachments_target",
        ),
        CheckConstraint(
            "(story_id IS NOT NULL OR quote_id IS NOT NULL) OR expires_at IS NOT NULL",
            name="ck_inspire_attachments_expiry",
        ),
        CheckConstraint(
            "file_size > 0 AND file_size <= 26214400",
            name="ck_inspire_attachments_size",
        ),
        CheckConstraint(
            "mime_type IN ('image/png','image/jpeg','application/pdf')",
            name="ck_inspire_attachments_type",
        ),
        CheckConstraint(
            "length(trim(filename)) > 0 AND length(trim(storage_bucket)) > 0 AND length(trim(storage_path)) > 0",
            name="ck_inspire_attachments_metadata",
        ),
        UniqueConstraint(
            "storage_bucket", "storage_path", name="uq_inspire_attachments_object"
        ),
        Index("ix_inspire_attachments_story", "story_id"),
        Index("ix_inspire_attachments_quote", "quote_id"),
        Index("ix_inspire_attachments_expiry", "expires_at"),
    )


class ModerationAction(Base):
    """Durable removal history with a snapshot independent of the content row."""

    __tablename__ = "moderation_actions"
    id = Column(Integer, primary_key=True)
    content_type = Column(String(20), nullable=False)
    content_id = Column(Integer, nullable=False)
    content_title = Column(String(255), nullable=False)
    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=True,
    )
    administrator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason = Column(Text, nullable=False)
    policy_reference = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    notification_id = Column(
        Integer, ForeignKey("contact_messages.id", ondelete="SET NULL"), nullable=True
    )
    __table_args__ = (
        CheckConstraint(
            "content_type IN ('resource','story','quote','comment')",
            name="ck_moderation_actions_type",
        ),
        CheckConstraint(
            "content_id > 0 AND length(trim(reason)) > 0",
            name="ck_moderation_actions_reason",
        ),
        Index(
            "ix_moderation_actions_target_created",
            "content_type",
            "content_id",
            "created_at",
        ),
        Index("ix_moderation_actions_admin_created", "administrator_id", "created_at"),
    )


class VerificationAction(Base):
    __tablename__ = "verification_actions"
    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    administrator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    __table_args__ = (
        CheckConstraint(
            "status IN ('verified','unverified')", name="ck_verification_actions_status"
        ),
        Index("ix_verification_actions_user_created", "user_id", "created_at"),
    )

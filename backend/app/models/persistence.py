"""Persistence for existing WellnessED, InspireED, inbox and dashboard interfaces."""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    UUID,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MoodRecord(Base):
    __tablename__ = "mood_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    mood = Column(String(20), nullable=False)
    recorded_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    user = relationship("Profile", back_populates="moods")

    __table_args__ = (
        CheckConstraint(
            "mood IN ('excited','happy','good','calm','okay','tired','worried','sad','angry','terrible')",
            name="ck_mood_records_mood",
        ),
        Index("ix_mood_records_user_recorded", "user_id", "recorded_at"),
    )


class WellnessGoal(Base):
    __tablename__ = "wellness_goals"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    text = Column(String(200), nullable=False)
    preset_key = Column(String(20), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    archived_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("Profile", back_populates="wellness_goals")
    progress = relationship(
        "WellnessGoalProgress", back_populates="goal", passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_wellness_goals_owner"),
        UniqueConstraint("user_id", "preset_key", name="uq_wellness_goals_preset"),
        CheckConstraint("length(trim(text)) > 0", name="ck_wellness_goals_text"),
        CheckConstraint(
            "preset_key IS NULL OR preset_key IN ('sleep','water','exercise','breaks')",
            name="ck_wellness_goals_preset",
        ),
        Index("ix_wellness_goals_user_created", "user_id", "created_at"),
    )


class WellnessGoalProgress(Base):
    __tablename__ = "wellness_goal_progress"

    id = Column(Integer, primary_key=True)
    goal_id = Column(Integer, nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    day = Column(Date, nullable=False)
    completed = Column(Boolean, nullable=False, default=False, server_default="false")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    goal = relationship("WellnessGoal", back_populates="progress")

    __table_args__ = (
        ForeignKeyConstraint(
            ["goal_id", "user_id"],
            ["wellness_goals.id", "wellness_goals.user_id"],
            name="fk_wellness_progress_goal_owner",
            ondelete="CASCADE",
        ),
        UniqueConstraint("goal_id", "day", name="uq_wellness_goal_progress_day"),
        CheckConstraint(
            "(completed AND completed_at IS NOT NULL) OR (NOT completed AND completed_at IS NULL)",
            name="ck_wellness_progress_completed",
        ),
        Index("ix_wellness_goal_progress_user_day", "user_id", "day"),
    )


class InspireReaction(Base):
    __tablename__ = "inspire_reactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    story_id = Column(
        Integer, ForeignKey("inspire_stories.id", ondelete="CASCADE"), nullable=True
    )
    quote_id = Column(
        Integer, ForeignKey("inspire_quotes.id", ondelete="CASCADE"), nullable=True
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    story = relationship("InspireStory", back_populates="reactions")
    quote = relationship("InspireQuote", back_populates="reactions")

    __table_args__ = (
        CheckConstraint(
            "(story_id IS NOT NULL AND quote_id IS NULL) OR (story_id IS NULL AND quote_id IS NOT NULL)",
            name="ck_inspire_reactions_target",
        ),
        UniqueConstraint("user_id", "story_id", name="uq_inspire_reactions_story_user"),
        UniqueConstraint("user_id", "quote_id", name="uq_inspire_reactions_quote_user"),
        Index("ix_inspire_reactions_story", "story_id"),
        Index("ix_inspire_reactions_quote", "quote_id"),
    )


class InspireComment(Base):
    __tablename__ = "inspire_comments"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    story_id = Column(
        Integer, ForeignKey("inspire_stories.id", ondelete="CASCADE"), nullable=True
    )
    quote_id = Column(
        Integer, ForeignKey("inspire_quotes.id", ondelete="CASCADE"), nullable=True
    )
    content = Column(Text, nullable=False)
    removed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    story = relationship("InspireStory", back_populates="comments")
    quote = relationship("InspireQuote", back_populates="comments")

    __table_args__ = (
        CheckConstraint(
            "(story_id IS NOT NULL AND quote_id IS NULL) OR (story_id IS NULL AND quote_id IS NOT NULL)",
            name="ck_inspire_comments_target",
        ),
        CheckConstraint(
            "length(trim(content)) > 0", name="ck_inspire_comments_content"
        ),
        Index("ix_inspire_comments_story_created", "story_id", "created_at"),
        Index("ix_inspire_comments_quote_created", "quote_id", "created_at"),
        Index("ix_inspire_comments_user_created", "user_id", "created_at"),
    )


class InspireShare(Base):
    __tablename__ = "inspire_shares"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    story_id = Column(
        Integer, ForeignKey("inspire_stories.id", ondelete="CASCADE"), nullable=True
    )
    quote_id = Column(
        Integer, ForeignKey("inspire_quotes.id", ondelete="CASCADE"), nullable=True
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    story = relationship("InspireStory", back_populates="shares")
    quote = relationship("InspireQuote", back_populates="shares")

    __table_args__ = (
        CheckConstraint(
            "(story_id IS NOT NULL AND quote_id IS NULL) OR (story_id IS NULL AND quote_id IS NOT NULL)",
            name="ck_inspire_shares_target",
        ),
        Index("ix_inspire_shares_story_created", "story_id", "created_at"),
        Index("ix_inspire_shares_quote_created", "quote_id", "created_at"),
        Index("ix_inspire_shares_user_created", "user_id", "created_at"),
    )


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True)
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    recipient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sender = relationship(
        "Profile", back_populates="sent_contact_messages", foreign_keys=[sender_id]
    )
    recipient = relationship(
        "Profile",
        back_populates="received_contact_messages",
        foreign_keys=[recipient_id],
    )

    __table_args__ = (
        CheckConstraint(
            "length(trim(name)) > 0 AND length(trim(email)) > 0 AND length(trim(subject)) > 0 AND length(trim(message)) > 0",
            name="ck_contact_messages_content",
        ),
        Index("ix_contact_messages_recipient_created", "recipient_id", "created_at"),
        Index("ix_contact_messages_sender_created", "sender_id", "created_at"),
    )


class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    action = Column(String(80), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    user = relationship("Profile", back_populates="activity")

    __table_args__ = (
        CheckConstraint("length(trim(action)) > 0", name="ck_user_activity_action"),
        Index("ix_user_activity_user_created", "user_id", "created_at"),
    )


class ApiSession(Base):
    """Revocable API session established only after Supabase authentication."""

    __tablename__ = "api_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    refresh_hash = Column(String(64), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (Index("ix_api_sessions_user_expires", "user_id", "expires_at"),)

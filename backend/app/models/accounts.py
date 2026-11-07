"""Restricted audit journal for account administration and external Auth operations."""

import uuid
from sqlalchemy import (
    Column,
    UUID,
    String,
    DateTime,
    ForeignKey,
    JSON,
    CheckConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class AccountAction(Base):
    __tablename__ = "account_actions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Invitation identities can exist before their application profile is saved.
    target_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(String(20), nullable=False)
    status = Column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    payload = Column(JSON().with_variant(JSONB(), "postgresql"), nullable=False)
    error_code = Column(String(60), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        CheckConstraint(
            "action IN ('invite','update','suspend','restore','verify')",
            name="ck_account_actions_action",
        ),
        CheckConstraint(
            "status IN ('pending','applied','failed')", name="ck_account_actions_status"
        ),
        Index("ix_account_actions_actor_created", "actor_id", "created_at"),
        Index("ix_account_actions_target_created", "target_id", "created_at"),
        Index("ix_account_actions_created", "created_at", "id"),
    )

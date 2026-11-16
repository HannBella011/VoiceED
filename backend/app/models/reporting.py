"""Short-lived, shared tracking throttle counters. No raw IP addresses."""

from sqlalchemy import Column, String, Integer, DateTime, Index, CheckConstraint
from app.database import Base


class TrackingRateLimit(Base):
    __tablename__ = "tracking_rate_limits"
    bucket = Column(String(64), primary_key=True)
    hits = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    __table_args__ = (
        Index("ix_tracking_rate_limits_expires", "expires_at"),
        CheckConstraint("hits > 0", name="ck_tracking_rate_limits_hits"),
    )

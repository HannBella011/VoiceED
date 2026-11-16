"""Private reporter snapshots, retry-safe receipts and shared tracking throttling.
Revision ID: e52f7d903ab1
Revises: d4a82e901c73
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e52f7d903ab1"
down_revision = "d4a82e901c73"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "reports", sa.Column("reporter_details", postgresql.JSONB(), nullable=True)
    )
    op.add_column("reports", sa.Column("submission_key", sa.String(64), nullable=True))
    op.add_column(
        "reports", sa.Column("submission_fingerprint", sa.String(64), nullable=True)
    )
    op.add_column(
        "reports", sa.Column("tracking_access_hash", sa.String(64), nullable=True)
    )
    op.add_column(
        "reports",
        sa.Column(
            "notification_status",
            sa.String(20),
            nullable=False,
            server_default="not_requested",
        ),
    )
    op.create_unique_constraint(
        "uq_reports_submission_key", "reports", ["submission_key"]
    )
    op.create_check_constraint(
        "ck_reports_anonymous_identity",
        "reports",
        "NOT is_anonymous OR reporter_details IS NULL",
    )
    op.create_check_constraint(
        "ck_reports_notification_status",
        "reports",
        "notification_status IN ('not_requested','pending','sending','accepted','failed')",
    )
    op.create_table(
        "tracking_rate_limits",
        sa.Column("bucket", sa.String(64), primary_key=True),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("hits > 0", name="ck_tracking_rate_limits_hits"),
    )
    op.create_index(
        "ix_tracking_rate_limits_expires", "tracking_rate_limits", ["expires_at"]
    )
    # Trusted API writes only; browsers cannot inspect counters or reset throttles.
    op.execute("ALTER TABLE tracking_rate_limits ENABLE ROW LEVEL SECURITY")
    # Reports are accessed through the authorized API, never the browser Data API.
    # Restrictive policies also block any permissive policies installed previously.
    for table in [
        "reports",
        "report_attachments",
        "report_timeline",
        "report_timeline_attachments",
    ]:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY voiceed_{table}_api_only ON {table} AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)"
        )


def downgrade():
    op.execute(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM reports WHERE reporter_details IS NOT NULL OR submission_key IS NOT NULL OR tracking_access_hash IS NOT NULL OR notification_status <> 'not_requested') THEN RAISE EXCEPTION 'Downgrade would discard report identity, retry receipts or tracking protection'; END IF; END $$"
    )
    op.drop_index("ix_tracking_rate_limits_expires", table_name="tracking_rate_limits")
    for table in [
        "reports",
        "report_attachments",
        "report_timeline",
        "report_timeline_attachments",
    ]:
        op.execute(f"DROP POLICY voiceed_{table}_api_only ON {table}")
    # Keep RLS enabled: a rollback must not expose previously private report data.
    op.drop_table("tracking_rate_limits")
    for name in ["ck_reports_notification_status", "ck_reports_anonymous_identity"]:
        op.drop_constraint(name, "reports", type_="check")
    op.drop_constraint("uq_reports_submission_key", "reports", type_="unique")
    for name in [
        "notification_status",
        "tracking_access_hash",
        "submission_fingerprint",
        "submission_key",
        "reporter_details",
    ]:
        op.drop_column("reports", name)

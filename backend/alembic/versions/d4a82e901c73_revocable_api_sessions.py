"""Revocable and rotating API sessions after verified Supabase authentication.

Revision ID: d4a82e901c73
Revises: c9e31b6f2048
"""

from alembic import op
import sqlalchemy as sa

revision = "d4a82e901c73"
down_revision = "c9e31b6f2048"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "api_sessions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("refresh_hash", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_api_sessions_user_expires", "api_sessions", ["user_id", "expires_at"]
    )
    # No browser policies: even owners cannot read refresh hashes or forge sessions.
    op.execute("ALTER TABLE api_sessions ENABLE ROW LEVEL SECURITY")


def downgrade():
    # Session state is security data, not user content. Removing it requires logout.
    op.execute(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM api_sessions WHERE revoked_at IS NULL AND expires_at > now()) THEN RAISE EXCEPTION 'Revoke active API sessions before downgrade'; END IF; END $$"
    )
    op.drop_index("ix_api_sessions_user_expires", table_name="api_sessions")
    op.drop_table("api_sessions")

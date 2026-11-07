"""Support bounded account, report and public-feed ordering.

Revision ID: eb8031649cd5
Revises: da7f20538bc4
"""

from alembic import op
import sqlalchemy as sa

revision = "eb8031649cd5"
down_revision = "da7f20538bc4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index("ix_profiles_created_id", "profiles", ["created_at", "id"])
    op.create_index(
        "ix_profiles_username_id", "profiles", [sa.text("lower(username)"), "id"]
    )
    op.create_index("ix_reports_created_id", "reports", ["created_at", "id"])
    op.create_index(
        "ix_reports_status_created_id", "reports", ["status", "created_at", "id"]
    )
    for table in ("inspire_stories", "inspire_quotes"):
        op.create_index(
            f"ix_{table}_visible_created",
            table,
            ["created_at", "id"],
            postgresql_where=sa.text("removed_at IS NULL"),
        )


def downgrade():
    for table in ("inspire_quotes", "inspire_stories"):
        op.drop_index(f"ix_{table}_visible_created", table_name=table)
    op.drop_index("ix_reports_status_created_id", table_name="reports")
    op.drop_index("ix_reports_created_id", table_name="reports")
    op.drop_index("ix_profiles_username_id", table_name="profiles")
    op.drop_index("ix_profiles_created_id", table_name="profiles")

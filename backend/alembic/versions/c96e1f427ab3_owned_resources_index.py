"""Index account-scoped resource counts and paginated personal listings.

Revision ID: c96e1f427ab3
Revises: b85d0e316fa2
"""

from alembic import op
import sqlalchemy as sa

revision = "c96e1f427ab3"
down_revision = "b85d0e316fa2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_shared_materials_owner_created",
        "shared_materials",
        ["user_id", "created_at", "id"],
        postgresql_where=sa.text("removed_at IS NULL"),
    )


def downgrade():
    op.drop_index("ix_shared_materials_owner_created", table_name="shared_materials")

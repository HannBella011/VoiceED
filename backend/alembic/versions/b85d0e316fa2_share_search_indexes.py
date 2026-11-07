"""Index visible ShareED feed order and prefix word search; retain all records.

Revision ID: b85d0e316fa2
Revises: a74c9d205ef1
"""

from alembic import op
import sqlalchemy as sa

revision = "b85d0e316fa2"
down_revision = "a74c9d205ef1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_shared_materials_visible_created",
        "shared_materials",
        ["created_at", "id"],
        postgresql_where=sa.text("removed_at IS NULL"),
    )
    op.execute(
        """CREATE INDEX ix_shared_materials_search ON public.shared_materials USING gin
        (to_tsvector('simple'::regconfig, coalesce(title, '') || ' ' || coalesce(subject, '') || ' ' || coalesce(description, '')))
        WHERE removed_at IS NULL"""
    )


def downgrade():
    op.drop_index("ix_shared_materials_search", table_name="shared_materials")
    op.drop_index("ix_shared_materials_visible_created", table_name="shared_materials")

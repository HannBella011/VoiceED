"""Merge moderator accounts into admin without changing account identities.

Revision ID: f63a8e014bc2
Revises: e52f7d903ab1
"""

from alembic import op

revision = "f63a8e014bc2"
down_revision = "e52f7d903ab1"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE profiles SET role = 'ADMIN' WHERE role = 'MODERATOR'")
    # Retain the historical PostgreSQL enum label to avoid rebuilding a shared
    # enum type; the constraint prevents it from being used by any account.
    op.create_check_constraint(
        "ck_profiles_supported_role",
        "profiles",
        "role IN ('STUDENT', 'ADMIN', 'SUPER_ADMIN')",
    )


def downgrade():
    op.drop_constraint("ck_profiles_supported_role", "profiles", type_="check")
    # Accounts remain admins: their previous roles cannot be inferred safely.

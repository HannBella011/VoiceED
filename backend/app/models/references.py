"""Reference Supabase-managed identity metadata without managing auth.users."""

from sqlalchemy import Column, MetaData, Table, UUID


# Separate metadata keeps Alembic/create_all from creating or dropping auth.users.
auth_users = Table(
    "users",
    MetaData(),
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)

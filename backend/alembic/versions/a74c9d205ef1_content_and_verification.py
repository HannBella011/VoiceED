"""Structured content, attachment lifecycle, moderation and student verification.

Revision ID: a74c9d205ef1
Revises: f63a8e014bc2
Legacy text and URLs remain intact. This revision does not move Storage objects.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a74c9d205ef1"
down_revision = "f63a8e014bc2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "profiles",
        sa.Column(
            "is_verified", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.add_column("profiles", sa.Column("verified_at", sa.DateTime(timezone=True)))
    op.add_column("profiles", sa.Column("verified_by", sa.UUID()))
    op.create_foreign_key(
        "fk_profiles_verified_by",
        "profiles",
        "profiles",
        ["verified_by"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_profiles_verification",
        "profiles",
        "(is_verified AND verified_at IS NOT NULL AND verified_by IS NOT NULL) OR (NOT is_verified AND verified_at IS NULL AND verified_by IS NULL)",
    )

    for table, text_column in [
        ("inspire_stories", "content"),
        ("inspire_quotes", "quote"),
    ]:
        op.add_column(table, sa.Column("body", postgresql.JSONB(), nullable=True))
        # Build JSON from text, never parse legacy content as HTML or JSON.
        op.execute(
            f"""UPDATE {table} SET body=jsonb_build_object('version',1,'blocks',
            jsonb_build_array(jsonb_build_object('type','paragraph','children',
            jsonb_build_array(jsonb_build_object('text',{text_column},'marks',jsonb_build_array())))))"""
        )
        op.create_check_constraint(
            f"ck_{table}_body",
            table,
            "body IS NULL OR (jsonb_typeof(body) = 'object' AND body @> jsonb_build_object('version',1) AND body ? 'blocks' AND jsonb_typeof(body->'blocks') = 'array')",
        )
    for table in [
        "inspire_stories",
        "inspire_quotes",
        "inspire_comments",
        "shared_materials",
    ]:
        op.add_column(table, sa.Column("removed_at", sa.DateTime(timezone=True)))
    for name, kind in [
        ("storage_bucket", sa.String(100)),
        ("storage_path", sa.String(500)),
        ("filename", sa.String(255)),
        ("file_size", sa.Integer()),
    ]:
        op.add_column("shared_materials", sa.Column(name, kind, nullable=True))

    op.create_table(
        "inspire_attachments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "story_id",
            sa.Integer(),
            sa.ForeignKey("inspire_stories.id", ondelete="RESTRICT"),
        ),
        sa.Column(
            "quote_id",
            sa.Integer(),
            sa.ForeignKey("inspire_quotes.id", ondelete="RESTRICT"),
        ),
        sa.Column("storage_bucket", sa.String(100), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "story_id IS NULL OR quote_id IS NULL", name="ck_inspire_attachments_target"
        ),
        sa.CheckConstraint(
            "(story_id IS NOT NULL OR quote_id IS NOT NULL) OR expires_at IS NOT NULL",
            name="ck_inspire_attachments_expiry",
        ),
        sa.CheckConstraint(
            "file_size > 0 AND file_size <= 26214400",
            name="ck_inspire_attachments_size",
        ),
        sa.CheckConstraint(
            "mime_type IN ('image/png','image/jpeg','application/pdf')",
            name="ck_inspire_attachments_type",
        ),
        sa.CheckConstraint(
            "length(trim(filename)) > 0 AND length(trim(storage_bucket)) > 0 AND length(trim(storage_path)) > 0",
            name="ck_inspire_attachments_metadata",
        ),
        sa.UniqueConstraint(
            "storage_bucket", "storage_path", name="uq_inspire_attachments_object"
        ),
    )
    for field in ["story_id", "quote_id", "expires_at"]:
        op.create_index(
            "ix_inspire_attachments_"
            + {"story_id": "story", "quote_id": "quote", "expires_at": "expiry"}[field],
            "inspire_attachments",
            [field],
        )

    op.create_table(
        "moderation_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content_type", sa.String(20), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("content_title", sa.String(255), nullable=False),
        sa.Column(
            "author_id", sa.UUID(), sa.ForeignKey("profiles.id", ondelete="RESTRICT")
        ),
        sa.Column(
            "administrator_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("policy_reference", sa.Text()),
        sa.Column("internal_notes", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "notification_id",
            sa.Integer(),
            sa.ForeignKey("contact_messages.id", ondelete="SET NULL"),
        ),
        sa.CheckConstraint(
            "content_type IN ('resource','story','quote','comment')",
            name="ck_moderation_actions_type",
        ),
        sa.CheckConstraint(
            "content_id > 0 AND length(trim(reason)) > 0",
            name="ck_moderation_actions_reason",
        ),
    )
    op.create_index(
        "ix_moderation_actions_target_created",
        "moderation_actions",
        ["content_type", "content_id", "created_at"],
    )
    op.create_index(
        "ix_moderation_actions_admin_created",
        "moderation_actions",
        ["administrator_id", "created_at"],
    )
    op.create_table(
        "verification_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "administrator_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('verified','unverified')", name="ck_verification_actions_status"
        ),
    )
    op.create_index(
        "ix_verification_actions_user_created",
        "verification_actions",
        ["user_id", "created_at"],
    )

    for table in ["inspire_attachments", "moderation_actions", "verification_actions"]:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        # Only the backend's trusted database connection accesses these tables.
        op.execute(f"REVOKE ALL ON public.{table} FROM anon, authenticated")
    # Defense in depth even if an existing profile policy permits owner updates.
    op.execute(
        """CREATE FUNCTION public.voiceed_protect_verification() RETURNS trigger
        LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
        BEGIN
          IF current_user IN ('anon','authenticated') THEN
            IF TG_OP='INSERT' THEN
              IF NEW.is_verified OR NEW.verified_at IS NOT NULL OR NEW.verified_by IS NOT NULL THEN
                RAISE EXCEPTION 'Student verification requires the administrative API' USING ERRCODE='42501';
              END IF;
            ELSIF NEW.is_verified IS DISTINCT FROM OLD.is_verified
               OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
               OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
              RAISE EXCEPTION 'Student verification requires the administrative API' USING ERRCODE='42501';
            END IF;
          END IF;
          RETURN NEW;
        END $$"""
    )
    op.execute(
        "CREATE TRIGGER trg_profiles_verification BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.voiceed_protect_verification()"
    )
    # A staged upload may only be linked to a post belonging to its uploader.
    op.execute(
        """CREATE FUNCTION public.voiceed_check_attachment_owner() RETURNS trigger
        LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
        DECLARE owner_id uuid;
        BEGIN
          IF NEW.story_id IS NOT NULL THEN
            SELECT user_id INTO owner_id FROM public.inspire_stories WHERE id=NEW.story_id FOR SHARE;
          ELSIF NEW.quote_id IS NOT NULL THEN
            SELECT user_id INTO owner_id FROM public.inspire_quotes WHERE id=NEW.quote_id FOR SHARE;
          ELSE RETURN NEW;
          END IF;
          IF owner_id IS DISTINCT FROM NEW.user_id THEN
            RAISE EXCEPTION 'Attachment and post must have the same owner' USING ERRCODE='23514';
          END IF;
          RETURN NEW;
        END $$"""
    )
    op.execute(
        "CREATE TRIGGER trg_inspire_attachment_owner BEFORE INSERT OR UPDATE ON public.inspire_attachments FOR EACH ROW EXECUTE FUNCTION public.voiceed_check_attachment_owner()"
    )
    op.execute(
        """CREATE FUNCTION public.voiceed_protect_post_owner() RETURNS trigger
        LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
        BEGIN
          IF NEW.user_id IS DISTINCT FROM OLD.user_id AND EXISTS (
            SELECT 1 FROM public.inspire_attachments WHERE
              (TG_TABLE_NAME='inspire_stories' AND story_id=OLD.id) OR
              (TG_TABLE_NAME='inspire_quotes' AND quote_id=OLD.id)) THEN
            RAISE EXCEPTION 'Cannot change the owner of a post with attachments' USING ERRCODE='23514';
          END IF;
          RETURN NEW;
        END $$"""
    )
    for table in ["inspire_stories", "inspire_quotes"]:
        op.execute(
            f"CREATE TRIGGER trg_{table}_owner BEFORE UPDATE OF user_id ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.voiceed_protect_post_owner()"
        )


def downgrade():
    # Refuse to silently discard rich content, storage references or audit history.
    op.execute(
        """DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM inspire_attachments)
         OR EXISTS (SELECT 1 FROM moderation_actions)
         OR EXISTS (SELECT 1 FROM verification_actions)
         OR EXISTS (SELECT 1 FROM profiles WHERE is_verified OR verified_at IS NOT NULL OR verified_by IS NOT NULL)
         OR EXISTS (SELECT 1 FROM shared_materials WHERE storage_bucket IS NOT NULL OR storage_path IS NOT NULL OR filename IS NOT NULL OR file_size IS NOT NULL OR removed_at IS NOT NULL)
         OR EXISTS (SELECT 1 FROM inspire_comments WHERE removed_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Downgrade would discard content or verification history; export/reconcile first';
      END IF;
    END $$"""
    )
    for table, text_column in [
        ("inspire_stories", "content"),
        ("inspire_quotes", "quote"),
    ]:
        op.execute(
            f"""DO $$ BEGIN IF EXISTS (SELECT 1 FROM {table} WHERE removed_at IS NOT NULL OR
          (body IS NOT NULL AND body IS DISTINCT FROM jsonb_build_object('version',1,'blocks',jsonb_build_array(
            jsonb_build_object('type','paragraph','children',jsonb_build_array(jsonb_build_object('text',{text_column},'marks',jsonb_build_array())))))))
          THEN RAISE EXCEPTION 'Downgrade would discard structured post content; export/reconcile first'; END IF; END $$"""
        )
    op.execute(
        "DROP TRIGGER trg_inspire_attachment_owner ON public.inspire_attachments"
    )
    op.execute("DROP FUNCTION public.voiceed_check_attachment_owner()")
    for table in ["inspire_stories", "inspire_quotes"]:
        op.execute(f"DROP TRIGGER trg_{table}_owner ON public.{table}")
    op.execute("DROP FUNCTION public.voiceed_protect_post_owner()")
    op.execute("DROP TRIGGER trg_profiles_verification ON public.profiles")
    op.execute("DROP FUNCTION public.voiceed_protect_verification()")
    for table in ["verification_actions", "moderation_actions", "inspire_attachments"]:
        op.drop_table(table)
    for table in ["inspire_stories", "inspire_quotes"]:
        op.drop_constraint(f"ck_{table}_body", table, type_="check")
        op.drop_column(table, "body")
    for table in [
        "inspire_stories",
        "inspire_quotes",
        "inspire_comments",
        "shared_materials",
    ]:
        op.drop_column(table, "removed_at")
    for name in ["storage_bucket", "storage_path", "filename", "file_size"]:
        op.drop_column("shared_materials", name)
    op.drop_constraint("ck_profiles_verification", "profiles", type_="check")
    op.drop_constraint("fk_profiles_verified_by", "profiles", type_="foreignkey")
    for name in ["verified_by", "verified_at", "is_verified"]:
        op.drop_column("profiles", name)

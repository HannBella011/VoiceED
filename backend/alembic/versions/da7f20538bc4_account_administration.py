"""Durable account actions and last-active-superadministrator protection.

Revision ID: da7f20538bc4
Revises: c96e1f427ab3
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "da7f20538bc4"
down_revision = "c96e1f427ab3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "account_actions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "actor_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("target_id", sa.UUID()),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("error_code", sa.String(60)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "action IN ('invite','update','suspend','restore','verify')",
            name="ck_account_actions_action",
        ),
        sa.CheckConstraint(
            "status IN ('pending','applied','failed')", name="ck_account_actions_status"
        ),
    )
    for name, columns in [
        ("actor_created", ["actor_id", "created_at"]),
        ("target_created", ["target_id", "created_at"]),
        ("created", ["created_at", "id"]),
    ]:
        op.create_index("ix_account_actions_" + name, "account_actions", columns)
    op.execute("ALTER TABLE public.account_actions ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON public.account_actions FROM anon, authenticated")
    op.execute(
        """CREATE FUNCTION public.voiceed_protect_account_authority() RETURNS trigger
        LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
        BEGIN
          IF current_user IN ('anon','authenticated') THEN
            IF TG_OP='INSERT' THEN
              IF NEW.role::text <> 'STUDENT' OR NOT NEW.is_active THEN
                RAISE EXCEPTION 'Account authority requires the administrative API' USING ERRCODE='42501';
              END IF;
            ELSIF TG_OP='DELETE' OR NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
              RAISE EXCEPTION 'Account authority requires the administrative API' USING ERRCODE='42501';
            END IF;
          END IF;
          IF TG_OP <> 'INSERT' AND OLD.role::text='SUPER_ADMIN' AND OLD.is_active THEN
            IF TG_OP='DELETE' OR NEW.role::text <> 'SUPER_ADMIN' OR NOT NEW.is_active THEN
              PERFORM pg_advisory_xact_lock(73910527);
              IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role::text='SUPER_ADMIN' AND is_active AND id<>OLD.id) THEN
                RAISE EXCEPTION 'Cannot remove the last active superadministrator' USING ERRCODE='23514';
              END IF;
            END IF;
          END IF;
          IF TG_OP='DELETE' THEN RETURN OLD; END IF;
          RETURN NEW;
        END $$"""
    )
    op.execute(
        "CREATE TRIGGER trg_profiles_account_authority BEFORE INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.voiceed_protect_account_authority()"
    )


def downgrade():
    op.execute(
        """DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.account_actions) THEN
        RAISE EXCEPTION 'Downgrade would discard account administration history; export/reconcile first'; END IF; END $$"""
    )
    op.execute("DROP TRIGGER trg_profiles_account_authority ON public.profiles")
    op.execute("DROP FUNCTION public.voiceed_protect_account_authority()")
    op.drop_table("account_actions")

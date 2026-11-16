"""Account preferences and existing-table integrity, without deleting records.

Revision ID: 8c6f2a1d4e90
Revises: 129e9b18f7ce
"""

from alembic import op
import sqlalchemy as sa

revision = "8c6f2a1d4e90"
down_revision = "129e9b18f7ce"
branch_labels = None
depends_on = None

WORDS_CHECK = r"remarks IS NULL OR btrim(remarks) = '' OR cardinality(regexp_split_to_array(btrim(remarks), E'\\s+')) <= 250"


def upgrade():
    # Fail the entire transaction; never guess which duplicate/orphan to remove.
    op.execute(
        r"""
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM public.reports GROUP BY tracking_code HAVING count(*) > 1) THEN
            RAISE EXCEPTION 'Duplicate report tracking codes must be resolved before upgrading';
          END IF;
          IF EXISTS (SELECT 1 FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL) THEN
            RAISE EXCEPTION 'Orphan profiles must be reconciled with Supabase Auth before upgrading';
          END IF;
          IF EXISTS (
            SELECT 1 FROM public.report_timeline_attachments l
            JOIN public.report_timeline t ON t.id=l.timeline_id
            JOIN public.report_attachments a ON a.id=l.attachment_id
            WHERE t.report_id <> a.report_id
          ) THEN
            RAISE EXCEPTION 'Cross-report timeline attachments must be reconciled before upgrading';
          END IF;
        END $$;
    """
    )
    op.add_column(
        "profiles",
        sa.Column("theme", sa.String(20), nullable=False, server_default="blue"),
    )
    op.create_check_constraint(
        "ck_profiles_theme",
        "profiles",
        "theme IN ('blue','purple','red','green','orange','pink')",
    )
    op.create_foreign_key(
        "fk_profiles_auth_user",
        "profiles",
        "users",
        ["id"],
        ["id"],
        referent_schema="auth",
        ondelete="RESTRICT",
    )
    op.alter_column(
        "shared_materials",
        "file_type",
        existing_type=sa.String(50),
        type_=sa.String(100),
        existing_nullable=False,
    )
    op.add_column("journal_entries", sa.Column("entry_date", sa.Date(), nullable=True))
    # No historical local entry date exists. Preserve the original timestamp and
    # derive only the new field, deterministically in UTC, for existing rows.
    op.execute(
        "UPDATE public.journal_entries SET entry_date=(created_at AT TIME ZONE 'UTC')::date WHERE entry_date IS NULL"
    )
    op.alter_column(
        "journal_entries",
        "entry_date",
        existing_type=sa.Date(),
        nullable=False,
        server_default=sa.text("CURRENT_DATE"),
    )
    op.create_index(
        "ix_journal_entries_user_date",
        "journal_entries",
        ["user_id", "entry_date", "created_at"],
    )
    op.drop_index("ix_reports_tracking_code", table_name="reports")
    op.create_index(
        "ix_reports_tracking_code", "reports", ["tracking_code"], unique=True
    )
    op.create_check_constraint(
        "ck_report_timeline_remarks_words", "report_timeline", WORDS_CHECK
    )

    # Validate both new links and later parent report_id changes. Locks keep a
    # concurrent parent update from invalidating a newly checked association.
    op.execute(
        """
        CREATE FUNCTION public.voiceed_check_timeline_attachment_report() RETURNS trigger
        LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
        DECLARE timeline_report integer; attachment_report integer;
        BEGIN
          IF TG_TABLE_NAME = 'report_timeline_attachments' THEN
            SELECT report_id INTO timeline_report FROM public.report_timeline WHERE id=NEW.timeline_id FOR SHARE;
            SELECT report_id INTO attachment_report FROM public.report_attachments WHERE id=NEW.attachment_id FOR SHARE;
            IF timeline_report IS DISTINCT FROM attachment_report THEN
              RAISE EXCEPTION 'Timeline and attachment must belong to the same report' USING ERRCODE='23514';
            END IF;
          ELSIF TG_TABLE_NAME = 'report_attachments' THEN
            IF EXISTS (SELECT 1 FROM public.report_timeline_attachments l JOIN public.report_timeline t ON t.id=l.timeline_id WHERE l.attachment_id=NEW.id AND t.report_id<>NEW.report_id) THEN
              RAISE EXCEPTION 'Cannot move a linked attachment to another report' USING ERRCODE='23514';
            END IF;
          ELSE
            IF EXISTS (SELECT 1 FROM public.report_timeline_attachments l JOIN public.report_attachments a ON a.id=l.attachment_id WHERE l.timeline_id=NEW.id AND a.report_id<>NEW.report_id) THEN
              RAISE EXCEPTION 'Cannot move a linked timeline to another report' USING ERRCODE='23514';
            END IF;
          END IF;
          RETURN NEW;
        END $$;
    """
    )
    # asyncpg prepares each execution: keep one top-level statement per call.
    op.execute(
        """CREATE TRIGGER trg_timeline_attachment_report
        BEFORE INSERT OR UPDATE ON public.report_timeline_attachments
        FOR EACH ROW EXECUTE FUNCTION public.voiceed_check_timeline_attachment_report()"""
    )
    op.execute(
        """CREATE TRIGGER trg_attachment_report_move
        BEFORE UPDATE OF report_id ON public.report_attachments
        FOR EACH ROW EXECUTE FUNCTION public.voiceed_check_timeline_attachment_report()"""
    )
    op.execute(
        """CREATE TRIGGER trg_timeline_report_move
        BEFORE UPDATE OF report_id ON public.report_timeline
        FOR EACH ROW EXECUTE FUNCTION public.voiceed_check_timeline_attachment_report()"""
    )


def downgrade():
    op.execute(
        """
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM public.profiles WHERE theme<>'blue')
             OR EXISTS (SELECT 1 FROM public.journal_entries WHERE entry_date<>(created_at AT TIME ZONE 'UTC')::date)
             OR EXISTS (SELECT 1 FROM public.shared_materials WHERE length(file_type)>50) THEN
            RAISE EXCEPTION 'Downgrade would discard preferences, entry dates or MIME types; export/reconcile affected data first';
          END IF;
        END $$;
    """
    )
    op.execute(
        "DROP TRIGGER trg_timeline_attachment_report ON public.report_timeline_attachments"
    )
    op.execute("DROP TRIGGER trg_attachment_report_move ON public.report_attachments")
    op.execute("DROP TRIGGER trg_timeline_report_move ON public.report_timeline")
    op.execute("DROP FUNCTION public.voiceed_check_timeline_attachment_report()")
    op.drop_constraint(
        "ck_report_timeline_remarks_words", "report_timeline", type_="check"
    )
    op.drop_index("ix_reports_tracking_code", table_name="reports")
    op.create_index(
        "ix_reports_tracking_code", "reports", ["tracking_code"], unique=False
    )
    op.drop_index("ix_journal_entries_user_date", table_name="journal_entries")
    op.drop_column("journal_entries", "entry_date")
    op.alter_column(
        "shared_materials",
        "file_type",
        existing_type=sa.String(100),
        type_=sa.String(50),
        existing_nullable=False,
    )
    op.drop_constraint("fk_profiles_auth_user", "profiles", type_="foreignkey")
    op.drop_constraint("ck_profiles_theme", "profiles", type_="check")
    op.drop_column("profiles", "theme")

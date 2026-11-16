"""Private mood records, goals and dated progress; reuse journal_entries.

Revision ID: b72d5e4a9031
Revises: 8c6f2a1d4e90
"""

from alembic import op
import sqlalchemy as sa

revision = "b72d5e4a9031"
down_revision = "8c6f2a1d4e90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "mood_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mood", sa.String(20), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "mood IN ('excited','happy','good','calm','okay','tired','worried','sad','angry','terrible')",
            name="ck_mood_records_mood",
        ),
    )
    op.create_index(
        "ix_mood_records_user_recorded", "mood_records", ["user_id", "recorded_at"]
    )
    op.create_table(
        "wellness_goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.String(200), nullable=False),
        sa.Column("preset_key", sa.String(20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("id", "user_id", name="uq_wellness_goals_owner"),
        sa.UniqueConstraint("user_id", "preset_key", name="uq_wellness_goals_preset"),
        sa.CheckConstraint("length(trim(text)) > 0", name="ck_wellness_goals_text"),
        sa.CheckConstraint(
            "preset_key IS NULL OR preset_key IN ('sleep','water','exercise','breaks')",
            name="ck_wellness_goals_preset",
        ),
    )
    op.create_index(
        "ix_wellness_goals_user_created", "wellness_goals", ["user_id", "created_at"]
    )
    op.create_table(
        "wellness_goal_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["goal_id", "user_id"],
            ["wellness_goals.id", "wellness_goals.user_id"],
            name="fk_wellness_progress_goal_owner",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("goal_id", "day", name="uq_wellness_goal_progress_day"),
        sa.CheckConstraint(
            "(completed AND completed_at IS NOT NULL) OR (NOT completed AND completed_at IS NULL)",
            name="ck_wellness_progress_completed",
        ),
    )
    op.create_index(
        "ix_wellness_goal_progress_user_day",
        "wellness_goal_progress",
        ["user_id", "day"],
    )
    # No admin policy: another user's personal wellness data remains private.
    for table in (
        "mood_records",
        "wellness_goals",
        "wellness_goal_progress",
        "journal_entries",
    ):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY voiceed_{table}_owner ON public.{table} FOR ALL TO authenticated USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()))"
        )


def downgrade():
    op.execute(
        """
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM public.mood_records)
             OR EXISTS (SELECT 1 FROM public.wellness_goals)
             OR EXISTS (SELECT 1 FROM public.wellness_goal_progress) THEN
            RAISE EXCEPTION 'Downgrade would discard wellness history; export/reconcile records first';
          END IF;
        END $$;
    """
    )
    op.execute("DROP POLICY voiceed_journal_entries_owner ON public.journal_entries")
    # Existing journals stay RLS-enabled on downgrade (fail closed).
    op.drop_table("wellness_goal_progress")
    op.drop_table("wellness_goals")
    op.drop_table("mood_records")

"""Extend existing InspireED entities; add interactions, contact inbox and activity.

Revision ID: c9e31b6f2048
Revises: b72d5e4a9031
"""

from alembic import op
import sqlalchemy as sa

revision = "c9e31b6f2048"
down_revision = "b72d5e4a9031"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "inspire_stories",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "inspire_stories",
        sa.Column("post_type", sa.String(20), nullable=False, server_default="story"),
    )
    op.add_column(
        "inspire_stories", sa.Column("recipient_label", sa.String(255), nullable=True)
    )
    op.create_check_constraint(
        "ck_inspire_stories_type",
        "inspire_stories",
        "post_type IN ('post','story','kudos','milestone')",
    )
    op.create_check_constraint(
        "ck_inspire_stories_recipient",
        "inspire_stories",
        "post_type <> 'kudos' OR (recipient_label IS NOT NULL AND length(trim(recipient_label)) > 0)",
    )
    op.create_index(
        "ix_inspire_stories_user_created", "inspire_stories", ["user_id", "created_at"]
    )
    op.add_column("inspire_quotes", sa.Column("user_id", sa.UUID(), nullable=True))
    op.add_column(
        "inspire_quotes",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_inspire_quotes_user",
        "inspire_quotes",
        "profiles",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_inspire_quotes_user_created", "inspire_quotes", ["user_id", "created_at"]
    )

    for table in ("inspire_reactions", "inspire_comments", "inspire_shares"):
        columns = [
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.UUID(),
                sa.ForeignKey("profiles.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "story_id",
                sa.Integer(),
                sa.ForeignKey("inspire_stories.id", ondelete="CASCADE"),
                nullable=True,
            ),
            sa.Column(
                "quote_id",
                sa.Integer(),
                sa.ForeignKey("inspire_quotes.id", ondelete="CASCADE"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.CheckConstraint(
                "(story_id IS NOT NULL AND quote_id IS NULL) OR (story_id IS NULL AND quote_id IS NOT NULL)",
                name=f"ck_{table}_target",
            ),
        ]
        if table == "inspire_comments":
            columns.extend(
                [
                    sa.Column("content", sa.Text(), nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
                    sa.CheckConstraint(
                        "length(trim(content)) > 0", name="ck_inspire_comments_content"
                    ),
                ]
            )
        if table == "inspire_reactions":
            columns.extend(
                [
                    sa.UniqueConstraint(
                        "user_id", "story_id", name="uq_inspire_reactions_story_user"
                    ),
                    sa.UniqueConstraint(
                        "user_id", "quote_id", name="uq_inspire_reactions_quote_user"
                    ),
                ]
            )
        op.create_table(table, *columns)
        if table == "inspire_reactions":
            op.create_index("ix_inspire_reactions_story", table, ["story_id"])
            op.create_index("ix_inspire_reactions_quote", table, ["quote_id"])
        else:
            for field in ("story_id", "quote_id", "user_id"):
                op.create_index(
                    f"ix_{table}_{field.removesuffix('_id')}_created",
                    table,
                    [field, "created_at"],
                )

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "sender_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "recipient_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "length(trim(name)) > 0 AND length(trim(email)) > 0 AND length(trim(subject)) > 0 AND length(trim(message)) > 0",
            name="ck_contact_messages_content",
        ),
    )
    for field in ("recipient_id", "sender_id"):
        op.create_index(
            f"ix_contact_messages_{field.removesuffix('_id')}_created",
            "contact_messages",
            [field, "created_at"],
        )
    op.create_table(
        "user_activity",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("length(trim(action)) > 0", name="ck_user_activity_action"),
    )
    op.create_index(
        "ix_user_activity_user_created", "user_activity", ["user_id", "created_at"]
    )

    # Shared feeds use FastAPI's sanitized responses. Direct table access is
    # owner-only, so anonymous authors are not revealed by a broad SELECT policy.
    for table in (
        "inspire_stories",
        "inspire_quotes",
        "inspire_reactions",
        "inspire_comments",
        "inspire_shares",
    ):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY voiceed_{table}_owner ON public.{table} FOR ALL TO authenticated USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()))"
        )
    op.execute("ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY")
    op.execute(
        """CREATE POLICY voiceed_contact_messages_read ON public.contact_messages
        FOR SELECT TO authenticated
        USING (sender_id=(SELECT auth.uid()) OR recipient_id=(SELECT auth.uid()))"""
    )
    op.execute(
        """CREATE POLICY voiceed_contact_messages_delete ON public.contact_messages
        FOR DELETE TO authenticated USING (recipient_id=(SELECT auth.uid()))"""
    )
    op.execute("ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY")
    op.execute(
        """CREATE POLICY voiceed_user_activity_read ON public.user_activity
        FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()))"""
    )


def downgrade():
    op.execute(
        """
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM public.inspire_reactions)
             OR EXISTS (SELECT 1 FROM public.inspire_comments)
             OR EXISTS (SELECT 1 FROM public.inspire_shares)
             OR EXISTS (SELECT 1 FROM public.contact_messages)
             OR EXISTS (SELECT 1 FROM public.user_activity)
             OR EXISTS (SELECT 1 FROM public.inspire_stories WHERE post_type<>'story' OR recipient_label IS NOT NULL OR updated_at IS NOT NULL)
             OR EXISTS (SELECT 1 FROM public.inspire_quotes WHERE user_id IS NOT NULL OR updated_at IS NOT NULL) THEN
            RAISE EXCEPTION 'Downgrade would discard social, inbox or activity data; export/reconcile records first';
          END IF;
        END $$;
    """
    )
    for table in ("inspire_stories", "inspire_quotes"):
        op.execute(f"DROP POLICY voiceed_{table}_owner ON public.{table}")
    for table in (
        "user_activity",
        "contact_messages",
        "inspire_shares",
        "inspire_comments",
        "inspire_reactions",
    ):
        op.drop_table(table)
    op.drop_index("ix_inspire_quotes_user_created", table_name="inspire_quotes")
    op.drop_constraint("fk_inspire_quotes_user", "inspire_quotes", type_="foreignkey")
    op.drop_column("inspire_quotes", "updated_at")
    op.drop_column("inspire_quotes", "user_id")
    op.drop_index("ix_inspire_stories_user_created", table_name="inspire_stories")
    op.drop_constraint("ck_inspire_stories_recipient", "inspire_stories", type_="check")
    op.drop_constraint("ck_inspire_stories_type", "inspire_stories", type_="check")
    op.drop_column("inspire_stories", "recipient_label")
    op.drop_column("inspire_stories", "post_type")
    op.drop_column("inspire_stories", "updated_at")

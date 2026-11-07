"""Account-scoped dashboard aggregates and a bounded recent-activity query."""

from datetime import date
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select, func, literal, union_all, or_
from app.database import get_db
from app.models import (
    Report,
    SharedMaterial,
    InspireStory,
    InspireQuote,
    InspireReaction,
    InspireComment,
    JournalEntry,
    MoodRecord,
    WellnessGoal,
    WellnessGoalProgress,
)
from app.routes.auth import get_current_active_user

router = APIRouter()


@router.get("")
async def summary(
    day: date,
    response: Response,
    db=Depends(get_db),
    user=Depends(get_current_active_user),
):
    response.headers["Cache-Control"] = "private, no-store"

    def owned_count(model, *conditions):
        return (
            select(func.count())
            .select_from(model)
            .where(model.user_id == user.id, *conditions)
            .scalar_subquery()
        )

    stories = select(InspireStory.id).where(
        InspireStory.user_id == user.id, InspireStory.removed_at.is_(None)
    )
    quotes = select(InspireQuote.id).where(
        InspireQuote.user_id == user.id, InspireQuote.removed_at.is_(None)
    )

    def received(model, *conditions):
        return (
            select(func.count())
            .select_from(model)
            .where(
                or_(model.story_id.in_(stories), model.quote_id.in_(quotes)),
                *conditions,
            )
            .scalar_subquery()
        )

    counts = (
        (
            await db.execute(
                select(
                    owned_count(
                        SharedMaterial, SharedMaterial.removed_at.is_(None)
                    ).label("materials"),
                    owned_count(
                        InspireStory,
                        InspireStory.removed_at.is_(None),
                        InspireStory.post_type == "story",
                    ).label("stories"),
                    owned_count(InspireQuote, InspireQuote.removed_at.is_(None)).label(
                        "quotes"
                    ),
                    owned_count(InspireStory, InspireStory.removed_at.is_(None)).label(
                        "story_records"
                    ),
                    received(InspireReaction).label("reactions_received"),
                    received(InspireComment, InspireComment.removed_at.is_(None)).label(
                        "comments_received"
                    ),
                    owned_count(JournalEntry).label("journals"),
                    owned_count(MoodRecord).label("moods"),
                    owned_count(WellnessGoal, WellnessGoal.archived_at.is_(None)).label(
                        "goals_total"
                    ),
                )
            )
        )
        .one()
        ._mapping
    )
    completed = await db.scalar(
        select(func.count())
        .select_from(WellnessGoalProgress)
        .join(WellnessGoal, WellnessGoal.id == WellnessGoalProgress.goal_id)
        .where(
            WellnessGoalProgress.user_id == user.id,
            WellnessGoalProgress.day == day,
            WellnessGoalProgress.completed.is_(True),
            WellnessGoal.archived_at.is_(None),
        )
    )
    statuses = (
        await db.execute(
            select(Report.status, func.count())
            .where(Report.user_id == user.id)
            .group_by(Report.status)
        )
    ).all()
    reports = {status.value: total for status, total in statuses}
    # Fetch only IDs, labels and real timestamps; sort/limit across sources in SQL.
    queries = []
    for model, action in [
        (Report, "Report submitted"),
        (SharedMaterial, "Study material shared"),
        (InspireStory, "InspireED post created"),
        (InspireQuote, "Quote shared"),
        (JournalEntry, "Journal entry saved"),
        (MoodRecord, "Mood recorded"),
    ]:
        timestamp = model.recorded_at if model is MoodRecord else model.created_at
        query = select(
            model.id.label("id"),
            literal(model.__tablename__).label("source"),
            literal(action).label("action"),
            timestamp.label("created_at"),
        ).where(model.user_id == user.id)
        if hasattr(model, "removed_at"):
            query = query.where(model.removed_at.is_(None))
        queries.append(query)
    activity_query = union_all(*queries).subquery()
    activity = (
        await db.execute(
            select(activity_query)
            .order_by(
                activity_query.c.created_at.desc(),
                activity_query.c.source,
                activity_query.c.id.desc(),
            )
            .limit(10)
        )
    ).all()
    fields = ["full_name", "username", "email", "birthday", "school_id", "gender"]
    completion = round(
        sum(bool(getattr(user, field, None)) for field in fields) / len(fields) * 100
    )
    return {
        "profile_completion": completion,
        "wellness_progress": (
            round(completed / counts["goals_total"] * 100)
            if counts["goals_total"]
            else 0
        ),
        "goals_total": counts["goals_total"],
        "goals_completed": completed,
        "reports": reports,
        "reports_submitted": sum(reports.values()),
        "materials": counts["materials"],
        "stories": counts["stories"],
        "quotes": counts["quotes"],
        "inspire_posts": counts["story_records"] + counts["quotes"],
        "other_posts": counts["story_records"] - counts["stories"],
        "reactions_received": counts["reactions_received"],
        "comments_received": counts["comments_received"],
        "journals": counts["journals"],
        "moods": counts["moods"],
        "activity": [
            {
                "id": f"{row.source}:{row.id}",
                "action": row.action,
                "created_at": row.created_at,
            }
            for row in activity
        ],
        "events": [],
        "safety_training": None,
    }

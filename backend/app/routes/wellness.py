"""Private WellnessED endpoints; administrators have no ownership exception."""

from datetime import date, datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import (
    Profile,
    MoodRecord,
    JournalEntry,
    WellnessGoal,
    WellnessGoalProgress,
    WellnessTip,
)
from app.routes.auth import get_current_active_user

router = APIRouter()
Mood = Literal[
    "excited",
    "happy",
    "good",
    "calm",
    "okay",
    "tired",
    "worried",
    "sad",
    "angry",
    "terrible",
]


class MoodInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mood: Mood


class JournalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="Journal entry", min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)
    mood: Mood | None = None
    entry_date: date


class GoalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=200)


class ProgressInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    day: date
    completed: bool


def record(row, fields):
    return {key: getattr(row, key) for key in fields.split()}


async def owned(db, model, identity, owner):
    row = await db.scalar(
        select(model).where(model.id == identity, model.user_id == owner)
    )
    if row is None:
        raise HTTPException(404, "Record not found")
    return row


@router.get("/tips")
async def tips(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    query = select(WellnessTip)
    if category:
        query = query.where(WellnessTip.category == category)
    return [
        record(r, "id title content category created_at")
        for r in (await db.scalars(query)).all()
    ]


@router.get("/resources")
async def resources(user: Profile = Depends(get_current_active_user)):
    return []


@router.get("/moods")
async def moods(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    rows = await db.scalars(
        select(MoodRecord)
        .where(MoodRecord.user_id == user.id)
        .order_by(MoodRecord.recorded_at.desc(), MoodRecord.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [record(r, "id mood recorded_at") for r in rows]


@router.post("/moods", status_code=201)
async def add_mood(
    data: MoodInput,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    row = MoodRecord(user_id=user.id, mood=data.mood)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return record(row, "id mood recorded_at")


@router.delete("/moods")
async def clear_moods(
    db: AsyncSession = Depends(get_db), user: Profile = Depends(get_current_active_user)
):
    await db.execute(delete(MoodRecord).where(MoodRecord.user_id == user.id))
    await db.commit()
    return {"message": "Mood history cleared"}


@router.delete("/moods/{identity}")
async def remove_mood(
    identity: int,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    await db.delete(await owned(db, MoodRecord, identity, user.id))
    await db.commit()
    return {"message": "Mood removed"}


@router.get("/journal")
async def journals(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    rows = await db.scalars(
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.created_at.desc(), JournalEntry.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [
        record(r, "id title content mood entry_date created_at updated_at")
        for r in rows
    ]


@router.post("/journal", status_code=201)
async def add_journal(
    data: JournalInput,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    if not data.content.strip():
        raise HTTPException(422, "Content is required")
    row = JournalEntry(user_id=user.id, **data.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return record(row, "id title content mood entry_date created_at updated_at")


@router.patch("/journal/{identity}")
async def update_journal(
    identity: int,
    data: JournalInput,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    row = await owned(db, JournalEntry, identity, user.id)
    if not data.content.strip():
        raise HTTPException(422, "Content is required")
    for key, value in data.model_dump().items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return record(row, "id title content mood entry_date created_at updated_at")


@router.delete("/journal")
async def clear_journals(
    db: AsyncSession = Depends(get_db), user: Profile = Depends(get_current_active_user)
):
    await db.execute(delete(JournalEntry).where(JournalEntry.user_id == user.id))
    await db.commit()
    return {"message": "Journals cleared"}


@router.delete("/journal/{identity}")
async def remove_journal(
    identity: int,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    await db.delete(await owned(db, JournalEntry, identity, user.id))
    await db.commit()
    return {"message": "Journal removed"}


@router.get("/goals")
async def goals(
    day: date,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    # Conflict-safe seeding only for existing preset controls, never fabricated progress.
    for key, text in [
        ("sleep", "7-8 hours sleep"),
        ("water", "8 glasses water"),
        ("exercise", "30 min exercise"),
        ("breaks", "Study breaks"),
    ]:
        await db.execute(
            insert(WellnessGoal)
            .values(user_id=user.id, text=text, preset_key=key)
            .on_conflict_do_nothing(index_elements=["user_id", "preset_key"])
        )
    await db.commit()
    rows = (
        await db.scalars(
            select(WellnessGoal)
            .where(WellnessGoal.user_id == user.id, WellnessGoal.archived_at.is_(None))
            .order_by(WellnessGoal.id)
        )
    ).all()
    progress = {
        r.goal_id: r.completed
        for r in (
            await db.scalars(
                select(WellnessGoalProgress).where(
                    WellnessGoalProgress.user_id == user.id,
                    WellnessGoalProgress.day == day,
                )
            )
        ).all()
    }
    return [
        {
            **record(r, "id text preset_key created_at"),
            "completed": progress.get(r.id, False),
        }
        for r in rows
    ]


@router.post("/goals", status_code=201)
async def add_goal(
    data: GoalInput,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    if not data.text.strip():
        raise HTTPException(422, "Goal text is required")
    row = WellnessGoal(user_id=user.id, text=data.text.strip())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return record(row, "id text preset_key created_at")


@router.delete("/goals/{identity}")
async def archive_goal(
    identity: int,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    row = await owned(db, WellnessGoal, identity, user.id)
    if row.preset_key:
        raise HTTPException(400, "Default goals cannot be removed")
    row.archived_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Goal archived; history retained"}


@router.put("/goals/{identity}/progress")
async def progress(
    identity: int,
    data: ProgressInput,
    db: AsyncSession = Depends(get_db),
    user: Profile = Depends(get_current_active_user),
):
    row = await owned(db, WellnessGoal, identity, user.id)
    if row.archived_at:
        raise HTTPException(404, "Goal not found")
    values = dict(
        user_id=user.id,
        goal_id=identity,
        day=data.day,
        completed=data.completed,
        completed_at=datetime.now(timezone.utc) if data.completed else None,
    )
    await db.execute(
        insert(WellnessGoalProgress)
        .values(**values)
        .on_conflict_do_update(
            index_elements=["goal_id", "day"],
            set_={
                k: v
                for k, v in values.items()
                if k not in ("user_id", "goal_id", "day")
            },
        )
    )
    await db.commit()
    return {"completed": data.completed}

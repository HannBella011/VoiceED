from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.database import get_db
from app.models import Profile, Report, SharedMaterial, InspireStory, InspireQuote, JournalEntry, MoodRecord, WellnessGoal, WellnessGoalProgress, UserActivity
from app.routes.auth import get_current_active_user

router=APIRouter()
@router.get('')
async def summary(day:date,db=Depends(get_db),user=Depends(get_current_active_user)):
    async def count(model): return await db.scalar(select(func.count()).select_from(model).where(model.user_id==user.id))
    fields=['full_name','username','email','birthday','school_id','gender']
    completion=round(sum(bool(getattr(user,f,None)) for f in fields)/len(fields)*100)
    goals=await db.scalar(select(func.count()).select_from(WellnessGoal).where(WellnessGoal.user_id==user.id,WellnessGoal.archived_at.is_(None)))
    completed=await db.scalar(select(func.count()).select_from(WellnessGoalProgress).join(WellnessGoal,WellnessGoal.id==WellnessGoalProgress.goal_id).where(WellnessGoalProgress.user_id==user.id,WellnessGoalProgress.day==day,WellnessGoalProgress.completed.is_(True),WellnessGoal.archived_at.is_(None)))
    # Genuine existing record timestamps, never invented registration/login events.
    activity=[]
    for model,action in [(Report,'Report submitted'),(SharedMaterial,'Study material shared'),(InspireStory,'InspireED post created'),(InspireQuote,'Quote shared'),(JournalEntry,'Journal entry saved')]:
        for row in (await db.scalars(select(model).where(model.user_id==user.id).order_by(model.created_at.desc()).limit(10))).all():
            activity.append({'id':f'{model.__tablename__}:{row.id}','action':action,'created_at':row.created_at})
    for row in (await db.scalars(select(MoodRecord).where(MoodRecord.user_id==user.id).order_by(MoodRecord.recorded_at.desc()).limit(10))).all():
        activity.append({'id':f'mood:{row.id}','action':'Mood recorded','created_at':row.recorded_at})
    # SQLite tests may return naive timestamps; normalized strings preserve ordering.
    activity.sort(key=lambda row: row['created_at'].isoformat(),reverse=True)
    statuses=(await db.execute(select(Report.status,func.count()).where(Report.user_id==user.id).group_by(Report.status))).all()
    return {'profile_completion':completion,'wellness_progress':round(completed/goals*100) if goals else 0,'goals_total':goals,'goals_completed':completed,
        'reports':{str(status.value):total for status,total in statuses},'materials':await count(SharedMaterial),'inspire_posts':await count(InspireStory)+await count(InspireQuote),'journals':await count(JournalEntry),'moods':await count(MoodRecord),
        'activity':activity[:10],'events':[],'safety_training':None}

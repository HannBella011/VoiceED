"""Database-backed InspireED feed with sanitized anonymous authors."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select, func, delete
from sqlalchemy.dialects.postgresql import insert
from app.database import get_db
from app.models import Profile, InspireStory, InspireQuote, InspireReaction, InspireComment, InspireShare, UserActivity
from app.routes.auth import get_current_active_user

router = APIRouter()
class StoryInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(default='Post', min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50000)
    post_type: Literal['post','story','kudos','milestone'] = 'story'
    is_anonymous: bool = False
    recipient_label: str | None = Field(None, max_length=255)
    @model_validator(mode='after')
    def valid(self):
        if not self.content.strip() or not self.title.strip(): raise ValueError('Content and title are required')
        if self.post_type == 'kudos' and not (self.recipient_label or '').strip(): raise ValueError('Kudos recipient is required')
        return self
class QuoteInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    quote: str = Field(min_length=1, max_length=10000)
    author: str | None = Field(None, max_length=255)
class CommentInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    content: str = Field(min_length=1, max_length=5000)

async def target(db, kind, identity):
    model = {'stories': InspireStory, 'quotes': InspireQuote}.get(kind)
    if model is None: raise HTTPException(404, 'Post not found')
    row = await db.scalar(select(model).where(model.id == identity))
    if row is None: raise HTTPException(404, 'Post not found')
    return row

def target_column(model, kind): return model.story_id if kind == 'stories' else model.quote_id
async def serialize(db, row, viewer, kind):
    anonymous = kind == 'stories' and row.is_anonymous
    profile = None if anonymous or row.user_id is None else await db.scalar(select(Profile).where(Profile.id == row.user_id))
    author = 'Anonymous' if anonymous else (profile.full_name or profile.username) if profile else 'Unknown'
    counts = {}
    for model, key in [(InspireReaction,'likes'),(InspireComment,'comments'),(InspireShare,'shares')]:
        counts[key] = await db.scalar(select(func.count()).select_from(model).where(target_column(model,kind) == row.id))
    liked = await db.scalar(select(InspireReaction.id).where(target_column(InspireReaction,kind) == row.id, InspireReaction.user_id == viewer.id))
    is_quote = kind == 'quotes'
    return dict(id=f'{kind}:{row.id}', record_id=row.id, kind=kind, type='quote' if is_quote else row.post_type,
        author=author, avatar=author[0], time=row.created_at.isoformat(), created_at=row.created_at,
        content={'text':row.quote,'author':row.author or 'Unknown'} if is_quote else {'text':row.content,'title':row.title,'recipient':row.recipient_label},
        user_id=None if anonymous else str(row.user_id) if row.user_id else None,
        is_anonymous=anonymous, userLiked=bool(liked), isUserCreated=row.user_id == viewer.id, **counts)

@router.get('/feed')
async def feed(page: int = Query(1,ge=1), limit: int = Query(20,ge=1,le=100), db=Depends(get_db), user=Depends(get_current_active_user)):
    # Merge entity IDs first so pagination applies across both existing tables.
    from sqlalchemy import literal, union_all
    combined=union_all(select(InspireStory.id.label('id'),InspireStory.created_at.label('created_at'),literal('stories').label('kind')),select(InspireQuote.id,InspireQuote.created_at,literal('quotes'))).subquery()
    keys=(await db.execute(select(combined).order_by(combined.c.created_at.desc(),combined.c.kind,combined.c.id.desc()).offset((page-1)*limit).limit(limit))).all()
    return [await serialize(db, await target(db,r.kind,r.id), user,r.kind) for r in keys]
@router.get('/stories')
async def stories(page: int=Query(1,ge=1),limit: int=Query(20,ge=1,le=100),db=Depends(get_db),user=Depends(get_current_active_user)):
    rows=await db.scalars(select(InspireStory).order_by(InspireStory.created_at.desc(),InspireStory.id.desc()).offset((page-1)*limit).limit(limit))
    return [await serialize(db,r,user,'stories') for r in rows]
@router.get('/quotes')
async def quotes(page: int=Query(1,ge=1),limit: int=Query(20,ge=1,le=100),db=Depends(get_db),user=Depends(get_current_active_user)):
    rows=await db.scalars(select(InspireQuote).order_by(InspireQuote.created_at.desc(),InspireQuote.id.desc()).offset((page-1)*limit).limit(limit))
    return [await serialize(db,r,user,'quotes') for r in rows]
@router.get('/quotes/daily')
async def daily(db=Depends(get_db),user=Depends(get_current_active_user)):
    row=await db.scalar(select(InspireQuote).order_by(InspireQuote.created_at.desc(),InspireQuote.id.desc()).limit(1))
    if row is None: raise HTTPException(404,'No quotes available')
    return await serialize(db,row,user,'quotes')
@router.post('/stories',status_code=201)
async def create_story(data: StoryInput,db=Depends(get_db),user=Depends(get_current_active_user)):
    row=InspireStory(user_id=user.id,author_name=user.full_name or user.username,**data.model_dump())
    db.add(row); db.add(UserActivity(user_id=user.id,action='inspire_post_created'))
    await db.commit(); await db.refresh(row)
    return await serialize(db,row,user,'stories')
@router.post('/quotes',status_code=201)
async def create_quote(data: QuoteInput,db=Depends(get_db),user=Depends(get_current_active_user)):
    if not data.quote.strip(): raise HTTPException(422,'Quote is required')
    row=InspireQuote(user_id=user.id,**data.model_dump()); db.add(row); db.add(UserActivity(user_id=user.id,action='inspire_quote_created'))
    await db.commit(); await db.refresh(row)
    return await serialize(db,row,user,'quotes')
@router.get('/{kind}/{identity}')
async def detail(kind:str,identity:int,db=Depends(get_db),user=Depends(get_current_active_user)):
    return await serialize(db,await target(db,kind,identity),user,kind)
@router.patch('/stories/{identity}')
async def edit_story(identity:int,data:StoryInput,db=Depends(get_db),user=Depends(get_current_active_user)):
    row=await target(db,'stories',identity)
    if row.user_id != user.id: raise HTTPException(404,'Post not found')
    for key,value in data.model_dump().items(): setattr(row,key,value)
    await db.commit(); await db.refresh(row)
    return await serialize(db,row,user,'stories')
@router.patch('/quotes/{identity}')
async def edit_quote(identity:int,data:QuoteInput,db=Depends(get_db),user=Depends(get_current_active_user)):
    row=await target(db,'quotes',identity)
    if row.user_id != user.id: raise HTTPException(404,'Post not found')
    if not data.quote.strip(): raise HTTPException(422,'Quote is required')
    for key,value in data.model_dump().items(): setattr(row,key,value)
    await db.commit(); await db.refresh(row)
    return await serialize(db,row,user,'quotes')
@router.delete('/comments/{identity}')
async def delete_comment(identity:int,db=Depends(get_db),user=Depends(get_current_active_user)):
    row=await db.scalar(select(InspireComment).where(InspireComment.id==identity))
    if row is None or (row.user_id!=user.id and not user.is_admin): raise HTTPException(404,'Comment not found')
    await db.delete(row); await db.commit(); return {'message':'Comment deleted'}
@router.delete('/{kind}/{identity}')
async def remove(kind:str,identity:int,db=Depends(get_db),user=Depends(get_current_active_user)):
    row=await target(db,kind,identity)
    if row.user_id != user.id and not user.is_admin: raise HTTPException(404,'Post not found')
    # Explicit deletes also work in local tests with FK enforcement disabled.
    for model in [InspireReaction,InspireComment,InspireShare]: await db.execute(delete(model).where(target_column(model,kind)==identity))
    await db.delete(row); await db.commit()
    return {'message':'Post deleted'}
@router.put('/{kind}/{identity}/reaction')
async def react(kind:str,identity:int,db=Depends(get_db),user=Depends(get_current_active_user)):
    await target(db,kind,identity)
    column=target_column(InspireReaction,kind)
    await db.execute(insert(InspireReaction).values(user_id=user.id,**{column.key:identity}).on_conflict_do_nothing(index_elements=['user_id',column.key]))
    await db.commit()
    return await serialize(db,await target(db,kind,identity),user,kind)
@router.delete('/{kind}/{identity}/reaction')
async def unreact(kind:str,identity:int,db=Depends(get_db),user=Depends(get_current_active_user)):
    await target(db,kind,identity)
    await db.execute(delete(InspireReaction).where(target_column(InspireReaction,kind)==identity,InspireReaction.user_id==user.id)); await db.commit()
    return await serialize(db,await target(db,kind,identity),user,kind)
@router.get('/{kind}/{identity}/comments')
async def comments(kind:str,identity:int,page:int=Query(1,ge=1),limit:int=Query(20,ge=1,le=100),db=Depends(get_db),user=Depends(get_current_active_user)):
    await target(db,kind,identity)
    rows=(await db.execute(select(InspireComment,Profile).join(Profile,Profile.id==InspireComment.user_id).where(target_column(InspireComment,kind)==identity).order_by(InspireComment.created_at,InspireComment.id).offset((page-1)*limit).limit(limit))).all()
    return [dict(id=r.id,content=r.content,author=p.full_name or p.username,created_at=r.created_at,owned=r.user_id==user.id) for r,p in rows]
@router.post('/{kind}/{identity}/comments',status_code=201)
async def comment(kind:str,identity:int,data:CommentInput,db=Depends(get_db),user=Depends(get_current_active_user)):
    await target(db,kind,identity)
    if not data.content.strip(): raise HTTPException(422,'Comment is required')
    row=InspireComment(user_id=user.id,content=data.content.strip(),**{target_column(InspireComment,kind).key:identity}); db.add(row)
    await db.commit(); await db.refresh(row)
    return {'id':row.id,'content':row.content}
@router.post('/{kind}/{identity}/shares',status_code=201)
async def share(kind:str,identity:int,db=Depends(get_db),user=Depends(get_current_active_user)):
    await target(db,kind,identity)
    db.add(InspireShare(user_id=user.id,**{target_column(InspireShare,kind).key:identity})); await db.commit()
    return await serialize(db,await target(db,kind,identity),user,kind)

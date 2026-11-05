from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database import get_db
from app.services import inspire_service, profile_service
from app.schemas import (
    InspireStoryCreate, InspireStoryResponse,
    InspireQuoteCreate, InspireQuoteResponse,
    PaginationParams
)
from app.routes.auth import get_current_active_user
from app.models import Profile

router = APIRouter()


@router.get("/stories", response_model=List[InspireStoryResponse])
async def get_inspire_stories(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get inspirational stories."""
    stories, total = await inspire_service.get_stories(db, {"page": page, "limit": limit})
    return stories


@router.get("/stories/{story_id}", response_model=InspireStoryResponse)
async def get_inspire_story(
    story_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get a specific inspirational story."""
    story = await inspire_service.get_story(db, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.post("/stories", response_model=InspireStoryResponse, status_code=status.HTTP_201_CREATED)
async def create_inspire_story(
    story_data: InspireStoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Create an inspirational story."""
    story = await inspire_service.create_story(db, story_data.model_dump(), current_user.id)
    return story


@router.patch("/stories/{story_id}", response_model=InspireStoryResponse)
async def update_inspire_story(
    story_id: int,
    story_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Update an inspirational story."""
    story = await inspire_service.update_story(db, story_id, story_data)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.delete("/stories/{story_id}")
async def delete_inspire_story(
    story_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Delete an inspirational story."""
    success = await inspire_service.delete_story(db, story_id)
    if not success:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Story deleted successfully"}


@router.get("/quotes", response_model=List[InspireQuoteResponse])
async def get_inspire_quotes(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get inspirational quotes."""
    quotes = await inspire_service.get_quotes(db)
    return quotes


@router.post("/quotes", response_model=InspireQuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_inspire_quote(
    quote_data: InspireQuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Create an inspirational quote (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    quote = await inspire_service.create_quote(db, quote_data.model_dump())
    return quote


@router.get("/quotes/daily", response_model=InspireQuoteResponse)
async def get_daily_quote(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get daily inspirational quote."""
    quote = await inspire_service.get_daily_quote(db)
    if not quote:
        raise HTTPException(status_code=404, detail="No quotes available")
    return quote

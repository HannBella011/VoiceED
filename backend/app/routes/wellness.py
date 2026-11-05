from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import uuid

from app.database import get_db
from app.services import wellness_service, profile_service
from app.schemas import (
    WellnessTipCreate, WellnessTipResponse, 
    JournalEntryCreate, JournalEntryResponse,
    PaginationParams
)
from app.routes.auth import get_current_active_user
from app.models import Profile

router = APIRouter()


@router.get("/tips", response_model=List[WellnessTipResponse])
async def get_wellness_tips(
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get wellness tips."""
    tips = await wellness_service.get_tips(db, category)
    return tips


@router.post("/tips", response_model=WellnessTipResponse, status_code=status.HTTP_201_CREATED)
async def create_wellness_tip(
    tip_data: WellnessTipCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Create a wellness tip (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    tip = await wellness_service.create_tip(db, tip_data.model_dump())
    return tip


@router.get("/resources")
async def get_wellness_resources(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get wellness resources."""
    resources = await wellness_service.get_resources(db)
    return resources


@router.post("/journal", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    entry_data: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Create a journal entry."""
    entry = await wellness_service.create_journal_entry(db, entry_data.model_dump(), current_user.id)
    return entry


@router.get("/journal", response_model=List[JournalEntryResponse])
async def list_journal_entries(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """List journal entries for current user."""
    entries, total = await wellness_service.get_journal_entries(db, current_user.id, {"page": page, "limit": limit})
    return entries


@router.patch("/journal/{entry_id}", response_model=JournalEntryResponse)
async def update_journal_entry(
    entry_id: int,
    entry_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Update a journal entry."""
    entry = await wellness_service.update_journal_entry(db, entry_id, entry_data)
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry


@router.delete("/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Delete a journal entry."""
    success = await wellness_service.delete_journal_entry(db, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"message": "Journal entry deleted successfully"}

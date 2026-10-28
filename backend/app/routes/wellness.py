from fastapi import APIRouter

router = APIRouter()


@router.get("/tips")
async def get_wellness_tips():
    """Get wellness tips - placeholder"""
    return {"message": "Get wellness tips - to be implemented"}


@router.get("/resources")
async def get_wellness_resources():
    """Get wellness resources - placeholder"""
    return {"message": "Get wellness resources - to be implemented"}


@router.post("/journal")
async def create_journal_entry():
    """Create journal entry - placeholder"""
    return {"message": "Create journal entry - to be implemented"}


@router.get("/journal")
async def list_journal_entries():
    """List journal entries - placeholder"""
    return {"message": "List journal entries - to be implemented"}
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database import get_db
from app.services import share_service, profile_service
from app.schemas import (
    SharedMaterialCreate, SharedMaterialResponse,
    FileUploadResponse, FileUploadError, FileUploadResult,
    PaginationParams
)
from app.routes.auth import get_current_active_user
from app.models import Profile

router = APIRouter()


@router.get("/materials", response_model=List[SharedMaterialResponse])
async def get_shared_materials(
    subject: Optional[str] = Query(None),
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get shared study materials."""
    materials, total = await share_service.get_materials(db, subject, {"page": page, "limit": limit})
    return materials


@router.get("/materials/{material_id}", response_model=SharedMaterialResponse)
async def get_shared_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get a specific shared material."""
    material = await share_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Increment download count
    await share_service.increment_download_count(db, material_id)
    return material


@router.post("/materials", response_model=FileUploadResult, status_code=status.HTTP_201_CREATED)
async def upload_material(
    title: str = Form(...),
    subject: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    is_anonymous: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Upload a study material."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    content = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    
    material_data = {
        "title": title,
        "description": description,
        "subject": subject,
    }
    
    try:
        material = await share_service.upload_material(
            db, material_data, current_user.id, content, file.filename, mime_type, is_anonymous
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return FileUploadResult(
        uploaded=[FileUploadResponse(
            id=str(material.id),
            filename=material.filename,
            stored_filename=material.stored_filename,
            file_path=material.file_path,
            file_size=material.file_size,
            mime_type=material.mime_type,
            extension=material.extension,
            url=material.file_url,
            download_count=material.download_count,
            created_at=material.created_at
        )],
        errors=[]
    )


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Delete a shared material."""
    success = await share_service.delete_material(db, material_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found or not authorized")
    return {"message": "Material deleted successfully"}


@router.get("/subjects", response_model=List[str])
async def get_subjects(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get list of subjects."""
    subjects = await share_service.get_subjects(db)
    return subjects


@router.get("/file-types", response_model=List[str])
async def get_file_types(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user)
):
    """Get list of file types."""
    file_types = await share_service.get_file_types(db)
    return file_types

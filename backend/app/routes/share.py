from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from typing import Literal
from pydantic import BaseModel

from app.database import get_db
from app.services import share_service
from app.schemas import SharedMaterialResponse
from app.routes.auth import get_current_active_user
from app.models import Profile

router = APIRouter()


class MaterialPage(BaseModel):
    items: List[SharedMaterialResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_more: bool


def material_response(material):
    return SharedMaterialResponse(
        id=str(material.id),
        user_id=None if material.is_anonymous else str(material.user_id),
        title=material.title,
        description=material.description,
        subject=material.subject,
        file_url=material.file_url,
        file_type=material.file_type,
        download_count=material.download_count,
        is_anonymous=material.is_anonymous,
        uploader_name=None if material.is_anonymous else material.user.username,
        created_at=material.created_at,
    )


@router.get("/materials", response_model=List[SharedMaterialResponse] | MaterialPage)
async def get_shared_materials(
    subject: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=200),
    resource_type: Optional[Literal["document", "presentation", "image"]] = None,
    file_format: Optional[
        Literal["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg"]
    ] = None,
    sort: Literal["newest", "oldest", "title", "downloads"] = "newest",
    envelope: bool = False,
    mine: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Get shared study materials."""
    materials, total = await share_service.get_materials(
        db,
        subject,
        {"page": page, "limit": limit},
        search,
        resource_type,
        file_format,
        sort,
        current_user.id if mine else None,
    )
    items = [material_response(material) for material in materials]
    if not envelope:
        return items
    return MaterialPage(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
        has_more=page * limit < total,
    )


@router.get("/materials/{material_id}", response_model=SharedMaterialResponse)
async def get_shared_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Get a specific shared material."""
    material = await share_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    return material_response(material)


@router.post("/materials/{material_id}/download", response_model=SharedMaterialResponse)
async def download_shared_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    material = await share_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    await share_service.increment_download_count(db, material_id)
    material = await share_service.get_material(db, material_id)
    return material_response(material)


@router.post(
    "/materials",
    response_model=SharedMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_material(
    title: str = Form(..., min_length=1, max_length=200),
    subject: str = Form(..., min_length=1, max_length=100),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    is_anonymous: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Upload a study material."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        content = await file.read(25 * 1024 * 1024 + 1)
    finally:
        await file.close()
    mime_type = file.content_type or "application/octet-stream"

    material_data = {
        "title": title,
        "description": description,
        "subject": subject,
    }

    try:
        material = await share_service.upload_material(
            db,
            material_data,
            current_user.id,
            content,
            file.filename,
            mime_type,
            is_anonymous,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return material_response(material)


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Delete a shared material."""
    success = await share_service.delete_material(db, material_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Material not found or not authorized"
        )
    return {"message": "Material deleted successfully"}


@router.get("/subjects", response_model=List[str])
async def get_subjects(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Get list of subjects."""
    subjects = await share_service.get_subjects(db)
    return subjects


@router.get("/file-types", response_model=List[str])
async def get_file_types(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    """Get list of file types."""
    file_types = await share_service.get_file_types(db)
    return file_types

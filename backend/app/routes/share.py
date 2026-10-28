from fastapi import APIRouter

router = APIRouter()


@router.get("/materials")
async def get_shared_materials():
    """Get shared study materials - placeholder"""
    return {"message": "Get shared materials - to be implemented"}


@router.post("/materials")
async def upload_material():
    """Upload study material - placeholder"""
    return {"message": "Upload material - to be implemented"}


@router.get("/materials/{material_id}")
async def get_material(material_id: str):
    """Get specific material - placeholder"""
    return {"message": f"Get material {material_id} - to be implemented"}


@router.delete("/materials/{material_id}")
async def delete_material(material_id: str):
    """Delete material - placeholder"""
    return {"message": f"Delete material {material_id} - to be implemented"}
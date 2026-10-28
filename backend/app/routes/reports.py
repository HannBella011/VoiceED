from fastapi import APIRouter

router = APIRouter()


@router.post("/")
async def create_report():
    """Create a new report - placeholder"""
    return {"message": "Create report - to be implemented"}


@router.get("/")
async def list_reports():
    """List reports - placeholder"""
    return {"message": "List reports - to be implemented"}


@router.get("/{report_id}")
async def get_report(report_id: str):
    """Get report by ID - placeholder"""
    return {"message": f"Get report {report_id} - to be implemented"}


@router.put("/{report_id}")
async def update_report(report_id: str):
    """Update report - placeholder"""
    return {"message": f"Update report {report_id} - to be implemented"}


@router.delete("/{report_id}")
async def delete_report(report_id: str):
    """Delete report - placeholder"""
    return {"message": f"Delete report {report_id} - to be implemented"}
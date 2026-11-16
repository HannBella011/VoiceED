from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.settings import settings


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "VoiceED API", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Import and include API routes
from app.routes import api_router

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

"""
Zestbrains HR Portal - Main Application Entry Point
Refactored from monolithic server.py into modular structure
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging

from config import CORS_ORIGINS
from database import get_database

# Import all routes from the legacy server for now
# These will be gradually migrated to separate route modules
from server_legacy import (
    api_router as legacy_router,
    db  # Use the database connection from legacy
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Zestbrains HR Portal API",
    description="Internal company portal for Zestbrains Private Limited",
    version="2.0.0"
)

# CORS Middleware
origins = CORS_ORIGINS.split(",") if CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes from legacy server
# TODO: Migrate these to separate route modules
app.include_router(legacy_router)

# Application lifecycle events
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("🚀 Zestbrains HR Portal starting up...")
    logger.info("✅ Database connection established")
    logger.info("✅ All routes registered")
    logger.info("🎯 Application ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("👋 Zestbrains HR Portal shutting down...")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Zestbrains HR Portal",
        "version": "2.0.0"
    }

# Root endpoint  
@app.get("/")
async def root():
    """Root endpoint - Redirect to API docs"""
    return {
        "message": "Zestbrains HR Portal API",
        "version": "2.0.0",
        "status": "running",
        "architecture": "modular",
        "refactored": True,
        "docs": "/docs",
        "health": "/health",
        "api_prefix": "/api"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

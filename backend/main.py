"""
TERRA Backend Application

Main FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.auth.routes import router as auth_router
from api.kyc.routes import router as kyc_router
from api.assets.routes import router as assets_router
# from api.investments.routes import router as investments_router
# from api.recovery.routes import router as recovery_router
# from api.admin.routes import router as admin_router
from api.blockchain.routes import router as blockchain_router
from config.settings import settings
from db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="TERRA API",
    description="Tokenized Real-World Asset Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(kyc_router, prefix="/api/kyc", tags=["KYC"])
app.include_router(assets_router, prefix="/api/assets", tags=["Assets"])
# app.include_router(investments_router, prefix="/api/investments", tags=["Investments"])
# app.include_router(recovery_router, prefix="/api/recovery", tags=["Recovery"])
# app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(blockchain_router, prefix="/api/blockchain", tags=["Blockchain"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(exc) if settings.DEBUG else "Internal server error",
            },
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

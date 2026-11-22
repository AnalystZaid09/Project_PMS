import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.security_headers import SecurityHeadersMiddleware
from app.db.seed import seed_database
from app.db.session import Base, SessionLocal, engine
# Import all models to ensure Base.metadata is completely populated
import app.models  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pms.backend")


def init_db():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Checking database bootstrap status...")
    db = SessionLocal()
    try:
        import os
        seed_demo = os.getenv("SEED_DUMMY_DATA", "false").lower() in ("true", "1")
        seed_database(db, include_demo_data=seed_demo)
        logger.info("Database bootstrap verified successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()


# Auto-initialize DB on startup
init_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Modern, secure Patient Management System (PMS) API Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^https://.*\.onrender\.com$|^http://localhost(:\d+)?$|^http://127\.0\.0\.1(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Root endpoint
@app.get("/", tags=["System"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

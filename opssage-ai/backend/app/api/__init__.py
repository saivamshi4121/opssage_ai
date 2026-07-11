"""API router aggregation."""

from fastapi import APIRouter

from app.api.analysis import router as analysis_router
from app.api.clusters import router as clusters_router
from app.api.demo import router as demo_router
from app.api.health import router as health_router
from app.api.incidents import router as incidents_router
from app.api.metrics import router as metrics_router

router = APIRouter()
router.include_router(health_router, prefix="/health", tags=["health"])
router.include_router(incidents_router, prefix="/incidents", tags=["incidents"])
router.include_router(clusters_router, prefix="/clusters", tags=["clusters"])
router.include_router(analysis_router, prefix="/analysis", tags=["analysis"])
router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
router.include_router(demo_router, prefix="/demo", tags=["demo"])

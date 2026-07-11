"""Health check endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.config import Settings
from app.dependencies import get_app_settings, get_motor_client
from app.models.schema import HealthDetailedResponse

router = APIRouter()


@router.get("")
async def health_check() -> dict[str, str]:
    """Return basic health status.

    Example:
        GET /api/health
    """
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/detailed", response_model=HealthDetailedResponse)
async def detailed_health_check(
    settings: Settings = Depends(get_app_settings),
) -> HealthDetailedResponse:
    """Return dependency-level health status for DB/cache/LLM.

    Example:
        GET /api/health/detailed
    """
    db_status = "healthy"
    cache_status = "disabled"
    llm_status = "healthy"

    try:
        await get_motor_client().admin.command("ping")
    except Exception:
        db_status = "unhealthy"

    if not settings.OPENAI_API_KEY:
        llm_status = "degraded"

    overall = "ok" if db_status == "healthy" else "degraded"
    return HealthDetailedResponse(status=overall, database=db_status, cache=cache_status, llm=llm_status)

"""LLM analysis API endpoints."""

from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query

from app.config import Settings
from app.dependencies import get_app_settings, get_company_id
from app.models.usage_log import UsageLog
from app.models.schema import (
    AnalysisRequest,
    AnalysisResponse,
    RunbookRequest,
    RunbookResponse,
    TrendingRootCauseResponse,
)
from app.services.llm_service import LLMService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _build_service(settings: Settings) -> LLMService:
    """Build LLM service from settings."""
    return LLMService()


@router.post("/root-causes", response_model=AnalysisResponse)
async def analyze_root_cause(
    payload: AnalysisRequest,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> AnalysisResponse:
    """Analyze incident for root-cause insights.

    Example:
        POST /api/analysis/root-causes
    """
    started_at = time.perf_counter()
    service = _build_service(settings)
    result = await service.analyze(
        payload,
        company_id=company_id,
        usage_log_endpoint="analysis_root_causes",
    )
    logger.info("analysis_root_cause_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.post("/runbook", response_model=RunbookResponse)
async def generate_runbook(
    payload: RunbookRequest,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> RunbookResponse:
    """Generate runbook actions for a specific incident.

    Example:
        POST /api/analysis/runbook
    """
    started_at = time.perf_counter()
    service = _build_service(settings)
    result = await service.generate_runbook(payload, company_id=company_id)
    logger.info("analysis_runbook_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.get("/usage")
async def get_analysis_usage(
    days: int = Query(default=7, ge=1, le=366),
    company_id: str | None = Query(default=None),
    tenant_company_id: str = Depends(get_company_id),
) -> dict:
    """Aggregate LLM usage for the tenant over the last ``days`` days."""
    cid = company_id if company_id is not None else tenant_company_id
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = await UsageLog.find({"company_id": cid, "timestamp": {"$gte": cutoff}}).to_list()

    agg: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {
            "call_count": 0,
            "tokens_input": 0,
            "tokens_output": 0,
            "total_tokens": 0,
            "cost_estimate_usd": 0.0,
        },
    )
    for row in rows:
        bucket = agg[row.endpoint]
        bucket["call_count"] = int(bucket["call_count"]) + 1
        bucket["tokens_input"] = int(bucket["tokens_input"]) + row.tokens_input
        bucket["tokens_output"] = int(bucket["tokens_output"]) + row.tokens_output
        bucket["total_tokens"] = int(bucket["total_tokens"]) + row.total_tokens
        bucket["cost_estimate_usd"] = float(bucket["cost_estimate_usd"]) + row.cost_estimate_usd

    endpoints = [{"endpoint": ep, **data} for ep, data in sorted(agg.items(), key=lambda x: x[0])]
    return {"company_id": cid, "days": days, "endpoints": endpoints}


@router.get("/trending", response_model=TrendingRootCauseResponse)
async def get_trending_root_causes(
    limit: int = Query(default=10, ge=1, le=50),
    settings: Settings = Depends(get_app_settings),
) -> TrendingRootCauseResponse:
    """Get trending root causes by historical frequency.

    Example:
        GET /api/analysis/trending?limit=10
    """
    started_at = time.perf_counter()
    service = _build_service(settings)
    result = await service.trending_root_causes(limit=limit)
    logger.info("analysis_trending_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result

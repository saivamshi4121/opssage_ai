"""Operational metrics endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_company_id
from app.models.usage_log import UsageLog

router = APIRouter()


@router.get("/usage")
async def get_usage_metrics(
    days: int = Query(default=7, ge=1, le=366),
    company_id: str | None = Query(default=None),
    tenant_company_id: str = Depends(get_company_id),
) -> dict:
    """Roll up LLM usage: request count, total cost, and average cost per request."""
    cid = company_id if company_id is not None else tenant_company_id
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = await UsageLog.find({"company_id": cid, "timestamp": {"$gte": cutoff}}).to_list()

    total_requests = len(rows)
    total_cost = sum(row.cost_estimate_usd for row in rows)
    avg_cost = (total_cost / total_requests) if total_requests else 0.0

    return {
        "company_id": cid,
        "days": days,
        "total_requests": total_requests,
        "total_cost_usd": round(total_cost, 6),
        "avg_cost_per_request_usd": round(avg_cost, 8),
    }

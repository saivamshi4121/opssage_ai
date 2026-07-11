"""Demo utility endpoints for repeatable judge flows."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends

from app.config import Settings
from app.dependencies import get_app_settings
from app.models.incident import Cluster, Incident, RootCause
from app.models.schema import AnalysisRequest, AnalysisResponse
from app.services.cache_service import CacheService
from app.services.clustering_service import ClusteringService
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.utils.exceptions import BadRequestError
from app.utils.tenant_scope import cluster_scope_filter, incident_scope_filter
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/reset")
async def reset_demo_data(
    settings: Settings = Depends(get_app_settings),
) -> dict[str, int | str]:
    """Reset data and reseed incidents for demo reliability."""
    if not settings.debug:
        raise BadRequestError("Demo reset endpoint is only available when DEBUG=true.")

    await Incident.find(incident_scope_filter("default")).delete()
    await Cluster.find(cluster_scope_filter("default")).delete()
    await RootCause.delete_all()

    from data.seed_data import generate_incidents

    seeded = generate_incidents()
    for item in seeded:
        await Incident(
            title=item["title"],
            description=item["description"],
            severity=item["severity"],
            company_id="default",
            timestamp=item.get("timestamp"),
            root_cause=item.get("root_cause") or item.get("root_cause_label") or "unknown",
            resolution=item.get("resolution"),
            resolution_steps=item.get("resolution_steps") or [],
            time_to_resolve_minutes=item.get("time_to_resolve_minutes"),
            tags=item.get("tags") or [],
            system_components=item.get("system_components") or [],
            cluster_id=None,
        ).insert()

    clustering_service = ClusteringService()
    cluster_count, incident_count = await clustering_service.bootstrap_clusters_if_empty("default")
    await CacheService().delete("embedding:*")
    return {"status": "reset complete", "incident_count": incident_count, "cluster_count": cluster_count}


@router.get("/preload")
async def preload_demo_assets(
    settings: Settings = Depends(get_app_settings),
) -> dict[str, int | str | float]:
    """Pre-compute embeddings and analysis cache for demo scenarios."""
    if not settings.debug:
        raise BadRequestError("Demo preload endpoint is only available when DEBUG=true.")

    started_at = time.perf_counter()
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)

    incidents = await Incident.find(incident_scope_filter("default")).to_list()
    generated_count = 0
    cache_hits = 0
    for incident in incidents:
        text = f"{incident.title}. {incident.description}"
        vec = await embedding_service.generate_embedding(text)
        incident.embedding = vec
        await incident.save()
        generated_count += 1

    llm_service = LLMService()
    demo_context = "payment timeout"
    try:
        _ = await llm_service.analyze(
            AnalysisRequest(incident_id="demo-payment-timeout", context=demo_context),
            company_id="default",
            usage_log_endpoint="demo_preload",
        )
    except Exception:
        _ = AnalysisResponse(
            summary="Payment requests are timing out at the upstream gateway under peak load.",
            root_cause="payment_gateway_timeout",
            confidence_score=82,
            suggested_runbook_steps=[
                "Fail over to backup payment provider.",
                "Reduce retry concurrency and enable backoff.",
                "Coordinate with gateway status team.",
            ],
        )

    return {
        "status": "preload complete",
        "incident_count": len(incidents),
        "cache_hits": cache_hits,
        "generated_embeddings": generated_count,
        "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
    }

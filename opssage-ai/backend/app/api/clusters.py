"""Cluster API endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Query

from app.config import Settings
from app.dependencies import get_app_settings, get_company_id
from app.models.schema import (
    ClusterListResponse,
    ClusterRecomputeRequest,
    ClusterRecomputeResponse,
    ClusterResponse,
    PaginatedIncidentsResponse,
)
from app.services.cache_service import CacheService
from app.services.clustering_service import ClusteringService
from app.services.embedding_service import EmbeddingService
from app.services.incident_service import IncidentService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _build_incident_service(settings: Settings) -> IncidentService:
    """Build incident service for cluster-associated endpoint logic."""
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    return IncidentService(embedding_service=embedding_service)


@router.get("", response_model=ClusterListResponse)
async def list_clusters(company_id: str = Depends(get_company_id)) -> ClusterListResponse:
    """List all clusters.

    Example:
        GET /api/clusters
    """
    started_at = time.perf_counter()
    service = ClusteringService()
    items = await service.list_clusters(company_id=company_id)
    logger.info("clusters_list_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return ClusterListResponse(items=items, total=len(items))


@router.get("/{cluster_id}", response_model=ClusterResponse)
async def get_cluster(cluster_id: str, company_id: str = Depends(get_company_id)) -> ClusterResponse:
    """Fetch cluster details by identifier.

    Example:
        GET /api/clusters/{id}
    """
    started_at = time.perf_counter()
    service = ClusteringService()
    result = await service.get_cluster_by_id(cluster_id, company_id=company_id)
    logger.info("clusters_get_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.get("/{cluster_id}/incidents", response_model=PaginatedIncidentsResponse)
async def list_cluster_incidents(
    cluster_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> PaginatedIncidentsResponse:
    """List incidents for a given cluster.

    Example:
        GET /api/clusters/{id}/incidents?page=1&page_size=20
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    data = await service.list_incidents_by_cluster(cluster_id, page, page_size, company_id=company_id)
    logger.info(
        "clusters_incidents_list_completed",
        extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
    )
    return PaginatedIncidentsResponse(items=data.items, total=data.total, page=data.page, page_size=data.page_size)


@router.post("/recompute", response_model=ClusterRecomputeResponse)
async def recompute_clusters(
    payload: ClusterRecomputeRequest,
    company_id: str = Depends(get_company_id),
) -> ClusterRecomputeResponse:
    """Trigger cluster recomputation.

    Example:
        POST /api/clusters/recompute
    """
    started_at = time.perf_counter()
    _ = payload
    service = ClusteringService()
    clusters_found, reassigned_incidents = await service.recompute_from_database(company_id=company_id)
    logger.info("clusters_recompute_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return ClusterRecomputeResponse(clusters_found=clusters_found, reassigned_incidents=reassigned_incidents)

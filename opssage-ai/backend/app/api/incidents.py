"""Incident API endpoints."""

from __future__ import annotations

import csv
import io
import json
import time

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.config import Settings
from app.dependencies import get_app_settings, get_company_id
from app.models.schema import (
    BulkImportResponse,
    IncidentCreate,
    IncidentFeedback,
    IncidentResponse,
    IncidentUpdate,
    PaginatedIncidentsResponse,
    SimilarIncidentsResponse,
)
from app.services.cache_service import CacheService
from app.services.embedding_service import EmbeddingService
from app.services.incident_service import IncidentService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _build_incident_service(settings: Settings) -> IncidentService:
    """Build incident service with required dependencies."""
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    return IncidentService(embedding_service=embedding_service)


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    payload: IncidentCreate,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> IncidentResponse:
    """Create a new incident.

    Example:
        POST /api/incidents
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    result = await service.create_incident(payload, company_id=company_id)
    logger.info("incidents_create_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.get("", response_model=PaginatedIncidentsResponse)
async def list_incidents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    query: str | None = Query(default=None),
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> PaginatedIncidentsResponse:
    """List incidents with pagination and optional query search.

    Example:
        GET /api/incidents?page=1&page_size=20&query=database
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    data = await (
        service.search_incidents(query, page, page_size, company_id=company_id)
        if query
        else service.list_incidents(page, page_size, company_id=company_id)
    )
    logger.info("incidents_list_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return PaginatedIncidentsResponse(items=data.items, total=data.total, page=data.page, page_size=data.page_size)


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> IncidentResponse:
    """Fetch incident details by identifier.

    Example:
        GET /api/incidents/{id}
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    result = await service.get_incident(incident_id, company_id=company_id)
    logger.info("incidents_get_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.post("/{incident_id}/feedback", response_model=IncidentResponse)
async def submit_incident_feedback(
    incident_id: str,
    payload: IncidentFeedback,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> IncidentResponse:
    """Apply engineer feedback and helpful votes to an incident."""
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    result = await service.apply_feedback(incident_id, payload, company_id=company_id)
    logger.info("incidents_feedback_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.get("/{incident_id}/similar", response_model=SimilarIncidentsResponse)
async def get_similar_incidents(
    incident_id: str,
    limit: int = Query(default=5, ge=1, le=25),
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> SimilarIncidentsResponse:
    """Fetch incidents semantically similar to a target incident.

    Example:
        GET /api/incidents/{id}/similar?limit=5
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    items = await service.similar_incidents(incident_id=incident_id, limit=limit, company_id=company_id)
    logger.info("incidents_similar_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return SimilarIncidentsResponse(incident_id=incident_id, items=items)


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> IncidentResponse:
    """Update an incident by identifier.

    Example:
        PUT /api/incidents/{id}
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    result = await service.update_incident(incident_id, payload, company_id=company_id)
    logger.info("incidents_update_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return result


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: str,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> None:
    """Delete an incident by identifier.

    Example:
        DELETE /api/incidents/{id}
    """
    started_at = time.perf_counter()
    service = _build_incident_service(settings)
    await service.delete_incident(incident_id, company_id=company_id)
    logger.info("incidents_delete_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})


@router.post("/bulk-import", response_model=BulkImportResponse, status_code=status.HTTP_201_CREATED)
async def bulk_import_incidents(
    file: UploadFile = File(...),
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> BulkImportResponse:
    """Bulk import incidents from JSON or CSV uploads.

    Example:
        POST /api/incidents/bulk-import (multipart/form-data file=@incidents.json)
    """
    started_at = time.perf_counter()
    content = (await file.read()).decode("utf-8")
    incident_payloads: list[IncidentCreate] = []
    errors: list[str] = []

    try:
        if file.filename and file.filename.lower().endswith(".csv"):
            for index, row in enumerate(csv.DictReader(io.StringIO(content)), start=1):
                try:
                    incident_payloads.append(IncidentCreate.model_validate(row))
                except Exception as exc:
                    errors.append(f"row {index}: {exc}")
        else:
            raw_payload = json.loads(content)
            if not isinstance(raw_payload, list):
                raw_payload = [raw_payload]
            for index, row in enumerate(raw_payload, start=1):
                try:
                    incident_payloads.append(IncidentCreate.model_validate(row))
                except Exception as exc:
                    errors.append(f"item {index}: {exc}")
    except json.JSONDecodeError as exc:
        errors.append(f"invalid json: {exc}")

    service = _build_incident_service(settings)
    created = await service.bulk_import(incident_payloads, company_id=company_id) if incident_payloads else []
    logger.info("incidents_bulk_import_completed", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})
    return BulkImportResponse(imported_count=len(created), failed_count=len(errors), errors=errors)

"""Inbound webhooks from external monitoring systems."""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError, field_validator

from app.config import Settings
from app.dependencies import get_app_settings, get_company_id
from app.models.schema import AnalysisRequest, IncidentCreate
from app.services.cache_service import CacheService
from app.services.embedding_service import EmbeddingService
from app.services.incident_service import IncidentService
from app.services.llm_service import LLMService
from app.models.incident import Incident, RootCause
from app.utils.tenant_scope import incident_belongs_to_tenant, incident_scope_filter, scoped_and
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class DatadogWebhookPayload(BaseModel):
    """Expected JSON body for Datadog → OpsSage alert ingestion."""

    alert_id: str = Field(min_length=1)
    alert_title: str = Field(min_length=1)
    alert_message: str = Field(min_length=1)
    alert_type: Literal["error", "warning", "info"]
    alert_status: Literal["triggered", "recovered"]
    alert_priority: Literal["P1", "P2", "P3", "P4"]
    alert_url: str = Field(min_length=1)
    hostname: str = Field(min_length=1)
    service: str | None = None
    tags: list[str] | None = None
    alert_timestamp: str | None = Field(
        default=None,
        description="Event time from Datadog (e.g. $DATE_POSIX); strengthens idempotency.",
    )

    @field_validator("alert_status", mode="before")
    @classmethod
    def _normalize_status(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("alert_priority", mode="before")
    @classmethod
    def _normalize_priority(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("alert_type", mode="before")
    @classmethod
    def _normalize_alert_type(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


def _verify_datadog_signature(raw_body: bytes, header_value: str | None, secret: str) -> bool:
    """Validate X-Datadog-Signature using HMAC-SHA256 over the raw body (hex digest)."""
    if not header_value:
        return False
    mac = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    received = header_value.strip()
    if "=" in received:
        received = received.split("=", 1)[1].strip()
    try:
        return hmac.compare_digest(mac.lower(), received.lower())
    except Exception:
        return False


def _priority_to_severity(priority: str) -> Literal["critical", "high", "medium", "low"]:
    mapping = {"P1": "critical", "P2": "high", "P3": "medium", "P4": "low"}
    return mapping.get(priority, "medium")


def _datadog_idempotency_key(payload: DatadogWebhookPayload) -> str:
    """Stable key per alert event: SHA256(alert_id + timestamp + title)."""
    ts = (payload.alert_timestamp or "").strip()
    basis = f"{payload.alert_id.strip()}:{ts}:{payload.alert_title.strip()}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()


def _ensure_min_chars(value: str, minimum: int, filler: str = "—") -> str:
    text = value.strip()
    if len(text) >= minimum:
        return text
    return (text + (" " + filler) * minimum)[:minimum]


def _build_incident_create(payload: DatadogWebhookPayload, idempotency_key: str) -> IncidentCreate:
    title = _ensure_min_chars(payload.alert_title, 3)
    parts = [
        payload.alert_message.strip(),
        f"Host: {payload.hostname.strip()}",
        f"Alert URL: {payload.alert_url.strip()}",
        f"Datadog alert ID: {payload.alert_id.strip()}",
    ]
    if payload.service:
        parts.append(f"Service: {payload.service.strip()}")
    description = "\n".join(parts)
    description = _ensure_min_chars(description, 5)

    tag_rows = list(payload.tags or [])
    tag_rows.extend(
        [
            f"datadog_alert_id:{payload.alert_id}",
            f"datadog_alert_type:{payload.alert_type}",
            f"datadog_priority:{payload.alert_priority}",
        ]
    )

    components = [payload.hostname.strip()]
    if payload.service:
        components.append(payload.service.strip())

    return IncidentCreate(
        title=title[:255],
        description=description,
        severity=_priority_to_severity(payload.alert_priority),
        source="datadog-webhook",
        tags=tag_rows,
        system_components=components,
        idempotency_key=idempotency_key,
    )


def _build_incident_service(settings: Settings) -> IncidentService:
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    return IncidentService(embedding_service=embedding_service)


async def _datadog_post_process(incident_id: str, settings: Settings, company_id: str) -> None:
    """Embedding, cluster hint, and persisted root-cause analysis (async)."""
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    incident_service = IncidentService(embedding_service=embedding_service)
    llm = LLMService()
    try:
        incident = await Incident.get(incident_id)
        if incident is None or not incident_belongs_to_tenant(incident, company_id):
            logger.warning("datadog_background_missing_incident", extra={"incident_id": incident_id})
            return

        text = f"{incident.title}. {incident.description}"
        vector = await embedding_service.generate_embedding(text)
        incident.embedding = vector
        cluster_id = await incident_service.nearest_cluster_for_embedding(vector, company_id=company_id)
        if cluster_id:
            incident.cluster_id = cluster_id
        incident.updated_at = datetime.utcnow()
        await incident.save()

        analysis = await llm.analyze(
            AnalysisRequest(incident_id=incident_id, context=text),
            company_id=company_id,
            usage_log_endpoint="datadog_post_process",
        )
        rc_doc = RootCause(
            incident_id=incident_id,
            root_cause=analysis.root_cause,
            confidence=max(0.0, min(1.0, analysis.confidence_score / 100.0)),
            evidence=(analysis.summary[:4000] if analysis.summary else ""),
            recommended_action=(analysis.suggested_runbook_steps[0] if analysis.suggested_runbook_steps else ""),
        )
        await rc_doc.insert()
    except Exception:
        logger.exception("datadog_webhook_background_failed", extra={"incident_id": incident_id})


@router.post("/datadog")
async def datadog_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> Response:
    """Accept Datadog alert JSON; create incident on trigger and enrich asynchronously."""
    raw = await request.body()

    secret = settings.datadog_webhook_secret
    if secret:
        sig_header = request.headers.get("x-datadog-signature")
        if not _verify_datadog_signature(raw, sig_header, secret):
            raise HTTPException(status_code=401, detail="invalid webhook signature")

    try:
        payload = DatadogWebhookPayload.model_validate_json(raw.decode("utf-8"))
    except (ValidationError, UnicodeDecodeError) as exc:
        if isinstance(exc, UnicodeDecodeError):
            raise HTTPException(status_code=422, detail="request body must be UTF-8 JSON") from exc
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    if payload.alert_status.lower() != "triggered":
        return Response(status_code=200)

    idempotency_key = _datadog_idempotency_key(payload)
    dup_query = scoped_and(incident_scope_filter(company_id), {"idempotency_key": idempotency_key})
    existing = await Incident.find(dup_query).first_or_none()
    if existing:
        logger.info(
            "duplicate_webhook_ignored",
            extra={"alert_id": payload.alert_id, "incident_id": str(existing.id)},
        )
        return JSONResponse(
            status_code=200,
            content={"status": "duplicate_ignored", "incident_id": str(existing.id)},
        )

    try:
        incident_payload = _build_incident_create(payload, idempotency_key)
        service = _build_incident_service(settings)
        created = await service.create_incident(incident_payload, company_id=company_id)
        background_tasks.add_task(_datadog_post_process, created.id, settings, company_id)
        return Response(status_code=200)
    except Exception:
        logger.exception("datadog_webhook_incident_create_failed")
        return Response(status_code=200)

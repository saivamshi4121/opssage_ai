"""Incident CRUD and business logic service."""

from __future__ import annotations

import math
import re
import time
from dataclasses import dataclass
from typing import List

import numpy as np

from datetime import datetime

from beanie import PydanticObjectId

from app.models.incident import Cluster, Incident
from app.models.schema import IncidentCreate, IncidentFeedback, IncidentResponse, IncidentUpdate, SimilarIncident
from app.services.embedding_service import EmbeddingService
from app.utils.exceptions import BadRequestError, NotFoundError
from app.utils.ranking import smart_rank_incidents
from app.utils.tenant_scope import (
    cluster_belongs_to_tenant,
    incident_scope_filter,
    scoped_and,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass(slots=True)
class PaginatedIncidents:
    """Container for paginated incident query results."""

    items: list[IncidentResponse]
    total: int
    page: int
    page_size: int


@dataclass(slots=True)
class SimilarIncidentMatch:
    """Container for similarity match ranking details."""

    incident: Incident
    similarity_score: float


class IncidentService:
    """Service for incident lifecycle operations."""

    def __init__(self, embedding_service: EmbeddingService) -> None:
        """Initialize service with embedding dependency."""
        self._embedding_service = embedding_service

    async def _get_incident_in_tenant(self, incident_id: str, company_id: str) -> Incident | None:
        """Load incident by id scoped to tenant (invalid ids yield ``None``)."""
        try:
            oid = PydanticObjectId(incident_id)
        except Exception:
            return None
        query = scoped_and(incident_scope_filter(company_id), {"_id": oid})
        return await Incident.find(query).first_or_none()

    async def create_incident(self, payload: IncidentCreate, company_id: str = "default") -> IncidentResponse:
        """Create and persist an incident entity."""
        ts = payload.timestamp or datetime.utcnow()
        incident = Incident(
            title=payload.title.strip(),
            description=payload.description.strip(),
            timestamp=ts,
            severity=payload.severity,
            company_id=company_id,
            root_cause=payload.source.strip(),
            cluster_id=payload.cluster_id,
            resolution=payload.resolution,
            resolution_steps=payload.resolution_steps,
            time_to_resolve_minutes=payload.time_to_resolve_minutes,
            tags=payload.tags,
            system_components=payload.system_components,
            idempotency_key=payload.idempotency_key,
        )
        await incident.insert()
        logger.info("incident_created", extra={"incident_id": str(incident.id)})
        return self._to_response(incident)

    async def get_incident(self, incident_id: str, company_id: str = "default") -> IncidentResponse:
        """Fetch incident by identifier or raise not found."""
        incident = await self._get_incident_in_tenant(incident_id, company_id)
        if incident is None:
            raise NotFoundError(f"Incident '{incident_id}' not found.")
        return self._to_response(incident)

    async def list_incidents(self, page: int = 1, page_size: int = 20, company_id: str = "default") -> PaginatedIncidents:
        """List incidents with pagination."""
        page, page_size = self._validate_pagination(page, page_size)
        scope = incident_scope_filter(company_id)
        total = await Incident.find(scope).count()
        rows = await (
            Incident.find(scope)
            .sort("-timestamp")
            .skip((page - 1) * page_size)
            .limit(page_size)
            .to_list()
        )
        return PaginatedIncidents(
            items=[self._to_response(row) for row in rows],
            total=int(total),
            page=page,
            page_size=page_size,
        )

    async def update_incident(self, incident_id: str, payload: IncidentUpdate, company_id: str = "default") -> IncidentResponse:
        """Update mutable incident fields."""
        incident = await self._get_incident_in_tenant(incident_id, company_id)
        if incident is None:
            raise NotFoundError(f"Incident '{incident_id}' not found.")

        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            if isinstance(value, str):
                value = value.strip()
            if field == "source":
                incident.root_cause = value
            else:
                setattr(incident, field, value)
        incident.updated_at = datetime.utcnow()
        await incident.save()
        logger.info("incident_updated", extra={"incident_id": incident_id})
        return self._to_response(incident)

    async def delete_incident(self, incident_id: str, company_id: str = "default") -> None:
        """Delete an incident entity."""
        incident = await self._get_incident_in_tenant(incident_id, company_id)
        if incident is None:
            raise NotFoundError(f"Incident '{incident_id}' not found.")
        await incident.delete()
        logger.info("incident_deleted", extra={"incident_id": incident_id})

    async def bulk_import(self, payloads: list[IncidentCreate], company_id: str = "default") -> list[IncidentResponse]:
        """Bulk create incidents in a single transaction."""
        created: list[Incident] = []
        now = datetime.utcnow()
        for payload in payloads:
            ts = payload.timestamp or now
            incident = Incident(
                title=payload.title.strip(),
                description=payload.description.strip(),
                timestamp=ts,
                severity=payload.severity,
                company_id=company_id,
                root_cause=payload.source.strip(),
                cluster_id=payload.cluster_id,
                resolution=payload.resolution,
                resolution_steps=payload.resolution_steps,
                time_to_resolve_minutes=payload.time_to_resolve_minutes,
                tags=payload.tags,
                system_components=payload.system_components,
            )
            await incident.insert()
            created.append(incident)
        logger.info("incident_bulk_import", extra={"count": len(created)})
        return [self._to_response(incident) for incident in created]

    async def search_incidents(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20,
        company_id: str = "default",
    ) -> PaginatedIncidents:
        """Search incidents by keyword ($text) and semantic similarity ranking."""
        normalized_query = query.strip()
        if not normalized_query:
            raise BadRequestError("Search query cannot be empty.")

        page, page_size = self._validate_pagination(page, page_size)
        tenant_scope = incident_scope_filter(company_id)

        # Try Mongo text search first; fall back to regex for safety during local/dev setup.
        try:
            candidates = await Incident.find(
                scoped_and(tenant_scope, {"$text": {"$search": normalized_query}}),
            ).limit(250).to_list()
        except Exception:
            pattern = re.escape(normalized_query)
            candidates = await Incident.find(
                scoped_and(
                    tenant_scope,
                    {
                        "$or": [
                            {"title": {"$regex": pattern, "$options": "i"}},
                            {"description": {"$regex": pattern, "$options": "i"}},
                            {"root_cause": {"$regex": pattern, "$options": "i"}},
                        ]
                    },
                ),
            ).limit(250).to_list()
        if not candidates:
            return PaginatedIncidents(items=[], total=0, page=page, page_size=page_size)

        query_embedding = await self._embedding_service.generate_query_embedding(normalized_query)
        query_vec = np.asarray(query_embedding, dtype=np.float32)
        query_norm = float(np.linalg.norm(query_vec))
        if query_norm == 0:
            raise BadRequestError("Embedding norm cannot be zero.")

        scored: list[tuple[Incident, float]] = []
        for incident in candidates:
            if incident.embedding is not None:
                candidate_vec = np.asarray(incident.embedding, dtype=np.float32)
            else:
                text_payload = f"{incident.title}. {incident.description}"
                candidate_embedding = await self._embedding_service.generate_embedding(text_payload)
                candidate_vec = np.asarray(candidate_embedding, dtype=np.float32)

            score = self._cosine_similarity_np(query_vec, query_norm, candidate_vec)
            scored.append((incident, score))

        scored.sort(key=lambda row: row[1], reverse=True)
        total = len(scored)
        start = (page - 1) * page_size
        page_rows = scored[start : start + page_size]
        return PaginatedIncidents(
            items=[self._to_response(item[0]) for item in page_rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def list_incidents_by_cluster(
        self,
        cluster_id: str,
        page: int = 1,
        page_size: int = 20,
        company_id: str = "default",
    ) -> PaginatedIncidents:
        """List incidents belonging to a specific cluster."""
        page, page_size = self._validate_pagination(page, page_size)
        cluster = await Cluster.get(cluster_id)
        if cluster is None or not cluster_belongs_to_tenant(cluster, company_id):
            raise BadRequestError(f"Cluster '{cluster_id}' not found.")

        scope = scoped_and(incident_scope_filter(company_id), {"cluster_id": cluster_id})
        query = Incident.find(scope)
        total = await query.count()
        rows = await (
            Incident.find(scope)
            .sort("-timestamp")
            .skip((page - 1) * page_size)
            .limit(page_size)
            .to_list()
        )
        return PaginatedIncidents(items=[self._to_response(row) for row in rows], total=int(total), page=page, page_size=page_size)

    async def similar_incidents(self, incident_id: str, limit: int = 5, company_id: str = "default") -> list[SimilarIncident]:
        """Return similar incidents to a reference incident based on embedding similarity."""
        reference = await self._get_incident_in_tenant(incident_id, company_id)
        if reference is None:
            raise NotFoundError(f"Incident '{incident_id}' not found.")

        query_text = f"{reference.title}. {reference.description}"
        query_embedding = await self._embedding_service.generate_query_embedding(query_text)
        matches = await self.match_by_embedding_vector(query_embedding, limit=limit + 1, company_id=company_id)

        filtered = [m for m in matches if str(m.incident.id) != incident_id][:limit]
        logger.info(
            "similarity_search",
            extra={"query": reference.title, "top_scores": [round(item.similarity_score, 4) for item in filtered[:3]]},
        )

        ranked = self._rank_similar_matches(filtered)
        return ranked[:limit]

    def _rank_similar_matches(self, matches: list[SimilarIncidentMatch]) -> list[SimilarIncident]:
        """Map embedding matches to ``SimilarIncident`` rows and apply smart ranking."""
        rows: list[SimilarIncident] = []
        for item in matches:
            incident_doc = item.incident
            resolution_summary = self._resolution_summary(incident_doc)
            rows.append(
                SimilarIncident(
                    id=str(incident_doc.id),
                    title=incident_doc.title,
                    similarity_score=round(item.similarity_score, 4),
                    severity=incident_doc.severity,
                    root_cause=incident_doc.root_cause,
                    resolution=resolution_summary,
                    helpful_count=incident_doc.helpful_count,
                    created_at=incident_doc.created_at,
                )
            )
        max_helpful = max((row.helpful_count for row in rows), default=0)
        return smart_rank_incidents(rows, max_helpful)

    @staticmethod
    def _resolution_summary(incident: Incident) -> str | None:
        """Short resolution text for LLM / UI context."""
        if incident.resolution and incident.resolution.strip():
            text = incident.resolution.strip()
            return text[:500] + ("…" if len(text) > 500 else "")
        if incident.resolution_steps:
            return "; ".join(s.strip() for s in incident.resolution_steps[:3] if s.strip())
        return None

    async def apply_feedback(self, incident_id: str, payload: IncidentFeedback, company_id: str = "default") -> IncidentResponse:
        """Apply engineer feedback and helpful votes to an incident."""
        incident = await self._get_incident_in_tenant(incident_id, company_id)
        if incident is None:
            raise NotFoundError(f"Incident '{incident_id}' not found.")

        if payload.actual_root_cause is not None:
            incident.actual_root_cause = payload.actual_root_cause.strip()
        if payload.was_prediction_correct is not None:
            incident.was_prediction_correct = payload.was_prediction_correct
        if payload.resolution_quality_score is not None:
            incident.resolution_quality_score = payload.resolution_quality_score
        if payload.mark_helpful:
            incident.helpful_count += 1

        incident.updated_at = datetime.utcnow()
        await incident.save()
        logger.info("incident_feedback_applied", extra={"incident_id": incident_id})
        return self._to_response(incident)

    async def match_by_embedding_vector(
        self,
        embedding: List[float],
        limit: int = 5,
        company_id: str = "default",
    ) -> list[SimilarIncidentMatch]:
        """Rank incidents by embedding similarity (internal / scripts)."""
        if not embedding:
            raise BadRequestError("Embedding cannot be empty for similarity search.")

        started_at = time.perf_counter()
        query_vec = np.asarray(embedding, dtype=np.float32)
        query_norm = float(np.linalg.norm(query_vec))
        if query_norm == 0:
            raise BadRequestError("Embedding norm cannot be zero.")

        tenant_scope = incident_scope_filter(company_id)
        candidates = await Incident.find(scoped_and(tenant_scope, {"embedding": {"$ne": None}})).to_list()
        if not candidates:
            candidates = await Incident.find(tenant_scope).to_list()

        scored: list[SimilarIncidentMatch] = []
        for incident in candidates:
            if incident.embedding is not None:
                cand_vec = np.asarray(incident.embedding, dtype=np.float32)
            else:
                text_payload = f"{incident.title}. {incident.description}"
                cand_embedding = await self._embedding_service.generate_embedding(text_payload)
                cand_vec = np.asarray(cand_embedding, dtype=np.float32)

            score = self._cosine_similarity_np(query_vec, query_norm, cand_vec)
            scored.append(SimilarIncidentMatch(incident=incident, similarity_score=score))

        scored.sort(key=lambda item: item.similarity_score, reverse=True)
        self._log_similarity_duration(started_at)
        return scored[:limit]

    async def search_by_embedding(
        self,
        query: str | List[float],
        limit: int = 5,
        company_id: str = "default",
    ) -> list[SimilarIncident]:
        """Semantic similarity search from raw text or a precomputed embedding vector."""
        if isinstance(query, str):
            normalized = query.strip()
            if not normalized:
                raise BadRequestError("Search query cannot be empty.")
            embedding = await self._embedding_service.generate_query_embedding(normalized)
        else:
            embedding = query

        matches = await self.match_by_embedding_vector(embedding, limit, company_id=company_id)
        ranked = self._rank_similar_matches(matches)
        return ranked[:limit]

    async def nearest_cluster_for_embedding(
        self,
        embedding: List[float],
        min_similarity: float = 0.42,
        company_id: str = "default",
    ) -> str | None:
        """Pick cluster_id from the most similar incident that already belongs to a cluster."""
        matches = await self.match_by_embedding_vector(embedding, limit=40, company_id=company_id)
        for match in matches:
            cid = match.incident.cluster_id
            if cid and match.similarity_score >= min_similarity:
                return cid
        return None

    @staticmethod
    def _cosine_similarity_np(left: np.ndarray, left_norm: float, right: np.ndarray) -> float:
        """Compute normalized cosine similarity and clamp to [0, 1]."""
        if left.shape != right.shape:
            return 0.0
        right_norm = float(np.linalg.norm(right))
        if right_norm == 0:
            return 0.0
        raw = float(np.dot(left, right) / (left_norm * right_norm))
        # Convert from [-1,1] into [0,1] for easier product-facing interpretation.
        return max(0.0, min(1.0, (raw + 1.0) / 2.0))

    def _log_similarity_duration(self, started_at: float) -> None:
        """Log similarity retrieval duration and warn when over target."""
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        if duration_ms > 200:
            logger.warning("similarity_search_slow", extra={"duration_ms": duration_ms})
        else:
            logger.info("similarity_search_duration", extra={"duration_ms": duration_ms})

    @staticmethod
    def _validate_pagination(page: int, page_size: int) -> tuple[int, int]:
        """Validate and normalize pagination args."""
        if page < 1:
            raise BadRequestError("Page must be >= 1.")
        if page_size < 1 or page_size > 100:
            raise BadRequestError("Page size must be between 1 and 100.")
        return page, page_size

    @staticmethod
    def _cosine_similarity(left: list[float], right: list[float]) -> float:
        """Compute cosine similarity for ranking semantic matches."""
        if len(left) != len(right):
            return 0.0
        dot_product = sum(l * r for l, r in zip(left, right, strict=True))
        left_norm = math.sqrt(sum(value * value for value in left))
        right_norm = math.sqrt(sum(value * value for value in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return dot_product / (left_norm * right_norm)

    def _to_response(self, incident: Incident) -> IncidentResponse:
        """Map Incident document to API response schema."""
        return IncidentResponse(
            id=str(incident.id),
            title=incident.title,
            description=incident.description,
            severity=incident.severity,  # type: ignore[arg-type]
            source=incident.root_cause or "unknown",
            cluster_id=incident.cluster_id,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            root_causes=[],
            timestamp=incident.timestamp,
            system_components=incident.system_components,
            resolution=incident.resolution,
            resolution_steps=incident.resolution_steps,
            time_to_resolve_minutes=incident.time_to_resolve_minutes,
            ai_predicted_root_cause=incident.ai_predicted_root_cause,
            actual_root_cause=incident.actual_root_cause,
            was_prediction_correct=incident.was_prediction_correct,
            helpful_count=incident.helpful_count,
            resolution_quality_score=incident.resolution_quality_score,
        )

    # Unit test structure:
    # - Test CRUD happy paths with AsyncSession fixture.
    # - Test search_incidents orders results by cosine similarity.
    # - Test pagination validation rejects invalid page/page_size values.

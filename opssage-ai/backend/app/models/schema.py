"""Pydantic API request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SeverityLevel = Literal["low", "medium", "high", "critical"]
KnowledgeDocumentSourceType = Literal["pdf", "txt", "docx", "slack"]
KnowledgeDocumentScope = Literal["personal", "team", "org"]


class APIModel(BaseModel):
    """Base API schema settings."""

    model_config = ConfigDict(from_attributes=True)


class IncidentCreate(APIModel):
    """Request payload for creating incidents."""

    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5)
    severity: SeverityLevel
    source: str = Field(min_length=2, max_length=128)
    cluster_id: str | None = None
    timestamp: datetime | None = None

    # Optional enrichment fields (stored on Incident documents).
    resolution: str | None = None
    resolution_steps: list[str] = Field(default_factory=list)
    time_to_resolve_minutes: int | None = None
    tags: list[str] = Field(default_factory=list)
    system_components: list[str] = Field(default_factory=list)
    idempotency_key: str | None = None


class IncidentUpdate(APIModel):
    """Request payload for incident updates."""

    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=5)
    severity: SeverityLevel | None = None
    source: str | None = Field(default=None, min_length=2, max_length=128)
    cluster_id: str | None = None

    timestamp: datetime | None = None
    resolution: str | None = None
    resolution_steps: list[str] = Field(default_factory=list)
    time_to_resolve_minutes: int | None = None
    tags: list[str] = Field(default_factory=list)
    system_components: list[str] = Field(default_factory=list)


class RootCauseCreate(APIModel):
    """Request payload for adding root-cause analysis."""

    summary: str = Field(min_length=5)
    confidence_score: int = Field(ge=0, le=100)
    runbook_steps: list[str] = Field(default_factory=list)
    cluster_id: str | None = None


class RootCauseResponse(APIModel):
    """Response schema for root-cause objects."""

    id: str
    incident_id: str
    cluster_id: str | None
    summary: str
    confidence_score: int
    runbook_steps: list[str]
    created_at: datetime
    updated_at: datetime


class IncidentResponse(APIModel):
    """Response schema for incident resources."""

    id: str
    title: str
    description: str
    severity: SeverityLevel
    source: str
    cluster_id: str | None
    created_at: datetime
    updated_at: datetime
    root_causes: list[RootCauseResponse] = Field(default_factory=list)

    # Optional enrichment fields.
    timestamp: datetime | None = None
    system_components: list[str] = Field(default_factory=list)
    resolution: str | None = None
    resolution_steps: list[str] = Field(default_factory=list)
    time_to_resolve_minutes: int | None = None

    # Feedback / intelligence layer.
    ai_predicted_root_cause: str | None = None
    actual_root_cause: str | None = None
    was_prediction_correct: bool | None = None
    helpful_count: int = 0
    resolution_quality_score: float | None = Field(default=None, ge=0.0, le=10.0)


class IncidentFeedback(APIModel):
    """Payload for POST /incidents/{id}/feedback."""

    actual_root_cause: str | None = None
    was_prediction_correct: bool | None = None
    resolution_quality_score: float | None = Field(default=None, ge=0.0, le=10.0)
    mark_helpful: bool = False


class ClusterCreate(APIModel):
    """Request payload for creating clusters."""

    name: str = Field(min_length=2, max_length=255)
    summary: str | None = None


class ClusterResponse(APIModel):
    """Response schema for cluster resources."""

    id: str
    name: str
    summary: str | None
    incident_count: int
    created_at: datetime
    updated_at: datetime


class AnalysisRequest(APIModel):
    """Request schema for LLM analysis."""

    incident_id: str
    context: str = Field(min_length=5)


class AnalysisResponse(APIModel):
    """Response schema for LLM analysis."""

    summary: str
    root_cause: str
    confidence_score: int = Field(ge=0, le=100)
    suggested_runbook_steps: list[str]


class PaginatedIncidentsResponse(APIModel):
    """Paginated response schema for incident collections."""

    items: list[IncidentResponse]
    total: int
    page: int
    page_size: int


class BulkImportResponse(APIModel):
    """Response payload for bulk import operations."""

    imported_count: int
    failed_count: int
    errors: list[str] = Field(default_factory=list)


class ClusterListResponse(APIModel):
    """Paginated response for cluster listings."""

    items: list[ClusterResponse]
    total: int


class SimilarIncidentsResponse(APIModel):
    """Response payload for similar-incident lookups."""

    incident_id: str
    items: list["SimilarIncident"]


class SimilarIncident(APIModel):
    """Slim incident representation for similarity results."""

    id: str
    title: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    severity: str = "medium"
    root_cause: str | None = None
    resolution: str | None = None
    helpful_count: int = Field(default=0, ge=0)
    created_at: datetime | None = None


class RootCauseAnalysis(APIModel):
    """Structured root-cause hypothesis from the incident intelligence LLM."""

    root_cause: str
    confidence: int = Field(ge=0, le=100)
    evidence: str = ""
    recommended_action: str = ""


class ClusterRecomputeRequest(APIModel):
    """Request payload for triggering clustering recomputation."""

    eps: float = Field(default=0.35, gt=0)
    min_samples: int = Field(default=2, ge=1)


class ClusterRecomputeResponse(APIModel):
    """Response payload for clustering recompute actions."""

    clusters_found: int
    reassigned_incidents: int


class RunbookRequest(APIModel):
    """Request payload for runbook generation."""

    incident_id: str
    context: str = Field(min_length=5)


class RunbookResponse(APIModel):
    """Response payload for generated runbook steps."""

    incident_id: str
    runbook_steps: list[str]
    confidence_score: int = Field(ge=0, le=100)


class TrendingRootCauseItem(APIModel):
    """Single trending root-cause entry."""

    summary: str
    occurrence_count: int


class TrendingRootCauseResponse(APIModel):
    """Response payload for trending root-cause query."""

    items: list[TrendingRootCauseItem]


class HealthDetailedResponse(APIModel):
    """Detailed health payload across dependencies."""

    status: str
    database: str
    cache: str
    llm: str


class KnowledgeDocumentChunkMeta(APIModel):
    """Optional chunk metadata for split PDF / large-document uploads."""

    parent_document_id: str | None = None
    chunk_index: int | None = Field(default=None, ge=0)
    chunk_total: int | None = Field(default=None, ge=1)


class KnowledgeDocumentCreate(APIModel):
    """Request payload for creating knowledge base documents."""

    title: str = Field(min_length=1, max_length=512)
    content: str = Field(min_length=1)
    source_type: KnowledgeDocumentSourceType
    scope: KnowledgeDocumentScope
    tags: list[str] = Field(default_factory=list)
    uploaded_by: str | None = None
    chunk: KnowledgeDocumentChunkMeta | None = None


class KnowledgeDocumentUpdate(APIModel):
    """Request payload for partial knowledge document updates."""

    title: str | None = Field(default=None, min_length=1, max_length=512)
    content: str | None = Field(default=None, min_length=1)
    source_type: KnowledgeDocumentSourceType | None = None
    scope: KnowledgeDocumentScope | None = None
    tags: list[str] | None = None
    uploaded_by: str | None = None
    chunk: KnowledgeDocumentChunkMeta | None = None


class KnowledgeDocumentResponse(APIModel):
    """Response schema for knowledge documents (embeddings excluded by default)."""

    id: str
    tenant_id: str
    title: str
    content: str
    source_type: KnowledgeDocumentSourceType
    scope: KnowledgeDocumentScope
    tags: list[str] = Field(default_factory=list)
    uploaded_by: str | None = None
    chunk: KnowledgeDocumentChunkMeta | None = None
    created_at: datetime
    updated_at: datetime


class KnowledgeQueryRequest(APIModel):
    """Request payload for semantic knowledge queries."""

    query: str = Field(min_length=1)
    scope: KnowledgeDocumentScope
    min_similarity: float = Field(default=0.5, ge=0.0, le=1.0)
    limit: int = Field(default=5, ge=1, le=25)


class KnowledgeQuerySourceResponse(APIModel):
    """Source attribution for a knowledge query result."""

    title: str
    source_type: KnowledgeDocumentSourceType
    similarity_score: float = Field(ge=0.0, le=1.0)


class KnowledgeQueryResponse(APIModel):
    """Response payload for knowledge base Q&A."""

    answer: str
    sources: list[KnowledgeQuerySourceResponse] = Field(default_factory=list)


class PaginatedKnowledgeDocumentsResponse(APIModel):
    """Paginated response schema for knowledge document collections."""

    items: list[KnowledgeDocumentResponse]
    total: int
    page: int
    page_size: int


class KnowledgeFileUploadResponse(APIModel):
    """Response payload for file-based knowledge ingestion."""

    document_title: str
    chunks_created: int
    tags: list[str] = Field(default_factory=list)
    status: Literal["success"] = "success"

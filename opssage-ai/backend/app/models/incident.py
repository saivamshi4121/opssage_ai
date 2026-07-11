"""MongoDB persistence models for incident intelligence (Beanie ODM)."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import Field
import pymongo


class Incident(Document):
    """Incident persistence document.

    Note: this replaces the prior SQLAlchemy ORM model.
    """

    title: str
    description: str
    timestamp: datetime
    severity: str  # critical | high | medium | low

    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    resolution_steps: List[str] = Field(default_factory=list)
    time_to_resolve_minutes: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    system_components: List[str] = Field(default_factory=list)

    cluster_id: Optional[str] = None

    embedding: Optional[List[float]] = None  # stored directly on doc

    company_id: str = "default"

    idempotency_key: Optional[str] = None

    ai_predicted_root_cause: Optional[str] = None
    actual_root_cause: Optional[str] = None
    was_prediction_correct: Optional[bool] = None
    helpful_count: int = 0
    resolution_quality_score: Optional[float] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "incidents"
        indexes = [
            "company_id",
            "idempotency_key",
            "severity",
            "cluster_id",
            "timestamp",
            [("title", pymongo.TEXT), ("description", pymongo.TEXT)],
        ]


class Cluster(Document):
    """Incident cluster persistence document."""

    company_id: str = "default"

    name: str
    description: Optional[str] = None
    root_cause_label: str

    incident_count: int = 0
    avg_severity_score: float = 0.0
    avg_time_to_resolve: float = 0.0
    last_incident_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "clusters"
        indexes = ["company_id"]


class RootCause(Document):
    """Root-cause persistence document.

    Currently the analysis flow may cache results to Redis; this doc is
    included for future persistence and parity with the original design.
    """

    incident_id: str
    root_cause: str
    confidence: float
    evidence: str
    recommended_action: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "root_causes"

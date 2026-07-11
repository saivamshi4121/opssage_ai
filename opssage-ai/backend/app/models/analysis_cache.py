"""Cache model for LLM responses."""

from datetime import datetime, timedelta
from typing import List, Optional

from beanie import Document
from pydantic import Field
import pymongo


def default_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=7)

class AnalysisCache(Document):
    """Cache for LLM incident analysis responses."""

    company_id: str = "default"
    description_hash: str
    root_cause: str
    confidence: int
    evidence: str = ""
    runbook: List[str] = Field(default_factory=list)
    severity: str = "medium"
    summary: str = ""
    matched_keywords: List[str] = Field(default_factory=list)
    embedding: Optional[List[float]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=default_expiry)

    class Settings:
        name = "analysis_cache"
        indexes = [
            "company_id",
            "description_hash",
            "expires_at",
            [("description_hash", pymongo.ASCENDING)]
        ]

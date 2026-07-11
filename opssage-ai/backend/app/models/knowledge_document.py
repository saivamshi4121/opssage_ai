"""MongoDB persistence model for the Slack-native organizational knowledge base.

Each ``KnowledgeDocument`` stores searchable knowledge content (uploads or Slack
captures) with a sentence-transformer embedding for semantic retrieval. Documents
are isolated by ``tenant_id`` and scoped to personal, team, or org visibility.

Example document (JSON):

.. code-block:: json

    {
        "_id": "665a1b2c3d4e5f6789012345",
        "tenant_id": "acme-corp",
        "title": "On-call runbook: payment gateway timeouts",
        "content": "When Stripe webhooks lag, check the retry queue and DLQ depth...",
        "source_type": "slack",
        "scope": "team",
        "tags": ["payments", "on-call", "runbook"],
        "embedding": [0.012, -0.034, 0.056],
        "uploaded_by": "U01234567",
        "parent_document_id": null,
        "chunk_index": null,
        "chunk_total": null,
        "created_at": "2026-06-13T10:30:00.000Z",
        "updated_at": "2026-06-13T10:30:00.000Z"
    }
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from beanie import Document, Insert, Save, Update, before_event
from pydantic import Field
import pymongo

KnowledgeDocumentSourceType = Literal["pdf", "txt", "docx", "slack"]
KnowledgeDocumentScope = Literal["personal", "team", "org"]


class KnowledgeDocument(Document):
    """Organizational knowledge entry persisted for semantic search and retrieval.

    Supports future PDF chunking via optional ``parent_document_id`` and chunk
    metadata fields. Parent documents hold full uploads; child chunks reference
    the parent and store ``chunk_index`` / ``chunk_total`` for ordered reassembly.
    """

    tenant_id: str
    title: str
    content: str
    source_type: KnowledgeDocumentSourceType
    scope: KnowledgeDocumentScope
    tags: List[str] = Field(default_factory=list)
    embedding: Optional[List[float]] = None
    uploaded_by: Optional[str] = None

    # Chunking architecture (optional; unset for whole-document uploads).
    parent_document_id: Optional[str] = None
    chunk_index: Optional[int] = Field(default=None, ge=0)
    chunk_total: Optional[int] = Field(default=None, ge=1)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @before_event(Insert)
    def _stamp_insert_timestamps(self) -> None:
        """Set both timestamps on first insert."""
        now = datetime.utcnow()
        self.created_at = now
        self.updated_at = now

    @before_event(Save, Update)
    def _touch_updated_at(self) -> None:
        """Refresh ``updated_at`` on every save or update."""
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "knowledge_documents"
        indexes = [
            "tenant_id",
            "title",
            "source_type",
            "scope",
            "parent_document_id",
            [("tenant_id", pymongo.ASCENDING), ("scope", pymongo.ASCENDING)],
            [("title", pymongo.TEXT), ("content", pymongo.TEXT)],
        ]

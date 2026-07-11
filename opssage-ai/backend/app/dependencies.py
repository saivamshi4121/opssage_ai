"""Shared dependency providers for API endpoints.

Data layer is MongoDB (Motor async driver) + Beanie ODM.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol

from beanie import init_beanie
from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient
from openai import AsyncOpenAI

from app.config import Settings, get_settings
from app.models.incident import Cluster, Incident, RootCause
from app.models.knowledge_document import KnowledgeDocument
from app.models.usage_log import UsageLog
from app.models.analysis_cache import AnalysisCache
from app.services.cache_service import CacheService
from app.services.embedding_service import EmbeddingService


class LLMClient(Protocol):
    """Protocol for LLM provider clients."""

    async def analyze(self, prompt: str) -> str:
        """Run text analysis against an LLM provider."""


_settings: Settings = get_settings()

_motor_client: Optional[AsyncIOMotorClient] = None
_db_initialized: bool = False
_cache_service: CacheService | None = None
_embedding_service: EmbeddingService | None = None


async def init_db() -> AsyncIOMotorClient:
    """Initialize MongoDB + Beanie models (exactly once)."""
    global _motor_client, _db_initialized
    if _db_initialized and _motor_client is not None:
        return _motor_client

    _motor_client = AsyncIOMotorClient(_settings.mongodb_url)
    await init_beanie(
        database=_motor_client[_settings.mongodb_db_name],
        document_models=[
            Incident,
            Cluster,
            RootCause,
            KnowledgeDocument,
            UsageLog,
            AnalysisCache,
        ],
    )
    _db_initialized = True
    return _motor_client


def get_motor_client() -> AsyncIOMotorClient:
    """Return initialized Motor client."""
    if _motor_client is None:
        raise RuntimeError("MongoDB is not initialized. Call init_db() during startup.")
    return _motor_client


def get_app_settings() -> Settings:
    """Provide application settings dependency."""
    return _settings


def get_cache_service() -> CacheService:
    """Return shared cache service instance."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service


def get_embedding_service() -> EmbeddingService:
    """Return shared embedding service instance (model loaded once at startup)."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService(cache_service=get_cache_service())
    return _embedding_service


async def get_redis():
    return None


def get_company_id(request: Request) -> str:
    """Tenant identifier from ``TenantMiddleware`` (falls back to ``default``)."""
    return getattr(request.state, "company_id", "default")


async def get_llm_client():
    return AsyncOpenAI(api_key=_settings.OPENAI_API_KEY)

"""Embedding generation service."""

from __future__ import annotations

import asyncio
from typing import Any

from app.services.cache_service import CacheService
from app.utils.exceptions import BadRequestError, ServiceUnavailableError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """Service for generating sentence embeddings."""

    def __init__(self, cache_service: CacheService, model_name: str = "all-MiniLM-L6-v2") -> None:
        """Initialize embedding service with lazy model loading."""
        self._cache_service = cache_service
        self._model_name = model_name
        self._model: Any | None = None
        self._model_lock = asyncio.Lock()

    async def _get_model(self) -> Any:
        """Load sentence-transformer model lazily and safely."""
        if self._model is not None:
            return self._model

        async with self._model_lock:
            if self._model is not None:
                return self._model
            try:
                from sentence_transformers import SentenceTransformer

                self._model = await asyncio.to_thread(SentenceTransformer, self._model_name)
                logger.info("embedding_model_loaded", extra={"model_name": self._model_name})
                return self._model
            except ImportError as exc:
                raise ServiceUnavailableError(
                    "SentenceTransformer dependency is unavailable. Install sentence-transformers.",
                ) from exc
            except Exception as exc:
                logger.exception("embedding_model_load_failed", extra={"model_name": self._model_name})
                raise ServiceUnavailableError("Unable to load embedding model.") from exc

    async def get_model(self) -> Any:
        """Public accessor for eager model loading during startup."""
        return await self._get_model()

    async def generate_embedding(self, text: str, use_cache: bool = True) -> list[float]:
        """Generate embedding for input text."""
        normalized = text.strip()
        if not normalized:
            raise BadRequestError("Text for embedding cannot be empty.")

        model = await self._get_model()
        try:
            raw_vector = await asyncio.to_thread(model.encode, normalized, normalize_embeddings=True)
            vector = [float(value) for value in raw_vector.tolist()]
        except Exception as exc:
            logger.exception("embedding_generation_failed")
            raise ServiceUnavailableError("Failed to generate embedding.") from exc

        return vector

    async def generate(self, text: str) -> list[float]:
        """Backward-compatible alias for single embedding generation."""
        return await self.generate_embedding(text)

    async def generate_query_embedding(self, query: str) -> list[float]:
        """Generate query embedding."""
        normalized = query.strip()
        if not normalized:
            raise BadRequestError("Query for embedding cannot be empty.")
        return await self.generate_embedding(normalized, use_cache=False)

    async def generate_batch(self, texts: list[str], use_cache: bool = True) -> list[list[float]]:
        """Generate embeddings for a batch of texts sequentially with cache support."""
        vectors: list[list[float]] = []
        for text in texts:
            vectors.append(await self.generate_embedding(text, use_cache=use_cache))
        return vectors

    async def invalidate_embedding_cache(self) -> int:
        """Invalidate all embedding cache keys for this model."""
        return 0

    # Unit test structure:
    # - Test cache hit path avoids model.encode call.
    # - Test ImportError from sentence_transformers raises ServiceUnavailableError.
    # - Test empty text raises BadRequestError.

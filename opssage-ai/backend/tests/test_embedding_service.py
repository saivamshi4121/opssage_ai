"""Tests for embedding service."""

import pytest

from app.services.embedding_service import EmbeddingService


@pytest.mark.asyncio
async def test_generate_returns_list() -> None:
    """Ensure embedding service returns placeholder sequence."""
    service = EmbeddingService()
    result = await service.generate("test")
    assert isinstance(result, list)

"""Tests for LLM service."""

import pytest

from app.models.schema import AnalysisRequest
from app.services.llm_service import LLMService


@pytest.mark.asyncio
async def test_llm_analysis_returns_summary() -> None:
    """Ensure analysis response includes a non-empty summary."""
    service = LLMService()
    response = await service.analyze(AnalysisRequest(incident_id="1", context="ctx"))
    assert bool(response.summary)

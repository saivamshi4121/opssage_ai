"""Pytest fixtures for backend tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    """Provide FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client

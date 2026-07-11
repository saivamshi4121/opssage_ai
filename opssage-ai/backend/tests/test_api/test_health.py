"""API tests for health endpoints."""


def test_health_check(client) -> None:
    """Health endpoint should return OK status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

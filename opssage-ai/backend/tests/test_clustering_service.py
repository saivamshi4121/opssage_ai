"""Tests for clustering service."""

from app.services.clustering_service import ClusteringService


def test_get_cluster_returns_expected_id() -> None:
    """Ensure cluster id is returned as requested."""
    service = ClusteringService()
    cluster = service.get_cluster("cluster-1")
    assert cluster.id == "cluster-1"

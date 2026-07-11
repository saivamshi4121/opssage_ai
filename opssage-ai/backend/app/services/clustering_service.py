"""Clustering and grouping business logic (MongoDB/Beanie persistence)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

import numpy as np

from app.models.incident import Cluster, Incident
from app.models.schema import ClusterResponse
from app.utils.exceptions import BadRequestError
from app.utils.tenant_scope import (
    cluster_belongs_to_tenant,
    cluster_scope_filter,
    incident_scope_filter,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass(slots=True)
class ClusterMetadata:
    """Calculated metadata for a generated cluster."""

    cluster_id: int
    frequency: int
    impact_score: float


class ClusteringService:
    """Service for incident clustering operations.

    Current implementation supports:
    - Bootstrap clusters when the `clusters` collection is empty
    - Recompute clusters from incident data
    """

    severity_weight: dict[str, float] = {
        "low": 1.0,
        "medium": 2.0,
        "high": 3.0,
        "critical": 4.0,
    }

    def __init__(self) -> None:
        """Initialize clustering service."""
        # DBSCAN config can be added later when embedding-based clustering is enabled.
        pass

    async def list_clusters(self, company_id: str = "default") -> list[ClusterResponse]:
        """List persisted clusters for a tenant."""
        clusters = await Cluster.find(cluster_scope_filter(company_id)).sort("-created_at").to_list()
        return [
            ClusterResponse(
                id=str(cluster.id),
                name=cluster.name,
                summary=cluster.description,
                incident_count=cluster.incident_count,
                created_at=cluster.created_at,
                updated_at=cluster.created_at,
            )
            for cluster in clusters
        ]

    async def get_cluster_by_id(self, cluster_id: str, company_id: str = "default") -> ClusterResponse:
        """Fetch a cluster by identifier within the tenant."""
        cluster = await Cluster.get(cluster_id)
        if cluster is None or not cluster_belongs_to_tenant(cluster, company_id):
            raise BadRequestError(f"Cluster '{cluster_id}' not found.")
        return ClusterResponse(
            id=str(cluster.id),
            name=cluster.name,
            summary=cluster.description,
            incident_count=cluster.incident_count,
            created_at=cluster.created_at,
            updated_at=cluster.created_at,
        )

    async def recompute_from_database(self, company_id: str = "default") -> tuple[int, int]:
        """Recompute cluster assignment and metadata from incidents for one tenant."""
        incidents = await Incident.find(incident_scope_filter(company_id)).to_list()
        if not incidents:
            return 0, 0

        # Group by root_cause (acts as "source" for current seed data).
        grouped: dict[str, list[Incident]] = defaultdict(list)
        for incident in incidents:
            grouped[incident.root_cause or "unknown"].append(incident)

        # Drop clusters for this tenant only, then rebuild.
        await Cluster.find(cluster_scope_filter(company_id)).delete()

        created_clusters: list[Cluster] = []
        now = datetime.utcnow()
        for root_cause_label, items in grouped.items():
            severities = [i.severity for i in items]
            sev_scores = [self.severity_weight.get(s, 1.0) for s in severities]
            avg_severity = float(np.mean(sev_scores)) if sev_scores else 0.0

            ttrs = [i.time_to_resolve_minutes for i in items if i.time_to_resolve_minutes is not None]
            avg_ttr = float(np.mean(ttrs)) if ttrs else 0.0

            last_at = max((i.timestamp for i in items if i.timestamp is not None), default=None)

            cluster = Cluster(
                company_id=company_id,
                name=root_cause_label.replace("_", " ").title(),
                description=f"Auto-generated cluster for root cause '{root_cause_label}'.",
                root_cause_label=root_cause_label,
                incident_count=len(items),
                avg_severity_score=avg_severity,
                avg_time_to_resolve=avg_ttr,
                last_incident_at=last_at,
                created_at=now,
            )
            await cluster.insert()
            created_clusters.append(cluster)

        # Assign cluster_id on incidents.
        cluster_by_label = {c.root_cause_label: str(c.id) for c in created_clusters}
        for incident in incidents:
            label = incident.root_cause or "unknown"
            incident.cluster_id = cluster_by_label.get(label)
            incident.updated_at = now
            await incident.save()

        return len(created_clusters), len(incidents)

    async def bootstrap_clusters_if_empty(self, company_id: str = "default") -> tuple[int, int]:
        """Create clusters for the tenant if none exist yet."""
        clusters_count = await Cluster.find(cluster_scope_filter(company_id)).count()
        if clusters_count > 0:
            incidents_count = await Incident.find(incident_scope_filter(company_id)).count()
            return 0, int(incidents_count)
        return await self.recompute_from_database(company_id)

    # Unit test structure:
    # - Test cluster_incidents returns labels for valid embeddings.
    # - Test validate_clusters false when all labels are noise (-1).
    # - Test incremental_cluster preserves output length with new incidents.

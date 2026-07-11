"""Mongo query fragments for multi-tenant isolation."""

from __future__ import annotations

from typing import Any

from app.models.incident import Cluster, Incident
from app.models.knowledge_document import KnowledgeDocument


def incident_scope_filter(company_id: str) -> dict[str, Any]:
    """Match incidents belonging to ``company_id`` (legacy docs without field count as ``default``)."""
    if company_id == "default":
        return {"$or": [{"company_id": "default"}, {"company_id": {"$exists": False}}]}
    return {"company_id": company_id}


def cluster_scope_filter(company_id: str) -> dict[str, Any]:
    """Match clusters belonging to ``company_id``."""
    if company_id == "default":
        return {"$or": [{"company_id": "default"}, {"company_id": {"$exists": False}}]}
    return {"company_id": company_id}


def scoped_and(tenant_clause: dict[str, Any], *other: dict[str, Any]) -> dict[str, Any]:
    """Combine tenant scope with additional Mongo clauses."""
    clauses = [tenant_clause] + [clause for clause in other if clause]
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def incident_belongs_to_tenant(incident: Incident, company_id: str) -> bool:
    cid = getattr(incident, "company_id", None)
    if company_id == "default":
        return cid in (None, "default")
    return cid == company_id


def cluster_belongs_to_tenant(cluster: Cluster, company_id: str) -> bool:
    cid = getattr(cluster, "company_id", None)
    if company_id == "default":
        return cid in (None, "default")
    return cid == company_id


def knowledge_document_scope_filter(tenant_id: str) -> dict[str, Any]:
    """Match knowledge documents belonging to ``tenant_id``."""
    if tenant_id == "default":
        return {"$or": [{"tenant_id": "default"}, {"tenant_id": {"$exists": False}}]}
    return {"tenant_id": tenant_id}


def knowledge_document_belongs_to_tenant(document: KnowledgeDocument, tenant_id: str) -> bool:
    """Return whether a knowledge document belongs to the given tenant."""
    tid = getattr(document, "tenant_id", None)
    if tenant_id == "default":
        return tid in (None, "default")
    return tid == tenant_id

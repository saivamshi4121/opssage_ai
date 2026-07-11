"""Generate realistic incident seed data and insert into OpsSage.

Usage:
    python backend/data/seed_data.py
"""

from __future__ import annotations

import asyncio
import json
import random
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from pydantic import BaseModel, Field

# Allow imports from backend/app when running as a script.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings  # noqa: E402
from app.models.incident import Incident  # noqa: E402


OUTPUT_PATH = BACKEND_DIR / "data" / "incidents.json"
TOTAL_INCIDENTS = 80
API_URL = "http://localhost:8000/api/incidents/bulk-import"


CLUSTER_DISTRIBUTION: dict[str, int] = {
    "database_connection_pool": 14,
    "payment_gateway_timeout": 14,
    "etl_schema_change": 13,
    "cache_misconfiguration": 13,
    "disk_space_exhaustion": 13,
    "memory_leak": 13,
}

SEVERITY_BUCKETS: dict[str, int] = {
    "critical": 16,  # 20%
    "high": 32,  # 40%
    "medium": 24,  # 30%
    "low": 8,  # 10%
}

SEVERITY_TTR_MINUTES: dict[str, tuple[int, int]] = {
    "critical": (30, 120),
    "high": (15, 60),
    "medium": (10, 30),
    "low": (5, 15),
}


@dataclass(slots=True)
class ClusterTemplate:
    """Template bundle for root-cause-specific incident generation."""

    prefixes: list[str]
    systems: list[str]
    tags: list[str]
    symptom_lines: list[str]
    error_snippets: list[str]
    resolution_patterns: list[str]
    step_pool: list[str]


class SeedIncident(BaseModel):
    """Validation schema for generated incident objects."""

    id: str = Field(pattern=r"^INC-\d{3}$")
    title: str = Field(min_length=12, max_length=160)
    description: str = Field(min_length=40)
    timestamp: datetime
    severity: str = Field(pattern=r"^(critical|high|medium|low)$")
    root_cause: str
    resolution: str = Field(min_length=12)
    resolution_steps: list[str] = Field(min_length=3, max_length=5)
    time_to_resolve_minutes: int = Field(ge=5, le=180)
    tags: list[str] = Field(min_length=2, max_length=4)
    system_components: list[str] = Field(min_length=1, max_length=3)


CLUSTER_TEMPLATES: dict[str, ClusterTemplate] = {
    "database_connection_pool": ClusterTemplate(
        prefixes=["Connection Pool Starvation", "Postgres Session Saturation", "DB Socket Exhaustion", "Read Replica Lockup"],
        systems=["orders-api", "billing-api", "postgres-primary", "reporting-worker", "auth-service"],
        tags=["database", "postgres", "connection-pool", "latency", "availability"],
        symptom_lines=[
            "API latency climbed sharply during sustained checkout traffic.",
            "Worker retries increased as transactions stalled waiting for DB handles.",
            "Downstream services reported cascading request back-pressure.",
            "Connection wait metrics breached SLO for over ten minutes.",
        ],
        error_snippets=[
            'FATAL: remaining connection slots are reserved for non-replication superuser connections',
            "psycopg_pool.PoolTimeout: could not acquire connection in 30.00 sec",
            "SQLSTATE[53300]: too_many_connections",
        ],
        resolution_patterns=[
            "Increased pool headroom and moved long-running queries to replicas.",
            "Reduced pool contention by tuning idle timeout and transaction scope.",
            "Rolled out pool-size override and restarted exhausted worker fleet.",
        ],
        step_pool=[
            "Capture active sessions and identify long-running transactions.",
            "Throttle non-critical batch workloads hitting the primary.",
            "Raise pool limits within safe DB max_connections envelope.",
            "Deploy query timeout guardrails for API-facing paths.",
            "Add alerting on pool wait time p95 and queue depth.",
        ],
    ),
    "payment_gateway_timeout": ClusterTemplate(
        prefixes=["Gateway Timeout Surge", "Acquirer Latency Spike", "Payment Authorization Degradation", "Settlement API Stall"],
        systems=["payments-api", "checkout-service", "fraud-engine", "webhook-dispatcher"],
        tags=["payments", "timeout", "gateway", "checkout", "retries"],
        symptom_lines=[
            "Checkout abandonment rose as payment authorization calls exceeded SLA.",
            "Retry storms amplified outbound call volume to the payment gateway.",
            "Queue depth increased for pending transaction confirmations.",
            "Client-side fallback switched to manual retry mode.",
        ],
        error_snippets=[
            "504 Gateway Timeout",
            "upstream request timeout after 10000ms",
            "PaymentProviderTimeoutError: authorization endpoint did not respond",
        ],
        resolution_patterns=[
            "Applied circuit breaker thresholds and shifted traffic to backup acquirer.",
            "Lowered retry aggressiveness and enabled idempotent authorization replay.",
            "Reconfigured timeout budget and prioritized high-value payment flows.",
        ],
        step_pool=[
            "Enable partial failover to secondary payment provider.",
            "Reduce concurrent payment retries with exponential backoff.",
            "Drain stuck authorization jobs and replay idempotent requests.",
            "Coordinate with provider status team for incident timeline.",
            "Tune connection keepalive and gateway timeout settings.",
        ],
    ),
    "etl_schema_change": ClusterTemplate(
        prefixes=["Warehouse Load Breakage", "Contract Drift in ETL", "Schema Evolution Incident", "Pipeline Parse Failure"],
        systems=["etl-orchestrator", "spark-jobs", "warehouse-loader", "analytics-api"],
        tags=["etl", "schema", "data-quality", "pipeline", "analytics"],
        symptom_lines=[
            "Nightly pipeline failed when payload contract introduced new required fields.",
            "Downstream dashboards displayed incomplete metrics for business-critical KPIs.",
            "Backfill jobs accumulated after repeated transformation failures.",
            "Data freshness alerts triggered across reporting domains.",
        ],
        error_snippets=[
            "SchemaMismatchException: expected column 'customer_id' type BIGINT got VARCHAR",
            "ValueError: cannot parse field 'event_time' with format '%Y-%m-%d %H:%M:%S'",
            "DeltaMergeError: target schema has incompatible nullable constraint",
        ],
        resolution_patterns=[
            "Patched schema registry contract and replayed failed partitions.",
            "Added compatibility transform and deployed migration-aware parser.",
            "Rolled forward ETL mapping with strict validation and backfill.",
        ],
        step_pool=[
            "Diff producer and consumer schemas for breaking fields.",
            "Introduce temporary cast layer for incompatible columns.",
            "Replay failed partitions after schema fix.",
            "Backfill historical windows impacted by dropped records.",
            "Create CI contract tests for producer schema changes.",
        ],
    ),
    "cache_misconfiguration": ClusterTemplate(
        prefixes=["Redis Memory Pressure", "Cache Eviction Cascade", "Session Cache Instability", "Hot Key Saturation"],
        systems=["redis", "session-service", "recommendation-api", "catalog-api"],
        tags=["cache", "redis", "evictions", "performance", "config"],
        symptom_lines=[
            "Cache hit ratio dropped suddenly and forced heavy DB fallback traffic.",
            "Application nodes observed inconsistent session lookups under load.",
            "CPU utilization rose due to repeated cache misses on hot keys.",
            "API p95 latency regressed after eviction bursts.",
        ],
        error_snippets=[
            "Redis maxmemory limit reached",
            "OOM command not allowed when used memory > 'maxmemory'",
            "MOVED 12182 10.0.2.14:6379",
        ],
        resolution_patterns=[
            "Corrected eviction policy and raised memory ceiling for cache tier.",
            "Rebalanced keyspace TTL strategy and removed oversized payload entries.",
            "Rolled out shard rebalance and disabled noisy cache stampede path.",
        ],
        step_pool=[
            "Inspect key cardinality and top memory consumers.",
            "Adjust maxmemory and eviction policy for workload profile.",
            "Invalidate stale keys with oversized serialized objects.",
            "Enable request coalescing for hot key paths.",
            "Add cache-health SLO alerts on evictions and hit ratio.",
        ],
    ),
    "disk_space_exhaustion": ClusterTemplate(
        prefixes=["Disk Capacity Exhaustion", "Log Volume Saturation", "Node Storage Incident", "Persistent Volume Full"],
        systems=["kafka-broker", "postgres-primary", "log-aggregator", "object-sync-worker"],
        tags=["storage", "disk", "capacity", "ops", "filesystem"],
        symptom_lines=[
            "Write operations failed once available disk dropped below operational threshold.",
            "Background compaction stalled and increased IO wait across the node.",
            "Service pods restarted repeatedly due to filesystem errors.",
            "Replication lag widened while checkpoints could not flush safely.",
        ],
        error_snippets=[
            "No space left on device",
            "ENOSPC: write failed during WAL flush",
            "kubelet: eviction manager: unable to reclaim ephemeral storage",
        ],
        resolution_patterns=[
            "Cleared stale artifacts and expanded persistent volume allocation.",
            "Moved high-churn logs to cold storage and enabled retention enforcement.",
            "Rebalanced shards to lower storage pressure on hot nodes.",
        ],
        step_pool=[
            "Identify top disk consumers by mount and workload.",
            "Purge expired logs and temporary processing artifacts.",
            "Expand volume and verify filesystem resize completed.",
            "Throttle ingest while backlog drains safely.",
            "Add predictive disk-capacity alerts with trend thresholds.",
        ],
    ),
    "memory_leak": ClusterTemplate(
        prefixes=["Heap Growth Regression", "Pod OOM Restart Loop", "Memory Retention Fault", "Runtime Leak Incident"],
        systems=["recommendation-worker", "api-gateway", "stream-processor", "notification-service"],
        tags=["memory", "oom", "runtime", "performance", "stability"],
        symptom_lines=[
            "Memory footprint increased continuously after latest deployment.",
            "Autoscaling failed to compensate as instances restarted under OOM pressure.",
            "GC pause times spiked and reduced request throughput.",
            "Background consumers lagged due to repeated process restarts.",
        ],
        error_snippets=[
            "OOMKilled: Container exceeded memory limit",
            "java.lang.OutOfMemoryError: Java heap space",
            "RuntimeError: memory allocation failed while processing batch",
        ],
        resolution_patterns=[
            "Rolled back leak-introducing release and patched object lifecycle handling.",
            "Added bounded cache and fixed dangling reference retention path.",
            "Applied memory profiling fix and increased guardrail alerts.",
        ],
        step_pool=[
            "Capture heap/profile snapshots before restart.",
            "Isolate offending code path from last deployment diff.",
            "Apply emergency rollback or feature flag disable.",
            "Increase memory limits temporarily to stabilize traffic.",
            "Ship leak fix with canary observation and GC telemetry.",
        ],
    ),
}


def _build_severity_plan() -> list[str]:
    values: list[str] = []
    for severity, count in SEVERITY_BUCKETS.items():
        values.extend([severity] * count)
    random.shuffle(values)
    return values


def _timestamp_within_last_year() -> datetime:
    now = datetime.now(UTC)
    delta_days = random.randint(0, 364)
    delta_minutes = random.randint(0, 23 * 60 + 59)
    return now - timedelta(days=delta_days, minutes=delta_minutes)


def _sample_steps(step_pool: list[str]) -> list[str]:
    step_count = random.randint(3, 5)
    return random.sample(step_pool, k=step_count)


def _build_title(prefix: str, cluster: str, used_titles: set[str]) -> str:
    qualifiers = [
        "during traffic burst",
        "after config rollout",
        "impacting checkout path",
        "on eu-west production",
        "triggering customer-visible latency",
        "during overnight processing window",
        "after partial failover",
    ]
    while True:
        candidate = f"{prefix} {random.choice(qualifiers)} ({cluster.replace('_', '-')})"
        if candidate not in used_titles:
            used_titles.add(candidate)
            return candidate


def _build_description(template: ClusterTemplate) -> str:
    sentence_count = random.randint(2, 4)
    symptom_count = max(1, sentence_count - 1)
    parts = random.sample(template.symptom_lines, k=min(symptom_count, len(template.symptom_lines)))
    parts.append(f'Observed error: "{random.choice(template.error_snippets)}".')
    return " ".join(parts[:sentence_count])


def _build_incident_object(
    index: int,
    root_cause: str,
    severity: str,
    used_titles: set[str],
) -> SeedIncident:
    template = CLUSTER_TEMPLATES[root_cause]
    title = _build_title(random.choice(template.prefixes), root_cause, used_titles)
    ttr_min, ttr_max = SEVERITY_TTR_MINUTES[severity]
    return SeedIncident(
        id=f"INC-{index:03d}",
        title=title,
        description=_build_description(template),
        timestamp=_timestamp_within_last_year(),
        severity=severity,
        root_cause=root_cause,
        resolution=random.choice(template.resolution_patterns),
        resolution_steps=_sample_steps(template.step_pool),
        time_to_resolve_minutes=random.randint(ttr_min, ttr_max),
        tags=random.sample(template.tags, k=random.randint(2, 4)),
        system_components=random.sample(template.systems, k=random.randint(1, 3)),
    )


def generate_incidents() -> list[dict[str, Any]]:
    """Generate and validate all seed incidents."""
    random.seed(42)
    severity_plan = _build_severity_plan()
    used_titles: set[str] = set()
    incidents: list[SeedIncident] = []

    next_index = 1
    for cluster, count in CLUSTER_DISTRIBUTION.items():
        for _ in range(count):
            severity = severity_plan.pop()
            incident = _build_incident_object(index=next_index, root_cause=cluster, severity=severity, used_titles=used_titles)
            incidents.append(incident)
            next_index += 1

    if len(incidents) != TOTAL_INCIDENTS:
        raise ValueError(f"Expected {TOTAL_INCIDENTS} incidents, got {len(incidents)}.")

    ids = [item.id for item in incidents]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate incident IDs generated.")

    random.shuffle(incidents)
    return [item.model_dump(mode="json") for item in incidents]


def write_json(incidents: list[dict[str, Any]]) -> None:
    """Persist generated incidents to backend/data/incidents.json."""
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(incidents, indent=2), encoding="utf-8")
    print(f"Wrote {len(incidents)} incidents to {OUTPUT_PATH}")


def print_distribution_summary(incidents: list[dict[str, Any]]) -> None:
    """Print cluster and severity distribution summaries."""
    cluster_counts = Counter(item["root_cause"] for item in incidents)
    severity_counts = Counter(item["severity"] for item in incidents)
    print("Cluster distribution:")
    for cluster, count in sorted(cluster_counts.items()):
        print(f"  - {cluster}: {count}")
    print("Severity distribution:")
    for severity, count in sorted(severity_counts.items()):
        print(f"  - {severity}: {count}")


def _to_api_payload(incident: dict[str, Any]) -> dict[str, Any]:
    """Map seed schema into current API payload shape (extra fields preserved)."""
    return {
        "title": incident["title"],
        "description": incident["description"],
        "severity": incident["severity"],
        "source": incident["root_cause"],
        "cluster_id": None,
        **incident,
    }


def seed_via_api() -> None:
    """Seed incidents via bulk-import API endpoint."""
    incidents = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    payload = [_to_api_payload(item) for item in incidents]
    content = json.dumps(payload, indent=2).encode("utf-8")

    print(f"Uploading {len(payload)} incidents to {API_URL}")
    response = requests.post(
        API_URL,
        files={"file": ("incidents.json", content, "application/json")},
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()
    print(f"API seed complete: imported={body.get('imported_count')} failed={body.get('failed_count')}")


async def seed_direct_db() -> None:
    """Fallback seed path using direct Beanie/MongoDB inserts."""
    incidents = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    settings = get_settings()
    inserted = 0

    from app.dependencies import init_db
    from datetime import datetime
    from app.services.clustering_service import ClusteringService

    await init_db()
    await Incident.delete_all()

    for index, incident in enumerate(incidents, start=1):
        await Incident(
            title=incident["title"],
            description=incident["description"],
            severity=incident["severity"],
            company_id="default",
            timestamp=incident.get("timestamp") or datetime.utcnow(),
            root_cause=incident.get("root_cause") or incident.get("root_cause_label") or "unknown",
            resolution=incident.get("resolution"),
            resolution_steps=incident.get("resolution_steps") or [],
            time_to_resolve_minutes=incident.get("time_to_resolve_minutes"),
            tags=incident.get("tags") or [],
            system_components=incident.get("system_components") or [],
            cluster_id=None,
            embedding=incident.get("embedding"),
        ).insert()

        if index % 10 == 0:
            inserted = index
            print(f"Inserted {inserted}/{TOTAL_INCIDENTS}...")

    # Ensure clusters + incident.cluster_id are consistent.
    clustering_service = ClusteringService()
    await clustering_service.recompute_from_database("default")

    if inserted < TOTAL_INCIDENTS:
        print(f"Inserted {TOTAL_INCIDENTS}/{TOTAL_INCIDENTS}...")


if __name__ == "__main__":
    generated = generate_incidents()
    write_json(generated)
    print_distribution_summary(generated)
    try:
        seed_via_api()
    except Exception:
        print("API failed, falling back to direct DB seed...")
        asyncio.run(seed_direct_db())
